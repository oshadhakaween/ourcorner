/* Two-player games for the arcade (Tic-Tac-Toe, Connect Four, Memory Match).
   games.js calls OCMulti.install() to add them to the arcade list.
   The SERVER decides every move, so nobody can cheat or play out of turn.
   This file only shows the game and sends your taps. */
(function () {
  'use strict';

  var META = {
    tictactoe: { id: 'mp-ttt', title: 'Tic-Tac-Toe: Together', emoji: '❌', tag: 'Two players', col: 'rose', blurb: 'Live with your person, on two screens.' },
    connect4:  { id: 'mp-c4',  title: 'Connect Four: Together', emoji: '🔴', tag: 'Two players', col: 'butter', blurb: 'Drop discs, line up four before they do.' },
    memory:    { id: 'mp-mem', title: 'Memory Match: Together', emoji: '🃏', tag: 'Two players', col: 'lilac', blurb: 'Find more pairs than your person. A match = go again.' }
  };
  var BY_ID = {};
  Object.keys(META).forEach(function (k) { BY_ID[META[k].id] = k; });
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var SYM = ['💗', '🌸'];
  var liveOn = false, liveHooked = false;

  function hashFor(game, roomId) { return '#' + META[game].id + (roomId ? '/' + roomId : ''); }

  /* ======================= one game screen ======================= */
  function mpGame(game) {
    return function (c) {
      var OCx = window.OC;
      var wrap = OCx.el('div', 'mp-wrap');
      c.stage.appendChild(wrap);

      var roomId = null, room = null, busy = false, unsub = null, stopPoll = null, rematch = null, checking = false, tick = 0;
      var disposed = false;
      var baseTitle = document.title;

      function cleanup() {
        disposed = true;
        if (unsub) { unsub(); unsub = null; }
        if (stopPoll) { stopPoll(); stopPoll = null; }
        document.title = baseTitle;
      }
      c.onExit(cleanup);

      function go(id) { location.hash = hashFor(game, id); }
      function myIndex(r) { return r.hostId === OCx.me.id ? 0 : r.guestId === OCx.me.id ? 1 : -1; }
      function personFor(id) {
        if (id === OCx.me.id) return OCx.me;
        if (OCx.partner && id === OCx.partner.id) return OCx.partner;
        return { name: OCx.nameOf(id) };
      }

      /* ---------- start screen: new game + open games ---------- */
      function showStart() {
        c.pills([['With', OCx.partnerName()]]);
        wrap.textContent = '';
        var start = OCx.el('div', 'mp-start');
        start.appendChild(OCx.el('div', 'oc-banner', META[game].emoji + ' ' + META[game].title.split(':')[0]));
        start.appendChild(OCx.el('p', '', 'Start a game and ' + OCx.partnerName() + ' can join from their phone. You see each move live.'));
        var go1 = OCx.el('button', 'btn rose', 'Start a new game');
        go1.type = 'button';
        go1.addEventListener('click', function () { create(game, go1); });
        start.appendChild(go1);
        wrap.appendChild(start);
        var list = OCx.el('div', 'mp-list');
        wrap.appendChild(list);

        function loadList() {
          OCx.api('/api/rooms').then(function (rows) {
            if (disposed || roomId) return;
            list.textContent = '';
            rows = rows.filter(function (r) { return r.game === game; });
            if (!rows.length) return;
            list.appendChild(OCx.el('h4', '', 'Your games'));
            rows.forEach(function (r) {
              var mine = myIndex(r) >= 0;
              var row = OCx.el('div', 'oc-room');
              row.appendChild(OCx.el('span', 'ico', META[game].emoji));
              var t = OCx.el('div', 't');
              t.appendChild(OCx.el('b', '', r.status === 'waiting' ? (mine ? 'Waiting for ' + OCx.partnerName() : OCx.nameOf(r.hostId) + ' is waiting for you') : 'In progress'));
              t.appendChild(OCx.el('small', '', r.status === 'playing' ? (r.turn === OCx.me.id ? 'Your turn' : 'Their turn') : 'Not started yet'));
              row.appendChild(t);
              var act = OCx.el('div', 'go');
              var open = OCx.el('a', 'btn rose sm', mine ? 'Open' : 'Join');
              open.href = hashFor(game, r.id);
              act.appendChild(open);
              if (mine) {
                var x = OCx.el('button', 'btn ghost sm', r.status === 'waiting' ? 'Cancel' : 'End');
                x.type = 'button';
                x.addEventListener('click', function () {
                  x.disabled = true;
                  OCx.api('/api/rooms/' + r.id, { method: 'DELETE' }).then(loadList).catch(function (e) { OCx.toast(e.message); x.disabled = false; });
                });
                act.appendChild(x);
              }
              row.appendChild(act);
              list.appendChild(row);
            });
          }).catch(function () {});
        }
        loadList();
        stopPoll = OCx.poll(loadList, 4000);
      }

      function create(g, btn) {
        if (btn) btn.disabled = true;
        return OCx.api('/api/rooms', { method: 'POST', body: { game: g } })
          .then(function (r) { go(r.id); })
          .catch(function (e) { OCx.toast("Couldn't start the game: " + e.message); if (btn) btn.disabled = false; });
      }

      /* ---------- room screen ---------- */
      var playersEl, bannerEl, stageEl, actionsEl;
      function showRoom(id) {
        roomId = id;
        wrap.textContent = '';
        playersEl = OCx.el('div', 'oc-players');
        bannerEl = OCx.el('div', 'oc-banner', 'Loading the game…');
        stageEl = OCx.el('div', 'oc-stage');
        actionsEl = OCx.el('div', 'oc-actions');
        [playersEl, bannerEl, stageEl, actionsEl].forEach(function (e) { wrap.appendChild(e); });

        unsub = OCx.live('room:' + id, function (r) { applyRoom(r); });
        if (!liveHooked) { liveHooked = true; OCx.liveState(function (on) { liveOn = on; }); }
        fetchRoom();
        stopPoll = OCx.poll(function () {
          tick++;
          if (!liveOn || tick % 4 === 0) fetchRoom();
          if (room && room.status === 'finished') checkRematch();
        }, 3000);
      }

      function fetchRoom() {
        var id = roomId;
        if (!id) return Promise.resolve();
        return OCx.api('/api/rooms/' + id).then(function (r) { if (!disposed && id === roomId) applyRoom(r); }).catch(function (e) {
          if (!disposed && id === roomId && e.status === 404) { OCx.toast('That game was not found'); go(''); }
        });
      }
      function applyRoom(r) {
        if (disposed || !r || r.id !== roomId) return;
        if (room && r.version < room.version) return;
        var old = room;
        room = r;
        render(old);
      }

      function myTurn() { return room && room.status === 'playing' && room.turn === OCx.me.id; }

      function drawPlayers() {
        playersEl.textContent = '';
        [[room.hostId, 0], [room.guestId, 1]].forEach(function (x) {
          if (!x[0]) return;
          var p = personFor(x[0]);
          var chip = OCx.el('div', 'oc-pl' + (room.status === 'playing' && room.turn === x[0] ? ' turn' : ''));
          chip.appendChild(OCx.avatar(p, 'sm'));
          chip.appendChild(OCx.el('span', '', x[0] === OCx.me.id ? 'You' : p.name));
          if (room.game === 'tictactoe') chip.appendChild(OCx.el('i', '', SYM[x[1]]));
          if (room.game === 'connect4') { var d = OCx.el('i', '', '●'); d.style.color = x[1] === 0 ? 'var(--rose)' : '#ffb91f'; chip.appendChild(d); }
          if (room.game === 'memory' && room.state && room.state.scores) chip.appendChild(OCx.el('b', '', String(room.state.scores[x[1]])));
          playersEl.appendChild(chip);
        });
      }

      function drawBanner(idx) {
        var cls = 'oc-banner', text = '', sub = '';
        var other = OCx.nameOf(room.hostId === OCx.me.id ? room.guestId : room.hostId);
        if (room.status === 'waiting') {
          if (idx === 0) { text = 'Waiting for ' + OCx.partnerName() + '…'; sub = 'This game shows up in their arcade as an invite.'; }
          else { text = OCx.nameOf(room.hostId) + ' started a game'; sub = 'Join to play!'; }
        } else if (room.status === 'playing') {
          if (idx < 0) text = 'Game in progress';
          else if (room.turn === OCx.me.id) { text = 'Your turn'; cls += ' you'; }
          else text = other + "'s turn";
        } else {
          if (room.winner === 'draw') text = "It's a draw 🤝";
          else if (room.winner && room.winner === OCx.me.id) { text = 'You won! 💖'; cls += ' you'; }
          else if (room.winner) text = OCx.nameOf(room.winner) + ' won';
          else text = 'Game ended';
        }
        bannerEl.className = cls;
        bannerEl.textContent = text;
        if (sub) bannerEl.appendChild(OCx.el('small', '', sub));
      }

      /* tic-tac-toe */
      function drawTTT() {
        var b = room.state.board, win = [];
        if (room.status === 'finished' && room.winner && room.winner !== 'draw') {
          LINES.forEach(function (l) { if (b[l[0]] !== null && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) win = l; });
        }
        stageEl.textContent = '';
        var bd = OCx.el('div', 'board');
        for (var i = 0; i < 9; i++) {
          (function (i) {
            var cell = OCx.el('button', 'cell' + (win.indexOf(i) >= 0 ? ' win' : ''));
            cell.type = 'button';
            cell.setAttribute('aria-label', 'cell ' + (i + 1));
            cell.disabled = !(myTurn() && b[i] === null);
            if (b[i] !== null) cell.appendChild(OCx.el('span', 'mk', SYM[b[i]]));
            cell.addEventListener('click', function () { move({ cell: i }); });
            bd.appendChild(cell);
          })(i);
        }
        stageEl.appendChild(bd);
      }

      /* connect four */
      function c4Win(b) {
        var dirs = [[0,1],[1,0],[1,1],[1,-1]], out = {};
        for (var r = 0; r < 6; r++) for (var cc = 0; cc < 7; cc++) {
          var p = b[r][cc]; if (p === null) continue;
          dirs.forEach(function (d) {
            var cells = [];
            for (var k = 0; k < 4; k++) {
              var rr = r + d[0] * k, c2 = cc + d[1] * k;
              if (rr < 0 || rr > 5 || c2 < 0 || c2 > 6 || b[rr][c2] !== p) return;
              cells.push(rr + ',' + c2);
            }
            cells.forEach(function (x) { out[x] = 1; });
          });
        }
        return out;
      }
      function drawC4(old) {
        var b = room.state.board;
        var ob = old && old.id === room.id && old.state && old.state.board ? old.state.board : null;
        var win = room.status === 'finished' && room.winner && room.winner !== 'draw' ? c4Win(b) : {};
        stageEl.textContent = '';
        var w = OCx.el('div', 'oc-c4');
        for (var col = 0; col < 7; col++) {
          (function (col) {
            var btn = OCx.el('button', 'oc-col');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'column ' + (col + 1));
            btn.disabled = !(myTurn() && b[0][col] === null);
            for (var r = 0; r < 6; r++) {
              var v = b[r][col];
              btn.appendChild(OCx.el('span', 'oc-disc' + (v !== null ? ' p' + v : '') + (v !== null && ob && ob[r][col] === null ? ' drop' : '') + (win[r + ',' + col] ? ' win' : '')));
            }
            btn.addEventListener('click', function () { move({ col: col }); });
            w.appendChild(btn);
          })(col);
        }
        stageEl.appendChild(w);
      }

      /* memory: built once, then only classes change so the cards flip smoothly */
      function drawMemory() {
        var s = room.state;
        var grid = stageEl.firstChild;
        if (stageEl.dataset.rid !== room.id || !grid || !grid.classList || !grid.classList.contains('mem')) {
          stageEl.textContent = '';
          grid = OCx.el('div', 'mem');
          for (var i = 0; i < 16; i++) {
            var b = OCx.el('button', 'mc');
            b.type = 'button';
            b.setAttribute('aria-label', 'card ' + (i + 1));
            b.dataset.i = i;
            b.appendChild(OCx.el('span', 'front', '♥'));
            b.appendChild(OCx.el('span', 'back', s.cards[i]));
            grid.appendChild(b);
          }
          grid.addEventListener('click', function (e) {
            var card = e.target.closest('.mc');
            if (card) move({ index: +card.dataset.i });
          });
          stageEl.appendChild(grid);
          stageEl.dataset.rid = room.id;
        }
        grid.classList.toggle('oc-lock', !myTurn() || busy);
        Array.prototype.forEach.call(grid.children, function (el, i) {
          var m = s.matched[i];
          el.classList.toggle('matched', m !== null);
          el.classList.toggle('by0', m === 0);
          el.classList.toggle('by1', m === 1);
          el.classList.toggle('flipped', s.flipped.indexOf(i) >= 0 || s.shown.indexOf(i) >= 0);
        });
      }

      function drawActions(idx) {
        actionsEl.textContent = '';
        function btn(label, cls, fn) {
          var b = OCx.el('button', 'btn ' + cls + ' sm', label);
          b.type = 'button';
          b.addEventListener('click', function () { b.disabled = true; Promise.resolve(fn()).then(function () { b.disabled = false; }, function () { b.disabled = false; }); });
          actionsEl.appendChild(b);
        }
        function more() { var a = OCx.el('a', 'btn ghost sm', 'All games'); a.href = hashFor(game, ''); actionsEl.appendChild(a); }
        if (room.status === 'waiting') {
          if (idx === -1) btn('Join game', 'rose', function () {
            return OCx.api('/api/rooms/' + room.id + '/join', { method: 'POST' }).then(applyRoom).catch(function (e) { OCx.toast(e.message); fetchRoom(); });
          });
          else btn('Cancel game', 'ghost', function () {
            return OCx.api('/api/rooms/' + room.id, { method: 'DELETE' }).then(function () { go(''); }).catch(function (e) { OCx.toast(e.message); });
          });
        } else if (room.status === 'playing') {
          if (idx >= 0) btn('Leave game', 'ghost', function () {
            if (!confirm('End this game for both of you?')) return;
            return OCx.api('/api/rooms/' + room.id, { method: 'DELETE' }).then(function () { go(''); }).catch(function (e) { OCx.toast(e.message); });
          });
          more();
        } else {
          if (idx >= 0) {
            if (rematch) btn('Join ' + OCx.nameOf(rematch.hostId) + "'s rematch", 'rose', function () {
              var rid = rematch.id;
              return OCx.api('/api/rooms/' + rid + '/join', { method: 'POST' }).then(function () { go(rid); }).catch(function (e) { OCx.toast(e.message); });
            });
            else btn('Rematch 🔁', 'rose', function () { return create(room.game); });
          }
          more();
        }
      }

      function render(old) {
        var idx = myIndex(room);
        drawPlayers();
        drawBanner(idx);
        if (room.status === 'waiting') {
          stageEl.textContent = ''; delete stageEl.dataset.rid;
          var w = OCx.el('div', 'oc-wait-card');
          w.appendChild(OCx.el('b', '', META[room.game] ? META[room.game].emoji : '🎲'));
          stageEl.appendChild(w);
        }
        else if (room.game === 'tictactoe') drawTTT();
        else if (room.game === 'connect4') drawC4(old);
        else if (room.game === 'memory') drawMemory();
        drawActions(idx);
        c.pills(room.status === 'playing' ? [[myTurn() ? 'Your turn' : 'Their turn', myTurn() ? '💗' : '…']] : []);
        var was = old && old.status === 'playing' && old.turn === OCx.me.id;
        if (document.hidden && myTurn() && !was) document.title = '🎲 Your turn!';
      }
      document.addEventListener('visibilitychange', function () { if (!document.hidden) document.title = baseTitle; });

      function move(m) {
        if (busy || !myTurn()) return;
        busy = true;
        var rid = room.id;
        OCx.api('/api/rooms/' + rid + '/move', { method: 'POST', body: { move: m } })
          .then(function (r) { applyRoom(r); })
          .catch(function (e) { if (e.status === 409) fetchRoom(); else OCx.toast(e.message); })
          .then(function () { busy = false; if (!disposed && room && room.id === rid && room.game === 'memory') drawMemory(); });
      }

      function checkRematch() {
        if (checking || !room || room.status !== 'finished' || myIndex(room) < 0) return;
        checking = true;
        var rid = room.id;
        OCx.api('/api/rooms').then(function (rows) {
          if (disposed || !room || room.id !== rid) return;
          var found = null;
          rows.forEach(function (r) { if (r.status === 'waiting' && r.hostId !== OCx.me.id && r.game === room.game && r.id !== rid) found = r; });
          var changed = (found && found.id) !== (rematch && rematch.id);
          rematch = found;
          if (changed) drawActions(myIndex(room));
        }).catch(function () {}).then(function () { checking = false; });
      }

      /* go */
      OCx.loadMe().then(function () {
        if (disposed) return;
        if (c.arg && UUID.test(c.arg)) showRoom(c.arg.toLowerCase()); else showStart();
      }).catch(function (e) {
        wrap.textContent = "Couldn't load: " + (e && e.message ? e.message : 'unknown error');
      });
    };
  }

  /* ======================= arcade hooks ======================= */
  var installed = false;
  function install(GAMES) {
    if (installed) return;
    installed = true;
    Object.keys(META).reverse().forEach(function (k) {
      var m = META[k];
      GAMES.unshift({ id: m.id, title: m.title, emoji: m.emoji, tag: m.tag, cat: 'duo', blurb: m.blurb, col: m.col, fn: mpGame(k), best: null });
    });
    startInvites();
  }

  /* "Chaya started a game" banners at the top of the arcade lobby */
  function startInvites() {
    var host = document.getElementById('invites');
    if (!host) return;
    var lobbyView = document.getElementById('lobby-view');
    function check() {
      if (document.hidden || (lobbyView && lobbyView.hidden) || !window.OC || !window.OC.me) return;
      window.OC.api('/api/rooms').then(function (rows) {
        host.textContent = '';
        rows.forEach(function (r) {
          if (r.status !== 'waiting' || r.hostId === window.OC.me.id || !META[r.game]) return;
          var box = window.OC.el('div', 'mp-invite');
          box.appendChild(window.OC.avatar(window.OC.partner, 'sm'));
          box.appendChild(window.OC.el('div', 't', window.OC.nameOf(r.hostId) + ' wants to play ' + META[r.game].title.split(':')[0] + '!'));
          var a = window.OC.el('a', 'btn sm', 'Join');
          a.href = hashFor(r.game, r.id);
          box.appendChild(a);
          host.appendChild(box);
        });
      }).catch(function () {});
    }
    window.OC.loadMe().then(function () { check(); window.OC.poll(check, 5000); }).catch(function () {});
  }

  window.OCMulti = { install: install, meta: META, byId: BY_ID };
})();
