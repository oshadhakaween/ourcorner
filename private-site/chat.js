/* Chat section: loads the history, shows new messages instantly (Ably) and refreshes gently as a backup. */
(function () {
  'use strict';
  var OCx = window.OC, $ = OCx.$;
  var card = $('#chat-card');
  if (!card) return;
  var log = $('#chat-log'), form = $('#chat-form'), input = $('#chat-input'), liveEl = $('#chat-live'), withEl = $('#chat-with');
  var section = $('#chat'), navPill = document.querySelector('a.pill-ui[href="#chat"]');

  var items = [], seen = {}, lastId = 0;
  var loaded = false, liveOn = false, lastFetch = 0, stick = true, inView = false;
  var EMOJI_ONLY = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}️‍\s]{0,10}$/u;

  function dayLabel(d) {
    var t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function timeLabel(d) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function whoIs(m) {
    if (OCx.me && m.senderId === OCx.me.id) return OCx.me;
    if (OCx.partner && m.senderId === OCx.partner.id) return OCx.partner;
    return { name: m.senderName };
  }

  function build(m, prev) {
    var frag = document.createDocumentFragment();
    var d = new Date(m.createdAt);
    var newDay = !prev || new Date(prev.createdAt).toDateString() !== d.toDateString();
    if (newDay) frag.appendChild(OCx.el('div', 'oc-day', dayLabel(d)));
    var mine = !!(OCx.me && m.senderId === OCx.me.id);
    var first = newDay || prev.senderId !== m.senderId || d - new Date(prev.createdAt) > 10 * 60000;
    var row = OCx.el('div', 'oc-row ' + (mine ? 'me' : 'them') + (first ? ' first' : ''));
    row.appendChild(first ? OCx.avatar(whoIs(m), 'sm') : OCx.el('span', 'oc-av sm'));
    var bubble = OCx.el('div', 'oc-msg' + (EMOJI_ONLY.test(m.body) && m.body.length <= 14 ? ' big' : ''));
    bubble.appendChild(document.createTextNode(m.body));
    bubble.appendChild(OCx.el('small', '', timeLabel(d)));
    row.appendChild(bubble);
    frag.appendChild(row);
    return frag;
  }

  function renderAll() {
    log.textContent = '';
    if (!items.length) {
      var e = OCx.el('div', 'oc-empty');
      e.appendChild(OCx.el('b', '', '💗'));
      e.appendChild(document.createTextNode('No messages yet. Say hi!'));
      log.appendChild(e);
      return;
    }
    items.forEach(function (m, i) { log.appendChild(build(m, items[i - 1])); });
  }
  function toBottom(smooth) { log.scrollTo({ top: log.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }

  function add(m, fromMe) {
    if (!m || seen[m.id]) return;
    seen[m.id] = 1;
    var inOrder = m.id > lastId, wasEmpty = !items.length;
    items.push(m);
    if (!inOrder) items.sort(function (a, b) { return a.id - b.id; });
    lastId = Math.max(lastId, m.id);
    if (!inOrder || wasEmpty) renderAll(); else log.appendChild(build(m, items[items.length - 2]));
    var mine = fromMe || (OCx.me && m.senderId === OCx.me.id);
    if (stick || mine) toBottom(loaded);
    if (loaded && !mine && !inView && navPill) navPill.classList.add('has-new');
  }

  log.addEventListener('scroll', function () { stick = log.scrollHeight - log.scrollTop - log.clientHeight < 90; });

  function refresh() {
    if (!loaded) return;
    lastFetch = Date.now();
    OCx.api('/api/messages?after=' + lastId).then(function (rows) { rows.forEach(function (m) { add(m); }); }).catch(function () {});
  }

  function send(text) {
    text = (text || '').trim();
    if (!text) return;
    input.value = '';
    OCx.api('/api/messages', { method: 'POST', body: { body: text } })
      .then(function (m) { add(m, true); })
      .catch(function (err) { OCx.toast("Couldn't send: " + err.message); if (!input.value) input.value = text; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); input.focus({ preventScroll: true }); });
  $('#chat-heart').addEventListener('click', function () { send('💗'); });

  function setLive(on) {
    liveOn = on;
    liveEl.classList.toggle('on', on);
    liveEl.lastChild.textContent = on ? 'Live' : 'Refreshing every few seconds';
  }

  if ('IntersectionObserver' in window && section) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView) { if (navPill) navPill.classList.remove('has-new'); refresh(); }
    }, { rootMargin: '200px 0px' }).observe(section);
  } else { inView = true; }

  OCx.loadMe().then(function () {
    withEl.textContent = '';
    withEl.appendChild(OCx.avatar(OCx.partner || { name: '?' }));
    withEl.appendChild(OCx.el('b', '', OCx.partner ? OCx.partner.name : 'Your person'));
    return OCx.api('/api/messages');
  }).then(function (rows) {
    rows.forEach(function (m) { add(m); });
    if (!items.length) renderAll();
    loaded = true;
    toBottom(false);
    OCx.live('chat', function (m) { add(m); });
    OCx.liveState(setLive);
    if (!window.Ably) setLive(false);
  }).catch(function (err) {
    log.textContent = '';
    var e = OCx.el('div', 'oc-empty');
    e.appendChild(OCx.el('b', '', '😢'));
    e.appendChild(document.createTextNode("Couldn't load the chat: " + (err && err.message ? err.message : 'unknown error')));
    log.appendChild(e);
  });

  // backup refresh: every 4 s while you are looking at the chat, every 12 s otherwise
  var n = 0;
  OCx.poll(function () {
    n++;
    if (liveOn && Date.now() - lastFetch < 25000) return;
    if (inView || n % 3 === 0) refresh();
  }, 4000);
})();
