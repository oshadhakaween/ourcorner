/* =========================================================
   games.js — the arcade. Eight games, one tiny framework.
   Each game: function(ctx) where ctx = { stage, pills(), best(), setBest(), onExit() }
   ========================================================= */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var buzz = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  var burst = function (x, y, n) { if (window.OCburst) window.OCburst(x, y, n); };
  var burstEl = function (el, n) { var r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n || 8); };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('oc_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('oc_' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ================= 1. TIC-TAC-TOE ================= */
  function ttt(c) {
    var diff = store.get('ttt_diff', 'hard');
    var sc = { you: 0, cpu: 0, draw: 0 };
    var SYM = { X: '💗', O: '🌸' };
    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var b, over, busy, humanFirst = false, timer;
    c.stage.innerHTML =
      '<div class="seg" id="seg"><button data-d="easy">Easy</button><button data-d="medium">Medium</button><button data-d="hard">Unbeatable</button></div>' +
      '<div class="msg" id="m"></div><div class="board" id="bd"></div>' +
      '<div class="scores"><div class="sc"><b id="s1">0</b><span>You 💗</span></div><div class="sc"><b id="s3">0</b><span>Draws</span></div><div class="sc"><b id="s2">0</b><span>Chaya-bot 🌸</span></div></div>' +
      '<button class="btn ghost sm" id="nr">New round</button>';
    var bd = $('#bd', c.stage), msg = $('#m', c.stage);
    for (var i = 0; i < 9; i++) { var cell = doc.createElement('button'); cell.className = 'cell'; cell.setAttribute('aria-label', 'cell ' + (i + 1)); cell.dataset.i = i; bd.appendChild(cell); }
    function winner(bb) {
      for (var k = 0; k < LINES.length; k++) { var l = LINES[k]; if (bb[l[0]] && bb[l[0]] === bb[l[1]] && bb[l[0]] === bb[l[2]]) return { p: bb[l[0]], line: l }; }
      return bb.every(Boolean) ? { p: 'd' } : null;
    }
    function minimax(bb, ai, d, al, be) {
      var w = winner(bb);
      if (w) return w.p === 'O' ? 10 - d : w.p === 'X' ? d - 10 : 0;
      var best = ai ? -99 : 99;
      for (var k = 0; k < 9; k++) {
        if (bb[k]) continue;
        bb[k] = ai ? 'O' : 'X';
        var v = minimax(bb, !ai, d + 1, al, be);
        bb[k] = '';
        if (ai) { best = Math.max(best, v); al = Math.max(al, v); } else { best = Math.min(best, v); be = Math.min(be, v); }
        if (be <= al) break;
      }
      return best;
    }
    function bestMove() {
      var bm = -1, bv = -99, opts = [];
      for (var k = 0; k < 9; k++) { if (b[k]) continue; b[k] = 'O'; var v = minimax(b, false, 1, -99, 99); b[k] = ''; if (v > bv) { bv = v; opts = [k]; } else if (v === bv) opts.push(k); }
      return pick(opts);
    }
    function cpuMove() {
      var free = []; for (var k = 0; k < 9; k++) if (!b[k]) free.push(k);
      var smart = diff === 'hard' ? 1 : diff === 'medium' ? 0.7 : 0.25;
      return Math.random() < smart ? bestMove() : pick(free);
    }
    function render() {
      $$('.cell', bd).forEach(function (el, k) {
        el.innerHTML = b[k] ? '<span class="mk">' + SYM[b[k]] + '</span>' : '';
        el.disabled = !!b[k] || over || busy;
      });
      $('#s1', c.stage).textContent = sc.you; $('#s2', c.stage).textContent = sc.cpu; $('#s3', c.stage).textContent = sc.draw;
      $$('#seg button', c.stage).forEach(function (x) { x.classList.toggle('on', x.dataset.d === diff); });
    }
    function check() {
      var w = winner(b); if (!w) return false;
      over = true;
      if (w.p === 'd') { sc.draw++; msg.textContent = 'A draw — we think alike 🤝'; }
      else {
        w.line.forEach(function (k) { $$('.cell', bd)[k].classList.add('win'); });
        if (w.p === 'X') { sc.you++; msg.textContent = 'You won! Of course you did 💖'; burstEl($$('.cell', bd)[w.line[1]], 14); buzz([20, 40, 20]); }
        else { sc.cpu++; msg.textContent = 'Chaya-bot wins this one 🌸'; }
      }
      render(); return true;
    }
    function cpuTurn() { busy = true; render(); timer = setTimeout(function () { var m = cpuMove(); b[m] = 'O'; busy = false; render(); check(); if (!over) msg.textContent = 'Your turn 💗'; }, 480); }
    function newRound() {
      clearTimeout(timer); b = Array(9).fill(''); over = false; busy = false; humanFirst = !humanFirst;
      msg.textContent = humanFirst ? 'You start 💗' : 'Chaya-bot starts…'; render();
      if (!humanFirst) cpuTurn();
    }
    bd.addEventListener('click', function (e) {
      var el = e.target.closest('.cell'); if (!el || over || busy) return;
      var i = +el.dataset.i; if (b[i]) return;
      b[i] = 'X'; buzz(8); render(); if (check()) return; msg.textContent = 'Thinking…'; cpuTurn();
    });
    $('#seg', c.stage).addEventListener('click', function (e) { var d = e.target.dataset.d; if (!d) return; diff = d; store.set('ttt_diff', d); render(); });
    $('#nr', c.stage).addEventListener('click', newRound);
    c.onExit(function () { clearTimeout(timer); });
    c.pills([['Mode', 'vs computer']]);
    newRound();
  }

  /* ================= 2. MEMORY MATCH ================= */
  function memory(c) {
    var LV = [{ cols: 4, pairs: 6, name: 'Cosy' }, { cols: 4, pairs: 8, name: 'Classic' }, { cols: 5, pairs: 10, name: 'Brainy' }];
    var POOL = ['💖', '🌸', '⭐', '🧸', '🌙', '🦋', '🍓', '☕', '🎀', '🍰'];
    var lv = 0, moves, secs, timer, first, lock, matched;
    c.stage.innerHTML = '<div class="seg" id="seg"></div><div class="mem" id="grid"></div>';
    var grid = $('#grid', c.stage), seg = $('#seg', c.stage);
    LV.forEach(function (l, i) { var bt = doc.createElement('button'); bt.textContent = l.name; bt.dataset.l = i; seg.appendChild(bt); });
    function pills() { c.pills([['Moves', moves], ['Time', secs + 's'], ['Best', c.best('mem' + lv) ? c.best('mem' + lv) + ' moves' : '—']]); }
    function start(i) {
      lv = i; clearInterval(timer); timer = null; moves = 0; secs = 0; first = null; lock = false; matched = 0;
      $$('button', seg).forEach(function (b, k) { b.classList.toggle('on', k === i); });
      var L = LV[i], cards = shuffle(POOL.slice(0, L.pairs).concat(POOL.slice(0, L.pairs)));
      grid.style.gridTemplateColumns = 'repeat(' + L.cols + ',1fr)';
      grid.innerHTML = cards.map(function (e, k) { return '<button class="mc" data-e="' + e + '" aria-label="card ' + (k + 1) + '"><span class="front">♥</span><span class="back">' + e + '</span></button>'; }).join('');
      pills();
      var ov = $('.overlay', c.stage); if (ov) ov.remove();
    }
    function finish() {
      clearInterval(timer);
      var p = LV[lv].pairs, stars = moves <= p + Math.ceil(p * 0.4) ? 3 : moves <= p * 2 ? 2 : 1;
      var bst = c.best('mem' + lv); if (!bst || moves < bst) c.setBest('mem' + lv, moves);
      pills();
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + '⭐'.repeat(stars) + '</div><h3>All matched!</h3><p>' + moves + ' moves in ' + secs + ' seconds.</p><div class="row"><button class="btn rose" id="again">Play again</button>' + (lv < 2 ? '<button class="btn" id="nxt">Next level →</button>' : '') + '</div>';
      c.stage.appendChild(ov);
      $('#again', ov).onclick = function () { start(lv); };
      var nx = $('#nxt', ov); if (nx) nx.onclick = function () { start(lv + 1); };
      burstEl(ov.querySelector('.big'), 18); buzz([30, 50, 30]);
    }
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.mc'); if (!card || lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
      if (!timer) timer = setInterval(function () { secs++; pills(); }, 1000);
      card.classList.add('flipped'); buzz(6);
      if (!first) { first = card; return; }
      moves++; pills(); var a = first, bcard = card; first = null;
      if (a.dataset.e === bcard.dataset.e) {
        a.classList.add('matched'); bcard.classList.add('matched'); matched++; burstEl(bcard, 5);
        if (matched === LV[lv].pairs) setTimeout(finish, 600);
      } else {
        lock = true;
        setTimeout(function () { a.classList.remove('flipped'); bcard.classList.remove('flipped'); lock = false; }, 800);
      }
    });
    seg.addEventListener('click', function (e) { var l = e.target.dataset.l; if (l !== undefined) start(+l); });
    c.onExit(function () { clearInterval(timer); });
    start(0);
  }

  /* ================= 3. BUBBLE POP ================= */
  function bubble(c) {
    c.stage.innerHTML = '<div class="field" id="f"><div class="combo" id="cb"></div></div><p class="small muted center">💗 +1 · ⭐ +5 · ⏱️ +3 sec · 💔 −3 (avoid!) · pop fast for combos</p>';
    var f = $('#f', c.stage), cb = $('#cb', c.stage);
    var score, left, combo, lastPop, spawnT, tickT, running = false;
    function pills() { c.pills([['Score', score || 0], ['Time', Math.max(0, Math.ceil(left || 0)) + 's'], ['Best', c.best('bub') || 0]]); }
    function overlay(title, text, btn) {
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<h3>' + title + '</h3><p>' + text + '</p><button class="btn rose" id="go">' + btn + '</button>';
      f.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
    }
    function float(x, y, t) { var s = doc.createElement('span'); s.className = 'float-txt'; s.textContent = t; s.style.left = x + 'px'; s.style.top = y + 'px'; f.appendChild(s); setTimeout(function () { s.remove(); }, 800); }
    function spawn() {
      if (!running) return;
      var size = rnd(54, 92), r = Math.random(), type = 'n', em = '', col = 'rgba(255,61,119,.38)';
      if (r < 0.06) { type = 'g'; em = '⭐'; col = 'rgba(255,190,40,.55)'; }
      else if (r < 0.11) { type = 't'; em = '⏱️'; col = 'rgba(59,140,240,.45)'; }
      else if (r < 0.2) { type = 'b'; em = '💔'; col = 'rgba(80,60,100,.5)'; }
      else { em = pick(['💗', '💖', '💕', '🌸']); col = pick(['rgba(255,61,119,.38)', 'rgba(138,107,255,.38)', 'rgba(59,140,240,.34)', 'rgba(37,168,100,.34)']); }
      var b = doc.createElement('button'); b.className = 'bub'; b.dataset.t = type; b.textContent = em; b.setAttribute('aria-label', 'bubble');
      b.style.width = b.style.height = size + 'px'; b.style.left = rnd(4, Math.max(8, f.clientWidth - size - 4)) + 'px';
      b.style.setProperty('--c', col); b.style.setProperty('--h', f.clientHeight + 'px');
      b.style.setProperty('--sw', rnd(-40, 40) + 'px'); b.style.setProperty('--t', rnd(3.6, 6.2) * (1 - Math.min(0.35, (score || 0) / 160)) + 's');
      b.style.fontSize = size * 0.38 + 'px';
      f.appendChild(b);
      b.addEventListener('animationend', function () { if (b.parentNode) { if (b.dataset.t === 'n' || b.dataset.t === 'g') combo = 0; b.remove(); } });
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (!running || b.dataset.popped) return; b.dataset.popped = 1;
        var now = performance.now(); combo = (now - lastPop < 1300) ? combo + 1 : 1; lastPop = now;
        var mult = 1 + Math.floor(combo / 5), pts = 1;
        if (type === 'g') pts = 5; if (type === 'b') { pts = -3; combo = 0; mult = 1; buzz(60); } if (type === 't') { left += 3; pts = 1; }
        score = Math.max(0, score + pts * mult);
        var rc = f.getBoundingClientRect();
        float(e.clientX - rc.left, e.clientY - rc.top, (pts * mult > 0 ? '+' : '') + pts * mult + (type === 't' ? ' ⏱️' : ''));
        if (type !== 'b') burst(e.clientX, e.clientY, type === 'g' ? 8 : 3); buzz(8);
        cb.textContent = combo >= 3 ? 'combo ×' + combo + (mult > 1 ? ' · ×' + mult + ' points!' : '') : ''; cb.classList.toggle('on', combo >= 3);
        b.remove(); pills();
      });
      spawnT = setTimeout(spawn, Math.max(260, 620 - (score || 0) * 4));
    }
    function start() {
      $$('.bub', f).forEach(function (x) { x.remove(); });
      score = 0; left = 30; combo = 0; lastPop = 0; running = true; cb.classList.remove('on'); pills();
      spawn();
      clearInterval(tickT); var t0 = performance.now(), l0 = 30;
      tickT = setInterval(function () {
        left -= 0.1; pills();
        if (left <= 0) end();
      }, 100);
    }
    function end() {
      running = false; clearInterval(tickT); clearTimeout(spawnT);
      $$('.bub', f).forEach(function (x) { x.remove(); });
      var nb = score > (c.best('bub') || 0); if (nb) c.setBest('bub', score); pills();
      overlay(nb ? 'New best! 🎉' : 'Time’s up!', 'You popped your way to <b>' + score + '</b> points.', 'Go again');
    }
    c.onExit(function () { running = false; clearInterval(tickT); clearTimeout(spawnT); });
    score = 0; left = 30; pills();
    overlay('Bubble Pop', 'Pop as many as you can in 30 seconds. Quick pops build combos!', 'Start');
  }

  /* ================= 4. POP-IT ================= */
  function popit(c) {
    var COLS = ['#ff7aa2', '#ffb36b', '#ffd45e', '#6fd49a', '#6bb6ff', '#a88bff'];
    var N = 42, popped = 0, ac = null, sound = store.get('pop_sound', true), total = store.get('pop_total', 0);
    c.stage.innerHTML = '<div class="row"><button class="btn ghost sm" id="snd"></button><button class="btn ghost sm" id="rs">Reset</button></div><div class="popit" id="pi"></div><p class="small muted center">Tap the bubbles. Press again to un-pop. Zero pressure, zero score.</p>';
    var pi = $('#pi', c.stage);
    for (var i = 0; i < N; i++) { var d = doc.createElement('button'); d.className = 'pdot'; d.style.setProperty('--c', COLS[(i % 6 + Math.floor(i / 6)) % 6]); d.setAttribute('aria-label', 'bubble'); pi.appendChild(d); }
    function pills() { c.pills([['Popped', popped + ' / ' + N], ['All-time', total]]); }
    function sndLabel() { $('#snd', c.stage).textContent = sound ? '🔊 Sound on' : '🔇 Sound off'; }
    function blip(up) {
      if (!sound) return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
        o.type = 'sine'; o.frequency.setValueAtTime((up ? 520 : 300) + Math.random() * 160, t); o.frequency.exponentialRampToValueAtTime(up ? 120 : 520, t + 0.09);
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.13);
      } catch (e) {}
    }
    pi.addEventListener('pointerdown', function (e) {
      var d = e.target.closest('.pdot'); if (!d) return;
      var off = d.classList.toggle('off');
      popped += off ? 1 : -1; if (off) { total++; store.set('pop_total', total); }
      blip(off); buzz(10); pills();
      if (popped === N) {
        var ov = doc.createElement('div'); ov.className = 'overlay';
        ov.innerHTML = '<div class="big">✨</div><h3>So satisfying!</h3><p>Every single one. Feel better?</p><button class="btn rose" id="again">Flip & pop again</button>';
        c.stage.appendChild(ov); burstEl(ov.querySelector('.big'), 16);
        $('#again', ov).onclick = function () { ov.remove(); reset(); };
      }
    });
    function reset() { $$('.pdot', pi).forEach(function (d) { d.classList.remove('off'); }); popped = 0; pills(); }
    $('#rs', c.stage).onclick = reset;
    $('#snd', c.stage).onclick = function () { sound = !sound; store.set('pop_sound', sound); sndLabel(); };
    c.onExit(function () { try { if (ac) ac.close(); } catch (e) {} });
    sndLabel(); pills();
  }

  /* ================= 5. HEART CATCHER ================= */
  function catcher(c) {
    c.stage.innerHTML = '<div class="hearts-row" id="lv"></div><canvas class="game" id="cv"></canvas><p class="small muted center">Slide to move the basket — catch 💗 🌹 💖, dodge 💔. Arrow keys work too.</p>';
    var cv = $('#cv', c.stage), g = cv.getContext('2d'), lvEl = $('#lv', c.stage);
    var W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      W = Math.min(520, c.stage.clientWidth - 8); H = Math.round(Math.min(W * 1.25, window.innerHeight * 0.62));
      cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); window.addEventListener('resize', size);
    var items, score, lives, bx, tx, last, spawnAcc, raf, state = 'idle', keys = {}, catchFx;
    function pills() { c.pills([['Score', score || 0], ['Best', c.best('cat') || 0]]); lvEl.textContent = state === 'idle' ? '' : '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives)); }
    function spawn() {
      var lvl = Math.min(1, score / 120), r = Math.random(), t = 'h', em = '💗', pts = 1;
      if (r < 0.1 + lvl * 0.14) { t = 'x'; em = '💔'; pts = 0; }
      else if (r < 0.2 + lvl * 0.14) { t = 'r'; em = '🌹'; pts = 3; }
      else if (r < 0.25 + lvl * 0.14) { t = 's'; em = '💖'; pts = 5; }
      items.push({ x: rnd(24, W - 24), y: -30, vy: rnd(120, 190) + score * 1.4, t: t, em: em, pts: pts, rot: rnd(-1, 1) });
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (state === 'play') {
        if (keys.ArrowLeft || keys.a) tx -= 420 * dt; if (keys.ArrowRight || keys.d) tx += 420 * dt;
        tx = Math.max(40, Math.min(W - 40, tx)); bx += (tx - bx) * Math.min(1, dt * 18);
        spawnAcc += dt; var gap = Math.max(0.3, 0.85 - score / 220);
        if (spawnAcc > gap) { spawnAcc = 0; spawn(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i]; it.y += it.vy * dt;
          var by = H - 46;
          if (it.y > by - 12 && it.y < by + 26 && Math.abs(it.x - bx) < 46) {
            if (it.t === 'x') { lives--; buzz(70); catchFx = { t: 0.25, c: 'rgba(80,60,100,.25)' }; }
            else { score += it.pts; buzz(8); catchFx = { t: 0.15, c: 'rgba(255,61,119,.12)' }; var rc = cv.getBoundingClientRect(); if (it.pts > 1) burst(rc.left + it.x, rc.top + it.y, 4); }
            items.splice(i, 1); pills();
            if (lives <= 0) { gameOver(); break; }
          } else if (it.y > H + 30) items.splice(i, 1);
        }
      }
      draw(dt);
    }
    function draw(dt) {
      g.clearRect(0, 0, W, H);
      if (catchFx && catchFx.t > 0) { g.fillStyle = catchFx.c; g.fillRect(0, 0, W, H); catchFx.t -= dt; }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      (items || []).forEach(function (it) { g.font = '30px serif'; g.fillText(it.em, it.x, it.y); });
      g.font = '54px serif'; g.fillText('🧺', bx || W / 2, H - 38);
    }
    function gameOver() {
      state = 'over';
      var nb = score > (c.best('cat') || 0); if (nb) c.setBest('cat', score); pills();
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + score + '</div><h3>' + (nb ? 'New best! 🎉' : 'Nicely caught!') + '</h3><p>' + (score > 40 ? 'Your reflexes are as sharp as your smile.' : 'Every heart counts. Try once more?') + '</p><button class="btn rose" id="go">Play again</button>';
      c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
    }
    function start() { items = []; score = 0; lives = 3; bx = tx = W / 2; spawnAcc = 0; state = 'play'; pills(); }
    function move(e) { var r = cv.getBoundingClientRect(); tx = (e.clientX - r.left) * (W / r.width); }
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerdown', move);
    var kd = function (e) { keys[e.key] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); }, ku = function (e) { keys[e.key] = false; };
    doc.addEventListener('keydown', kd); doc.addEventListener('keyup', ku);
    c.onExit(function () { cancelAnimationFrame(raf); window.removeEventListener('resize', size); doc.removeEventListener('keydown', kd); doc.removeEventListener('keyup', ku); });
    items = []; bx = tx = W / 2; last = performance.now(); raf = requestAnimationFrame(loop); pills();
    var ov = doc.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="big">🧺</div><h3>Heart Catcher</h3><p>Hearts are raining. Catch them all — but watch out for the broken ones.</p><button class="btn rose" id="go">Start</button>';
    c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
  }

  /* ================= 6. 2048 GARDEN ================= */
  function g2048(c) {
    var EM = { 2: '🌱', 4: '🌷', 8: '🌸', 16: '🌹', 32: '🧸', 64: '🎀', 128: '💌', 256: '💝', 512: '💖', 1024: '👑', 2048: '💍' };
    var BG = { 2: '#f2fbf4', 4: '#fff4f8', 8: '#ffe3ec', 16: '#ffd0df', 32: '#fff1cf', 64: '#ffe0b8', 128: '#e8e0ff', 256: '#d9ccff', 512: '#cfe5ff', 1024: '#c5ecd5', 2048: '#ffd36b' };
    c.stage.innerHTML = '<div class="row"><button class="btn ghost sm" id="nw">New garden</button></div><div class="g48" id="b"><div class="grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="tiles" id="t"></div></div><p class="small muted center">Swipe or use arrow keys. Merge matching flowers to grow 🌱 → 🌷 → 🌸 → … → 💍</p>';
    var tiles, nid, score, won, dead, boardEl = $('#b', c.stage), layer = $('#t', c.stage);
    function pills() { c.pills([['Score', score], ['Best', c.best('g48') || 0]]); }
    function at(r, cc) { for (var i = 0; i < tiles.length; i++) if (!tiles[i].gone && tiles[i].r === r && tiles[i].c === cc) return tiles[i]; return null; }
    function paint(t) {
      t.el.style.setProperty('--r', t.r); t.el.style.setProperty('--c', t.c); t.el.style.setProperty('--bgc', BG[t.v] || '#ffd36b');
      t.el.firstChild.innerHTML = (EM[t.v] || '👑') + '<small>' + t.v + '</small>';
    }
    function add(r, cc, v) {
      var el = doc.createElement('div'); el.className = 't48'; el.innerHTML = '<div class="in"></div>';
      var t = { id: nid++, r: r, c: cc, v: v, el: el }; layer.appendChild(el); paint(t); tiles.push(t); return t;
    }
    function spawn() {
      var free = []; for (var r = 0; r < 4; r++) for (var cc = 0; cc < 4; cc++) if (!at(r, cc)) free.push([r, cc]);
      if (!free.length) return; var p = pick(free); add(p[0], p[1], Math.random() < 0.9 ? 2 : 4);
    }
    function coords(dir, i, pos) { return dir === 3 ? [i, pos] : dir === 1 ? [i, 3 - pos] : dir === 0 ? [pos, i] : [3 - pos, i]; }
    function canMove() {
      if (tiles.filter(function (t) { return !t.gone; }).length < 16) return true;
      for (var r = 0; r < 4; r++) for (var cc = 0; cc < 4; cc++) { var t = at(r, cc), rr = at(r, cc + 1), dn = at(r + 1, cc); if ((rr && rr.v === t.v) || (dn && dn.v === t.v)) return true; }
      return false;
    }
    function move(dir) {
      if (dead) return; var moved = false;
      tiles.forEach(function (t) { t.el.classList.remove('merged'); });
      for (var i = 0; i < 4; i++) {
        var line = [];
        for (var j = 0; j < 4; j++) { var p = coords(dir, i, j), t = at(p[0], p[1]); if (t) line.push(t); }
        var pos = 0, k = 0;
        while (k < line.length) {
          var t1 = line[k], t2 = line[k + 1], dest = coords(dir, i, pos);
          if (t2 && t2.v === t1.v) {
            t1.v *= 2; score += t1.v; t2.gone = true; t2.r = dest[0]; t2.c = dest[1]; paint(t2);
            (function (x) { setTimeout(function () { x.el.remove(); }, 140); })(t2);
            t1.r = dest[0]; t1.c = dest[1]; t1.el.classList.add('merged'); t1.el.firstChild.style.animation = 'none'; void t1.el.offsetWidth; t1.el.firstChild.style.animation = '';
            paint(t1); moved = true; k += 2;
            if (t1.v === 2048 && !won) { won = true; setTimeout(winOverlay, 300); }
          } else { if (t1.r !== dest[0] || t1.c !== dest[1]) moved = true; t1.r = dest[0]; t1.c = dest[1]; paint(t1); k++; }
          pos++;
        }
      }
      tiles = tiles.filter(function (t) { return !t.gone; });
      if (moved) {
        buzz(6); setTimeout(function () { spawn(); if (!canMove()) lose(); }, 120);
        if (score > (c.best('g48') || 0)) c.setBest('g48', score);
        pills();
      }
    }
    function lose() {
      dead = true; var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + score + '</div><h3>Garden full 🌷</h3><p>Beautiful. Plant another one?</p><button class="btn rose" id="go">New garden</button>';
      c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); init(); };
    }
    function winOverlay() {
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">💍</div><h3>You made the ring!</h3><p>Okay, that was cheesy — but you did reach 2048.</p><button class="btn rose" id="go">Keep growing</button>';
      c.stage.appendChild(ov); burstEl(ov.querySelector('.big'), 20); $('#go', ov).onclick = function () { ov.remove(); };
    }
    function init() { layer.innerHTML = ''; tiles = []; nid = 1; score = 0; won = false; dead = false; spawn(); spawn(); pills(); }
    var kd = function (e) {
      var m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3 }[e.key];
      if (m === undefined) return; e.preventDefault(); move(m);
    };
    doc.addEventListener('keydown', kd);
    var sx, sy;
    boardEl.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    boardEl.addEventListener('pointerup', function (e) {
      if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    });
    $('#nw', c.stage).onclick = init;
    c.onExit(function () { doc.removeEventListener('keydown', kd); });
    init();
  }

  /* ================= 7. LOVE QUIZ ================= */
  function quiz(c) {
    var Q = [
      ['Where did Oshadha see you for the very first time?', ['Inside Keells', 'At a bus stand', 'On the mountain', 'At school'], 'He saw you first 😌'],
      ['Whose phone did you use for your very first text?', ['Your brother’s', 'Your friend’s', 'Your mom’s', 'A shop phone'], 'Who knew one text would go this far?'],
      ['Who said “I love you” first?', ['Oshadha', 'Chaya', 'Both at once', 'The teddy bear'], 'And he meant every word 💕'],
      ['On what date was that first “I love you”?', ['April 12', 'April 20', 'May 16', 'August 22'], 'April 20 — a date worth remembering.'],
      ['What did he do for you on the mountain?', ['Carried you down', 'Bought you a cake', 'Sang to you', 'Flew you home'], 'Mountains are easier with you in his arms.'],
      ['What was the first gift he ever gave to a girl?', ['A breathing teddy bear', 'A red rose', 'A watch', 'A necklace'], 'A teddy that breathes, just like you ask him to.'],
      ['What did he build to wish you a Happy Birthday?', ['His very first website', 'A paper boat', 'A song', 'A video game'], 'And look where that website is now ✨'],
      ['When is Chaya’s birthday?', ['May 16', 'April 20', 'August 22', 'July 29'], 'The best day of May 🎂'],
      ['What colour was the teddy he brought when you met again?', ['Red', 'Blue', 'Yellow', 'Green'], 'A red teddy for a red-hot ear pinch.'],
      ['What did you do to his ear that day?', ['Pinched it', 'Kissed it', 'Whispered into it', 'Nothing at all'], 'Ouch. Worth it 😂']
    ];
    var qs, idx, correct, locked;
    c.stage.innerHTML = '<div class="quiz" id="qz"></div>';
    var qz = $('#qz', c.stage);
    function pills() { c.pills([['Question', Math.min(idx + 1, qs.length) + ' / ' + qs.length], ['Score', correct], ['Best', (c.best('quiz') || 0) + ' / ' + Q.length]]); }
    function start() {
      qs = shuffle(Q).map(function (q) { return { q: q[0], o: shuffle(q[1].map(function (t, i) { return { t: t, ok: i === 0 }; })), f: q[2] }; });
      idx = 0; correct = 0; show();
    }
    function show() {
      if (idx >= qs.length) return end();
      var q = qs[idx]; locked = false;
      qz.innerHTML = '<div class="qbar"><i style="width:' + (idx / qs.length * 100) + '%"></i></div><div class="qq">' + q.q + '</div><div class="qopts">' +
        q.o.map(function (o, i) { return '<button class="qopt" data-i="' + i + '">' + o.t + '</button>'; }).join('') + '</div><div class="qfb" id="fb"></div><div class="row"><button class="btn" id="nx" hidden>Next →</button></div>';
      pills();
    }
    qz.addEventListener('click', function (e) {
      var b = e.target.closest('.qopt');
      if (b && !locked) {
        locked = true; var q = qs[idx], o = q.o[+b.dataset.i];
        $$('.qopt', qz).forEach(function (x) { x.disabled = true; if (q.o[+x.dataset.i].ok) x.classList.add('right'); });
        if (o.ok) { correct++; $('#fb', qz).textContent = q.f; burstEl(b, 8); buzz(15); } else { b.classList.add('wrong'); $('#fb', qz).textContent = 'Not quite — ' + q.f; }
        var nx = $('#nx', qz); nx.hidden = false; nx.textContent = idx === qs.length - 1 ? 'See result' : 'Next →'; pills();
      }
      if (e.target.id === 'nx') { idx++; show(); }
    });
    function end() {
      if (correct > (c.best('quiz') || 0)) c.setBest('quiz', correct);
      var msg = correct === Q.length ? 'Perfect. Our story lives in your heart. 💖' : correct >= 8 ? 'Almost perfect — you know us so well! 💕' : correct >= 5 ? 'Pretty good! A few memories to revisit 🥰' : 'Time for a little story-time together 🧸';
      qz.innerHTML = '<div class="qbar"><i style="width:100%"></i></div><div style="text-align:center;display:flex;flex-direction:column;gap:.8rem;align-items:center"><div class="big" style="font-family:var(--serif);font-size:5rem;line-height:1;color:var(--rose)">' + correct + '/' + Q.length + '</div><div class="qq">' + msg + '</div><button class="btn rose" id="re">Play again</button></div>';
      $('#re', qz).onclick = start; burstEl($('.big', qz), 16); pills();
    }
    start();
  }

  /* ================= 8. SCRATCH COUPONS ================= */
  function scratch(c) {
    var COUPONS = [['🫂', 'One long, tight hug'], ['🎬', 'Movie night — you pick'], ['🍦', 'Ice-cream date, on me'], ['💌', 'A handwritten love letter'], ['🎤', 'A voice note, just for you'], ['👂', 'One free ear pinch (no revenge)'], ['✨', 'Any small wish, granted'], ['🧸', 'Cuddles & cartoons evening'], ['🌹', 'A rose, delivered'], ['☕', 'A coffee date together']];
    var BG = ['#ffe9f0', '#e4f1ff', '#fff1cf', '#e2f6ea', '#ede7ff', '#ffe8dc'];
    c.stage.innerHTML = '<p class="msg">Scratch to reveal your coupons 🎟️</p><div class="scratch" id="sg"></div><button class="btn ghost sm" id="nw">New cards</button><p class="small muted center">Each coupon is a real promise. Screenshot your favourites.</p>';
    var sg = $('#sg', c.stage), opened;
    function pills() { c.pills([['Revealed', opened + ' / 6']]); }
    function make() {
      sg.innerHTML = ''; opened = 0; pills();
      shuffle(COUPONS).slice(0, 6).forEach(function (cp, i) {
        var card = doc.createElement('div'); card.className = 'sc-card'; card.style.setProperty('--bgc', BG[i % 6]);
        card.innerHTML = '<span class="em">' + cp[0] + '</span><b>' + cp[1] + '</b><canvas></canvas>'; sg.appendChild(card);
        var cv = card.querySelector('canvas'), w = card.clientWidth, h = card.clientHeight; cv.width = w; cv.height = h;
        var g = cv.getContext('2d', { willReadFrequently: true });
        var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#d9d4e2'); gr.addColorStop(.5, '#f3f0f8'); gr.addColorStop(1, '#c9c2d6');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,61,119,.5)'; g.font = '700 16px Plus Jakarta Sans, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('✨ scratch me', w / 2, h / 2); g.globalCompositeOperation = 'destination-out';
        var down = false, lx, ly;
        function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (w / r.width), (e.clientY - r.top) * (h / r.height)]; }
        cv.addEventListener('pointerdown', function (e) { down = true; var p = pt(e); lx = p[0]; ly = p[1]; try { cv.setPointerCapture(e.pointerId); } catch (er) {} dot(lx, ly); });
        function dot(x, y) { g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill(); }
        cv.addEventListener('pointermove', function (e) {
          if (!down) return; var p = pt(e); g.lineWidth = 40; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(p[0], p[1]); g.stroke(); lx = p[0]; ly = p[1];
        });
        function up() {
          if (!down) return; down = false; if (card.classList.contains('done')) return;
          var d = g.getImageData(0, 0, w, h).data, clear = 0, n = 0;
          for (var k = 3; k < d.length; k += 40) { n++; if (d[k] < 40) clear++; }
          if (clear / n > 0.5) { card.classList.add('done'); opened++; pills(); burstEl(card, 10); buzz(20); }
        }
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      });
    }
    $('#nw', c.stage).onclick = make;
    make();
  }

  /* ================= 9. SNAKE ================= */
  function snake(c) {
    c.stage.innerHTML = '<canvas class="game" id="cv" style="cursor:default"></canvas><p class="small muted center">Swipe or use arrow keys / WASD. Walls wrap around — no pressure 🐍</p>';
    var cv = $('#cv', c.stage), g = cv.getContext('2d'), N = 16, cell, W, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = Math.min(460, c.stage.clientWidth - 8); cell = Math.floor(W / N); W = cell * N; cv.style.width = W + 'px'; cv.style.height = W + 'px'; cv.width = W * dpr; cv.height = W * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    var body, dir, next, food, score, timer, state = 'idle', speed;
    function pills() { c.pills([['Score', score || 0], ['Best', c.best('snk') || 0]]); }
    function place() { var free = []; for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) if (!body.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y }); food = pick(free); }
    function start() { body = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]; dir = next = { x: 1, y: 0 }; score = 0; speed = 140; place(); state = 'play'; pills(); clearInterval(timer); timer = setInterval(tick, speed); }
    function tick() {
      dir = next; var h = body[0], nh = { x: (h.x + dir.x + N) % N, y: (h.y + dir.y + N) % N };
      if (body.some(function (s, i) { return i < body.length - 1 && s.x === nh.x && s.y === nh.y; })) return over();
      body.unshift(nh);
      if (nh.x === food.x && nh.y === food.y) { score++; buzz(8); if (score % 4 === 0 && speed > 70) { speed -= 10; clearInterval(timer); timer = setInterval(tick, speed); } place(); pills(); var r = cv.getBoundingClientRect(); burst(r.left + (nh.x + .5) * cell, r.top + (nh.y + .5) * cell, 3); }
      else body.pop();
      draw();
    }
    function over() {
      clearInterval(timer); state = 'over'; var nb = score > (c.best('snk') || 0); if (nb) c.setBest('snk', score); pills();
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + score + '</div><h3>' + (nb ? 'New best! 🎉' : 'Ssssso close!') + '</h3><p>Your snake ate ' + score + ' hearts.</p><button class="btn rose" id="go">Slither again</button>';
      c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
    }
    function draw() {
      g.clearRect(0, 0, W, W);
      for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) { g.fillStyle = (x + y) % 2 ? '#fff6f9' : '#fff'; g.fillRect(x * cell, y * cell, cell, cell); }
      if (food) { g.font = (cell * 0.86) + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💗', (food.x + .5) * cell, (food.y + .55) * cell); }
      if (!body) return;
      for (var i = body.length - 1; i >= 0; i--) {
        var s = body[i], k = 1 - i / (body.length + 6);
        g.fillStyle = i === 0 ? '#e01f66' : 'hsl(' + (340 - i * 3) + ',90%,' + (62 + (1 - k) * 18) + '%)';
        var pad = i === 0 ? 1 : 2.5; g.beginPath(); if (g.roundRect) g.roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.35); else g.rect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2); g.fill();
      }
      var h = body[0]; g.fillStyle = '#fff';
      var ex = dir.y ? cell * 0.24 : 0, ey = dir.x ? cell * 0.24 : 0, fx = dir.x * cell * 0.12, fy = dir.y * cell * 0.12;
      [[-1, -1], [1, 1]].forEach(function (o, idx) { var sx = idx ? 1 : -1; g.beginPath(); g.arc((h.x + .5) * cell + fx + (dir.y ? sx * ex : 0), (h.y + .5) * cell + fy + (dir.x ? sx * ey : 0), cell * 0.1, 0, 7); g.fill(); });
    }
    function turn(nx, ny) { if (state !== 'play') return; if (nx === -dir.x && ny === -dir.y) return; next = { x: nx, y: ny }; }
    var kd = function (e) { var m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key]; if (!m) return; e.preventDefault(); turn(m[0], m[1]); };
    doc.addEventListener('keydown', kd);
    var sx, sy;
    cv.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    cv.addEventListener('pointermove', function (e) {
      if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) { if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1); sx = e.clientX; sy = e.clientY; }
    });
    cv.addEventListener('pointerup', function () { sx = null; }); cv.addEventListener('pointercancel', function () { sx = null; });
    c.onExit(function () { clearInterval(timer); window.removeEventListener('resize', size); doc.removeEventListener('keydown', kd); });
    body = null; draw(); pills();
    var ov = doc.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="big">🐍</div><h3>Snake</h3><p>Eat the hearts, grow long, and don’t bite yourself.</p><button class="btn rose" id="go">Start</button>';
    c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
  }

  /* ================= 10. WHACK-A-TEDDY ================= */
  function whack(c) {
    c.stage.innerHTML = '<div class="holes" id="hs"></div><p class="small muted center">🧸 +1 · 💖 +3 · 💔 −2 (don’t!) · 30 seconds</p>';
    var hs = $('#hs', c.stage), holes = [], score, left, running = false, spawnT, tickT;
    for (var i = 0; i < 9; i++) { var h = doc.createElement('button'); h.className = 'hole'; h.setAttribute('aria-label', 'hole'); h.innerHTML = '<span class="m"></span>'; hs.appendChild(h); holes.push({ el: h, m: h.firstChild, busy: false, type: '', hide: 0 }); }
    function pills() { c.pills([['Score', score || 0], ['Time', Math.max(0, Math.ceil(left || 0)) + 's'], ['Best', c.best('whk') || 0]]); }
    function pop() {
      if (!running) return;
      var free = holes.filter(function (h) { return !h.busy; });
      if (free.length) {
        var h = pick(free), r = Math.random(); h.type = r < 0.14 ? 'x' : r < 0.26 ? 's' : 't';
        h.m.textContent = h.type === 'x' ? '💔' : h.type === 's' ? '💖' : '🧸'; h.busy = true; h.el.classList.add('up'); h.el.classList.remove('hit');
        h.hide = setTimeout(function () { down(h); }, Math.max(520, 1100 - (30 - left) * 18));
      }
      spawnT = setTimeout(pop, Math.max(260, 620 - (30 - left) * 10));
    }
    function down(h) { clearTimeout(h.hide); h.busy = false; h.el.classList.remove('up'); }
    hs.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.hole'); if (!el || !running) return; var h = holes.filter(function (x) { return x.el === el; })[0];
      if (!h.busy) return; var t = h.type; h.el.classList.add('hit'); down(h);
      score = Math.max(0, score + (t === 'x' ? -2 : t === 's' ? 3 : 1)); if (t === 'x') buzz(60); else { buzz(8); burstEl(el, t === 's' ? 6 : 3); } pills();
    });
    function start() { holes.forEach(function (h) { down(h); }); score = 0; left = 30; running = true; pills(); pop(); clearInterval(tickT); tickT = setInterval(function () { left -= 0.1; pills(); if (left <= 0) end(); }, 100); }
    function end() {
      running = false; clearInterval(tickT); clearTimeout(spawnT); holes.forEach(function (h) { down(h); });
      var nb = score > (c.best('whk') || 0); if (nb) c.setBest('whk', score); pills();
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + score + '</div><h3>' + (nb ? 'New best! 🎉' : 'Time’s up!') + '</h3><p>The teddies are exhausted.</p><button class="btn rose" id="go">Again</button>';
      c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
    }
    c.onExit(function () { running = false; clearInterval(tickT); clearTimeout(spawnT); holes.forEach(function (h) { clearTimeout(h.hide); }); });
    score = 0; left = 30; pills();
    var ov = doc.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="big">🧸</div><h3>Whack-a-Teddy</h3><p>Teddies pop out of the holes. Tap them fast — but leave the broken hearts alone.</p><button class="btn rose" id="go">Start</button>';
    c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); start(); };
  }

  /* ================= 11. HEART HOP (flappy) ================= */
  function hop(c) {
    c.stage.innerHTML = '<canvas class="game" id="cv" style="cursor:pointer"></canvas><p class="small muted center">Tap, click or press Space to flap. Glide through the gaps 💗</p>';
    var cv = $('#cv', c.stage), g = cv.getContext('2d'), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = Math.min(420, c.stage.clientWidth - 8); H = Math.round(Math.min(W * 1.35, window.innerHeight * 0.66)); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    var y, vy, pipes, score, state = 'idle', spawn, last, raf, clouds = [], tt = 0;
    for (var i = 0; i < 4; i++) clouds.push({ x: Math.random() * 400, y: 30 + Math.random() * 200, s: 0.6 + Math.random() * 0.8 });
    function pills() { c.pills([['Score', score || 0], ['Best', c.best('hop') || 0]]); }
    function reset() { y = H * 0.45; vy = 0; pipes = []; score = 0; spawn = 0.9; state = 'play'; pills(); }
    function flap() { if (state === 'play') { vy = -H * 0.72; buzz(6); } }
    function loop(now) {
      raf = requestAnimationFrame(loop); var dt = Math.min(0.04, (now - last) / 1000); last = now; tt += dt;
      var gap = H * 0.28, pw = W * 0.17, sp = W * 0.4, r = W * 0.045, x = W * 0.28;
      clouds.forEach(function (cl) { cl.x -= 10 * cl.s * dt; if (cl.x < -80) cl.x = W + 40; });
      if (state === 'play') {
        vy += H * 2.3 * dt; y += vy * dt; spawn -= dt;
        if (spawn <= 0) { spawn = 1.5; pipes.push({ x: W + 10, top: H * 0.12 + Math.random() * (H * 0.76 - gap - H * 0.1), passed: false }); }
        pipes.forEach(function (p) { p.x -= sp * dt; if (!p.passed && p.x + pw < x - r) { p.passed = true; score++; pills(); } });
        pipes = pipes.filter(function (p) { return p.x > -pw - 10; });
        var dead = y - r < 0 || y + r > H - H * 0.06;
        pipes.forEach(function (p) { if (x + r * 0.8 > p.x && x - r * 0.8 < p.x + pw && (y - r * 0.8 < p.top || y + r * 0.8 > p.top + gap)) dead = true; });
        if (dead) over();
      }
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#e2f0ff'); sky.addColorStop(1, '#fff'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.font = '38px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; clouds.forEach(function (cl) { g.globalAlpha = 0.8; g.fillText('☁️', cl.x, cl.y); }); g.globalAlpha = 1;
      pipes.forEach(function (p) {
        var gr = g.createLinearGradient(p.x, 0, p.x + pw, 0); gr.addColorStop(0, '#ff9dbb'); gr.addColorStop(1, '#ff5d8f'); g.fillStyle = gr;
        g.beginPath(); g.rect(p.x, -4, pw, p.top + 4); g.rect(p.x, p.top + gap, pw, H); g.fill();
        g.fillStyle = '#e01f66'; g.fillRect(p.x - 4, p.top - 14, pw + 8, 14); g.fillRect(p.x - 4, p.top + gap, pw + 8, 14);
      });
      g.fillStyle = '#ffe8f0'; g.fillRect(0, H - H * 0.06, W, H * 0.06);
      var rot = state === 'play' ? Math.max(-0.5, Math.min(0.9, vy / (H * 1.2))) : Math.sin(tt * 3) * 0.1;
      var yy = state === 'idle' ? H * 0.45 + Math.sin(tt * 3) * 6 : y;
      g.save(); g.translate(x, yy); g.rotate(rot); g.font = (r * 2.4) + 'px serif'; g.fillText('💗', 0, 2); g.restore();
    }
    function over() {
      state = 'over'; buzz(60); var nb = score > (c.best('hop') || 0); if (nb) c.setBest('hop', score); pills();
      var ov = doc.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="big">' + score + '</div><h3>' + (nb ? 'New best! 🎉' : 'Bonk!') + '</h3><p>' + (score > 9 ? 'That was graceful.' : 'The pipes came out of nowhere.') + '</p><button class="btn rose" id="go">Hop again</button>';
      c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); reset(); };
    }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); flap(); });
    var kd = function (e) { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); } };
    doc.addEventListener('keydown', kd);
    c.onExit(function () { cancelAnimationFrame(raf); window.removeEventListener('resize', size); doc.removeEventListener('keydown', kd); });
    pipes = []; y = H * 0.45; last = performance.now(); raf = requestAnimationFrame(loop); pills();
    var ov = doc.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="big">💗</div><h3>Heart Hop</h3><p>Keep the heart flying through the gaps. One tap = one flap.</p><button class="btn rose" id="go">Start</button>';
    c.stage.appendChild(ov); $('#go', ov).onclick = function () { ov.remove(); reset(); };
  }

  /* ================= 12. SIMON HEARTS ================= */
  function simon(c) {
    c.stage.innerHTML = '<div class="msg" id="m">Watch the pattern…</div><div class="simon" id="sm"><button class="spad" data-i="0">💗</button><button class="spad" data-i="1">🌸</button><button class="spad" data-i="2">⭐</button><button class="spad" data-i="3">🍀</button></div><button class="btn rose" id="st">Start</button>';
    var sm = $('#sm', c.stage), msg = $('#m', c.stage), st = $('#st', c.stage);
    var seq = [], pos = 0, state = 'idle', tms = [], ac = null, FREQ = [392, 523, 659, 784];
    function pills() { c.pills([['Round', seq.length], ['Best', c.best('sim') || 0]]); }
    function tone(i) {
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); var o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime; o.type = 'triangle'; o.frequency.value = FREQ[i]; gn.gain.setValueAtTime(0.2, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + 0.36); } catch (e) {}
    }
    function flash(i, ms) { var p = sm.children[i]; p.classList.add('lit'); tone(i); tms.push(setTimeout(function () { p.classList.remove('lit'); }, ms || 300)); }
    function later(f, ms) { tms.push(setTimeout(f, ms)); }
    function round() {
      seq.push(Math.floor(Math.random() * 4)); state = 'show'; msg.textContent = 'Watch…'; pills();
      var sp = Math.max(340, 640 - seq.length * 22);
      seq.forEach(function (v, k) { later(function () { flash(v, sp * 0.65); }, 700 + k * sp); });
      later(function () { state = 'play'; pos = 0; msg.textContent = 'Your turn 💕'; }, 700 + seq.length * sp);
    }
    function lose() {
      state = 'idle'; var sc = seq.length - 1, nb = sc > (c.best('sim') || 0); if (nb) c.setBest('sim', sc);
      msg.textContent = (nb ? 'New best! ' : 'Oops! ') + 'You reached round ' + sc + '.'; st.hidden = false; st.textContent = 'Try again'; seq = []; pills(); buzz(60);
    }
    sm.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.spad'); if (!b || state !== 'play') return; var i = +b.dataset.i; flash(i, 200); buzz(6);
      if (i !== seq[pos]) return lose();
      pos++;
      if (pos === seq.length) { state = 'wait'; msg.textContent = 'Nice! ✨'; burstEl(b, 5); later(round, 900); }
    });
    st.onclick = function () { st.hidden = true; seq = []; round(); };
    c.onExit(function () { tms.forEach(clearTimeout); try { if (ac) ac.close(); } catch (e) {} });
    msg.textContent = 'Repeat the pattern. It gets longer each round.'; pills();
  }

  /* ================= 13. SLIDE PUZZLE ================= */
  function slide(c) {
    var EM = ['🌸', '🍓', '🧸', '🌙', '🦋', '⭐', '☕', '🎀', '🍰', '💖', '🌷', '🫧', '🍀', '🐰', '🍒'];
    var n = 3, grid, tiles, moves, secs, timer, size;
    c.stage.innerHTML = '<div class="seg" id="sz"><button data-n="3">3 × 3</button><button data-n="4">4 × 4</button></div><div class="slide" id="bd"></div><button class="btn ghost sm" id="sh">Shuffle</button><p class="small muted center">Slide the tiles back into order: 1, 2, 3 …</p>';
    var bd = $('#bd', c.stage);
    function pills() { c.pills([['Moves', moves], ['Time', secs + 's'], ['Best', c.best('sld' + n) ? c.best('sld' + n) + ' moves' : '—']]); }
    function build(k) {
      n = k; clearInterval(timer); timer = null; moves = 0; secs = 0; bd.innerHTML = ''; bd.style.setProperty('--n', n);
      $$('#sz button', c.stage).forEach(function (b) { b.classList.toggle('on', +b.dataset.n === n); });
      grid = []; tiles = {};
      for (var r = 0; r < n; r++) { grid.push([]); for (var cc = 0; cc < n; cc++) grid[r].push(r * n + cc + 1 === n * n ? 0 : r * n + cc + 1); }
      for (var v = 1; v < n * n; v++) { var el = doc.createElement('button'); el.className = 't15'; el.dataset.v = v; el.innerHTML = EM[(v - 1) % EM.length] + '<small>' + v + '</small>'; bd.appendChild(el); tiles[v] = el; }
      var er = n - 1, ec = n - 1, last = null;
      for (var s = 0; s < n * n * 24; s++) {
        var opts = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(function (d) { var nr = er + d[0], nc = ec + d[1]; return nr >= 0 && nr < n && nc >= 0 && nc < n && !(last && d[0] === -last[0] && d[1] === -last[1]); });
        var d = pick(opts); grid[er][ec] = grid[er + d[0]][ec + d[1]]; grid[er + d[0]][ec + d[1]] = 0; er += d[0]; ec += d[1]; last = d;
      }
      if (solved()) return build(k);
      paint(); pills();
      var ov = $('.overlay', c.stage); if (ov) ov.remove();
    }
    function paint() { for (var r = 0; r < n; r++) for (var cc = 0; cc < n; cc++) { var v = grid[r][cc]; if (v) { tiles[v].style.setProperty('--r', r); tiles[v].style.setProperty('--c', cc); tiles[v].classList.toggle('ok', v === r * n + cc + 1); } } }
    function solved() { for (var r = 0; r < n; r++) for (var cc = 0; cc < n; cc++) { var want = r * n + cc + 1 === n * n ? 0 : r * n + cc + 1; if (grid[r][cc] !== want) return false; } return true; }
    bd.addEventListener('click', function (e) {
      var el = e.target.closest('.t15'); if (!el) return; var v = +el.dataset.v, r0, c0, er, ec;
      for (var r = 0; r < n; r++) for (var cc = 0; cc < n; cc++) { if (grid[r][cc] === v) { r0 = r; c0 = cc; } if (grid[r][cc] === 0) { er = r; ec = cc; } }
      /* slide a whole row/column toward the gap, like a real puzzle */
      if (r0 === er && c0 !== ec) { var st = ec > c0 ? -1 : 1; for (var k = ec; k !== c0; k += st) grid[r0][k] = grid[r0][k + st]; grid[r0][c0] = 0; }
      else if (c0 === ec && r0 !== er) { var st2 = er > r0 ? -1 : 1; for (var k2 = er; k2 !== r0; k2 += st2) grid[k2][c0] = grid[k2 + st2][c0]; grid[r0][c0] = 0; }
      else return;
      moves++; buzz(6); if (!timer) timer = setInterval(function () { secs++; pills(); }, 1000); paint(); pills();
      if (solved()) {
        clearInterval(timer); var b = c.best('sld' + n); if (!b || moves < b) c.setBest('sld' + n, moves); pills();
        var ov = doc.createElement('div'); ov.className = 'overlay';
        ov.innerHTML = '<div class="big">🧩</div><h3>Solved!</h3><p>' + moves + ' moves in ' + secs + ' seconds.</p><button class="btn rose" id="go">Play again</button>';
        c.stage.appendChild(ov); burstEl(ov.querySelector('.big'), 16); $('#go', ov).onclick = function () { build(n); };
      }
    });
    $('#sz', c.stage).onclick = function (e) { var k = e.target.dataset.n; if (k) build(+k); };
    $('#sh', c.stage).onclick = function () { build(n); };
    c.onExit(function () { clearInterval(timer); });
    build(3);
  }

  /* ================= 14. WHEEL OF DATES ================= */
  function wheel(c) {
    var OPT = [['🍦', 'Ice-cream'], ['🎬', 'Movie night'], ['🚲', 'Little ride'], ['☕', 'Coffee date'], ['🌙', 'Stargazing call'], ['🍕', 'Pizza night'], ['🎮', 'Game duel'], ['💌', 'Love letter']];
    var COL = ['#ffe8f0', '#e2f0ff', '#fff0cc', '#dff6ea', '#ece6ff', '#ffe6d8', '#ffd9e6', '#d6ebff'];
    var seg = 360 / OPT.length, rot = 0, spinning = false, count = store.get('wheel_n', 0);
    c.stage.innerHTML = '<div class="wheel-wrap"><div class="wheel-ptr">▼</div><div class="wheel" id="wh"></div><div class="wheel-hub">💖</div></div><div class="msg" id="m">What shall we do next?</div><button class="btn rose" id="sp">Spin the wheel</button>';
    var wh = $('#wh', c.stage), msg = $('#m', c.stage);
    wh.style.background = 'conic-gradient(' + COL.map(function (col, i) { return col + ' ' + i * seg + 'deg ' + (i + 1) * seg + 'deg'; }).join(',') + ')';
    function lay() { var R = wh.clientWidth * 0.34; wh.innerHTML = OPT.map(function (o, i) { return '<div class="wl" style="transform:translate(-50%,-50%) rotate(' + ((i + 0.5) * seg) + 'deg) translateY(-' + R + 'px)"><span>' + o[0] + '</span><small>' + o[1] + '</small></div>'; }).join(''); }
    lay(); window.addEventListener('resize', lay);
    function pills() { c.pills([['Spins', count]]); }
    $('#sp', c.stage).onclick = function () {
      if (spinning) return; spinning = true; msg.textContent = '…';
      rot += 1440 + Math.floor(Math.random() * 360); wh.style.transform = 'rotate(' + rot + 'deg)';
      setTimeout(function () {
        spinning = false; var idx = Math.floor((((360 - (rot % 360)) % 360)) / seg) % OPT.length;
        count++; store.set('wheel_n', count); pills(); msg.textContent = OPT[idx][0] + ' ' + OPT[idx][1] + '!'; burstEl(msg, 12); buzz([20, 30, 20]);
      }, 4300);
    };
    c.onExit(function () { window.removeEventListener('resize', lay); });
    pills();
  }

  /* ================= 15. FORTUNE COOKIE ================= */
  function cookie(c) {
    var MSG = ['You are the best thing that ever happened to my Mondays.', 'A hug is on its way to you. Brace yourself.', 'Today you will smile at least once because of me.', 'You are braver than you think and softer than you know.', 'Someone is thinking about you right now. (Hi, it’s me.)', 'Your future holds many cartoons, snacks and cuddles.', 'Drink some water. Then drink a little more.', 'You are allowed to rest. The world can wait.', 'You will win the next pinch war. Probably.', 'Good things come to those who text back first.', 'The universe says: you are loved, deeply and loudly.', 'Your smile is a legally registered weapon.', 'You are doing better than you think, love.', 'A red teddy knows all your secrets.', 'Tonight’s forecast: stars, and me missing you.', 'You are my favourite notification.', 'Breathe in, breathe out. I am right here.', 'Many more chapters await. Turn the page together.'];
    var n = store.get('cookie_n', 0), cracked = false;
    c.stage.innerHTML = '<div class="msg" id="m">Tap the cookie to crack it open</div><button class="cookie" id="ck" aria-label="Fortune cookie">🥠</button><div class="slip" id="sl"></div><button class="btn ghost sm" id="nx" hidden>Another cookie</button>';
    var ck = $('#ck', c.stage), sl = $('#sl', c.stage), msg = $('#m', c.stage), nx = $('#nx', c.stage);
    function pills() { c.pills([['Opened', n]]); }
    ck.onclick = function () {
      if (cracked) return; cracked = true; ck.classList.add('crack'); buzz([15, 30, 15]);
      setTimeout(function () { ck.classList.remove('crack'); ck.classList.add('open'); sl.textContent = '“' + pick(MSG) + '”'; sl.classList.add('show'); msg.textContent = 'Your fortune ✨'; n++; store.set('cookie_n', n); pills(); nx.hidden = false; burstEl(sl, 10); }, 650);
    };
    nx.onclick = function () { cracked = false; ck.classList.remove('open'); sl.classList.remove('show'); nx.hidden = true; msg.textContent = 'Tap the cookie to crack it open'; };
    pills();
  }

  /* ================= 16. QUICK TAP (reaction) ================= */
  function quick(c) {
    var state = 'idle', t0, tm, times = [];
    c.stage.innerHTML = '<button class="qt idle" id="qt"><b>Tap to start</b><span>When it turns green, tap as fast as you can</span></button><div class="row" id="hist"></div>';
    var qt = $('#qt', c.stage), hist = $('#hist', c.stage);
    function pills() { var avg = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0; c.pills([['Last', times.length ? times[times.length - 1] + ' ms' : '—'], ['Average', avg ? avg + ' ms' : '—'], ['Best', c.best('qt') ? c.best('qt') + ' ms' : '—']]); }
    function set(cls, b, s) { qt.className = 'qt ' + cls; qt.innerHTML = '<b>' + b + '</b><span>' + s + '</span>'; }
    qt.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (state === 'idle') { state = 'wait'; set('wait', 'Wait for green…', 'Don’t tap yet!'); tm = setTimeout(function () { state = 'go'; t0 = performance.now(); set('go', 'TAP!', ''); }, 1200 + Math.random() * 2800); }
      else if (state === 'wait') { clearTimeout(tm); state = 'idle'; set('early', 'Too soon! 😅', 'Tap to try again'); buzz(40); }
      else if (state === 'go') {
        var ms = Math.round(performance.now() - t0); state = 'idle'; times.push(ms); if (times.length > 5) times.shift();
        var nb = !c.best('qt') || ms < c.best('qt'); if (nb) c.setBest('qt', ms);
        set('idle', ms + ' ms', (ms < 220 ? 'Lightning ⚡' : ms < 300 ? 'Quick! 🐇' : ms < 450 ? 'Nice 🙂' : 'Sleepy… ☕') + ' · tap to go again'); pills(); burstEl(qt, 4); buzz(10);
        hist.innerHTML = times.map(function (t) { return '<span class="pill"><b>' + t + '</b> ms</span>'; }).join('');
      }
    });
    c.onExit(function () { clearTimeout(tm); });
    pills();
  }

  /* ================= registry + shell ================= */
  var GAMES = [
    { id: 'ttt', title: 'Tic-Tac-Toe', emoji: '⭕', tag: 'Classic', cat: 'brain', blurb: 'Three levels, up to an unbeatable computer.', col: 'rose', fn: ttt, best: null },
    { id: 'memory', title: 'Memory Match', emoji: '🃏', tag: 'Chill', cat: 'chill brain', blurb: '3 levels of 3D flip cards with stars.', col: 'sky', fn: memory, best: function () { return c0('mem0') ? 'Best: ' + c0('mem0') + ' moves' : ''; } },
    { id: 'bubble', title: 'Bubble Pop', emoji: '🫧', tag: 'Quick', cat: 'quick', blurb: 'Combos, golden stars and sneaky broken hearts.', col: 'lilac', fn: bubble, best: function () { return c0('bub') ? 'Best: ' + c0('bub') : ''; } },
    { id: 'popit', title: 'Pop-It', emoji: '🔴', tag: 'Relax', cat: 'chill', blurb: 'Endless, satisfying popping with sound.', col: 'peach', fn: popit, best: function () { return store.get('pop_total', 0) ? store.get('pop_total', 0) + ' popped ever' : ''; } },
    { id: 'catcher', title: 'Heart Catcher', emoji: '🧺', tag: 'Reflex', cat: 'quick', blurb: 'Catch falling hearts. Dodge the broken ones.', col: 'butter', fn: catcher, best: function () { return c0('cat') ? 'Best: ' + c0('cat') : ''; } },
    { id: 'garden', title: '2048 Garden', emoji: '🌷', tag: 'Brainy', cat: 'brain chill', blurb: 'Merge seedlings into roses… and a ring.', col: 'mint', fn: g2048, best: function () { return c0('g48') ? 'Best: ' + c0('g48') : ''; } },
    { id: 'quiz', title: 'Love Quiz', emoji: '💌', tag: 'Us', cat: 'us', blurb: 'How well do you know our story?', col: 'rose', fn: quiz, best: function () { return c0('quiz') ? 'Best: ' + c0('quiz') + ' / 10' : ''; } },
    { id: 'scratch', title: 'Scratch Coupons', emoji: '🎟️', tag: 'Surprise', cat: 'us chill', blurb: 'Scratch six cards to win little promises.', col: 'sky', fn: scratch, best: null },
    { id: 'snake', title: 'Snake', emoji: '🐍', tag: 'Classic', cat: 'quick', blurb: 'Eat hearts, grow long. Walls wrap around.', col: 'mint', fn: snake, best: function () { return c0('snk') ? 'Best: ' + c0('snk') : ''; } },
    { id: 'whack', title: 'Whack-a-Teddy', emoji: '🧸', tag: 'Quick', cat: 'quick', blurb: 'Teddies pop up. Whack them, spare the 💔.', col: 'peach', fn: whack, best: function () { return c0('whk') ? 'Best: ' + c0('whk') : ''; } },
    { id: 'hop', title: 'Heart Hop', emoji: '💗', tag: 'Reflex', cat: 'quick', blurb: 'Tap to flap a heart through the gaps.', col: 'lilac', fn: hop, best: function () { return c0('hop') ? 'Best: ' + c0('hop') : ''; } },
    { id: 'simon', title: 'Heart Echo', emoji: '🎹', tag: 'Memory', cat: 'brain', blurb: 'Repeat the growing light-and-sound pattern.', col: 'butter', fn: simon, best: function () { return c0('sim') ? 'Best: round ' + c0('sim') : ''; } },
    { id: 'slide', title: 'Slide Puzzle', emoji: '🧩', tag: 'Brainy', cat: 'brain chill', blurb: 'Slide the emoji tiles back into order.', col: 'sky', fn: slide, best: function () { return c0('sld3') ? 'Best: ' + c0('sld3') + ' moves' : ''; } },
    { id: 'wheel', title: 'Wheel of Dates', emoji: '🎡', tag: 'Us', cat: 'us chill', blurb: 'Can’t decide what to do? Spin for a date idea.', col: 'rose', fn: wheel, best: function () { return store.get('wheel_n', 0) ? store.get('wheel_n', 0) + ' spins' : ''; } },
    { id: 'cookie', title: 'Fortune Cookie', emoji: '🥠', tag: 'Us', cat: 'us chill', blurb: 'Crack one open for a tiny love note.', col: 'butter', fn: cookie, best: function () { return store.get('cookie_n', 0) ? store.get('cookie_n', 0) + ' opened' : ''; } },
    { id: 'quick', title: 'Quick Tap', emoji: '⚡', tag: 'Reflex', cat: 'quick', blurb: 'How fast are your fingers? Tap on green.', col: 'mint', fn: quick, best: function () { return c0('qt') ? 'Best: ' + c0('qt') + ' ms' : ''; } }
  ];
  function c0(k) { return store.get('best_' + k, 0); }

  var lobbyView = $('#lobby-view'), stageView = $('#stage-view'), stage = $('#stage'), exits = [];
  var lobby = $('#lobby');
  var filter = 'all';
  function renderLobby() {
    var list = GAMES.filter(function (g) { return filter === 'all' || (' ' + g.cat + ' ').indexOf(' ' + filter + ' ') > -1; });
    lobby.innerHTML = list.map(function (g) {
      var b = g.best ? g.best() : '';
      return '<button class="gcard reveal" data-tilt="8" data-id="' + g.id + '" data-c="' + g.col + '"><span class="art">' + g.emoji + '</span><span class="tag">' + g.tag + '</span><h3>' + g.title + '</h3><p>' + g.blurb + '</p><span class="best">' + (b || 'Tap to play →') + '</span></button>';
    }).join('');
    $$('.gcard', lobby).forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 60 + 'ms'; setTimeout(function () { el.classList.add('in'); }, 30); });
    $$('#filters button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === filter); });
    var cnt = $('#count'); if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' game' : ' games');
    tiltInit();
  }
  /* tiny tilt (ui.js ran before the cards existed) */
  function tiltInit() {
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    $$('.gcard', lobby).forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - .5) * 16).toFixed(1) + 'deg'); el.style.setProperty('--rx', (-(py - .5) * 16).toFixed(1) + 'deg');
        el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  function open(id) {
    var g = GAMES.filter(function (x) { return x.id === id; })[0];
    if (!g) return close();
    exits.forEach(function (f) { try { f(); } catch (e) {} }); exits = [];
    lobbyView.hidden = true; stageView.hidden = false;
    $('#stage-title').textContent = g.emoji + ' ' + g.title;
    stage.innerHTML = '';
    var ctx = {
      stage: stage,
      pills: function (arr) { $('#stage-score').innerHTML = arr.map(function (p) { return '<span class="pill">' + p[0] + ' <b>' + p[1] + '</b></span>'; }).join(''); },
      best: function (k) { return store.get('best_' + k, 0); },
      setBest: function (k, v) { store.set('best_' + k, v); },
      onExit: function (f) { exits.push(f); }
    };
    window.scrollTo(0, 0);
    g.fn(ctx);
  }
  function close() {
    exits.forEach(function (f) { try { f(); } catch (e) {} }); exits = [];
    stage.innerHTML = ''; stageView.hidden = true; lobbyView.hidden = false; renderLobby();
  }
  function route() { var id = location.hash.slice(1); if (id) open(id); else close(); }

  var fb = $('#filters'); if (fb) fb.addEventListener('click', function (e) { var f = e.target.dataset.f; if (f) { filter = f; renderLobby(); } });
  lobby.addEventListener('click', function (e) { var el = e.target.closest('.gcard'); if (el) location.hash = el.dataset.id; });
  $('#back').addEventListener('click', function () { history.pushState('', doc.title, location.pathname + location.search); route(); });
  $('#surprise').addEventListener('click', function () { location.hash = pick(GAMES).id; });
  window.addEventListener('hashchange', route);
  route();
})();
