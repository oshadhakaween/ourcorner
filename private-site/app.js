/* =========================================================
   Shared helpers for the signed-in pages (chat, together, photos, arcade...)
   - OC.api()    talk to the server
   - profile chip in the header (you + your partner, sign out)
   - OC.live()   instant updates (Ably) with a safe fallback
   - OC.poll()   gentle refresh while the tab is visible
   ========================================================= */
(function () {
  'use strict';
  var OC = (window.OC = window.OC || {});
  var START = new Date('2026-04-12T00:00:00'); // together since (same date as the home page)

  /* ---------- small helpers ---------- */
  OC.$ = function (s, r) { return (r || document).querySelector(s); };
  OC.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };

  /* ---------- server calls ---------- */
  var reloaded = false;
  function sessionEnded() {
    // The 12 hour cookie ran out. Re-opening the page logs in again without typing anything
    // (or shows the login screen if you really are logged out).
    var last = 0;
    try { last = +sessionStorage.getItem('oc_reload') || 0; } catch (e) {}
    if (reloaded || Date.now() - last < 20000) { location.href = '/sign-in'; return; }
    reloaded = true;
    try { sessionStorage.setItem('oc_reload', String(Date.now())); } catch (e) {}
    location.reload();
  }

  OC.api = function (path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(path, init).then(function (r) {
      if (r.status === 401) { sessionEnded(); throw new Error('Please log in again'); }
      var ct = r.headers.get('content-type') || '';
      var read = ct.indexOf('json') >= 0 ? r.json() : r.text();
      return read.then(function (data) {
        if (!r.ok) {
          var err = new Error(typeof data === 'string' && data ? data : 'Something went wrong');
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  };

  /* ---------- who am I ---------- */
  var mePromise = null;
  OC.loadMe = function () {
    if (!mePromise) {
      mePromise = OC.api('/api/me').then(function (d) {
        OC.me = d.me;
        OC.partner = d.partner;
        return d;
      });
      mePromise.catch(function () { mePromise = null; });
    }
    return mePromise;
  };
  OC.partnerName = function () { return (OC.partner && OC.partner.name) || 'Your person'; };
  OC.nameOf = function (id) {
    if (OC.me && id === OC.me.id) return OC.me.name;
    if (OC.partner && id === OC.partner.id) return OC.partner.name;
    return OC.partnerName();
  };

  /* ---------- avatar + profile chip ---------- */
  function avatar(p, size) {
    var a = OC.el('span', 'oc-av' + (size ? ' ' + size : ''));
    var initial = ((p && p.name) || '?').trim().charAt(0).toUpperCase();
    if (p && p.imageUrl) {
      var img = new Image();
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = function () { img.remove(); a.textContent = initial; };
      img.src = p.imageUrl;
      a.appendChild(img);
    } else {
      a.textContent = initial;
    }
    return a;
  }
  OC.avatar = avatar;

  function daysTogether() {
    return Math.max(0, Math.floor((Date.now() - START.getTime()) / 86400000));
  }

  function person(p, label) {
    var row = OC.el('div', 'oc-person');
    row.appendChild(avatar(p, 'lg'));
    var txt = OC.el('div', 'oc-person-t');
    txt.appendChild(OC.el('b', '', p ? p.name : 'Waiting for them'));
    txt.appendChild(OC.el('small', '', p ? label : 'They have not logged in yet'));
    row.appendChild(txt);
    return row;
  }

  function renderWho(host, d) {
    host.textContent = '';
    var btn = OC.el('button', 'pill-ui oc-who-btn');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Your profile');
    btn.appendChild(avatar(d.me));
    btn.appendChild(OC.el('span', 'oc-who-name', d.me.name));

    var menu = OC.el('div', 'oc-who-menu');
    menu.setAttribute('role', 'menu');
    menu.appendChild(OC.el('div', 'oc-who-h', 'Signed in'));
    menu.appendChild(person(d.me, 'You'));
    menu.appendChild(person(d.partner, 'Your person 💞'));
    menu.appendChild(OC.el('div', 'oc-who-days', '💞 Together ' + daysTogether().toLocaleString() + ' days'));
    var out = OC.el('a', 'btn ghost sm oc-who-out', 'Sign out');
    out.href = '/sign-out';
    menu.appendChild(out);

    host.appendChild(btn);
    host.appendChild(menu);

    function close() { host.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !host.classList.contains('open');
      host.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('who');
    OC.loadMe().then(function (d) {
      if (host) renderWho(host, d);
      document.dispatchEvent(new CustomEvent('oc:me', { detail: d }));
    }).catch(function () { /* the rest of the page still works */ });
  });

  /* ---------- live updates ---------- */
  // Instant delivery through Ably when it is available. Every page ALSO polls
  // slowly as a backup, so nothing is ever missed if live updates are down.
  var ably = null;
  OC.live = function (channelName, onData) {
    if (!window.Ably) return function () {};
    try {
      if (!ably) ably = new window.Ably.Realtime({ authUrl: '/api/ably-token' });
      var ch = ably.channels.get(channelName);
      var fn = function (m) { try { onData(m.data); } catch (e) {} };
      ch.subscribe(fn);
      return function () { try { ch.unsubscribe(fn); } catch (e) {} };
    } catch (e) {
      return function () {};
    }
  };
  OC.liveState = function (cb) {
    if (!ably) return;
    ably.connection.on(function (c) { cb(c.current === 'connected'); });
    cb(ably.connection.state === 'connected');
  };

  OC.poll = function (fn, ms) {
    var t = null, stopped = false;
    function tick() {
      if (stopped) return;
      if (!document.hidden) { try { fn(); } catch (e) {} }
      t = setTimeout(tick, ms);
    }
    function wake() { if (!document.hidden && !stopped) { clearTimeout(t); tick(); } }
    document.addEventListener('visibilitychange', wake);
    t = setTimeout(tick, ms);
    return function () { stopped = true; clearTimeout(t); document.removeEventListener('visibilitychange', wake); };
  };

  /* ---------- tiny toast ---------- */
  var toastT = null;
  OC.toast = function (text) {
    var t = document.getElementById('oc-toast');
    if (!t) { t = OC.el('div'); t.id = 'oc-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  };
})();
