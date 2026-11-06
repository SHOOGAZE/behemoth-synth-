var DEFAULT_P = {}; for (k0 in S.PARAMS) DEFAULT_P[k0] = S.PARAMS[k0][0];
var curPreset = 'Behemoth Growl';
function f32b64(f) { var u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength), s = '', i; for (i = 0; i < u.length; i += 0x4000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x4000)); return btoa(s); }
function b64f32(b) { var s = atob(b), u = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer); }
function snapshot(name) {
  var o = { schema: 'behemoth.preset', version: 1, name: name, p: {}, routes: ROUTES.map(function (r) { return { s: SRC[r.s].id, d: DST[r.d].id, a: +r.a.toFixed(3) }; }),
    lfo: [Array.prototype.map.call(LFO[0], function (v) { return +v.toFixed(3); }), Array.prototype.map.call(LFO[1], function (v) { return +v.toFixed(3); })], tables: [TAB[0].name, TAB[1].name] };
  for (var k in P) if (k !== 'tune' && Math.abs(P[k] - DEFAULT_P[k]) > 1e-9) o.p[k] = +P[k].toFixed(5);
  if (TAB[0].name === 'Custom' || TAB[1].name === 'Custom') o.custom = { n: lib.Custom.n, data: f32b64(lib.Custom.data) };
  return o;
}
function setTable(slot, name, silent) {
  var t = lib[name] || lib['Basic Shapes'];
  TAB[slot] = { name: name, n: t.n, data: t.data };
  if (!silent) histMark();
  if (!silent) A.send({ t: 'table', slot: slot, data: t.data, n: t.n });
}
function applyPreset(o, silent) {
  var k, i;
  for (k in DEFAULT_P) P[k] = DEFAULT_P[k];
  P.tune = CFG.tune || 0;
  for (k in o.p) if (k !== 'tune' && S.PARAMS[k]) P[k] = clamp(o.p[k], S.PARAMS[k][1], S.PARAMS[k][2]);
  ROUTES = (o.routes || []).map(function (r) { return { s: typeof r.s === 'string' ? srcIdx(r.s) : r.s, d: typeof r.d === 'string' ? dstIdx(r.d) : r.d, a: r.a }; }).filter(function (r) { return r.s >= 0 && r.d >= 0; }).slice(0, 24);
  if (o.custom) { lib.Custom = { n: o.custom.n, data: b64f32(o.custom.data) }; }
  LFO[0] = o.lfo ? Float32Array.from(o.lfo[0]) : shape('sine'); LFO[1] = o.lfo ? Float32Array.from(o.lfo[1]) : shape('tri');
  var tn = o.tables || ['Basic Shapes', 'Glass Bells'];
  setTable(0, tn[0], true); setTable(1, tn[1], true);
  SEL = null; curPreset = o.name || 'Untitled'; applyMacroNames();
  if (!HIST.restoring) { histReset(); if (!silent) noteRecent(curPreset); }
  $('#presetName').textContent = curPreset; stageEl && stageEl._name && (stageEl._name.textContent = curPreset);
  if (!silent) syncAll();
  refreshAll();
}
