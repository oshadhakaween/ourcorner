/* =========================================================
   ui.js — shared behaviour: reveal, active nav, 3D tilt,
   tap hearts, story rail, swipeable photo deck, letters
   ========================================================= */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };

  /* ---------- scroll reveal ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* ---------- active nav (top bar + dock) ---------- */
  var links = $$('.nav a[href^="#"], .dock a[href^="#"]');
  var ids = {};
  links.forEach(function (l) { var id = l.getAttribute('href').slice(1); (ids[id] = ids[id] || []).push(l); });
  var secs = Object.keys(ids).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
  if (secs.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); });
        (ids[e.target.id] || []).forEach(function (l) { l.classList.add('active'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { so.observe(s); });
  }

  /* ---------- 3D tilt ---------- */
  if (canHover && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6, raf = 0, rx = 0, ry = 0;
      var apply = function () { raf = 0; el.style.setProperty('--rx', rx.toFixed(2) + 'deg'); el.style.setProperty('--ry', ry.toFixed(2) + 'deg'); };
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 2 * max; rx = -(py - 0.5) * 2 * max;
        el.style.setProperty('--mx', (px * 100) + '%'); el.style.setProperty('--my', (py * 100) + '%');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', function () { rx = 0; ry = 0; if (!raf) raf = requestAnimationFrame(apply); });
    });
  }

  /* ---------- tap hearts (DOM, works everywhere) ---------- */
  var faces = ['💗', '💖', '💕', '🌸', '✨', '🤍'];
  function burst(x, y, n) {
    if (reduce) return;
    for (var i = 0; i < n; i++) {
      var s = doc.createElement('span');
      s.className = 'tapheart';
      s.textContent = faces[Math.floor(Math.random() * faces.length)];
      var ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--x', (Math.cos(ang) * dist).toFixed(0) + 'px');
      s.style.setProperty('--y', (Math.sin(ang) * dist - 30).toFixed(0) + 'px');
      s.style.setProperty('--rot', ((Math.random() - 0.5) * 60).toFixed(0) + 'deg');
      s.style.setProperty('--d', (0.8 + Math.random() * 0.6).toFixed(2) + 's');
      doc.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 1500);
    }
  }
  window.OCburst = burst;
  doc.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button,a,input,textarea,.dcard,.rail,.env,[data-noburst],canvas.game,.board')) return;
    burst(e.clientX, e.clientY, 5);
  });

  /* ---------- story rail ---------- */
  $$('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail'), bar = wrap.querySelector('.bar i');
    var prev = wrap.querySelector('[data-prev]'), next = wrap.querySelector('[data-next]');
    var step = function () { var c = rail.querySelector('.chap'); return (c ? c.offsetWidth : 300) + 18; };
    var upd = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? rail.scrollLeft / max : 1;
      if (bar) bar.style.width = (12 + p * 88) + '%';
    };
    rail.addEventListener('scroll', upd, { passive: true }); upd(); window.addEventListener('resize', upd);
    if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
    /* mouse drag */
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; sx = e.clientX; sl = rail.scrollLeft; moved = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) rail.classList.add('drag');
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false; rail.classList.remove('drag');
    });
  });

  /* ---------- swipeable photo deck ---------- */
  var deck = doc.getElementById('deck');
  if (deck) {
    var cards = $$('.dcard', deck), order = cards.map(function (_, i) { return i; });
    var cnt = doc.getElementById('deck-count');
    var place = function () {
      order.forEach(function (ci, pos) {
        var c = cards[ci];
        c.classList.remove('drag');
        var vis = pos < 4;
        var rot = pos === 0 ? 0 : (pos % 2 ? 1 : -1) * (2 + pos * 1.6);
        c.style.transform = 'translate3d(' + (pos * (pos % 2 ? 10 : -10)) + 'px,' + (pos * 16) + 'px,' + (-pos * 50) + 'px) rotate(' + rot + 'deg) scale(' + (1 - pos * 0.045) + ')';
        c.style.zIndex = String(100 - pos);
        c.style.opacity = vis ? '1' : '0';
        c.style.pointerEvents = pos === 0 ? 'auto' : 'none';
      });
      if (cnt) cnt.textContent = (order[0] + 1) + ' / ' + cards.length;
    };
    var sendBack = function (dir) {
      var top = cards[order[0]];
      top.style.transition = 'transform .45s cubic-bezier(.4,0,.8,.4),opacity .4s';
      top.style.transform = 'translate3d(' + (dir * 520) + 'px,40px,0) rotate(' + (dir * 22) + 'deg)';
      top.style.opacity = '0';
      setTimeout(function () {
        order.push(order.shift());
        top.style.transition = 'none'; place();
        void top.offsetWidth; top.style.transition = '';
      }, 380);
    };
    var bringFront = function () { order.unshift(order.pop()); place(); };
    var drag = null;
    deck.addEventListener('pointerdown', function (e) {
      var top = cards[order[0]];
      if (!top.contains(e.target)) return;
      drag = { x: e.clientX, y: e.clientY, dx: 0 };
      top.classList.add('drag');
      try { deck.setPointerCapture(e.pointerId); } catch (er) {}
    });
    deck.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var top = cards[order[0]];
      drag.dx = e.clientX - drag.x; var dy = (e.clientY - drag.y) * 0.4;
      top.style.transform = 'translate3d(' + drag.dx + 'px,' + dy + 'px,0) rotate(' + (drag.dx * 0.06) + 'deg)';
    });
    var end = function () {
      if (!drag) return;
      var dx = drag.dx; drag = null;
      var top = cards[order[0]]; top.classList.remove('drag');
      if (Math.abs(dx) > 90) sendBack(dx > 0 ? 1 : -1); else place();
    };
    deck.addEventListener('pointerup', end); deck.addEventListener('pointercancel', end);
    var pb = doc.getElementById('deck-prev'), nb = doc.getElementById('deck-next');
    if (pb) pb.addEventListener('click', bringFront);
    if (nb) nb.addEventListener('click', function () { sendBack(1); });
    deck.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') sendBack(1); if (e.key === 'ArrowLeft') bringFront(); });
    place();
  }

  /* ---------- letters / envelopes ---------- */
  $$('.env').forEach(function (env) {
    var toggle = function () { env.classList.toggle('open'); if (env.classList.contains('open')) { var r = env.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 40, 7); } };
    env.addEventListener('click', toggle);
    env.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();
