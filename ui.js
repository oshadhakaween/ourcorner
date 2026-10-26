/* =========================================================
   ui.js — menu, scroll reveal, 3D card tilt, active nav,
   and the draggable 3D photo carousel
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile menu ---------- */
  var toggle = doc.getElementById('menu-toggle');
  var mnav = doc.getElementById('mobile-nav');
  if (toggle && mnav) {
    var setMenu = function (open) {
      mnav.classList.toggle('open', open);
      toggle.textContent = open ? '✕' : '☰';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () { setMenu(!mnav.classList.contains('open')); });
    [].forEach.call(mnav.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    doc.addEventListener('pointerdown', function (e) {
      if (mnav.classList.contains('open') && !mnav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- scroll reveal ---------- */
  var reveals = [].slice.call(doc.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el, i) {
      if (el.classList.contains('timeline-node')) el.style.transitionDelay = ((i % 3) * 0.08) + 's';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- active nav link ---------- */
  var links = [].slice.call(doc.querySelectorAll('.main-nav a[href^="#"]'));
  var map = {};
  links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
  var secs = Object.keys(map).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
  if (secs.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { so.observe(s); });
  }

  /* ---------- 3D tilt (mouse devices only) ---------- */
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canHover && !reduce) {
    [].forEach.call(doc.querySelectorAll('[data-tilt]'), function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      var raf = 0, rx = 0, ry = 0;
      function apply() {
        raf = 0;
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 2 * max;
        rx = -(py - 0.5) * 2 * max;
        el.style.setProperty('--mx', (px * 100) + '%');
        el.style.setProperty('--my', (py * 100) + '%');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', function () {
        rx = 0; ry = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  }

  /* ---------- 3D photo carousel ---------- */
  var car = doc.getElementById('carousel');
  if (car) {
    var ring = car.querySelector('.ring');
    var cards = [].slice.call(ring.children);
    var n = cards.length;
    var step = 360 / n;
    var angle = 0, target = 0, radius = 0;
    var dragging = false, startX = 0, startTarget = 0, lastInteract = 0;
    var visible = true, raf2 = 0, frontIdx = -1;

    var layout = function () {
      var w = ring.offsetWidth;
      radius = Math.round(((w / 2) / Math.tan(Math.PI / Math.max(n, 3))) * 1.25) + 20;
      cards.forEach(function (c, i) {
        c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + radius + 'px)';
      });
    };
    var tick = function () {
      raf2 = 0;
      var now = performance.now();
      if (!dragging && !reduce && now - lastInteract > 2800) target -= 0.14;
      angle += (target - angle) * (dragging ? 0.35 : 0.09);
      ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateY(' + angle.toFixed(2) + 'deg)';
      var a = mod(-angle, 360);
      var idx = Math.round(a / step) % n;
      if (idx !== frontIdx) {
        if (cards[frontIdx]) cards[frontIdx].classList.remove('front');
        cards[idx].classList.add('front');
        frontIdx = idx;
      }
      if (visible) raf2 = requestAnimationFrame(tick);
    };
    var mod = function (a, m) { return ((a % m) + m) % m; };
    var snap = function () { target = Math.round(target / step) * step; };

    car.addEventListener('pointerdown', function (e) {
      dragging = true;
      startX = e.clientX;
      startTarget = target;
      lastInteract = performance.now();
      car.classList.add('dragging');
      try { car.setPointerCapture(e.pointerId); } catch (err) {}
    });
    car.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      target = startTarget + (e.clientX - startX) * 0.35;
      lastInteract = performance.now();
    });
    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      car.classList.remove('dragging');
      snap();
      lastInteract = performance.now();
    };
    car.addEventListener('pointerup', endDrag);
    car.addEventListener('pointercancel', endDrag);
    car.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { snap(); target += step; lastInteract = performance.now(); }
      if (e.key === 'ArrowRight') { snap(); target -= step; lastInteract = performance.now(); }
    });
    var prev = doc.querySelector('.car-prev');
    var next = doc.querySelector('.car-next');
    if (prev) prev.addEventListener('click', function () { snap(); target += step; lastInteract = performance.now(); });
    if (next) next.addEventListener('click', function () { snap(); target -= step; lastInteract = performance.now(); });

    window.addEventListener('resize', layout);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf2) raf2 = requestAnimationFrame(tick);
      }).observe(car);
    }
    layout();
    raf2 = requestAnimationFrame(tick);
  }
})();
