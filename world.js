/* =========================================================
   world.js — one fixed 3D world, the camera flies through it as you scroll.
   Nine stops (one per <section data-stage>): heart · time ring · mountain ·
   teddy · breathing orb · envelope · book · dice · final heart.
   Three.js r128. If anything fails the page falls back to emoji (no-3d).
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var canvas = document.getElementById('world');
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE = window.THREE;
  if (!THREE) { root.classList.add('no-3d'); return; }

  try { init(); } catch (err) {
    if (window.console) console.warn('3D world disabled:', err);
    root.classList.add('no-3d');
  }

  function init() {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.6 : 2));
    renderer.setClearColor(0x000000, 0);

    var STEP = 10;                              /* distance between stops along -z */
    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 10, 27);
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

    /* ---------- lights ---------- */
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffd6e4, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.95); sun.position.set(-4, 7, 6); scene.add(sun);
    var rimA = new THREE.PointLight(0xffa3c4, 0.8, 60); scene.add(rimA);
    var rimB = new THREE.PointLight(0xb9a4ff, 0.6, 60); scene.add(rimB);

    /* ---------- helpers ---------- */
    function std(color, rough, extra) {
      var o = { color: color, roughness: rough == null ? 0.5 : rough };
      if (extra) for (var k in extra) o[k] = extra[k];
      return new THREE.MeshStandardMaterial(o);
    }
    function gloss(color, extra) {
      var o = { color: color, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 };
      if (extra) for (var k in extra) o[k] = extra[k];
      return new THREE.MeshPhysicalMaterial(o);
    }
    function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
    function radial(stops) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    function heartShape() {
      var s = new THREE.Shape();
      s.moveTo(0, -1.05);
      s.bezierCurveTo(-0.25, -0.8, -1.15, -0.25, -1.15, 0.35);
      s.bezierCurveTo(-1.15, 0.95, -0.4, 1.2, 0, 0.7);
      s.bezierCurveTo(0.4, 1.2, 1.15, 0.95, 1.15, 0.35);
      s.bezierCurveTo(1.15, -0.25, 0.25, -0.8, 0, -1.05);
      return s;
    }
    function heartGeo(depth, bevel) {
      var g = new THREE.ExtrudeGeometry(heartShape(), { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 8, curveSegments: 32 });
      g.center(); g.computeVertexNormals(); return g;
    }
    var bigHeart = heartGeo(0.45, 0.28), miniHeart = heartGeo(0.22, 0.14);
    var shadowTex = radial([[0, 'rgba(120,60,140,.22)'], [1, 'rgba(120,60,140,0)']]);

    /* each stop is a Group + an update(t, local, prox) function */
    var stops = [];
    function addStop(group, update, floorY) {
      var i = stops.length;
      var sh = mesh(new THREE.PlaneGeometry(5, 1.7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), 0, (floorY == null ? -2.3 : floorY), 0);
      sh.rotation.x = -Math.PI / 2 + 0.2;
      var holder = new THREE.Group();
      holder.position.set(0, 0, -i * STEP);
      holder.add(group); holder.add(sh);
      scene.add(holder);
      stops.push({ holder: holder, g: group, update: update, shadow: sh });
    }

    /* ---------- 0 · big glossy heart + pearl satellites ---------- */
    (function () {
      var g = new THREE.Group();
      var h = mesh(bigHeart, gloss(0xff4a85, { emissive: 0x7a0b32, emissiveIntensity: 0.12 })); h.scale.setScalar(1.45); g.add(h);
      var pal = [0xffffff, 0xffd1df, 0xe3d9ff, 0xcfe6ff, 0xfff0c8, 0xffc2d4, 0xd9f2e3], sats = [];
      var n = window.innerWidth < 700 ? 5 : 8;
      for (var i = 0; i < n; i++) {
        var sc = 0.26 + (i % 3) * 0.09;
        var m = mesh(miniHeart, gloss(pal[i % pal.length])); m.scale.setScalar(sc); g.add(m);
        sats.push({ m: m, a: i / n * Math.PI * 2, r: 2.7 + (i % 3) * 0.4, y: ((i % 4) - 1.5) * 0.8, sp: 0.2 + (i % 3) * 0.06, ph: i * 1.7 });
      }
      addStop(g, function (t, local) {
        var beat = 1 + Math.pow(Math.max(0, Math.sin(t * 2.6)), 12) * 0.07;
        h.scale.setScalar(1.45 * beat); h.rotation.y = Math.sin(t * 0.6) * 0.3 + local * 2.4; h.rotation.x = Math.sin(t * 0.45) * 0.08;
        sats.forEach(function (s) {
          var a = s.a + t * s.sp + local * 1.5;
          s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 0.9 + s.ph) * 0.18, Math.sin(a) * s.r * 0.55);
          s.m.rotation.y = a * 1.2;
        });
      });
    })();

    /* ---------- 1 · time ring with real clock hands ---------- */
    (function () {
      var g = new THREE.Group();
      var ring = mesh(new THREE.TorusGeometry(1.75, 0.16, 28, 120), gloss(0xff6b9c)); g.add(ring);
      var ring2 = mesh(new THREE.TorusGeometry(1.2, 0.05, 16, 100), gloss(0xb9a4ff)); g.add(ring2);
      var marks = new THREE.Group(); g.add(marks);
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2, big = i % 3 === 0;
        var m = mesh(new THREE.SphereGeometry(big ? 0.12 : 0.07, 16, 12), gloss(big ? 0xffffff : 0xffd1df), Math.sin(a) * 1.75, Math.cos(a) * 1.75, 0.0);
        marks.add(m);
      }
      var hubH = mesh(miniHeart, gloss(0xff4a85)); hubH.scale.setScalar(0.34); g.add(hubH);
      var hourPivot = new THREE.Group(), minPivot = new THREE.Group(), secPivot = new THREE.Group();
      var hour = mesh(new THREE.BoxGeometry(0.12, 0.8, 0.08), gloss(0x2a2236), 0, 0.4, 0.05); hourPivot.add(hour);
      var min = mesh(new THREE.BoxGeometry(0.09, 1.25, 0.06), gloss(0x2a2236), 0, 0.62, 0.08); minPivot.add(min);
      var sec = mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), gloss(0xff3d7f), 0, 0.55, 0.1); secPivot.add(sec);
      g.add(hourPivot); g.add(minPivot); g.add(secPivot);
      var orbs = [];
      for (var k = 0; k < 6; k++) { var o = mesh(miniHeart, gloss(k % 2 ? 0xffc2d4 : 0xe3d9ff)); o.scale.setScalar(0.2); g.add(o); orbs.push({ m: o, a: k / 6 * 6.283 }); }
      g.scale.setScalar(1.05);
      addStop(g, function (t, local) {
        var d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, mi = d.getMinutes() + s / 60, h = (d.getHours() % 12) + mi / 60;
        secPivot.rotation.z = -s / 60 * 6.283; minPivot.rotation.z = -mi / 60 * 6.283; hourPivot.rotation.z = -h / 12 * 6.283;
        g.rotation.y = Math.sin(t * 0.5) * 0.35 + local * 1.6; g.rotation.x = -0.15 + Math.sin(t * 0.4) * 0.05;
        ring2.rotation.z = t * 0.3;
        orbs.forEach(function (o) { var a = o.a + t * 0.5; o.m.position.set(Math.cos(a) * 2.35, Math.sin(a) * 2.35, Math.sin(a * 2) * 0.3); o.m.rotation.y = t + o.a; });
      });
    })();

    /* ---------- 2 · low-poly mountain (the hike) ---------- */
    (function () {
      var g = new THREE.Group();
      function cone(r, h, x, y, z, color) { var c = mesh(new THREE.ConeGeometry(r, h, 6), std(color, 0.7, { flatShading: true }), x, y, z); g.add(c); return c; }
      cone(1.7, 3.2, 0, 0.2, 0, 0x9b87ff);
      cone(1.2, 2.2, -1.65, -0.3, 0.4, 0xff8fb0);
      cone(1.0, 1.6, 1.55, -0.6, 0.5, 0x7fd8b0);
      cone(0.56, 1.0, 0, 1.3, 0, 0xffffff);
      var pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), std(0x2a2236), 0, 2.2, 0); g.add(pole);
      var flag = mesh(new THREE.PlaneGeometry(0.42, 0.26), std(0xff3d7f, 0.6, { side: THREE.DoubleSide }), 0.22, 2.42, 0); g.add(flag);
      var base = mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.14, 48), std(0xfff3f7, 0.9), 0, -1.45, 0); g.add(base);
      var clouds = [];
      for (var i = 0; i < 4; i++) {
        var c = new THREE.Group();
        for (var j = 0; j < 3; j++) c.add(mesh(new THREE.SphereGeometry(0.3 + j * 0.05, 16, 12), std(0xffffff, 1), (j - 1) * 0.35, j === 1 ? 0.12 : 0, 0));
        c.userData = { a: i / 4 * 6.283, r: 3.1 + (i % 2) * 0.5, y: 1.2 + (i % 3) * 0.55 };
        g.add(c); clouds.push(c);
      }
      var sunB = mesh(new THREE.SphereGeometry(0.3, 24, 16), std(0xffd36b, 0.4, { emissive: 0xffb300, emissiveIntensity: 0.5 }), 2.4, 2.4, -1); g.add(sunB);
      g.scale.setScalar(0.95);
      addStop(g, function (t, local) {
        g.rotation.y = local * 3.2 + Math.sin(t * 0.3) * 0.2; g.rotation.x = 0.12;
        flag.rotation.y = Math.sin(t * 3) * 0.35;
        clouds.forEach(function (c) { var a = c.userData.a + t * 0.12; c.position.set(Math.cos(a) * c.userData.r, c.userData.y + Math.sin(t + a) * 0.08, Math.sin(a) * c.userData.r); });
        sunB.position.y = 2.4 + Math.sin(t * 0.8) * 0.12;
      }, -2.05);
    })();

    /* ---------- 3 · teddy bear (breathes) ---------- */
    (function () {
      var g = new THREE.Group(), fur = std(0xe9b98c, 0.9), light = std(0xf8dfc4, 0.9), dark = std(0x2a1d24, 0.35), red = gloss(0xff3d5a);
      function sph(r, x, y, z, mat, sx, sy, sz) { var s = mesh(new THREE.SphereGeometry(r, 28, 20), mat, x, y, z); s.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); g.add(s); return s; }
      var body = sph(1, 0, -0.6, 0, fur, 1, 1.1, 0.92);
      sph(0.62, 0, -0.55, 0.66, light, 1, 1, 0.5);
      var head = new THREE.Group(); head.position.y = 0.92; g.add(head);
      function hs(r, x, y, z, mat, sx, sy, sz) { var s = mesh(new THREE.SphereGeometry(r, 28, 20), mat, x, y, z); s.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); head.add(s); return s; }
      hs(0.84, 0, 0, 0, fur);
      hs(0.3, -0.62, 0.7, 0, fur); hs(0.3, 0.62, 0.7, 0, fur);
      hs(0.17, -0.62, 0.7, 0.14, light); hs(0.17, 0.62, 0.7, 0.14, light);
      hs(0.34, 0, -0.14, 0.68, light, 1, 0.8, 0.8);
      hs(0.1, 0, -0.02, 0.98, dark);
      hs(0.09, -0.3, 0.16, 0.72, dark); hs(0.09, 0.3, 0.16, 0.72, dark);
      var armL = sph(0.3, -1.02, -0.3, 0.2, fur, 1, 1.5, 1), armR = sph(0.3, 1.02, -0.3, 0.2, fur, 1, 1.5, 1);
      armL.rotation.z = -0.5; armR.rotation.z = 0.5;
      sph(0.42, -0.6, -1.55, 0.35, fur, 1, 0.9, 1.2); sph(0.42, 0.6, -1.55, 0.35, fur, 1, 0.9, 1.2);
      var scarf = mesh(new THREE.TorusGeometry(0.64, 0.14, 16, 40), red, 0, 0.18, 0); scarf.rotation.x = Math.PI / 2; g.add(scarf);
      var hx = mesh(miniHeart, gloss(0xff3d7f), 0.0, -0.45, 0.98); hx.scale.setScalar(0.22); g.add(hx);
      g.position.y = -0.15; g.scale.setScalar(0.82);
      addStop(g, function (t, local) {
        var b = 1 + Math.sin(t * 1.1) * 0.035;
        body.scale.set(b, 1.1 * b, 0.92 * b); hx.scale.setScalar(0.22 * (1 + Math.sin(t * 1.1) * 0.12));
        head.rotation.z = Math.sin(t * 0.7) * 0.07; head.rotation.y = Math.sin(t * 0.5) * 0.2;
        armL.rotation.z = -0.5 - Math.sin(t * 1.3) * 0.12; armR.rotation.z = 0.5 + Math.sin(t * 1.3 + 1) * 0.12;
        g.rotation.y = local * 2.8 + Math.sin(t * 0.4) * 0.25;
      });
    })();

    /* ---------- 4 · iridescent breathing orb ---------- */
    var breathState = { box: null, scale: 1 };
    (function () {
      var g = new THREE.Group();
      var shell = mesh(new THREE.SphereGeometry(1.45, 48, 32), gloss(0xffc9de, { transparent: true, opacity: 0.62 })); g.add(shell);
      var core = mesh(new THREE.SphereGeometry(0.85, 32, 24), std(0xff5a8f, 0.3, { emissive: 0xff2d70, emissiveIntensity: 0.35, transparent: true, opacity: 0.9 })); g.add(core);
      var bubbles = [], bc = [0xffffff, 0xe3d9ff, 0xcfe6ff, 0xffd1df];
      var n = window.innerWidth < 700 ? 12 : 20;
      for (var i = 0; i < n; i++) {
        var r = 0.08 + (i % 4) * 0.045;
        var b = mesh(new THREE.SphereGeometry(r, 16, 12), gloss(bc[i % 4], { transparent: true, opacity: 0.85 })); g.add(b);
        bubbles.push({ m: b, a: Math.random() * 6.283, r: 2.0 + Math.random() * 1.4, y: (Math.random() - 0.5) * 3.2, sp: 0.15 + Math.random() * 0.3 });
      }
      addStop(g, function (t, local, prox, dt) {
        if (!breathState.box) breathState.box = document.getElementById('breath-box');
        var cl = breathState.box ? breathState.box.classList : null;
        var target = cl && cl.contains('inhale') ? 1.35 : cl && cl.contains('exhale') ? 0.85 : 1 + Math.sin(t * 0.8) * 0.04;
        breathState.scale += (target - breathState.scale) * Math.min(1, dt * 0.9);
        shell.scale.setScalar(breathState.scale); core.scale.setScalar(0.9 + (breathState.scale - 1) * 0.6);
        shell.rotation.y = t * 0.2; g.rotation.y = local * 1.5;
        bubbles.forEach(function (b) { var a = b.a + t * b.sp; b.m.position.set(Math.cos(a) * b.r * breathState.scale, b.y + Math.sin(t * 0.8 + b.a) * 0.2, Math.sin(a) * b.r * breathState.scale); });
      });
    })();

    /* ---------- 5 · envelope with rising hearts ---------- */
    (function () {
      var g = new THREE.Group();
      var body = mesh(new THREE.BoxGeometry(2.8, 1.8, 0.16), std(0xffffff, 0.5), 0, 0, 0); g.add(body);
      var paper = mesh(new THREE.PlaneGeometry(2.4, 1.4), std(0xfffafc, 0.9), 0, 0.2, 0.085); g.add(paper);
      for (var i = 0; i < 4; i++) g.add(mesh(new THREE.PlaneGeometry(1.6 - (i % 2) * 0.4, 0.05), std(0xffc2d4, 1), -0.2 + (i % 2) * -0.2, 0.55 - i * 0.22, 0.09));
      var fs = new THREE.Shape(); fs.moveTo(-1.4, 0.9); fs.lineTo(1.4, 0.9); fs.lineTo(0, -0.15); fs.lineTo(-1.4, 0.9);
      var flapPivot = new THREE.Group(); flapPivot.position.set(0, 0.9, 0.1); g.add(flapPivot);
      var flap = mesh(new THREE.ShapeGeometry(fs), std(0xffd0e0, 0.6, { side: THREE.DoubleSide }), 0, -0.9, 0); flapPivot.add(flap);
      var seal = mesh(miniHeart, gloss(0xe01f66), 0, -0.12, 0.2); seal.scale.setScalar(0.24); flapPivot.add(seal); seal.position.y = -1.0;
      var rise = [];
      for (var k = 0; k < 7; k++) { var m = mesh(miniHeart, gloss(k % 2 ? 0xff4a85 : 0xffc2d4)); m.scale.setScalar(0.18 + (k % 3) * 0.05); g.add(m); rise.push({ m: m, off: k / 7, x: (Math.random() - 0.5) * 2.2 }); }
      g.rotation.x = -0.1;
      addStop(g, function (t, local, prox) {
        var open = Math.min(1, Math.max(0, (prox - 0.35) / 0.5));
        flapPivot.rotation.x = open * -Math.PI * 0.92;
        paper.position.y = 0.2 + open * 0.55 + Math.sin(t) * 0.03; paper.scale.set(1, 1 + open * 0.08, 1);
        g.rotation.y = local * 2.2 + Math.sin(t * 0.5) * 0.2;
        rise.forEach(function (r) { var p = (t * 0.18 + r.off) % 1; r.m.position.set(r.x * (0.4 + p), 0.6 + p * 3.2, 0.3 + Math.sin(p * 8 + r.off * 9) * 0.3); r.m.scale.setScalar((0.16 + (r.off * 3 % 1) * 0.12) * Math.sin(p * Math.PI) * open); r.m.rotation.y = t + r.off * 5; });
      });
    })();

    /* ---------- 6 · storybook ---------- */
    (function () {
      var g = new THREE.Group();
      var coverM = gloss(0xff6b9c), pageM = std(0xfff6e8, 0.9);
      function half(dir) {
        var p = new THREE.Group(); p.position.x = 0;
        p.add(mesh(new THREE.BoxGeometry(2.0, 2.8, 0.1), coverM, dir * 1.0, 0, -0.12));
        p.add(mesh(new THREE.BoxGeometry(1.88, 2.66, 0.2), pageM, dir * 0.98, 0, -0.01));
        return p;
      }
      var L = half(-1), R = half(1); g.add(L); g.add(R);
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 12), coverM, 0, 0, -0.1));
      var star = mesh(miniHeart, gloss(0xffc247), 1.0, 0.2, 0.15); star.scale.setScalar(0.4); R.add(star);
      var lines = [];
      for (var i = 0; i < 6; i++) { var ln = mesh(new THREE.PlaneGeometry(1.2 - (i % 3) * 0.2, 0.05), std(0xd9c9b4, 1), -1.0, 0.9 - i * 0.22, 0.11); L.add(ln); lines.push(ln); }
      var sparks = [];
      for (var k = 0; k < 8; k++) { var s = mesh(new THREE.OctahedronGeometry(0.07), gloss(0xffc247)); g.add(s); sparks.push({ m: s, a: k / 8 * 6.283, y: Math.random() * 2 }); }
      g.scale.setScalar(0.95);
      addStop(g, function (t, local, prox) {
        var open = 0.35 + Math.min(1, prox) * 0.45 + Math.sin(t * 0.8) * 0.03;
        L.rotation.y = open; R.rotation.y = -open;
        g.rotation.y = local * 2.0 + Math.sin(t * 0.4) * 0.15; g.rotation.x = -0.2;
        star.rotation.z = t;
        sparks.forEach(function (s) { var a = s.a + t * 0.6; s.m.position.set(Math.cos(a) * 2.2, s.y - 1 + Math.sin(t + s.a) * 0.2, Math.sin(a) * 1.0 + 0.4); s.m.rotation.set(t, t * 1.3, 0); });
      });
    })();

    /* ---------- 7 · dice (the arcade) ---------- */
    (function () {
      var g = new THREE.Group();
      function faceTex(emoji, bg) {
        var c = document.createElement('canvas'); c.width = c.height = 192;
        var x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 192, 192);
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '110px serif'; x.fillText(emoji, 96, 104);
        var tx = new THREE.CanvasTexture(c); return tx;
      }
      var sets = [
        [['🎮', '#ffe8f0'], ['💖', '#fff0cc'], ['🌸', '#e2f0ff'], ['⭐', '#ece6ff'], ['🧸', '#dff6ea'], ['🫧', '#ffe6d8']],
        [['🎲', '#e2f0ff'], ['🍓', '#ffe8f0'], ['🦋', '#ece6ff'], ['🌙', '#fff0cc'], ['☕', '#ffe6d8'], ['🎀', '#dff6ea']],
        [['💌', '#ffe6d8'], ['🌷', '#dff6ea'], ['🎟️', '#fff0cc'], ['🔴', '#ece6ff'], ['🧺', '#e2f0ff'], ['🍰', '#ffe8f0']]
      ];
      var cubes = [];
      var pos = [[-1.6, 0.3, 0.2, 1.45], [0.4, -0.55, 0.9, 1.25], [1.8, 0.6, -0.5, 1.1]];
      sets.forEach(function (set, i) {
        var mats = set.map(function (f) { return new THREE.MeshStandardMaterial({ map: faceTex(f[0], f[1]), roughness: 0.4 }); });
        var c = mesh(new THREE.BoxGeometry(1, 1, 1), mats, pos[i][0], pos[i][1], pos[i][2]); c.scale.setScalar(pos[i][3]); g.add(c); cubes.push(c);
      });
      addStop(g, function (t, local) {
        cubes.forEach(function (c, i) { c.rotation.x = t * (0.4 + i * 0.15) + local * 2 + i; c.rotation.y = t * (0.55 - i * 0.1) + local * 3; c.position.y = pos[i][1] + Math.sin(t * 1.1 + i * 2) * 0.22; });
      });
    })();

    /* ---------- 8 · finale heart ---------- */
    (function () {
      var g = new THREE.Group();
      var h = mesh(bigHeart, gloss(0xff5f98, { emissive: 0xff2d70, emissiveIntensity: 0.16 })); h.scale.setScalar(1.7); g.add(h);
      var ups = [];
      for (var i = 0; i < 14; i++) { var m = mesh(miniHeart, gloss(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xffc2d4 : 0xe3d9ff)); m.scale.setScalar(0.14 + (i % 4) * 0.05); g.add(m); ups.push({ m: m, off: i / 14, x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 3 }); }
      addStop(g, function (t, local) {
        var beat = 1 + Math.pow(Math.max(0, Math.sin(t * 2.2)), 10) * 0.09;
        h.scale.setScalar(1.7 * beat); h.rotation.y = t * 0.4 + local * 2; h.rotation.x = Math.sin(t * 0.5) * 0.1;
        ups.forEach(function (u) { var p = (t * 0.1 + u.off) % 1; u.m.position.set(u.x * (0.5 + p * 0.5), -2.5 + p * 6, u.z); u.m.rotation.y = t + u.off * 9; u.m.scale.setScalar((0.12 + (u.off * 5 % 1) * 0.12) * Math.sin(p * Math.PI)); });
      });
    })();

    /* ---------- drifting dust along the whole journey ---------- */
    var DUST = window.innerWidth < 700 ? 260 : 520, dpos = new Float32Array(DUST * 3), dcol = new Float32Array(DUST * 3);
    var cols = [[1, 0.45, 0.65], [0.7, 0.6, 1], [1, 0.72, 0.5], [0.45, 0.78, 1]];
    for (var d = 0; d < DUST; d++) {
      dpos[d * 3] = (Math.random() - 0.5) * 22; dpos[d * 3 + 1] = (Math.random() - 0.5) * 12; dpos[d * 3 + 2] = 8 - Math.random() * (STEP * 9 + 14);
      var c = cols[d % 4]; dcol[d * 3] = c[0]; dcol[d * 3 + 1] = c[1]; dcol[d * 3 + 2] = c[2];
    }
    var dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dgeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    var dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.14, map: radial([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(dust);

    /* ---------- DOM stage mapping ---------- */
    var secs = [].slice.call(document.querySelectorAll('[data-stage]'));
    var N = Math.min(secs.length, stops.length);
    function sideOf(i) { var o = secs[i] ? secs[i].getAttribute('data-obj') : 'center'; return o === 'left' ? -1 : o === 'right' ? 1 : 0; }

    var W = 1, H = 1, narrow = false, camDist = 8.2, lookTmp = new THREE.Vector3();
    function resize() {
      W = window.innerWidth; H = window.innerHeight; narrow = W / H < 0.95 || W < 900;
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
      camDist = narrow ? Math.max(9.4, Math.min(17, 7.4 / camera.aspect)) : 8.2;
      scene.fog.near = camDist + 1.5; scene.fog.far = camDist + 18;
    }
    window.addEventListener('resize', resize); resize();

    var smooth = 0, ox = 0, oy = 0, px = 0, py = 0, tpx = 0, tpy = 0, velocity = 0, lastScrollS = 0;
    window.addEventListener('pointermove', function (e) { tpx = e.clientX / W * 2 - 1; tpy = e.clientY / H * 2 - 1; }, { passive: true });
    window.addEventListener('deviceorientation', function (e) { if (e.gamma == null) return; tpx = Math.max(-1, Math.min(1, e.gamma / 30)); tpy = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); }, { passive: true });

    function stagePos() {                         /* continuous stop index from the DOM */
      var mid = H * 0.5, s = 0;
      if (!N) return 0;
      var first = secs[0].getBoundingClientRect();
      if (mid < first.top) return 0;
      for (var i = 0; i < N; i++) {
        var r = secs[i].getBoundingClientRect();
        if (mid >= r.top && mid < r.bottom) return i + (mid - r.top) / Math.max(1, r.height);
      }
      return N - 1;
    }
    var ease = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    var tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), lookA = new THREE.Vector3(), lookB = new THREE.Vector3();
    function camFor(i, f, outPos, outLook) {      /* orbit a stop slowly while its section scrolls by */
      var ang = (f - 0.5) * (secs[i] && secs[i].getAttribute('data-orbit') ? parseFloat(secs[i].getAttribute('data-orbit')) : 0.5);
      var dist = camDist;
      outPos.set(Math.sin(ang) * dist, 0.45 + (f - 0.5) * 0.5, -i * STEP + Math.cos(ang) * dist);
      outLook.set(0, 0, -i * STEP);
    }

    var visible = true, last = performance.now(), start = last, raf = 0;
    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var t = (now - start) / 1000;
      var s = stagePos();
      var prevSmooth = smooth;
      smooth += (s - smooth) * (reduce ? 1 : 0.09);
      velocity += ((smooth - prevSmooth) / Math.max(dt, 0.001) - velocity) * 0.15;
      var a = Math.max(0, Math.min(N - 1, Math.floor(smooth))), b = Math.min(N - 1, a + 1);
      var f = smooth - a; if (a === N - 1) f = Math.min(1, f);
      var g = ease((f - 0.6) / 0.4);              /* hold for 60 % of the section, then fly to the next */

      camFor(a, Math.min(f, 1), tmpA, lookA); camFor(b, 0.0, tmpB, lookB);
      camera.position.lerpVectors(tmpA, tmpB, g);
      var look = lookTmp.lerpVectors(lookA, lookB, g);
      var swoop = Math.sin(g * Math.PI);
      camera.position.x += swoop * 2.4 * (a % 2 ? -1 : 1); camera.position.y += swoop * 0.9;
      px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
      camera.position.x += px * 0.5; camera.position.y += -py * 0.3;
      camera.up.set(Math.sin(swoop * 0.18) * (a % 2 ? -1 : 1), 1, 0);
      camera.lookAt(look);

      /* push each stop's object to the side opposite the text */
      var sa = sideOf(a), sb = sideOf(b), side = sa + (sb - sa) * g;
      var tx = narrow ? 0 : -side * W * 0.2, ty = narrow ? H * 0.24 : 0;
      ox += (tx - ox) * 0.1; oy += (ty - oy) * 0.1;
      camera.setViewOffset(W, H, ox, oy, W, H);

      rimA.position.set(camera.position.x + 4, camera.position.y + 3, camera.position.z + 2);
      rimB.position.set(camera.position.x - 5, camera.position.y - 2, camera.position.z - 3);

      for (var i = 0; i < stops.length; i++) {
        var st = stops[i], dist = Math.abs(smooth - i), prox = 1 - Math.min(1, dist / 0.9);
        var local = i < N ? Math.max(-1, Math.min(1, smooth - i)) : 0;
        st.holder.visible = dist < 1.9;
        if (st.holder.visible) {
          st.holder.scale.setScalar(0.55 + 0.45 * ease(1 - Math.min(1, dist / 1.1)));
          st.update(t, local, Math.max(0, 1 - Math.abs(smooth - i - 0.1) / 0.8), dt);
          st.shadow.material.opacity = 0.4 + 0.6 * prox;
        }
      }
      dust.rotation.z = Math.sin(t * 0.1) * 0.04;
      dust.position.y = -smooth * 0.0 + Math.sin(t * 0.3) * 0.15;

      renderer.render(scene, camera);
      if (visible && (!reduce || Math.abs(s - smooth) > 0.002)) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) { last = performance.now(); kick(); } });
    kick();
    root.classList.add('has-3d');
    window.OCworld = { kick: kick };
  }
})();
