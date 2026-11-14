/* ------------------------------------------------ knob */
function arc(a0, a1, r) {
  if (a1 - a0 < 0.6) return '';
  var p = function (a) { var t = a * Math.PI / 180; return [(32 + r * Math.sin(t)).toFixed(2), (32 - r * Math.cos(t)).toFixed(2)]; };
  var s = p(a0), e = p(a1);
  return 'M' + s[0] + ' ' + s[1] + 'A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + e[0] + ' ' + e[1];
}
var FMT = {
  pct: function (v) { return Math.round(v * 100) + '%'; },
  cut: function (v) { var f = 20 * Math.pow(1000, v); return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 1 : 2) + 'k' : Math.round(f) + ''; },
  time: function (v) { return v < 1 ? Math.round(v * 1000) + 'ms' : v.toFixed(v < 10 ? 2 : 1) + 's'; },
  hz: function (v) { return v.toFixed(v < 10 ? 2 : 1) + 'Hz'; },
  int: function (v) { return (v > 0 ? '+' : '') + Math.round(v); },
  cents: function (v) { return (v > 0 ? '+' : '') + Math.round(v) + 'c'; },
  num: function (v) { return Math.round(v) + ''; },
  ms: function (v) { return Math.round(v) + 'ms'; },
  signed: function (v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; },
  pan: function (v) { return Math.abs(v) < 0.02 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100); }
};
var vbEl = null, vbT = 0;
function vbShow(el, label, text) {
  if (!vbEl) { vbEl = h('div', { id: 'vbubble' }, h('i'), h('b')); document.body.append(vbEl); }
  clearTimeout(vbT); var r = el.getBoundingClientRect();
  vbEl.firstChild.textContent = label; vbEl.lastChild.textContent = text;
  vbEl.style.left = clamp(r.left + r.width / 2, 70, window.innerWidth - 70) + 'px'; vbEl.style.top = Math.max(8, r.top - 62) + 'px'; vbEl.classList.add('on');
}
function vbHide() { clearTimeout(vbT); vbT = setTimeout(function () { vbEl && vbEl.classList.remove('on'); }, 450); }
function kv(e) { return e.clientY; }
function kv2(e) { return e.clientX; }
function Knob(o) {
  var d = S.PARAMS[o.k];
  if (o.min === undefined) o.min = d[1]; if (o.max === undefined) o.max = d[2]; if (o.def === undefined) o.def = d[0];
  o.kind = o.kind || 'lin'; o.fmt = o.fmt || FMT.pct;
  var el = h('div', { class: 'knob' + (o.big ? ' big' : '') });
  if (o.dest != null) el.dataset.dest = o.dest;
  el.innerHTML = '<svg viewBox="0 0 64 64"><path class="trk"/><path class="val"/><g class="mods"></g><circle class="cap" cx="32" cy="32" r="16"/><line class="ind" x1="32" y1="32" x2="32" y2="20"/></svg><div class="lbl"></div><div class="vv"></div>';
  if (o.color) el.style.setProperty('--kc', o.color);
  var trk = $('.trk', el), val = $('.val', el), mods = $('.mods', el), ind = $('.ind', el), lbl = $('.lbl', el), vv = $('.vv', el);
  var bead = document.createElementNS(NS, 'circle'); bead.setAttribute('class', 'liv'); bead.setAttribute('r', '2.8'); bead.style.display = 'none'; $('svg', el).insertBefore(bead, $('.cap', el));
  lbl.textContent = o.label;
  function toNorm(v) { return o.kind === 'exp' ? Math.log(v / o.min) / Math.log(o.max / o.min) : (v - o.min) / (o.max - o.min); }
  function fromNorm(n) { n = clamp(n, 0, 1); var v = o.kind === 'exp' ? o.min * Math.pow(o.max / o.min, n) : o.min + n * (o.max - o.min); return o.kind === 'int' ? Math.round(v) : v; }
  var K = { o: o, el: el, hasMod: false, fromNorm: fromNorm, setLabel: function (t) { o.label = t; lbl.textContent = t; } };
  K.live = function () {
    var n = effNorm(o.dest, clamp(toNorm(P[o.k]), 0, 1)), t = (-135 + 270 * n) * Math.PI / 180;
    bead.setAttribute('cx', (32 + 24 * Math.sin(t)).toFixed(2)); bead.setAttribute('cy', (32 - 24 * Math.cos(t)).toFixed(2));
  };
  K.update = function () {
    K.hasMod = o.dest != null && ROUTES.some(function (r) { return r.d === o.dest; }); bead.style.display = K.hasMod ? '' : 'none';
    var v = P[o.k], n = clamp(toNorm(v), 0, 1), a = -135 + 270 * n;
    trk.setAttribute('d', arc(-135, 135, 24));
    var zero = (o.min < 0 && o.max > 0) ? clamp(toNorm(0), 0, 1) : 0, za = -135 + 270 * zero;
    val.setAttribute('d', a >= za ? arc(za, a, 24) : arc(a, za, 24));
    var t = a * Math.PI / 180; ind.setAttribute('x2', (32 + 13 * Math.sin(t)).toFixed(2)); ind.setAttribute('y2', (32 - 13 * Math.cos(t)).toFixed(2));
    vv.textContent = o.fmt(v); el.setAttribute('aria-valuenow', Math.round(n * 100)); el.setAttribute('aria-valuetext', vv.textContent);
    // modulation rings
    while (mods.firstChild) mods.removeChild(mods.firstChild);
    if (o.dest != null) {
      var idx = 0;
      ROUTES.forEach(function (r) {
        if (r.d !== o.dest) return;
        var s = SRC[r.s], lo, hi, nn = n;
        if (BIPOLAR[s.id]) { lo = nn - Math.abs(r.a); hi = nn + Math.abs(r.a); } else if (r.a >= 0) { lo = nn; hi = nn + r.a; } else { lo = nn + r.a; hi = nn; }
        lo = clamp(lo, 0, 1); hi = clamp(hi, 0, 1);
        var p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'mod'); p.setAttribute('d', arc(-135 + 270 * lo, -135 + 270 * hi, 29 + idx * 3.6)); p.style.stroke = 'var(' + srcVar(s) + ')';
        if (r.a < 0) p.style.strokeDasharray = '3 2.5';
        mods.appendChild(p); idx++;
      });
    }
    el.classList.toggle('armed', SEL != null && o.dest != null);
    if (SEL != null) el.style.setProperty('--arm', 'var(' + srcVar(SRC[SEL]) + ')');
  };
  var drag = null, lastTap = 0;
  el.addEventListener('pointerdown', function (e) {
    e.preventDefault(); if (MIDI.learning) { midiPick(o.k, el); return; }
    try { el.setPointerCapture(e.pointerId); } catch (x) { }
    var now = performance.now(), dbl = now - lastTap < 300; lastTap = now;
    if (dbl) { if (SEL != null && o.dest != null) removeRoute(SEL, o.dest); else setP(o.k, o.def); buzz(14); drag = null; return; }
    vbShow(el, o.label, o.fmt(P[o.k]));
    drag = { y: kv(e), x0: kv2(e), n: toNorm(P[o.k]), a: routeAmt(SEL, o.dest), rt: SEL != null && o.dest != null }; el.classList.add('touch');
  });
  el.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dy = drag.y - kv(e), far = Math.abs(kv2(e) - drag.x0) > 56; drag.y = kv(e);
    if (drag.rt) { drag.a = clamp(drag.a + dy * CFG.ksens * (far ? 1 / 700 : 1 / 130), -1, 1); setRoute(SEL, o.dest, drag.a); vbShow(el, SRC[SEL].name, (drag.a > 0 ? '+' : '') + Math.round(drag.a * 100) + '%'); }
    else { drag.n = clamp(drag.n + dy * CFG.ksens * (far ? 1 / 800 : 1 / 150), 0, 1); setP(o.k, fromNorm(drag.n)); vbShow(el, o.label, o.fmt(P[o.k])); }
  });
  function end() { drag = null; vbHide(); setTimeout(function () { if (!drag) el.classList.remove('touch'); }, 120); }
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  /* keyboard and screen readers: a knob is a slider, arrows move it, Home resets it */
  el.tabIndex = 0; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', o.label); el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100');
  el.addEventListener('keydown', function (e) {
    var s = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home') { setP(o.k, o.def); e.preventDefault(); return; }
    if (!s) return; e.preventDefault();
    var n = toNorm(P[o.k]), st = o.kind === 'int' ? 1 / Math.max(1, o.max - o.min) : (e.shiftKey ? .002 : .02);
    setP(o.k, fromNorm(clamp(n + s * st, 0, 1)));
  });
  knobs.push(K); K.update();
  return K;
}
function Chips(k, opts, extra) {
  var wrap = h('div', { class: 'chips' }), els = [];
  opts.forEach(function (o, i) {
    var v = o.v !== undefined ? o.v : i, c = h('button', { class: 'chip', type: 'button', onclick: function () { setP(k, v); } }, o.l !== undefined ? o.l : o);
    c._v = v; els.push(c); wrap.append(c);
  });
  function fn() { els.forEach(function (c) { c.classList.toggle('on', Math.round(P[k]) === c._v); }); }
  binders.push({ k: k, fn: fn }); fn();
  if (extra) wrap.classList.add(extra);
  return wrap;
}
function Switch(k, cb) {
  var s = h('button', { class: 'sw', type: 'button', 'aria-label': k, onclick: function () { setP(k, P[k] >= 0.5 ? 0 : 1); cb && cb(); } });
  function fn() { s.classList.toggle('on', P[k] >= 0.5); }
  binders.push({ k: k, fn: fn }); fn(); return s;
}
function Stepper(k, step, fmt, min, max) {
  var sp = h('span'), lo = min !== undefined ? min : S.PARAMS[k][1], hi = max !== undefined ? max : S.PARAMS[k][2];
  var st = h('div', { class: 'stepper' }, h('button', { type: 'button', onclick: function () { setP(k, clamp(P[k] - step, lo, hi)); } }, '−'), sp, h('button', { type: 'button', onclick: function () { setP(k, clamp(P[k] + step, lo, hi)); } }, '+'));
  function fn() { sp.textContent = fmt(P[k]); }
  binders.push({ k: k, fn: fn }); fn(); return st;
}
function card(title, kids, cls, right) {
  var col = store('behemoth.collapsed') || {}, head = h('h3', { class: 'cth', role: 'button', 'aria-expanded': col[title] ? 'false' : 'true' }, h('span', { class: 'ct' }, title), h('span', { class: 'sp' }), right);
  var sec = h('section', { class: 'card ' + (cls || '') + (col[title] ? ' collapsed' : '') }, head, kids);
  head.addEventListener('click', function (e) {
    if (e.target.closest('button, input, .chips')) return;
    var c = store('behemoth.collapsed') || {}, on = sec.classList.toggle('collapsed'); head.setAttribute('aria-expanded', on ? 'false' : 'true');
    if (on) c[title] = 1; else delete c[title]; store('behemoth.collapsed', c); buzz(4); setTimeout(drawAllVis, 0);
  });
  return sec;
}


