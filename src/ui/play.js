/* ------------------------------------------------ play: notes, surface, keyboard */
var SCALES = [['Minor pent', [0, 3, 5, 7, 10]], ['Major pent', [0, 2, 4, 7, 9]], ['Major', [0, 2, 4, 5, 7, 9, 11]], ['Minor', [0, 2, 3, 5, 7, 8, 10]], ['Dorian', [0, 2, 3, 5, 7, 9, 10]], ['Whole tone', [0, 2, 4, 6, 8, 10]], ['Chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]];
var NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var PL = { scale: 0, root: 0, oct: 3, glide: true, base: 48 };
function degNote(d) { var sc = SCALES[PL.scale][1], L = sc.length, o = Math.floor(d / L), i = ((d % L) + L) % L; return 12 * (PL.oct + 1) + PL.root + 12 * o + sc[i]; }
function degPitch(x) { var f = Math.floor(x), u = x - f, a = degNote(f), b = degNote(f + 1); return a + (b - a) * u; }
/* HOLD: latch released notes until the next fresh touch (or until HOLD is switched off). With the arpeggiator on, this latches the arp. */
var Hold = { on: false, latched: {}, fingers: 0, btns: [] };
window.__dbg = { Hold: Hold, PL: PL };
var CHORDS = [['Off', [0]], ['Oct', [0, 12]], ['5th', [0, 7]], ['Power', [0, 7, 12]], ['Maj', [0, 4, 7]], ['Min', [0, 3, 7]], ['Sus4', [0, 5, 7]], ['Maj7', [0, 4, 7, 11]], ['Min7', [0, 3, 7, 10]]];
var chordIdx = +(store('behemoth.chord') || 0), CH = {};
function noteOff(id) { A.send({ t: 'off', id: id }); var l = CH[id]; if (l) { l.forEach(function (x) { A.send({ t: 'off', id: x }); }); delete CH[id]; } }
function releaseLatched() { for (var id in Hold.latched) noteOff(+id); Hold.latched = {}; }
function playOn(n, vel, id) {
  if (SEQ.on) { SEQ.base = n; return; }                 /* with the sequencer running, keys transpose it */
  if (Hold.on && Hold.fingers === 0) releaseLatched();
  if (Hold.latched[id]) { noteOff(id); delete Hold.latched[id]; }
  var poly = P.mono >= 0.5 && Hold.fingers > 0;   /* mono preset: a second finger adds a voice instead of replacing the first */
  Hold.fingers++; A.send({ t: 'on', n: n, vel: vel, id: id, poly: poly });
  var iv = CHORDS[chordIdx][1];
  if (iv.length > 1) { CH[id] = []; for (var j = 1; j < iv.length; j++) { var cid = id + 100000 * j; CH[id].push(cid); A.send({ t: 'on', n: n + iv[j], vel: vel * 0.9, id: cid, poly: true }); } }
}
function playOff(id) { if (SEQ.on) return; Hold.fingers = Math.max(0, Hold.fingers - 1); if (Hold.on) Hold.latched[id] = 1; else noteOff(id); }
function setHold(v, quiet) { Hold.on = v; if (!v) releaseLatched(); Hold.btns.forEach(function (b) { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); if (!quiet) toast(v ? 'Hold on' : 'Hold off'); }
function panicAll() { Hold.latched = {}; Hold.fingers = 0; CH = {}; seqStop(true); A.send({ t: 'panic' }); }
function holdButton(cls, style) { var b = h('button', { class: cls, type: 'button', 'aria-pressed': 'false', onclick: function () { setHold(!Hold.on); } }, 'HOLD'); if (style) b.style.cssText = style; Hold.btns.push(b); b.classList.toggle('on', Hold.on); return b; }
function setOct(o) { PL.oct = clamp(o, 0, 6); octLabels.forEach(function (s) { s.textContent = 'Oct ' + PL.oct; }); rebuildSurfaces(); rebuildKbds(); }
function OctControl() {
  var span = h('span', null, 'Oct ' + PL.oct);
  var st = h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': 'Octave down', onclick: function () { setOct(PL.oct - 1); } }, '−'), span, h('button', { type: 'button', 'aria-label': 'Octave up', onclick: function () { setOct(PL.oct + 1); } }, '+'));
  octLabels.push(span); return st;
}
/* pointer position inside an element */
function lpos(el, e) {
  var r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
}
function Wheel(kind) {
  var el = h('div', { class: 'wheel ' + kind, role: 'slider', 'aria-label': kind === 'pitch' ? 'Pitch bend' : 'Mod wheel (Macro 1)' }), th = h('i'), val = kind === 'pitch' ? 0 : P.m1, drag = false, raf = 0;
  el.append(th, h('b', null, kind === 'pitch' ? 'PITCH' : 'MOD'));
  function paint() { th.style.bottom = 'calc((100% - 22px) * ' + (kind === 'pitch' ? (val + 1) / 2 : val) + ')'; }
  function push() { paint(); if (kind === 'pitch') A.send({ t: 'wheel', v: val }); else setP('m1', val); }
  function fromY(e) { var p = lpos(el, e), f = 1 - clamp((p.y - 11) / Math.max(1, p.h - 22), 0, 1); val = kind === 'pitch' ? f * 2 - 1 : f; if (kind === 'pitch' && Math.abs(val) < 0.04) val = 0; push(); }
  function spring() { cancelAnimationFrame(raf); (function step() { val *= 0.7; if (Math.abs(val) < 0.01) val = 0; push(); if (val !== 0) raf = requestAnimationFrame(step); })(); }
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); cancelAnimationFrame(raf); drag = true; try { el.setPointerCapture(e.pointerId); } catch (x) { } fromY(e); });
  el.addEventListener('pointermove', function (e) { if (drag) fromY(e); });
  function up() { if (!drag) return; drag = false; if (kind === 'pitch') spring(); }
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  if (kind === 'mod') binders.push({ k: 'm1', fn: function () { if (!drag) { val = P.m1; paint(); } } });
  paint(); return el;
}
function presetList() {
  var names = FACTORY.map(function (f) { return f.name; }), go = FACTORY.map(function (f, i) { return function () { loadFactory(i); }; });
  userPresets().forEach(function (u) { names.push(u.name); go.push(function () { applyPreset(u); store('behemoth.last', u.name); }); });
  return { names: names, go: go };
}
function stepPreset(d) { var L = presetList(), i = L.names.indexOf(curPreset); i = i < 0 ? 0 : (i + d + L.names.length) % L.names.length; L.go[i](); if (presetSheet && presetSheet.paint) presetSheet.paint(); }
var togs = [], dockEl = null;
function setDockMin(m) { if (dockEl) dockEl.classList.toggle('min', m); togs.forEach(function (t) { t.classList.toggle('up', m); }); store('behemoth.dockMin', m); }
function ico(path, extra) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + path + '</svg>'; }
function controls(cls) {
  var arp = h('button', { class: 'pill', type: 'button', onclick: function () { setP('arpOn', P.arpOn >= 0.5 ? 0 : 1); } }, 'ARP');
  function arpFn() { arp.classList.toggle('on', P.arpOn >= 0.5); } binders.push({ k: 'arpOn', fn: arpFn }); arpFn();
  var tog = h('button', { class: 'pill sq tog', type: 'button', 'aria-label': 'Show or hide keys', onclick: function () { setDockMin(!dockEl.classList.contains('min')); }, html: ico('<path d="M6 9l6 6 6-6"/>') }); togs.push(tog);
  return h('div', { class: cls }, holdButton('pill'), arp, OctControl(),
    h('button', { class: 'pill sq', type: 'button', 'aria-label': 'Panic: stop all notes', onclick: panicAll, html: ico('<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none"/>') }),
    h('span', { class: 'dgap' }),
    h('button', { class: 'pill sq xbtn', type: 'button', 'aria-label': 'Expand or collapse the keys', onclick: function () { if (isPortrait()) setDockOpen(!(dockEl.classList.contains('open') && !dockEl.classList.contains('min'))); else openStage(); },
      html: ico('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', ' class="i1"') + ico('<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M3 21l7-7"/>', ' class="i2"') }), tog);
}
function isPortrait() { return window.innerHeight > window.innerWidth; }
function setDockOpen(o) {
  if (!dockEl) return; if (o) setDockMin(false);
  dockEl.classList.toggle('open', !!o); store('behemoth.dockOpen', o ? 1 : 0);
  if (o && dockEl._xset) requestAnimationFrame(function () { dockEl._xset(); });
}
/* portrait: the dock grows in place into a window with a split keyboard or a touch pad; the sound controls above stay usable */
function buildDockWindow(dock) {
  var xMode = store('beh.stage') === 'pad' ? 'pad' : 'split', main = h('div', { class: 'dxmain' }), pad = h('div', { id: 'surfaceD' });
  pad._cols = 8; var padD = Surface(pad, 8);
  var bSplit = h('button', { type: 'button', onclick: function () { xset('split'); } }, 'SPLIT'), bPad = h('button', { type: 'button', onclick: function () { xset('pad'); } }, 'PAD');
  var glide = h('button', { class: 'pill', type: 'button', onclick: function () { PL.glide = !PL.glide; gl(); } }, 'GLIDE');
  function gl() { glide.classList.toggle('on', !!PL.glide); }
  function force(el) { var w = el.clientWidth || main.clientWidth || (window.innerWidth - 80), per = { s: 46, m: 62, l: 76 }[CFG.skw] || 76; return clamp(Math.ceil((w / per - 1) / 7 - .1), 1, 5); }
  function xset(m) {
    if (m) { xMode = m; store('beh.stage', m); }
    bSplit.classList.toggle('on', xMode === 'split'); bPad.classList.toggle('on', xMode === 'pad'); gl(); glide.style.display = xMode === 'pad' ? '' : 'none';
    KBDS = KBDS.filter(function (k) { return !main.contains(k); }); main.innerHTML = ''; main.className = 'dxmain m-' + xMode;
    if (xMode === 'split') {
      var sp = h('div', { class: 'dxsplit' });
      /* two rows one above the other: the upper one continues where the lower one ends */
      [[1, 9000], [0, 9500]].forEach(function (r) {
        var el = h('div', { class: 'kbd' });
        el._force = function () { return force(el); }; el._oct = function () { return clamp(PL.oct + (r[0] ? (el._oc || 1) : 0), 0, 7); }; el._idb = r[1];
        sp.append(el);
      });
      main.append(sp); requestAnimationFrame(function () { $$('.kbd', sp).forEach(buildKeyboard); });
    } else { main.append(pad); padD.rebuild(); }
  }
  var lastP = isPortrait();
  window.addEventListener('resize', function () {
    var p = isPortrait(); if (p === lastP) return; lastP = p;
    if (p && typeof stageEl !== 'undefined' && stageEl && stageEl.classList.contains('on')) closeStage();   /* no full-screen Stage in portrait */
    if (p && dock.classList.contains('open') && Hold.fingers === 0) requestAnimationFrame(function () { xset(); });
  });
  dock._xset = xset; xset();
  return h('div', { class: 'dxp' }, h('div', { class: 'dxbar' }, h('div', { class: 'seg' }, bSplit, bPad), h('span', { class: 'dgap' }), glide),
    h('div', { class: 'dxbody' }, main, h('div', { class: 'wgrp' }, Wheel('pitch'), Wheel('mod'))));
}
function buildDock() {
  var dock = h('div', { id: 'dock' }), kb = h('div', { class: 'kbd', id: 'kbdDock' });
  dockEl = dock; buildKeyboard(kb);
  dock.append(controls('drow'), h('div', { class: 'dmain' }, Wheel('pitch'), kb, Wheel('mod')), buildDockWindow(dock));
  if (store('behemoth.dockMin')) setDockMin(true);
  else if (store('behemoth.dockOpen')) setDockOpen(true);
  return dock;
}
var surfaces = [], active = {};
function Surface(el, cols) {
  var cells = [], dots = {};
  function want() { return el._cols || (window.innerWidth >= 900 ? 12 : 8); }
  function build() {
    cols = want(); el.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)'; cells = [];
    el.innerHTML = '';
    for (var i = 0; i < cols; i++) { var c = h('div', { class: 'cell' }, NN[degNote(i) % 12] + Math.floor(degNote(i) / 12 - 1)); if (i % SCALES[PL.scale][1].length === 0) c.classList.add('root'); el.append(c); cells.push(c); }
    cells.length = cols;
  }
  function relax(e) { var p = lpos(el, e); return { x: p.x / p.w, y: p.y / p.h }; }
  function press(e) { var w = Math.max(e.width || 0, e.height || 0); if (e.pointerType === 'touch' && w > 1) return clamp((w - 10) / 38, 0, 1); return e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.5; }
  window.addEventListener('resize', function () { if (want() !== cols && !Object.keys(st).length) build(); });
  var st = {};
  el.addEventListener('pointerdown', function (e) {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
    var p = relax(e), col = clamp(Math.floor(p.x * cols), 0, cols - 1), note = degNote(col), id = 5000 + e.pointerId, vel = clamp(0.55 + (1 - p.y) * 0.4, 0.3, 1);
    st[e.pointerId] = { id: id, col: col, note: note };
    playOn(note, vel, id); A.send({ t: 'y', id: id, v: clamp(1 - p.y, 0, 1) });
    var d = h('div', { class: 'dotp' }); d.style.display = 'block'; d.style.left = (p.x * 100) + '%'; d.style.top = (p.y * 100) + '%'; el.append(d); dots[e.pointerId] = d;
    cells[col] && cells[col].classList.add('on'); active[id] = true;
  });
  el.addEventListener('pointermove', function (e) {
    var s = st[e.pointerId]; if (!s) return; var p = relax(e);
    if (PL.glide) { var fx = clamp(p.x * cols - 0.5, 0, cols - 1), semis = degPitch(fx) - s.note; A.send({ t: 'bend', id: s.id, v: clamp(semis, -24, 24) }); }
    A.send({ t: 'y', id: s.id, v: clamp(1 - p.y, 0, 1) }); A.send({ t: 'z', id: s.id, v: press(e) });
    var d = dots[e.pointerId]; if (d) { d.style.left = (clamp(p.x, 0, 1) * 100) + '%'; d.style.top = (clamp(p.y, 0, 1) * 100) + '%'; }
    var col = clamp(Math.floor(p.x * cols), 0, cols - 1); if (col !== s.hcol) { cells.forEach(function (c) { c.classList.remove('on'); }); cells[col].classList.add('on'); s.hcol = col; }
  });
  function end(e) {
    var s = st[e.pointerId]; if (!s) return;
    playOff(s.id); delete st[e.pointerId]; delete active[s.id];
    if (dots[e.pointerId]) { dots[e.pointerId].remove(); delete dots[e.pointerId]; }
    if (!Object.keys(st).length) cells.forEach(function (c) { c.classList.remove('on'); });
  }
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  build(); var S2 = { rebuild: build }; surfaces.push(S2); return S2;
}
function rebuildSurfaces() { surfaces.forEach(function (s) { s.rebuild(); }); }
var KBDS = [], octLabels = [];
function rebuildKbds() { KBDS.forEach(function (el) { buildKeyboard(el); }); }
function kbdOcts(el) {
  if (el._force) return el._force();
  if (CFG.keys !== 'auto') return +CFG.keys;
  var w = el.clientWidth || Math.min(window.innerWidth, 700), per = CFG.kh === 'l' ? 40 : 34;
  return Math.max(1, Math.min(3, Math.floor(w / per / 7)));
}
function kOct(el) { return el._oct ? el._oct() : PL.oct; }
function buildKeyboard(el) {
  if (KBDS.indexOf(el) < 0) KBDS.push(el);
  var oc = kbdOcts(el); el._oc = oc; el.innerHTML = '';
  var WS = [0, 2, 4, 5, 7, 9, 11], nw = 7 * oc + 1, bw = 100 / nw, i, o;
  for (i = 0; i < nw; i++) el.append(h('div', { class: 'wk', 'data-s': 12 * Math.floor(i / 7) + WS[i % 7] }, i % 7 === 0 ? 'C' + (kOct(el) + Math.floor(i / 7)) : ''));
  for (o = 0; o < oc; o++) [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]].forEach(function (b) { var k = h('div', { class: 'bk', 'data-s': 12 * o + b[0] }); k.style.left = ((o * 7 + b[1]) * bw) + '%'; k.style.width = (bw * 0.62) + '%'; el.append(k); });
  if (el._wired) return; el._wired = true;
  var fing = el._fing = {};
  if (window.ResizeObserver) new ResizeObserver(function () { if (kbdOcts(el) !== el._oc && !Object.keys(fing).length) buildKeyboard(el); }).observe(el);
  function keyAt(x, y) { var t = document.elementFromPoint(x, y); return t && t.dataset && t.dataset.s !== undefined && el.contains(t) ? t : null; }
  function nn(k) { return 12 * (kOct(el) + 1) + PL.root + (+k.dataset.s); }
  el.addEventListener('pointerdown', function (e) {
    var k = keyAt(e.clientX, e.clientY); if (!k) return;
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
    fing[e.pointerId] = { k: k }; k.classList.add('on'); playOn(nn(k), 0.8, (el._idb || 6000) + (+k.dataset.s));
  });
  el.addEventListener('pointermove', function (e) {
    var f = fing[e.pointerId]; if (!f) return; var k = keyAt(e.clientX, e.clientY);
    if (k && k !== f.k) { f.k.classList.remove('on'); A.send({ t: 'off', id: (el._idb || 6000) + (+f.k.dataset.s) }); k.classList.add('on'); A.send({ t: 'on', n: nn(k), vel: 0.8, id: (el._idb || 6000) + (+k.dataset.s) }); f.k = k; }
  });
  function up(e) { var f = fing[e.pointerId]; if (!f) return; f.k.classList.remove('on'); playOff((el._idb || 6000) + (+f.k.dataset.s)); delete fing[e.pointerId]; }
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}

