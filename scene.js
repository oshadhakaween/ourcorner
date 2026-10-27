/* =========================================================
   scene.js — the glossy 3D heart in the hero (Three.js r128)
   Falls back to a big emoji heart if WebGL isn't available.
   ========================================================= */
(function () {
  'use strict';
  var canvas = document.getElementById('hero3d');
  if (!canvas) return;
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE = window.THREE;
  var renderer;
  try {
    if (!THREE) throw new Error('three missing');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { root.classList.add('no-3d'); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0.1, 9.5);

  /* ---- lights: soft studio look on white ---- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffd5e3, 0.9));
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-4, 5, 6); scene.add(key);
  var fill = new THREE.PointLight(0xffb3cc, 0.9, 40); fill.position.set(5, -2, 5); scene.add(fill);
  var rimL = new THREE.PointLight(0xb9a4ff, 0.7, 40); rimL.position.set(-5, -3, -3); scene.add(rimL);

  /* ---- heart geometry ---- */
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
    var g = new THREE.ExtrudeGeometry(heartShape(), {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9,
      bevelSegments: 10, curveSegments: 40
    });
    g.center();
    g.computeVertexNormals();
    return g;
  }
  var bigGeo = heartGeo(0.45, 0.28);
  var smallGeo = heartGeo(0.25, 0.16);

  var mainMat = new THREE.MeshPhysicalMaterial({
    color: 0xff4a80, roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.08,
    reflectivity: 0.6, emissive: 0x7a0b32, emissiveIntensity: 0.12
  });
  var group = new THREE.Group();
  scene.add(group);
  var heart = new THREE.Mesh(bigGeo, mainMat);
  heart.scale.setScalar(1.55);
  group.add(heart);

  /* soft floor shadow */
  function radial(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.4),
    new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(255,61,119,.28)'], [1, 'rgba(255,61,119,0)']]), transparent: true, depthWrite: false })
  );
  shadow.position.y = -2.55;
  shadow.rotation.x = -Math.PI / 2 + 0.25;
  scene.add(shadow);

  /* ---- orbiting pearl hearts ---- */
  var small = window.innerWidth < 700 ? 5 : 8;
  var palette = [0xffffff, 0xffd1df, 0xe3d9ff, 0xcfe6ff, 0xfff0c8, 0xffffff, 0xffc2d4, 0xd9f2e3];
  var sats = [];
  for (var i = 0; i < small; i++) {
    var m = new THREE.Mesh(smallGeo, new THREE.MeshPhysicalMaterial({
      color: palette[i % palette.length], roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.05
    }));
    var sc = 0.28 + (i % 3) * 0.1;
    m.scale.setScalar(sc);
    scene.add(m);
    sats.push({ m: m, a: (i / small) * Math.PI * 2, r: 2.9 + (i % 3) * 0.4, y: ((i % 4) - 1.5) * 0.85, sp: 0.18 + (i % 3) * 0.06, ph: i * 1.7, sc: sc });
  }

  /* ---- pointer / tilt ---- */
  var mx = 0, my = 0, tx = 0, ty = 0, boost = 0;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null) return;
    tx = Math.max(-1, Math.min(1, e.gamma / 30));
    ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });
  canvas.addEventListener('pointerdown', function () { boost = 1; });

  /* ---- sizing + loop ---- */
  function resize() {
    var w = canvas.clientWidth || 400, h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var fit = Math.min(1, camera.aspect * 1.08);
    camera.position.z = 9.5 / fit;
  }
  window.addEventListener('resize', resize);
  resize();

  var visible = true, raf = 0, t0 = performance.now();
  function frame(now) {
    raf = 0;
    var t = (now - t0) / 1000, an = reduce ? 0 : 1;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    boost *= 0.94;
    heart.rotation.y = mx * 0.7 + Math.sin(t * 0.6) * 0.25 * an + boost * 0.9;
    heart.rotation.x = my * 0.35 + Math.sin(t * 0.45) * 0.08 * an;
    var beat = 1 + (Math.pow(Math.max(0, Math.sin(t * 2.6)), 12) * 0.07 + boost * 0.1) * an;
    heart.scale.setScalar(1.55 * beat);
    group.position.y = Math.sin(t * 1.1) * 0.13 * an;
    shadow.material.opacity = 0.9 - Math.sin(t * 1.1) * 0.15 * an;
    sats.forEach(function (s) {
      var a = s.a + t * s.sp * an;
      s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 0.9 + s.ph) * 0.18 * an, Math.sin(a) * s.r * 0.55);
      s.m.rotation.y = a * 1.2; s.m.rotation.x = Math.sin(t + s.ph) * 0.3;
    });
    renderer.render(scene, camera);
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(canvas);
  }
  raf = requestAnimationFrame(frame);
  if (reduce) { window.addEventListener('pointermove', function () { if (!raf) raf = requestAnimationFrame(frame); }); }
})();
