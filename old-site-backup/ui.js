/* =========================================================
   ui.js — shared behaviour: reveal, 3D tilt, tap hearts, envelopes
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
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

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

  /* ---------- tap hearts ---------- */
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
    if (e.target.closest('button,a,input,textarea,.env,.tframe,[data-noburst],canvas.game,.board,.stage-body,.sheet,.popup')) return;
    burst(e.clientX, e.clientY, 5);
  });

  /* ---------- letters / envelopes ---------- */
  $$('.env').forEach(function (env) {
    var toggle = function () {
      env.classList.toggle('open');
      env.setAttribute('aria-expanded', env.classList.contains('open') ? 'true' : 'false');
      if (env.classList.contains('open')) { var r = env.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 40, 7); }
    };
    env.addEventListener('click', toggle);
    env.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();
