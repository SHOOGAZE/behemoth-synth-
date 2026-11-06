/* ------------------------------------------------ edit history (undo / redo), A/B compare, randomize / mutate */
var HIST = { stack: [], idx: -1, orig: null, timer: 0, restoring: false };
var AB = { on: false, edit: null };
function histSig(o) { return JSON.stringify([o.p, o.routes, o.tables, o.lfo]); }
function histReset() { clearTimeout(HIST.timer); HIST.timer = 0; var o = snapshot(curPreset); HIST.stack = [o]; HIST.idx = 0; HIST.orig = o; AB.on = false; AB.edit = null; histUi(); }
function histPush() {
  clearTimeout(HIST.timer); HIST.timer = 0; if (HIST.restoring) return;
  var o = snapshot(curPreset), cur = HIST.stack[HIST.idx];
  if (cur && histSig(cur) === histSig(o)) { histUi(); return; }
  HIST.stack.length = HIST.idx + 1; HIST.stack.push(o); if (HIST.stack.length > 60) HIST.stack.shift(); HIST.idx = HIST.stack.length - 1; histUi();
}
function histMark() {
  if (HIST.restoring) return;
  if (AB.on) { AB.on = false; AB.edit = null; histUi(); }
  clearTimeout(HIST.timer); HIST.timer = setTimeout(histPush, 600);
}
function applyState(o) { HIST.restoring = true; try { applyPreset(o, false); } finally { HIST.restoring = false; } }
function histUndo() { if (HIST.timer) histPush(); if (HIST.idx <= 0) { toast('Nothing to undo'); return; } HIST.idx--; AB.on = false; applyState(HIST.stack[HIST.idx]); histUi(); buzz(6); }
function histRedo() { if (HIST.timer) histPush(); if (HIST.idx >= HIST.stack.length - 1) { toast('Nothing to redo'); return; } HIST.idx++; AB.on = false; applyState(HIST.stack[HIST.idx]); histUi(); buzz(6); }
function abToggle() {
  if (!HIST.orig) return;
  if (!AB.on) { if (HIST.timer) histPush(); AB.edit = snapshot(curPreset); if (histSig(AB.edit) === histSig(HIST.orig)) { toast('Nothing changed yet'); return; } AB.on = true; applyState(HIST.orig); toast('B · original preset'); }
  else { AB.on = false; applyState(AB.edit); AB.edit = null; toast('A · your edit'); }
  histUi(); buzz(8);
}
var histEls = [];
function histUi() {
  histEls.forEach(function (e) {
    if (e.k === 'undo') e.el.disabled = HIST.idx <= 0 && !HIST.timer;
    else if (e.k === 'redo') e.el.disabled = HIST.idx >= HIST.stack.length - 1;
    else if (e.k === 'ab') { e.el.classList.toggle('on', AB.on); e.el.textContent = AB.on ? 'B' : 'A/B'; }
  });
}
function histBtn(k, txt, label, fn, cls) { var b = h('button', { class: cls || 'pnav', type: 'button', 'aria-label': label, onclick: fn }, txt); histEls.push({ k: k, el: b }); return b; }

var RND = { aPos: [0, 1], bPos: [0, 1], aWarp: [0, .8], bWarp: [0, .8], aWMode: [0, 9, 1], bWMode: [0, 9, 1], aUni: [1, 6, 1], bUni: [1, 5, 1], aDet: [0, .5], bDet: [0, .4], aBlend: [.4, 1], aSpread: [.3, 1],
  fType: [0, 7, 1], fCut: [.25, .92], fRes: [0, .65], fDrive: [0, .6], fEnv: [-.3, .7], e1A: [.001, 1.2, 0, 1], e1D: [.1, 1.5, 0, 1], e1S: [.1, 1], e1R: [.05, 2, 0, 1], e2A: [.001, 1, 0, 1], e2D: [.1, 1.5, 0, 1], e2S: [0, .8], e2R: [.05, 2, 0, 1],
  l1Rate: [.1, 12, 0, 1], l2Rate: [.1, 8, 0, 1], dlMix: [0, .4], dlFb: [.2, .65], rvMix: [0, .5], chMix: [0, .5], fxDrive: [0, .5], subLev: [0, .6] };
