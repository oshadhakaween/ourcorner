/* =========================================================
   scene.js — ambient 3D world (Three.js r128)
   - floating glossy hearts with scroll + pointer/tilt parallax
   - real 3D hearts glued to any element with [data-heart]
   - tap/click bursts of little hearts
   Needs: <canvas id="bg3d"> and three.min.js loaded first.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var canvas = document.getElementById('bg3d');
  var THREE = window.THREE;
  if (!canvas || !THREE) { root.classList.add('no-3d'); return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.innerWidth < 760;
  var density = parseFloat(canvas.getAttribute('data-density') || '1');

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !small, powerPreference: 'high-performance' });
  } catch (err) {
    root.classList.add('no-3d');
    canvas.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  var FOV = 45, CAM_Z = 14, SPAN = 24;
  var tanH = Math.tan(FOV * Math.PI / 360);
  var W = window.innerWidth, H = window.innerHeight;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffc2d9, 0.95));
  var key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 8, 8);
  scene.add(key);
  var glow = new THREE.PointLight(0xff8fc0, 1.3, 45);
  glow.position.set(0, 2, 7);
  scene.add(glow);

  /* ---------- heart geometry ---------- */
  function P(x, y) { return [(x - 5) * 0.07, (9.5 - y) * 0.07]; }
  function makeHeartShape() {
    var s = new THREE.Shape();
    var a = P(5, 5);
    s.moveTo(a[0], a[1]);
    function bc(c1x, c1y, c2x, c2y, x, y) {
      var p1 = P(c1x, c1y), p2 = P(c2x, c2y), p = P(x, y);
      s.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p[0], p[1]);
    }
    bc(5, 5, 4, 0, 0, 0);
    bc(-6, 0, -6, 7, -6, 7);
    bc(-6, 11, -3, 15.4, 5, 19);
    bc(12, 15.4, 16, 11, 16, 7);
    bc(16, 7, 16, 0, 10, 0);
    bc(7, 0, 5, 5, 5, 5);
    return s;
  }
  var geo = new THREE.ExtrudeGeometry(makeHeartShape(), {
    depth: 0.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: small ? 12 : 24
  });
  geo.center();
  geo.computeBoundingBox();
  var heartW = geo.boundingBox.max.x - geo.boundingBox.min.x;

  var palette = [0xff7aa8, 0xff9cc0, 0xc79bff, 0xffb7a0, 0xf5c96b, 0xff5d94];
  var mats = palette.map(function (c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.08 });
  });

  /* ---------- ambient floating hearts ---------- */
  var hearts = [];
  var COUNT = Math.round((small ? 11 : 22) * density);
  for (var i = 0; i < COUNT; i++) {
    var m = new THREE.Mesh(geo, mats[i % mats.length]);
    var z = -9 + Math.random() * 11;
    var h = {
      mesh: m, nx: Math.random() * 2 - 1, oy: Math.random() * SPAN, z: z,
      s: 0.22 + Math.random() * 0.45, spd: 0.12 + Math.random() * 0.22,
      rx: Math.random() * 6, ry: Math.random() * 6,
      vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 1.1, ph: Math.random() * 6.28
    };
    m.scale.setScalar(h.s);
    scene.add(m);
    hearts.push(h);
  }

  /* ---------- sparkle dust ---------- */
  function dotTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,240,200,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var SP = small ? 45 : 90;
  var spPos = new Float32Array(SP * 3);
  for (var k = 0; k < SP; k++) {
    spPos[k * 3] = (Math.random() - 0.5) * 22;
    spPos[k * 3 + 1] = (Math.random() - 0.5) * 22;
    spPos[k * 3 + 2] = -6 + Math.random() * 9;
  }
  var spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  var spMat = new THREE.PointsMaterial({ size: 0.28, map: dotTexture(), color: 0xf2c46d, transparent: true, opacity: 0.85, depthWrite: false });
  var sparkles = new THREE.Points(spGeo, spMat);
  scene.add(sparkles);

  /* ---------- hearts glued to DOM elements ---------- */
  var anchors = [].slice.call(document.querySelectorAll('[data-heart]')).map(function (el) {
    var mat = new THREE.MeshPhysicalMaterial({
      color: el.getAttribute('data-heart-color') || '#ff5d94',
      roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return { el: el, mesh: mesh, big: el.hasAttribute('data-heart-big'), ph: Math.random() * 6 };
  });

  /* ---------- helpers ---------- */
  var v3 = new THREE.Vector3();
  function toWorld(px, py, targetZ) {
    v3.set((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(camera);
    v3.sub(camera.position).normalize();
    var d = (targetZ - camera.position.z) / v3.z;
    return new THREE.Vector3().copy(camera.position).add(v3.multiplyScalar(d));
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  /* ---------- input ---------- */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.tx = (e.clientX / W) * 2 - 1;
    mouse.ty = (e.clientY / H) * 2 - 1;
  }, { passive: true });
  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null || e.beta == null) return;
    mouse.tx = clamp(e.gamma / 30, -1, 1);
    mouse.ty = clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  /* ---------- heart bursts on tap ---------- */
  var bursts = [];
  function spawnBurst(cx, cy) {
    var base = toWorld(cx, cy, 3);
    var now = performance.now() / 1000;
    for (var b = 0; b < 7; b++) {
      var mat = mats[Math.floor(Math.random() * mats.length)].clone();
      mat.transparent = true;
      var m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(0.1 + Math.random() * 0.14);
      m.position.copy(base);
      var ang = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      bursts.push({ m: m, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp + 1, vz: (Math.random() - 0.3) * 1.5, born: now, life: 1.3 + Math.random() * 0.5, spin: Math.random() * 4 });
      scene.add(m);
    }
    requestRender();
  }
  window.addEventListener('pointerdown', function (e) {
    if (reduce || root.classList.contains('locked')) return;
    var t = e.target;
    if (t && t.closest && t.closest('a,button,input,textarea,select,[onclick],.carousel,.ttt-cell,.memory-card,.bubble,.wrap-cell,.bubble-stage,.breath-circle,#password-screen,.popup-overlay,header,.mobile-nav')) return;
    spawnBurst(e.clientX, e.clientY);
  });

  /* ---------- render loop ---------- */
  var raf = 0, lastT = 0;
  function requestRender() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame(now) {
    raf = 0;
    var t = now / 1000;
    var dt = Math.min(0.05, t - lastT);
    lastT = t;
    var anim = reduce ? 0 : 1;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    var sy = window.pageYOffset || 0;

    camera.position.x = mouse.x * 0.7;
    camera.position.y = -mouse.y * 0.4;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    glow.position.set(mouse.x * 7, -mouse.y * 4 + 2, 7);

    /* ambient hearts */
    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i];
      var halfH = (CAM_Z - h.z) * tanH;
      var halfW = halfH * camera.aspect;
      var par = 0.004 + 0.006 * ((h.z + 9) / 11);
      var y = mod(h.oy + t * h.spd * anim + sy * par, SPAN) - SPAN / 2;
      var x = h.nx * halfW * 1.05 + Math.sin(t * 0.4 * anim + h.ph) * 0.3;
      h.mesh.position.set(x, y, h.z);
      h.mesh.rotation.x = h.rx + t * h.vx * anim;
      h.mesh.rotation.y = h.ry + t * h.vy * anim;
    }

    sparkles.rotation.z = t * 0.01 * anim;
    sparkles.position.y = -((sy * 0.002) % 6);
    spMat.opacity = 0.7 + 0.2 * Math.sin(t * 2.2 * anim);

    /* heart anchors */
    var upp = 2 * CAM_Z * tanH / H;
    for (var a = 0; a < anchors.length; a++) {
      var an = anchors[a];
      var r = an.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > H + 80 || r.width === 0) { an.mesh.visible = false; continue; }
      an.mesh.visible = true;
      var p = toWorld(r.left + r.width / 2, r.top + r.height / 2, 0);
      var s = r.width * upp / heartW * 0.92;
      var beat = 1 + (Math.pow(Math.max(0, Math.sin(t * 3.2)), 10) * 0.09 + Math.pow(Math.max(0, Math.sin(t * 3.2 - 0.7)), 10) * 0.05) * anim;
      an.mesh.position.set(p.x, p.y + Math.sin(t * 1.2 + an.ph) * 0.05 * s * anim, p.z);
      an.mesh.scale.setScalar(s * beat);
      an.mesh.rotation.y = Math.sin(t * 0.7 + an.ph) * 0.45 * anim + mouse.x * 0.7 + sy * 0.0012;
      an.mesh.rotation.x = mouse.y * 0.4 + Math.sin(t * 0.5 + an.ph) * 0.08 * anim;
    }

    /* bursts */
    for (var b = bursts.length - 1; b >= 0; b--) {
      var bu = bursts[b];
      var age = t - bu.born;
      if (age > bu.life) {
        scene.remove(bu.m);
        bu.m.material.dispose();
        bursts.splice(b, 1);
        continue;
      }
      bu.m.position.x += bu.vx * dt;
      bu.m.position.y += bu.vy * dt;
      bu.m.position.z += bu.vz * dt;
      bu.m.rotation.x += bu.spin * dt;
      bu.m.rotation.y += bu.spin * dt * 1.3;
      var q = age / bu.life;
      bu.m.material.opacity = 1 - q * q;
    }

    renderer.render(scene, camera);
    if (!reduce || bursts.length) requestRender();
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    requestRender();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', requestRender, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) requestRender(); });
  resize();
})();
