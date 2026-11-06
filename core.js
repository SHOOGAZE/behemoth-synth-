var S = window.Strata, NS = 'http://www.w3.org/2000/svg';
function $(s, r) { return (r || document).querySelector(s); }
function h(tag, attrs) {
  var e = document.createElement(tag), k, i, kids = Array.prototype.slice.call(arguments, 2);
  if (attrs) for (k in attrs) {
    var v = attrs[k];
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
  }
  (function add(list) { for (i = 0; i < list.length; i++) { var c = list[i]; if (c == null || c === false) continue; if (Array.isArray(c)) add(c); else e.append(c.nodeType ? c : document.createTextNode(c)); } })(kids);
  return e;
}
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
/* user settings: persisted in localStorage, applied to <html> data-attributes and CSS variables */
var CFG = { keys: 'auto', kh: 'm', wheels: 'auto', hand: 'right', dockPlay: 'off',
  lang: 'auto', tips: 'on', text: 'm', contrast: 'normal', hue: 0, sat: 0, glow: 1, srcbar: 'on', hint: 'on', meters: 'on', ksize: 'm', ksens: 1, haptics: 'on', motion: 'auto', wake: 'off', skw: 'l', tune: 0 };
function store(k, v) {
  try {
    if (v === undefined) { var raw = localStorage.getItem(k); if (raw === null && k.indexOf('behemoth.') === 0) raw = localStorage.getItem('strata.' + k.slice(9)); /* migrate data saved by earlier builds */ return JSON.parse(raw); }
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) { return null; }
}
var CFG_DEFAULT = JSON.parse(JSON.stringify(CFG));
(function () { var c = store('beh.cfg'); if (c) for (var k in c) if (k in CFG) CFG[k] = c[k]; })();
function applyCfg() {
  var r = document.documentElement.dataset;
  r.hand = CFG.hand; r.kh = CFG.kh; r.wheels = CFG.wheels; r.srcbar = CFG.srcbar; r.hint = CFG.hint; r.meters = CFG.meters; r.ksize = CFG.ksize; r.text = CFG.text; r.contrast = CFG.contrast;
  store('beh.cfg', CFG);
}
applyCfg();
var toastT; function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1700); }

/* ------------------------------------------------ state */
var P = {}, k0;
for (k0 in S.PARAMS) P[k0] = S.PARAMS[k0][0];
P.tune = CFG.tune || 0; /* master tune is a global setting, not part of presets */
var SRC = S.SRCS.map(function (x, i) { return { id: x[0], name: x[1], kind: x[2], i: i }; });
var DST = S.DESTS.map(function (x, i) { return { id: x[0], name: x[1], i: i }; });
function srcIdx(id) { for (var i = 0; i < SRC.length; i++) if (SRC[i].id === id) return i; return -1; }
function dstIdx(id) { for (var i = 0; i < DST.length; i++) if (DST[i].id === id) return i; return -1; }
function srcCls(s) { return s.id === 'velo' || s.id === 'key' ? 's-key' : 's-' + s.kind; }
function srcVar(s) { return s.id === 'velo' || s.id === 'key' ? '--c-key' : s.kind === 'lfo' ? '--c-lfo' : s.kind === 'env' ? '--c-env' : s.kind === 'macro' ? '--c-macro' : '--c-touch'; }
var BIPOLAR = { lfo1: 1, lfo2: 1, key: 1, tilt: 1, ypos: 1 };
var ROUTES = [], SEL = null;
var LFO = [new Float32Array(64), new Float32Array(64)];
var TAB = [null, null];
var lib = {};
S.TABLE_NAMES.forEach(function (n) { lib[n] = S.makeTable(n); });
var binders = [], knobs = [];
function shape(kind) {
  var a = new Float32Array(64), i, t;
  for (i = 0; i < 64; i++) {
    t = i / 64;
    a[i] = kind === 'sine' ? Math.sin(2 * Math.PI * t) : kind === 'tri' ? 1 - 4 * Math.abs(t - 0.5) : kind === 'saw' ? 1 - 2 * t : kind === 'ramp' ? 2 * t - 1 : kind === 'sq' ? (t < 0.5 ? 1 : -1) : (Math.random() * 2 - 1);
  }
  if (kind === 'tri') for (i = 0; i < 64; i++) a[i] = 1 - 4 * Math.abs(i / 64 - 0.5) * 1; // triangle -1..1
  return a;
}
LFO[0] = shape('sine'); LFO[1] = shape('tri');


/* ------------------------------------------------ theme: illumination colour, motion, haptics, wake lock */
var ACC = { r: 255, g: 42, b: 31 };
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
function accA(a) { return 'rgba(' + ACC.r + ',' + ACC.g + ',' + ACC.b + ',' + a + ')'; }
/* one hue, five related shades: accent, text-on-dark, and the LFO / ENV / MACRO / TOUCH source colours */
function applyTheme() {
  var r = document.documentElement.style, hue = CFG.hue, s = CFG.sat, white = true, v = {};
  v['--accent'] = white ? hsl(0, 0, 90) : hsl(hue, s, 56);
  v['--accent-fg'] = white ? hsl(0, 0, 96) : hsl(hue, s, 65);
  v['--c-lfo'] = white ? hsl(0, 0, 84) : hsl(hue, s, 59);
  v['--c-env'] = white ? hsl(0, 0, 66) : hsl(hue + 4, s, 70);
  v['--c-macro'] = white ? hsl(0, 0, 50) : hsl(hue + 4, s, 80);
  v['--c-touch'] = white ? hsl(0, 0, 38) : hsl(hue - 12, s * .85, 42);
  v['--accent-ink'] = hsl(hue, white ? 0 : 100, 4);
  ACC.r = parseInt(v['--accent'].slice(1, 3), 16); ACC.g = parseInt(v['--accent'].slice(3, 5), 16); ACC.b = parseInt(v['--accent'].slice(5, 7), 16);
  v['--accent-glow'] = accA(0.45 * CFG.glow);
  for (var k in v) r.setProperty(k, v[k]);
  for (k in _cssv) delete _cssv[k];
  cssvCache.accent = v['--accent'];
  if (typeof drawAllVis === 'function') drawAllVis();
}
var MQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
function applyMotion() {
  REDUCE = CFG.motion === 'off' || (CFG.motion === 'auto' && MQ.matches);
  document.documentElement.classList.toggle('calm', REDUCE);
}
function buzz(ms) { if (CFG.haptics === 'on' && navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) { } } }
var wakeLock = null;
function applyWake() {
  if (!navigator.wakeLock) return;
  if (CFG.wake === 'on') navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () { });
  else if (wakeLock) { wakeLock.release().catch(function () { }); wakeLock = null; }
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && CFG.wake === 'on') applyWake(); });

