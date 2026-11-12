/* =========================================================
   journey.js — the scroll engine for the DOM side of the story
   · progress line, chapter rail / pill, menu sheet
   · --t scrub variable for 3D-tilting cards
   · the 3D photo tunnel
   ========================================================= */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };

  /* ---------- menu sheet + smooth anchors ---------- */
  var menuBtn = $('#menu-btn');
  function setMenu(open) {
    doc.body.classList.toggle('menu-open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!doc.body.classList.contains('menu-open')); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1), el = id && doc.getElementById(id);
    if (!el) return;
    e.preventDefault(); setMenu(false);
    var y = el.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- chapters ---------- */
  var chapters = $$('[data-chapter]');
  var dots = $('#rail-dots'), pillName = $('#chap-name'), pillNo = $('#chap-no');
  if (dots) {
    dots.innerHTML = chapters.map(function (c, i) {
      return '<a href="#' + c.id + '" data-i="' + i + '" aria-label="' + c.getAttribute('data-chapter') + '"><span>' + c.getAttribute('data-chapter') + '</span><i></i></a>';
    }).join('');
  }
  var dotEls = dots ? $$('a', dots) : [];
  var curChapter = -1;

  /* ---------- scrub targets + tunnel ---------- */
  var scrubs = $$('[data-scrub]');
  var vault = $('#vault'), frames = vault ? $$('.tframe', vault) : [], vcount = $('#vault-count');
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; schedule(); });

  function tunnel() {
    var r = vault.getBoundingClientRect(), total = vault.offsetHeight - vh;
    if (r.bottom < -200 || r.top > vh + 200) return;
    var p = clamp(-r.top / Math.max(1, total), 0, 1), n = frames.length;
    var near = Math.round(p * (n - 1));
    frames.forEach(function (f, i) {
      var u = i - p * (n - 1), side = i % 2 ? 1 : -1, x, y, z, rot, op;
      if (u >= 0) { z = -u * 640; x = side * u * 95; y = -u * 22; rot = -side * u * 7; op = clamp(1 - u * 0.34, 0, 1); }
      else { var k = -u; z = k * 950; x = side * k * 640; y = -k * 50; rot = side * k * 32; op = clamp(1 - k * 1.7, 0, 1); }
      f.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg)';
      f.style.opacity = op.toFixed(3);
      f.style.zIndex = String(100 - Math.round(Math.abs(u) * 10));
      f.style.visibility = op <= 0.01 ? 'hidden' : 'visible';
    });
    if (vcount) vcount.innerHTML = '<b>' + (near + 1) + '</b> / ' + n;
  }

  /* ---------- the loop (only runs when scroll/resize happened) ---------- */
  var ticking = false;
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    var max = Math.max(1, doc.documentElement.scrollHeight - vh);
    var sp = clamp(window.pageYOffset / max, 0, 1);
    root.style.setProperty('--sp', sp.toFixed(4));

    for (var i = 0; i < scrubs.length; i++) {
      var r = scrubs[i].getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      var t = clamp((vh - r.top) / (vh + r.height), 0, 1);
      scrubs[i].style.setProperty('--t', t.toFixed(3));
    }
    if (vault) tunnel();

    var mid = vh * 0.5, idx = 0;
    for (var c = 0; c < chapters.length; c++) { if (chapters[c].getBoundingClientRect().top <= mid) idx = c; }
    if (idx !== curChapter) {
      curChapter = idx;
      dotEls.forEach(function (d, k) { d.classList.toggle('on', k === idx); });
      if (pillName && chapters[idx]) pillName.textContent = chapters[idx].getAttribute('data-chapter');
      if (pillNo) pillNo.textContent = String(idx + 1).padStart(2, '0');
    }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('load', schedule);
  schedule();
})();