var RND_SRC = ['lfo1', 'lfo2', 'env2', 'm1', 'm2', 'velo', 'ypos', 'press'], RND_DST = ['aPos', 'bPos', 'aWarp', 'bWarp', 'fCut', 'fRes', 'fDrive', 'aDet', 'rvMix', 'dlMix'];
function rr(a, b, expo) { var u = Math.random(); return expo ? a * Math.pow(b / a, u) : a + (b - a) * u; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function morph(amount) {            /* amount 1 = full randomize, small = gentle mutation */
  var o = snapshot(curPreset), p = {}, k, r, full = amount >= 1;
  for (k in P) if (k !== 'tune' && Math.abs(P[k] - DEFAULT_P[k]) > 1e-9) p[k] = P[k];
  for (k in RND) {
    r = RND[k]; if (!full && Math.random() > 0.55) continue;
    var cur = k in p ? p[k] : DEFAULT_P[k], v;
    if (full) v = r[3] ? rr(r[0], r[1], true) : rr(r[0], r[1]);
    else v = r[3] ? cur * Math.exp((Math.random() - .5) * 2 * amount * 1.5) : cur + (Math.random() - .5) * 2 * amount * (r[1] - r[0]);
    v = clamp(v, r[0], r[1]); if (r[2]) v = Math.round(v); p[k] = v;
  }
  if (full) { p.aOn = 1; p.aLev = rr(.8, 1); p.bOn = Math.random() < .5 ? 1 : 0; p.bLev = rr(.4, .8); p.subOn = Math.random() < .4 ? 1 : 0; p.fKey = rr(.2, .7); }
  var routes = o.routes.map(function (x) { return { s: x.s, d: x.d, a: x.a }; });
  if (full) { routes = []; var nr = 2 + Math.floor(Math.random() * 4); for (var i = 0; i < nr; i++) { var s0 = pick(RND_SRC), d0 = pick(RND_DST); if (!routes.some(function (x) { return x.s === s0 && x.d === d0; })) routes.push({ s: s0, d: d0, a: +(rr(.15, .6) * (Math.random() < .25 ? -1 : 1)).toFixed(2) }); } }
  else { routes.forEach(function (x) { x.a = +clamp(x.a + (Math.random() - .5) * 2 * amount * 1.2, -1, 1).toFixed(3); }); if (Math.random() < .25) { var s1 = pick(RND_SRC), d1 = pick(RND_DST); if (!routes.some(function (x) { return x.s === s1 && x.d === d1; }) && routes.length < 12) routes.push({ s: s1, d: d1, a: +rr(.15, .45).toFixed(2) }); } else if (routes.length > 1 && Math.random() < .2) routes.splice(Math.floor(Math.random() * routes.length), 1); }
  var tabs = o.tables.slice(); if (full) { var T = ['Basic Shapes', 'Glass Bells', 'Digital Grit', 'Vowel Choir', 'Analog Saw', 'FM Bloom']; tabs = [pick(T), pick(T)]; }
  var out = { schema: 'behemoth.preset', version: 1, name: curPreset, p: p, routes: routes, tables: tabs, lfo: o.lfo };
  for (k in P) if (k !== 'tune' && !(k in RND) && k in o.p) out.p[k] = o.p[k];
  return out;
}
function doMorph(amount) {
  if (HIST.timer) histPush();
  var o = morph(amount);
  /* keep what describes the player's setup rather than the sound */
  ['vol', 'mono', 'glide', 'voices', 'bend', 'arpOn', 'arpMode', 'arpRate', 'arpGate', 'arpOct', 'bpm'].forEach(function (k) { if (k in P && Math.abs(P[k] - DEFAULT_P[k]) > 1e-9) o.p[k] = P[k]; else delete o.p[k]; });
  applyState(o); histPush(); toast(amount >= 1 ? 'Randomized — undo with ↶' : 'Mutated — undo with ↶'); buzz(10);
}

function favs() { return store('behemoth.favs') || []; }
function toggleFav(n) { var f = favs(), i = f.indexOf(n); if (i >= 0) f.splice(i, 1); else f.push(n); store('behemoth.favs', f); }
function noteRecent(n) { var r = (store('behemoth.recent') || []).filter(function (x) { return x !== n; }); r.unshift(n); store('behemoth.recent', r.slice(0, 8)); }
function userPresets() { return store('behemoth.user') || []; }
function loadFactory(i) { var f = FACTORY[i], p = {}; for (var k in f.p) p[k] = f.p[k]; applyPreset({ name: f.name, p: p, routes: f.routes, tables: f.tables, lfo: f.lfo }); store('behemoth.last', f.name); }


