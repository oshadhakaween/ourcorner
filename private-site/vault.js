/* Photo vault: the 3D tunnel is filled from your private photo storage,
   and the "Edit vault" panel lets either of you add, rename or remove photos. */
(function () {
  'use strict';
  var OCx = window.OC, $ = OCx.$;
  var tunnel = $('#tunnel'), editBtn = $('#vault-edit');
  if (!tunnel) return;

  var photos = [];
  var loadedAt = 0;
  var ORIGINALS = [
    ['img1.jpg', 'First Meet'], ['img2.jpg', 'Mountain Hike ⛰️'], ['img3.jpg', '🧸'],
    ['img4.jpg', 'Favorite Smile'], ['img5.jpg', 'Beautiful soles in a frame']
  ];

  /* ---------- the tunnel ---------- */
  function frame(emoji, url, caption) {
    var f = OCx.el('figure', 'tframe');
    var ph = OCx.el('div', 'ph');
    ph.appendChild(document.createTextNode(emoji));
    if (url) {
      var img = new Image();
      img.alt = caption || 'Photo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = function () { img.remove(); };
      img.src = url;
      ph.appendChild(img);
    }
    f.appendChild(ph);
    f.appendChild(OCx.el('figcaption', 'cap', caption || ''));
    return f;
  }
  function paint() {
    tunnel.textContent = '';
    if (!photos.length) tunnel.appendChild(frame('📷', '', 'Add our first photo ✏️'));
    else photos.forEach(function (p) { tunnel.appendChild(frame('📷', p.url, p.caption)); });
    if (window.OCtunnel) window.OCtunnel.refresh();
    if (panel) drawPanel();
  }

  function load() {
    return OCx.api('/api/photos').then(function (rows) {
      photos = rows; loadedAt = Date.now(); paint();
    }).catch(function () {
      tunnel.textContent = '';
      tunnel.appendChild(frame('📷', '', "Couldn't load photos"));
      if (window.OCtunnel) window.OCtunnel.refresh();
    });
  }

  /* picture links last an hour: refresh them if the tab was asleep */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - loadedAt > 40 * 60000) load();
  });

  /* ---------- uploading ---------- */
  function shrink(f) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 300 * 1024) return resolve(f);
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 2200 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b || b.size >= f.size) return resolve(f);
          resolve(new File([b], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(f); };
      img.src = url;
    });
  }
  function uploadOne(f, caption) {
    return shrink(f).then(function (small) {
      var type = small.type || 'image/jpeg';
      return OCx.api('/api/upload-url', { method: 'POST', body: { filename: small.name || 'photo.jpg', contentType: type } })
        .then(function (u) {
          return fetch(u.url, { method: 'PUT', headers: { 'Content-Type': type }, body: small }).then(function (r) {
            if (!r.ok) throw new Error('storage said ' + r.status + ' (check the R2 CORS setting)');
            return OCx.api('/api/photos', { method: 'POST', body: { key: u.key, caption: caption || '' } });
          });
        });
    });
  }

  /* ---------- the edit panel ---------- */
  var panel = null, listEl, noteEl, upLabel, upBox, importBtn;
  function say(text, bad) { noteEl.textContent = text || ''; noteEl.className = 'vm-note' + (bad ? ' bad' : ''); }
  function busy(on, label) {
    upBox.classList.toggle('busy', on);
    if (importBtn) importBtn.disabled = on;
    upLabel.textContent = on ? label : '＋ Add photos';
  }

  function drawPanel() {
    listEl.textContent = '';
    importBtn.hidden = photos.length > 0;
    if (!photos.length) {
      listEl.appendChild(OCx.el('p', 'vm-empty', 'The vault is empty. Add photos, or bring in the original five.'));
      return;
    }
    photos.forEach(function (p) {
      var row = OCx.el('div', 'vm-item');
      var th = OCx.el('div', 'vm-th');
      var img = new Image(); img.alt = ''; img.src = p.url; img.loading = 'lazy';
      th.appendChild(img);
      var inp = OCx.el('input', 'vm-cap');
      inp.type = 'text'; inp.maxLength = 120; inp.value = p.caption || ''; inp.placeholder = 'Add a caption…';
      inp.setAttribute('aria-label', 'Caption');
      function save() {
        var v = inp.value.trim();
        if (v === (p.caption || '')) return;
        OCx.api('/api/photos/' + p.id, { method: 'PATCH', body: { caption: v } }).then(function (u) {
          p.caption = u.caption; say('Saved 💗'); paintCaptionsOnly();
        }).catch(function (e) { say("Couldn't save: " + e.message, true); });
      }
      inp.addEventListener('blur', save);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
      var del = OCx.el('button', 'vm-del', '🗑');
      del.type = 'button'; del.setAttribute('aria-label', 'Delete photo');
      del.addEventListener('click', function () {
        if (!confirm('Delete this photo for good?')) return;
        del.disabled = true;
        OCx.api('/api/photos/' + p.id, { method: 'DELETE' }).then(function () {
          photos = photos.filter(function (x) { return x.id !== p.id; }); say('Deleted'); paint();
        }).catch(function (e) { say("Couldn't delete: " + e.message, true); del.disabled = false; });
      });
      row.appendChild(th); row.appendChild(inp); row.appendChild(del);
      listEl.appendChild(row);
    });
  }
  function paintCaptionsOnly() {
    var caps = tunnel.querySelectorAll('.cap');
    photos.forEach(function (p, i) { if (caps[i]) caps[i].textContent = p.caption || ''; });
  }

  function addFiles(files) {
    files = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var ok = 0, bad = 0, lastErr = '', total = files.length;
    (function next() {
      if (!files.length) {
        busy(false);
        say(bad ? bad + ' failed: ' + lastErr : 'Added ' + ok + ' 💗', !!bad);
        return load();
      }
      busy(true, 'Uploading ' + (ok + bad + 1) + ' of ' + total + '…');
      uploadOne(files.shift()).then(function () { ok++; }, function (e) { bad++; lastErr = e.message; }).then(next);
    })();
  }

  function importOriginals() {
    var i = 0, ok = 0, lastErr = '';
    (function next() {
      if (i >= ORIGINALS.length) {
        busy(false); say(ok ? 'Brought in ' + ok + ' photos 💗' : 'Nothing imported: ' + lastErr, !ok);
        return load();
      }
      var o = ORIGINALS[i++];
      busy(true, 'Importing ' + i + ' of ' + ORIGINALS.length + '…');
      fetch(o[0], { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error(o[0] + ' not found');
        return r.blob();
      }).then(function (b) {
        return uploadOne(new File([b], o[0], { type: b.type || 'image/jpeg' }), o[1]);
      }).then(function () { ok++; }, function (e) { lastErr = e.message; }).then(next);
    })();
  }

  function buildPanel() {
    panel = OCx.el('div', 'vm');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Edit the photo vault');
    var box = OCx.el('div', 'vm-box');
    var head = OCx.el('div', 'vm-head');
    var h = OCx.el('div', 'vm-title'); h.appendChild(OCx.el('span', 'eyebrow', 'our little gallery')); h.appendChild(OCx.el('b', '', 'Edit the vault'));
    var x = OCx.el('button', 'btn ghost icon', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', closePanel);
    head.appendChild(h); head.appendChild(x);

    var bar = OCx.el('div', 'vm-bar');
    upBox = OCx.el('label', 'btn rose oc-up');
    upLabel = OCx.el('span', '', '＋ Add photos');
    var file = OCx.el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.setAttribute('aria-label', 'Add photos');
    file.addEventListener('change', function () { var f = [].slice.call(file.files || []); file.value = ''; addFiles(f); });
    upBox.appendChild(upLabel); upBox.appendChild(file);
    importBtn = OCx.el('button', 'btn ghost', 'Bring in our original 5 photos'); importBtn.type = 'button';
    importBtn.addEventListener('click', importOriginals);
    bar.appendChild(upBox); bar.appendChild(importBtn);

    noteEl = OCx.el('div', 'vm-note');
    listEl = OCx.el('div', 'vm-list');
    box.appendChild(head); box.appendChild(bar); box.appendChild(noteEl); box.appendChild(listEl);
    panel.appendChild(box);
    panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
    document.body.appendChild(panel);
  }
  function onKey(e) { if (e.key === 'Escape') closePanel(); }
  function openPanel() {
    if (!panel) buildPanel();
    panel.classList.add('on'); say('');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    drawPanel();
  }
  function closePanel() {
    if (!panel) return;
    panel.classList.remove('on');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  }
  editBtn.addEventListener('click', openPanel);

  OCx.loadMe().then(load).catch(function () {});
})();
