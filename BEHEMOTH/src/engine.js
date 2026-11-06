/* STRATA DSP core — shared by AudioWorklet, ScriptProcessor fallback and Node tests.
 * Real-time safe in process(): no allocations, typed arrays only. */
(function (root) {
'use strict';
var PI2 = Math.PI * 2, FS = 2048, NMIP = 10, MAXV = 8, CT = 16, NSRC = 12, NDEST = 32, MAXR = 24;

/* ---------------- helpers ---------------- */
function th(x) { if (x > 3) return 1; if (x < -3) return -1; return x * (27 + x * x) / (27 + 9 * x * x); }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

function fft(re, im, inv) {
  var n = re.length, i, j, bit, t;
  for (i = 1, j = 0; i < n; i++) {
    bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (var len = 2; len <= n; len <<= 1) {
    var ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (i = 0; i < n; i += len) {
      var cr = 1, ci = 0;
      for (j = 0; j < half; j++) {
        var a = i + j, b = a + half;
        var xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/* Build band-limited mip-maps for a table of n frames (time-domain, FS samples each). */
var _bre = new Float64Array(FS), _bim = new Float64Array(FS), _bor = new Float64Array(FS), _boi = new Float64Array(FS);
function buildFrame(mips, f, src, so) {
  var i, h, m, re = _bre, im = _bim, or = _bor, oi = _boi;
  for (i = 0; i < FS; i++) { re[i] = src[so + i]; im[i] = 0; }
  fft(re, im, false);
  for (m = 0; m < NMIP; m++) {
    var lim = m === 0 ? 1023 : (1024 >> m);
    or.fill(0); oi.fill(0);
    for (h = 1; h <= lim; h++) {
      var x = Math.PI * h / (lim + 1), w = Math.sin(x) / x; // Lanczos sigma
      or[h] = re[h] * w / FS; oi[h] = im[h] * w / FS;
      or[FS - h] = re[h] * w / FS; oi[FS - h] = -im[h] * w / FS;
    }
    fft(or, oi, true);
    var base = f * (FS + 1), dst = mips[m];
    for (i = 0; i < FS; i++) dst[base + i] = or[i];
    dst[base + FS] = or[0];
  }
}
function buildTable(data, n) {
  var mips = [], m, f;
  for (m = 0; m < NMIP; m++) mips.push(new Float32Array(n * (FS + 1)));
  for (f = 0; f < n; f++) buildFrame(mips, f, data, f * FS);
  return { n: n, mips: mips };
}

function mipFor(inc) {
  var mh = 0.5 / inc;
  if (mh >= 1023) return 0;
  var m = Math.ceil(Math.log(1024 / mh) / Math.LN2);
  return m > NMIP - 1 ? NMIP - 1 : m < 0 ? 0 : m;
}

/* ---------------- factory wavetables ---------------- */
function normFrame(a, off) {
  var pk = 0, i, mean = 0;
  for (i = 0; i < FS; i++) mean += a[off + i];
  mean /= FS;
  for (i = 0; i < FS; i++) { a[off + i] -= mean; var v = Math.abs(a[off + i]); if (v > pk) pk = v; }
  if (pk > 1e-9) for (i = 0; i < FS; i++) a[off + i] /= pk;
}
// amps[h], phs[h] (h = 1..) -> time-domain frame via inverse FFT
function frameFromSpectrum(out, off, amps, phs) {
  var re = new Float64Array(FS), im = new Float64Array(FS), h, i;
  var nh = Math.min(amps.length - 1, 1000);
  for (h = 1; h <= nh; h++) {
    var a = amps[h] || 0, ph = phs ? (phs[h] || 0) : 0;
    re[h] = a / 2 * Math.sin(ph); im[h] = -a / 2 * Math.cos(ph);
    re[FS - h] = re[h]; im[FS - h] = -im[h];
  }
  fft(re, im, true);
  for (i = 0; i < FS; i++) out[off + i] = re[i];
  normFrame(out, off);
}
var TABLE_NAMES = ['Basic Shapes', 'Glass Bells', 'Digital Grit', 'Vowel Choir', 'Analog Saw', 'FM Bloom', 'Custom'];
function makeTable(name) {
  var n, out, f, i, h, t;
  if (name === 'Basic Shapes') {
    n = 32; out = new Float32Array(n * FS);
    for (f = 0; f < n; f++) {
      var x = f / (n - 1) * 3, A = new Float64Array(400), P = new Float64Array(400);
      var seg = Math.min(2, Math.floor(x)), u = x - seg;
      for (h = 1; h < 400; h++) {
        var sine = h === 1 ? 1 : 0, tri = (h & 1) ? 1 / (h * h) * ((h % 4 === 1) ? 1 : -1) : 0, saw = 1 / h, sq = (h & 1) ? 1 / h : 0;
        var a, b;
        if (seg === 0) { a = sine; b = tri * 1; } else if (seg === 1) { a = tri; b = saw; } else { a = saw; b = sq; }
        if (seg === 0) { var sa = h === 1 ? 1 : 0, tb = (h & 1) ? (8 / (Math.PI * Math.PI)) / (h * h) * ((h % 4 === 1) ? 1 : -1) : 0; A[h] = Math.abs(sa * (1 - u) + tb * u); P[h] = (sa * (1 - u) + tb * u) < 0 ? Math.PI : 0; }
        else if (seg === 1) { var tt = (h & 1) ? (8 / (Math.PI * Math.PI)) / (h * h) * ((h % 4 === 1) ? 1 : -1) : 0, ss = 1 / h * (2 / Math.PI) * 0.9; var v = tt * (1 - u) + ss * u; A[h] = Math.abs(v); P[h] = v < 0 ? Math.PI : 0; }
        else { var s2 = 1 / h * 0.64, q2 = (h & 1) ? 4 / (Math.PI * h) : 0; var v2 = s2 * (1 - u) + q2 * u; A[h] = Math.abs(v2); P[h] = v2 < 0 ? Math.PI : 0; }
      }
      frameFromSpectrum(out, f * FS, A, P);
    }
    return { n: n, data: out };
  }
  if (name === 'Glass Bells') {
    n = 32; out = new Float32Array(n * FS);
    for (f = 0; f < n; f++) {
      var A2 = new Float64Array(200), P2 = new Float64Array(200), k = f / (n - 1);
      for (h = 1; h < 200; h++) {
        var env = Math.exp(-h * (0.03 + 0.04 * (1 - k)));
        var bell = (h === 1 ? 1 : 0) + 0.7 * Math.exp(-Math.pow((h - (2.76 + 8 * k)) / 1.2, 2)) + 0.6 * Math.exp(-Math.pow((h - (5.4 + 14 * k)) / 1.6, 2)) + 0.45 * Math.exp(-Math.pow((h - (8.9 + 22 * k)) / 2.0, 2)) + 0.25 * Math.exp(-Math.pow((h - (13 + 30 * k)) / 2.5, 2));
        A2[h] = bell * (0.6 + 0.4 * env); P2[h] = Math.sin(h * 12.9898 + f) * 3;
      }
      frameFromSpectrum(out, f * FS, A2, P2);
    }
    return { n: n, data: out };
  }
  if (name === 'Digital Grit') {
    n = 32; out = new Float32Array(n * FS);
    for (f = 0; f < n; f++) {
      var k2 = f / (n - 1), pw = 0.5 - 0.46 * k2, steps = Math.round(64 - 56 * k2), shape = f < 16 ? 0 : 1;
      for (i = 0; i < FS; i++) {
        t = i / FS;
        var v3 = t < pw ? 1 : -1;
        if (shape) { var sw = 2 * t - 1; v3 = Math.round(sw * steps / 2) / (steps / 2) * (1 - (k2 - 0.5) * 0.4) + (t < pw ? 0.35 : -0.35); }
        out[f * FS + i] = v3;
      }
      normFrame(out, f * FS);
    }
    return { n: n, data: out };
  }
  if (name === 'Vowel Choir') {
    n = 20; out = new Float32Array(n * FS);
    var V = [[800, 1150, 2900], [400, 1600, 2700], [350, 1700, 2700], [450, 800, 2830], [325, 700, 2530]], f0 = 110;
    for (f = 0; f < n; f++) {
      var pos = f / (n - 1) * 4, vi = Math.min(3, Math.floor(pos)), uu = pos - vi;
      var F = [0, 1, 2].map(function (q) { return V[vi][q] * (1 - uu) + V[vi + 1][q] * uu; });
      var A3 = new Float64Array(300), P3 = new Float64Array(300);
      for (h = 1; h < 300; h++) {
        var fr = h * f0, g = 0;
        g += 1.0 * Math.exp(-Math.pow((fr - F[0]) / (60 + 0.08 * F[0]), 2));
        g += 0.6 * Math.exp(-Math.pow((fr - F[1]) / (80 + 0.08 * F[1]), 2));
        g += 0.35 * Math.exp(-Math.pow((fr - F[2]) / (120 + 0.06 * F[2]), 2));
        A3[h] = (g + 0.02) / Math.pow(h, 0.35); P3[h] = Math.sin(h * 4.17) * 0.8;
      }
      frameFromSpectrum(out, f * FS, A3, P3);
    }
    return { n: n, data: out };
  }
  if (name === 'Analog Saw') {
    n = 32; out = new Float32Array(n * FS);
    for (f = 0; f < n; f++) {
      var k3 = f / (n - 1), A4 = new Float64Array(500), P4 = new Float64Array(500);
      for (h = 1; h < 500; h++) {
        var sawA = 1 / h, pulse = (h & 1) ? 1 / h : 0, rolloff = 1 / (1 + Math.pow(h / (8 + 120 * (1 - k3 * 0.5)), 2));
        A4[h] = (sawA * (1 - 0.6 * k3) + pulse * 0.6 * k3) * rolloff;
        P4[h] = k3 * 0.5 * Math.sin(h * 2.3);
      }
      frameFromSpectrum(out, f * FS, A4, P4);
    }
    return { n: n, data: out };
  }
  if (name === 'FM Bloom') {
    n = 32; out = new Float32Array(n * FS);
    for (f = 0; f < n; f++) {
      var idx = f / (n - 1) * 6, ratio = f < 16 ? 2 : 3;
      for (i = 0; i < FS; i++) { t = i / FS; out[f * FS + i] = Math.sin(PI2 * t + idx * Math.sin(PI2 * ratio * t)); }
      normFrame(out, f * FS);
    }
    return { n: n, data: out };
  }
  // Custom: 16 frames, sine->saw morph so the editor starts with something useful
  n = 16; out = new Float32Array(n * FS);
  for (f = 0; f < n; f++) {
    var k4 = f / (n - 1), A5 = new Float64Array(200);
    for (h = 1; h < 200; h++) A5[h] = (h === 1 ? 1 - k4 : 0) + k4 / h;
    frameFromSpectrum(out, f * FS, A5, null);
  }
  return { n: n, data: out };
}

/* ---------------- parameter registry ---------------- */
var PARAMS = {
  aOn: [1, 0, 1], aPos: [0, 0, 1], aLev: [0.8, 0, 1], aPan: [0, -1, 1], aOct: [0, -3, 3], aSemi: [0, -12, 12], aFine: [0, -100, 100],
  aUni: [1, 1, 7], aDet: [0.2, 0, 1], aBlend: [0.7, 0, 1], aSpread: [0.6, 0, 1], aWMode: [0, 0, 9], aWarp: [0, 0, 1],
  bOn: [0, 0, 1], bPos: [0, 0, 1], bLev: [0.6, 0, 1], bPan: [0, -1, 1], bOct: [0, -3, 3], bSemi: [0, -12, 12], bFine: [0, -100, 100],
  bUni: [1, 1, 7], bDet: [0.2, 0, 1], bBlend: [0.7, 0, 1], bSpread: [0.6, 0, 1], bWMode: [0, 0, 9], bWarp: [0, 0, 1],
  subOn: [0, 0, 1], subWave: [0, 0, 3], subLev: [0.5, 0, 1], subOct: [1, 1, 2],
  nzLev: [0, 0, 1], nzType: [0, 0, 1],
  fType: [0, 0, 7], fCut: [0.7, 0, 1], fRes: [0.15, 0, 1], fDrive: [0, 0, 1], fKey: [0.3, 0, 1], fEnv: [0.3, -1, 1], fMix: [1, 0, 1],
  e1A: [0.005, 0.001, 8], e1D: [0.3, 0.001, 8], e1S: [0.7, 0, 1], e1R: [0.4, 0.001, 10],
  e2A: [0.005, 0.001, 8], e2D: [0.5, 0.001, 8], e2S: [0.2, 0, 1], e2R: [0.5, 0.001, 10],
  l1Rate: [1, 0.02, 30], l2Rate: [0.3, 0.02, 30], l1Smooth: [1, 0, 1], l2Smooth: [1, 0, 1],
  m1: [0.5, 0, 1], m2: [0.5, 0, 1], m3: [0.5, 0, 1], m4: [0.5, 0, 1],
  tune: [0, -100, 100], vol: [0.7, 0, 1], glide: [0, 0, 1], bend: [2, 0, 24], mono: [0, 0, 1], voices: [8, 1, MAXV], vel: [0.7, 0, 1],
  fxDrive: [0, 0, 1], chMix: [0, 0, 1], chRate: [0.4, 0.05, 4], chDepth: [0.5, 0, 1],
  dlMix: [0, 0, 1], dlTime: [320, 20, 1200], dlFb: [0.4, 0, 0.95],
  rvMix: [0, 0, 1], rvSize: [0.6, 0, 1], rvDamp: [0.4, 0, 1],
  arpOn: [0, 0, 1], arpMode: [0, 0, 4], arpRate: [2, 0, 5], arpGate: [0.6, 0.05, 1], arpOct: [1, 1, 4], bpm: [120, 40, 240],
  arpSwing: [0, 0, 0.75], arpProb: [1, 0, 1], arpHuman: [0, 0, 1], arpAcc: [0.5, 0, 1]
};
var DESTS = [['aPos', 'A Position'], ['bPos', 'B Position'], ['aWarp', 'A Warp'], ['bWarp', 'B Warp'], ['aLev', 'A Level'], ['bLev', 'B Level'],
  ['pitch', 'Pitch'], ['fCut', 'Cutoff'], ['fRes', 'Resonance'], ['fDrive', 'Drive'], ['aDet', 'Unison Detune'], ['subLev', 'Sub Level'],
  ['nzLev', 'Noise Level'], ['dlMix', 'Delay Mix'], ['rvMix', 'Reverb Mix'], ['fxDrive', 'FX Drive'],
  ['aPan', 'A Pan'], ['bPan', 'B Pan'], ['aFine', 'A Fine Tune'], ['bFine', 'B Fine Tune'], ['aOct', 'A Octave'], ['bOct', 'B Octave'], ['aBlend', 'A Blend'], ['bBlend', 'B Blend'],
  ['aSpread', 'A Stereo Spread'], ['bSpread', 'B Stereo Spread'], ['bDet', 'B Detune'], ['l1Rate', 'LFO 1 Rate'], ['l2Rate', 'LFO 2 Rate'], ['chMix', 'Chorus Mix'], ['dlFb', 'Delay Feedback'], ['vol', 'Volume']];
var SRCS = [['lfo1', 'LFO 1', 'lfo'], ['lfo2', 'LFO 2', 'lfo'], ['env2', 'ENV 2', 'env'], ['m1', 'MACRO 1', 'macro'], ['m2', 'MACRO 2', 'macro'],
  ['m3', 'MACRO 3', 'macro'], ['m4', 'MACRO 4', 'macro'], ['velo', 'VELOCITY', 'touch'], ['key', 'KEY', 'touch'], ['press', 'PRESSURE', 'touch'],
  ['tilt', 'TILT', 'touch'], ['ypos', 'Y-AXIS', 'touch']];
var VOWELS = [[800, 1150, 2900], [400, 1600, 2700], [350, 1700, 2700], [450, 800, 2830], [325, 700, 2530]];
var ARP_DIV = [1, 0.5, 0.25, 0.125, 1 / 3, 1 / 6];

/* ---------------- voice ---------------- */
function Voice() {
  this.on = false; this.gate = false; this.id = -1; this.note = 60; this.tnote = 60; this.vel = 1; this.age = 0;
  this.phA = new Float64Array(8); this.phB = new Float64Array(8); this.phS = 0;
  this.e1s = 0; this.e1 = 0; this.e2s = 0; this.e2 = 0;
  this.fL = new Float64Array(12); this.fR = new Float64Array(12);
  this.cbL = new Float32Array(4096); this.cbR = new Float32Array(4096); this.cw = 0;
  this.bend = 0; this.y = 0.5; this.z = 0; this.lastB = 0;
  this.pk0 = 0; this.pk1 = 0; this.pk2 = 0; this.rng = 12345;
  // per-chunk coefficients
  this.g = 0; this.k = 0; this.a1 = 0; this.a2 = 0; this.a3 = 0; this.k2 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0;
  this.fg = [0, 0, 0]; this.fk = [0, 0, 0]; this.ladG = 0; this.ladFb = 0; this.combD = 100; this.combFb = 0;
}

/* ---------------- engine ---------------- */
function Engine(sr) {
  var i, k;
  this.sr = sr || 48000;
  this.p = {}; this.s = {};
  for (k in PARAMS) { this.p[k] = PARAMS[k][0]; this.s[k] = PARAMS[k][0]; }
  this.tbl = [null, null];
  this.setTable(0, makeTable('Basic Shapes').data, makeTable('Basic Shapes').n);
  var t2 = makeTable('Glass Bells'); this.setTable(1, t2.data, t2.n);
  this.lfoT = [new Float32Array(64), new Float32Array(64)];
  for (i = 0; i < 64; i++) { this.lfoT[0][i] = Math.sin(PI2 * i / 64); this.lfoT[1][i] = 1 - 2 * Math.abs(2 * i / 64 - 1); }
  this.lfoPh = [0, 0.37];
  this.v = []; for (i = 0; i < MAXV; i++) this.v.push(new Voice());
  this.rs = new Int32Array(MAXR); this.rd = new Int32Array(MAXR); this.ra = new Float64Array(MAXR); this.nr = 0;
  this.sv = new Float64Array(NSRC); this.md = new Float64Array(NDEST); this.gm = new Float64Array(NDEST);
  this.tilt = 0; this.wheel = 0; this.ageCtr = 0;
  this.live = new Float32Array(16); /* UI feed: [0..11] source values, [12,13] LFO phases, [14] amp env, [2] env2 of the loudest voice */
  this.monoStack = [];
  this.held = []; this.arpT = 0; this.arpGateT = 0; this.arpIdx = 0; this.arpDir = 1; this.arpNote = -1; this.arpList = []; this.arpPat = null; this.arpOff = null; this.arpStep = 0;
  this.bL = new Float32Array(CT); this.bR = new Float32Array(CT);
  this.peak = 0; this.nVoices = 0;
  this.scope = new Float32Array(256); this.scopeW = 0; this.scopeDec = 0;
  this.recomputeEnv = true;
  this.initFx();
}
var EP = Engine.prototype;

EP.initFx = function () {
  var sr = this.sr, i, sc = sr / 44100;
  this.cbufL = new Float32Array(8192); this.cbufR = new Float32Array(8192); this.cw = 0; this.cph = 0;
  var dlen = Math.ceil(sr * 1.35) + 8;
  this.dbL = new Float32Array(dlen); this.dbR = new Float32Array(dlen); this.dw = 0; this.dt = 320 * sr / 1000; this.dlpL = 0; this.dlpR = 0;
  var ct = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], at = [556, 441, 341, 225];
  this.rcL = []; this.rcR = []; this.rci = new Int32Array(16); this.rcs = new Float64Array(16);
  for (i = 0; i < 8; i++) { this.rcL.push(new Float32Array(Math.round(ct[i] * sc))); this.rcR.push(new Float32Array(Math.round((ct[i] + 23) * sc))); }
  this.raL = []; this.raR = []; this.rai = new Int32Array(8);
  for (i = 0; i < 4; i++) { this.raL.push(new Float32Array(Math.round(at[i] * sc))); this.raR.push(new Float32Array(Math.round((at[i] + 23) * sc))); }
};

EP.setTable = function (slot, data, n) {
  if (!n) n = Math.floor(data.length / FS);
  this.tbl[slot] = buildTable(data, n);
};
EP.setFrame = function (slot, f, data) {
  var t = this.tbl[slot]; if (!t || f < 0 || f >= t.n) return;
  buildFrame(t.mips, f, data, 0);
};
EP.set = function (k, val) {
  var d = PARAMS[k]; if (!d) return;
  if (typeof val !== 'number' || val !== val) return;
  this.p[k] = clamp(val, d[1], d[2]);
};
EP.setLfo = function (i, pts) { var t = this.lfoT[i]; for (var j = 0; j < 64; j++) t[j] = pts[j] || 0; };
EP.setMod = function (routes) {
  var n = Math.min(routes.length, MAXR), i;
  for (i = 0; i < n; i++) { this.rs[i] = routes[i].s | 0; this.rd[i] = routes[i].d | 0; this.ra[i] = routes[i].a || 0; }
  this.nr = n;
};
EP.handle = function (m) {
  switch (m.t) {
    case 'p': this.set(m.k, m.v); break;
    case 'bulk': for (var k in m.p) this.set(k, m.p[k]); break;
    case 'table': this.setTable(m.slot, m.data, m.n); break;
    case 'frame': this.setFrame(m.slot, m.f, m.data); break;
    case 'lfo': this.setLfo(m.i, m.pts); break;
    case 'mod': this.setMod(m.routes); break;
    case 'on': this.noteOn(m.n, m.vel, m.id, m.poly); break;
    case 'off': this.noteOff(m.id); break;
    case 'bend': this.voiceSet(m.id, 'bend', m.v); break;
    case 'y': this.voiceSet(m.id, 'y', m.v); break;
    case 'z': this.voiceSet(m.id, 'z', m.v); break;
    case 'tilt': this.tilt = clamp(m.v, -1, 1); break;
    case 'wheel': this.wheel = clamp(m.v, -1, 1); break;
    case 'panic': this.panic(); break;
    case 'arppat': this.arpPat = m.steps && m.steps.length ? m.steps : null; this.arpOff = m.offs || null; break;
  }
};
EP.voiceSet = function (id, f, val) { for (var i = 0; i < MAXV; i++) { var v = this.v[i]; if (v.on && v.id === id) v[f] = val; } };
EP.panic = function () {
  this.held.length = 0; this.monoStack.length = 0; this.arpNote = -1;
  for (var i = 0; i < MAXV; i++) { var v = this.v[i]; v.gate = false; if (v.on) { v.e1s = 4; v.e2s = 4; } }
};

/* ---- note handling ---- */
EP.noteOn = function (note, vel, id, poly) {
  if (vel === undefined) vel = 0.8;
  if (this.p.arpOn >= 0.5) {
    for (var i = 0; i < this.held.length; i++) if (this.held[i].id === id) { this.held.splice(i, 1); break; }
    this.held.push({ n: note, vel: vel, id: id });
    if (this.held.length === 1) { this.arpT = 0; this.arpIdx = 0; this.arpDir = 1; this.arpStep = 0; }
    return;
  }
  this._on(note, vel, id, poly);
};
EP.noteOff = function (id) {
  var i;
  if (this.p.arpOn >= 0.5 || this.held.length) {
    for (i = 0; i < this.held.length; i++) if (this.held[i].id === id) { this.held.splice(i, 1); break; }
    if (this.p.arpOn >= 0.5) return;
  }
  this._off(id);
};
EP._startEnv = function (v) { v.gate = true; v.e1s = 1; v.e2s = 1; v.on = true; };
EP._on = function (note, vel, id, poly) {
  var p = this.p, v = null, i;
  this.ageCtr++;
  if (p.mono >= 0.5 && !poly) {   /* poly: an extra finger or chord note plays alongside the mono voice */
    for (i = 0; i < this.monoStack.length; i++) if (this.monoStack[i].id === id) { this.monoStack.splice(i, 1); break; }
    this.monoStack.push({ n: note, vel: vel, id: id });
    v = this.v[0];
    if (v.on && v.gate) { v.tnote = note; v.id = id; v.vel = vel; return; }
    if (!v.on) v.note = note;
    v.tnote = note; v.id = id; v.vel = vel; v.age = this.ageCtr; v.bend = 0; v.z = 0; v.y = 0.5;
    this._startEnv(v);
    return;
  }
  var lim = Math.max(1, Math.min(MAXV, Math.round(p.voices)));
  for (i = 0; i < lim; i++) if (!this.v[i].on) { v = this.v[i]; break; }
  if (!v) { // steal: prefer released voices, then oldest
    var best = 1e18;
    for (i = 0; i < lim; i++) {
      var c = this.v[i], score = c.age + (c.gate ? 1e9 : 0) + c.e1 * 1e3;
      if (score < best) { best = score; v = c; }
    }
  }
  v.note = note; v.tnote = note; v.id = id; v.vel = vel; v.age = this.ageCtr; v.bend = 0; v.z = 0; v.y = 0.5;
  for (i = 0; i < 8; i++) { v.phA[i] = Math.random(); v.phB[i] = Math.random(); }
  v.phS = 0;
  this._startEnv(v);
};
EP._off = function (id) {
  var i, v, inStack = false;
  if (this.p.mono >= 0.5) {
    for (i = 0; i < this.monoStack.length; i++) if (this.monoStack[i].id === id) { this.monoStack.splice(i, 1); inStack = true; break; }
    v = this.v[0];
    if (inStack && this.monoStack.length) { var t = this.monoStack[this.monoStack.length - 1]; v.tnote = t.n; v.id = t.id; return; }
  }
  for (i = 0; i < MAXV; i++) {
    v = this.v[i];
    if (v.on && v.gate && v.id === id) { v.gate = false; v.e1s = 4; v.e2s = 4; }
  }
};

/* ---- arpeggiator ---- */
EP._arpBuild = function () {
  var p = this.p, notes = this.held.slice(), list = [], o, i;
  if (p.arpMode < 3.5) notes.sort(function (a, b) { return a.n - b.n; });
  var oct = Math.round(p.arpOct);
  for (o = 0; o < oct; o++) for (i = 0; i < notes.length; i++) list.push({ n: notes[i].n + 12 * o, vel: notes[i].vel });
  return list;
};
EP._arpTick = function (n) {
  var p = this.p;
  if (this.arpNote >= 0) {
    this.arpGateT -= n;
    if (this.arpGateT <= 0) { this._off(100000); this.arpNote = -1; }
  }
  if (p.arpOn < 0.5) { if (this.arpNote >= 0) { this._off(100000); this.arpNote = -1; } return; }
  if (!this.held.length) { if (this.arpNote >= 0) { this._off(100000); this.arpNote = -1; } this.arpT = 0; return; }
  this.arpT -= n;
  if (this.arpT > 0) return;
  var base = this.sr * 60 / p.bpm * ARP_DIV[Math.round(p.arpRate)];
  var si = this.arpStep, sw = (si & 1) === 0 ? 1 + p.arpSwing : 1 - p.arpSwing;          /* swing: pairs of steps keep their total length */
  var stepLen = base * sw, hum = p.arpHuman;
  this.arpT += stepLen * (hum > 0 ? 1 + (Math.random() - 0.5) * hum * 0.3 : 1);
  if (this.arpT < 1) this.arpT = stepLen;
  var st = 1, off = 0;
  if (this.arpPat) { var pl = this.arpPat.length; st = this.arpPat[si % pl]; if (this.arpOff) off = this.arpOff[si % pl] || 0; }
  this.arpStep++;
  if (st === 0 || (p.arpProb < 1 && Math.random() > p.arpProb)) { if (this.arpNote >= 0) { this._off(100000); this.arpNote = -1; } return; }
  var list = this._arpBuild(), len = list.length, mode = Math.round(p.arpMode), idx;
  if (!len) return;
  if (mode === 0 || mode === 4) { idx = this.arpIdx % len; this.arpIdx = idx + 1; }
  else if (mode === 1) { idx = len - 1 - (this.arpIdx % len); this.arpIdx++; }
  else if (mode === 2) {
    if (len === 1) idx = 0; else {
      idx = this.arpIdx; if (idx >= len) { idx = len - 2; this.arpDir = -1; } if (idx < 0) { idx = 1; this.arpDir = 1; }
      this.arpIdx = idx + this.arpDir; if (this.arpIdx >= len) { this.arpDir = -1; this.arpIdx = len - 2 < 0 ? 0 : len - 2; } if (this.arpIdx < 0) { this.arpDir = 1; this.arpIdx = 1 < len ? 1 : 0; }
    }
  } else { idx = Math.floor(Math.random() * len); }
  if (this.arpNote >= 0) this._off(100000);
  var item = list[idx], vel = item.vel, acc = p.arpAcc;
  if (this.arpPat) vel = st === 2 ? Math.min(1, vel * (1 + 0.6 * acc)) : vel * (1 - 0.3 * acc);
  if (hum > 0) vel = clamp(vel * (1 + (Math.random() - 0.5) * hum * 0.5), 0.05, 1);
  var note = clamp(item.n + off, 0, 127);
  this._on(note, vel, 100000);
  this.arpNote = note; this.arpGateT = stepLen * p.arpGate;
};

/* ---- control-rate modulation ---- */
EP._lfoVal = function (i, smooth) {
  var t = this.lfoT[i], ph = this.lfoPh[i] * 64, a = ph | 0, f = ph - a, b = (a + 1) & 63;
  if (smooth >= 0.5) return t[a] + (t[b] - t[a]) * f;
  return t[a];
};

/* ---- main render ---- */
EP.process = function (L, R, n) {
  var off = 0, i, c;
  while (off < n) {
    var cn = Math.min(CT, n - off);
    this._chunk(L, R, off, cn);
    off += cn;
  }
  // meters
  var pk = this.peak;
  for (i = 0; i < n; i++) { c = Math.abs(L[i]); if (c > pk) pk = c; }
  this.peak = pk;
};

EP._chunk = function (L, R, off, cn) {
  var p = this.p, s = this.s, sr = this.sr, i, k, vi;
  // param smoothing
  var SM = 0.1;
  s.aPos += (p.aPos - s.aPos) * SM; s.bPos += (p.bPos - s.bPos) * SM; s.aWarp += (p.aWarp - s.aWarp) * SM; s.bWarp += (p.bWarp - s.bWarp) * SM;
  s.aLev += (p.aLev - s.aLev) * SM; s.bLev += (p.bLev - s.bLev) * SM; s.subLev += (p.subLev - s.subLev) * SM; s.nzLev += (p.nzLev - s.nzLev) * SM;
  s.fCut += (p.fCut - s.fCut) * SM; s.fRes += (p.fRes - s.fRes) * SM; s.fDrive += (p.fDrive - s.fDrive) * SM; s.fMix += (p.fMix - s.fMix) * SM;
  s.vol += (p.vol - s.vol) * SM; s.aDet += (p.aDet - s.aDet) * SM; s.bDet += (p.bDet - s.bDet) * SM;
  s.fxDrive += (p.fxDrive - s.fxDrive) * SM; s.dlMix += (p.dlMix - s.dlMix) * SM; s.rvMix += (p.rvMix - s.rvMix) * SM; s.chMix += (p.chMix - s.chMix) * SM;

  // arp
  this._arpTick(cn);

  // LFOs (global, free-running)
  this.lfoPh[0] += p.l1Rate * Math.pow(2, clamp(this.gm[27], -1, 1) * 3) * cn / sr; if (this.lfoPh[0] >= 1) this.lfoPh[0] -= Math.floor(this.lfoPh[0]);
  this.lfoPh[1] += p.l2Rate * Math.pow(2, clamp(this.gm[28], -1, 1) * 3) * cn / sr; if (this.lfoPh[1] >= 1) this.lfoPh[1] -= Math.floor(this.lfoPh[1]);
  var l1 = this._lfoVal(0, p.l1Smooth), l2 = this._lfoVal(1, p.l2Smooth);

  var sv = this.sv, md = this.md, gm = this.gm;
  sv[0] = l1; sv[1] = l2; sv[3] = p.m1; sv[4] = p.m2; sv[5] = p.m3; sv[6] = p.m4; sv[10] = this.tilt;
  sv[2] = 0; sv[7] = 0; sv[8] = 0; sv[9] = 0; sv[11] = 0;
  var lv = this.live; lv[0] = l1; lv[1] = l2; lv[3] = p.m1; lv[4] = p.m2; lv[5] = p.m3; lv[6] = p.m4; lv[10] = this.tilt; lv[12] = this.lfoPh[0]; lv[13] = this.lfoPh[1]; lv[2] = 0; lv[14] = 0;
  gm.fill(0);
  for (i = 0; i < this.nr; i++) gm[this.rd[i]] += sv[this.rs[i]] * this.ra[i];

  // envelope coefficients
  var E1 = this._envCoef(p.e1A, p.e1D, p.e1R, 1), E2 = this._envCoef(p.e2A, p.e2D, p.e2R, CT);

  // glide
  var glideC = p.glide > 0.001 ? 1 - Math.exp(-cn / (sr * (0.005 + p.glide * p.glide * 1.5))) : 1;
  var bl = this.bL, br = this.bR;
  for (i = 0; i < cn; i++) { bl[i] = 0; br[i] = 0; }

  var nv = 0;
  for (vi = 0; vi < MAXV; vi++) {
    var v = this.v[vi];
    if (!v.on) continue;
    nv++;
    // glide / note
    v.note += (v.tnote - v.note) * glideC;
    // env2 (control rate)
    this._env2(v, E2, p);
    if (v.e2 > lv[2]) lv[2] = v.e2; if (v.e1 > lv[14]) lv[14] = v.e1;
    // modulation sum
    sv[2] = v.e2; sv[7] = v.vel; sv[8] = clamp((v.note - 60) / 36, -1, 1); sv[9] = v.z; sv[11] = v.y * 2 - 1;
    md.fill(0);
    for (i = 0; i < this.nr; i++) md[this.rd[i]] += sv[this.rs[i]] * this.ra[i];
    this._voice(v, cn, bl, br, E1, p, s, md);
    if (!v.on) nv--;
  }
  this.nVoices = nv;
  /* idle: no sounding voice -> the free-running LFOs are not reported, so the UI stays still until you play */
  lv[15] = nv > 0 ? 1 : 0;
  if (!nv) { lv[0] = 0; lv[1] = 0; lv[10] = 0; }

  // FX + output
  this._fx(L, R, off, cn, bl, br, s, gm);
};

var _E1 = { a: 0, d: 0, r: 0 }, _E2 = { a: 0, d: 0, r: 0 };
EP._envCoef = function (A, D, R, step) {
  var sr = this.sr, o = step === 1 ? _E1 : _E2;
  o.a = step / (Math.max(A, 0.001) * sr); o.d = Math.exp(-4.6 * step / (Math.max(D, 0.001) * sr)); o.r = Math.exp(-6.9 * step / (Math.max(R, 0.001) * sr));
  return o;
};
EP._env2 = function (v, E, p) {
  var st = v.e2s, l = v.e2;
  if (st === 1) { l += E.a; if (l >= 1) { l = 1; st = 2; } }
  else if (st === 2) { l = p.e2S + (l - p.e2S) * E.d; if (Math.abs(l - p.e2S) < 1e-4) { l = p.e2S; st = 3; } }
  else if (st === 3) { l = p.e2S; }
  else if (st === 4) { l *= E.r; if (l < 1e-5) { l = 0; st = 0; } }
  v.e2 = l; v.e2s = st;
};

/* ---- voice render (adds into bl/br) ---- */
var _incA = new Float64Array(8), _incB = new Float64Array(8), _wA = new Float64Array(8), _wB = new Float64Array(8);
var _gAL = new Float64Array(8), _gAR = new Float64Array(8), _gBL = new Float64Array(8), _gBR = new Float64Array(8);

function uniSetup(n, det, blend, spread, pan, inc0, incArr, wArr, gL, gR) {
  var i, norm = 0, d, ratio, wsum = 0;
  var cents = 100 * det * det;
  for (i = 0; i < n; i++) {
    d = n === 1 ? 0 : (i - (n - 1) / 2) / ((n - 1) / 2);
    ratio = Math.pow(2, cents * d / 1200);
    incArr[i] = Math.min(inc0 * ratio, 0.49);
    var w = (n % 2 === 1 && i === (n - 1) / 2) ? 1 : (n === 1 ? 1 : blend * 0.8 + 0.2);
    wArr[i] = w; wsum += w * w;
    var pn = clamp(d * spread + pan, -1, 1), ang = (pn + 1) * Math.PI / 4;
    gL[i] = Math.cos(ang); gR[i] = Math.sin(ang);
  }
  norm = 1 / Math.sqrt(wsum);
  for (i = 0; i < n; i++) { wArr[i] *= norm; gL[i] *= wArr[i]; gR[i] *= wArr[i]; }
}

EP._voice = function (v, cn, bl, br, E1, p, s, md) {
  var sr = this.sr, i, j;
  var semiBase = v.note + v.bend + this.wheel * p.bend + md[6] * 24 + p.tune * 0.01;
  var tA = this.tbl[0], tB = this.tbl[1];
  var aOn = p.aOn >= 0.5 && tA, bOn = p.bOn >= 0.5 && tB;
  var nA = Math.round(p.aUni), nB = Math.round(p.bUni);
  var aLev = clamp(s.aLev + md[4], 0, 1) * 0.55, bLev = clamp(s.bLev + md[5], 0, 1) * 0.55;
  var aPosN = clamp(s.aPos + md[0], 0, 1), bPosN = clamp(s.bPos + md[1], 0, 1);
  var aWarp = clamp(s.aWarp + md[2], 0, 1), bWarp = clamp(s.bWarp + md[3], 0, 1);
  var aWM = Math.round(p.aWMode), bWM = Math.round(p.bWMode);
  var dMod = md[10], aDet = clamp(s.aDet + dMod, 0, 1), bDet = clamp(s.bDet + dMod + md[26], 0, 1);
  var aMip = 0, bMip = 0, aFrame = 0, bFrame = 0;
  if (aOn) {
    var fA = 440 * Math.pow(2, (semiBase + 12 * (p.aOct + Math.round(md[20] * 6)) + p.aSemi + (p.aFine + md[18] * 200) / 100 - 69) / 12);
    uniSetup(nA, aDet, clamp(p.aBlend + md[22], 0, 1), clamp(p.aSpread + md[24], 0, 1), clamp(p.aPan + md[16] * 2, -1, 1), fA / sr, _incA, _wA, _gAL, _gAR);
    var maxA = 0; for (i = 0; i < nA; i++) if (_incA[i] > maxA) maxA = _incA[i];
    aMip = mipFor(Math.min(maxA, 0.49)); aFrame = aPosN * (tA.n - 1);
  }
  if (bOn) {
    var fB = 440 * Math.pow(2, (semiBase + 12 * (p.bOct + Math.round(md[21] * 6)) + p.bSemi + (p.bFine + md[19] * 200) / 100 - 69) / 12);
    uniSetup(nB, bDet, clamp(p.bBlend + md[23], 0, 1), clamp(p.bSpread + md[25], 0, 1), clamp(p.bPan + md[17] * 2, -1, 1), fB / sr, _incB, _wB, _gBL, _gBR);
    var maxB = 0; for (i = 0; i < nB; i++) if (_incB[i] > maxB) maxB = _incB[i];
    bMip = mipFor(Math.min(maxB, 0.49)); bFrame = bPosN * (tB.n - 1);
  }
  // sub / noise
  var subOn = p.subOn >= 0.5, subLev = clamp(s.subLev + md[11], 0, 1) * 0.5;
  var subInc = Math.min(0.49, 440 * Math.pow(2, (semiBase - 12 * p.subOct - 69) / 12) / sr), subW = Math.round(p.subWave);
  var nzLev = clamp(s.nzLev + md[12], 0, 1) * 0.35, nzPink = p.nzType >= 0.5;

  // filter coefficients
  var fType = Math.round(p.fType);
  var cutN = clamp(s.fCut + md[7] + p.fEnv * v.e2, 0, 1);
  var fc = 20 * Math.pow(1000, cutN) * Math.pow(2, (v.note - 60) / 12 * p.fKey);
  var fcMax = sr * 0.45; if (fc > fcMax) fc = fcMax; if (fc < 15) fc = 15;
  var res = clamp(s.fRes + md[8], 0, 1), drv = clamp(s.fDrive + md[9], 0, 1);
  var pre = 1 + drv * 6, post = 1 / (1 + drv * 2.2);
  var fMix = s.fMix;
  var g, k, a1, a2, a3, k2, a1b, a2b, a3b;
  if (fType <= 4) {
    g = Math.tan(Math.PI * fc / sr); k = 2 - 1.96 * res;
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
    k2 = 1.4; a1b = 1 / (1 + g * (g + k2)); a2b = g * a1b; a3b = g * a2b;
  } else if (fType === 5) {
    g = 1 - Math.exp(-PI2 * fc / sr); k = res * 3.95;
  } else if (fType === 6) {
    g = clamp(sr / fc, 2, 2000); k = 0.1 + 0.88 * res;
  } else {
    var pos = cutN * 4, vi = Math.min(3, Math.floor(pos)), u = pos - vi;
    for (j = 0; j < 3; j++) {
      var ff = VOWELS[vi][j] * (1 - u) + VOWELS[vi + 1][j] * u;
      v.fg[j] = Math.tan(Math.PI * Math.min(ff, sr * 0.45) / sr);
      v.fk[j] = 1 / (5 + res * 14);
    }
  }
  // amp / env1
  var velAmt = 1 - p.vel + p.vel * v.vel, ampBase = velAmt * 0.5;
  var e1 = v.e1, e1s = v.e1s, sus = p.e1S;
  var ph, x, ox, mA, mB, sA, sB, lastB = v.lastB;
  var phA = v.phA, phB = v.phB, phS = v.phS;
  var fL = v.fL, fR = v.fR, cbL = v.cbL, cbR = v.cbR, cw = v.cw;
  var rng = v.rng, pk0 = v.pk0, pk1 = v.pk1, pk2 = v.pk2;
  var sGate = (v.z * 0 + 1);

  for (var s_i = 0; s_i < cn; s_i++) {
    // env1
    if (e1s === 1) { e1 += E1.a; if (e1 >= 1) { e1 = 1; e1s = 2; } }
    else if (e1s === 2) { e1 = sus + (e1 - sus) * E1.d; if (Math.abs(e1 - sus) < 1e-4) { e1 = sus; e1s = 3; } }
    else if (e1s === 3) { e1 = sus; }
    else if (e1s === 4) { e1 *= E1.r; if (e1 < 1e-5) { e1 = 0; e1s = 0; } }
    if (e1s === 0) { v.on = false; break; }

    var aL = 0, aR = 0, bL2 = 0, bR2 = 0, aMono = 0, bMono = 0;
    // ---- osc A (FM/RM source = B previous sample)
    if (aOn) {
      for (i = 0; i < nA; i++) {
        ph = phA[i] + _incA[i]; if (ph >= 1) ph -= 1; phA[i] = ph;
        var ph2 = ph, rm = 0;
        switch (aWM) {
          case 1: ph2 = ph + aWarp * (ph * ph - ph); break;
          case 2: ph2 = ph + aWarp * (ph - ph * ph); break;
          case 3: { var pv = 0.5 + 0.45 * aWarp; ph2 = ph < pv ? 0.5 * ph / pv : 0.5 + 0.5 * (ph - pv) / (1 - pv); break; }
          case 4: { var pv2 = 0.5 - 0.45 * aWarp; ph2 = ph < pv2 ? 0.5 * ph / pv2 : 0.5 + 0.5 * (ph - pv2) / (1 - pv2); break; }
          case 5: { var q = ph * (1 + 7 * aWarp); ph2 = q - Math.floor(q); break; }
          case 6: ph2 = ph + aWarp * ((ph < 0.5 ? 2 * ph : 2 - 2 * ph) - ph); break;
          case 7: { var st = 64 - 60 * aWarp; ph2 = Math.floor(ph * st) / st; break; }
          case 8: { var q2 = ph + aWarp * 3 * lastB; ph2 = q2 - Math.floor(q2); break; }
          case 9: rm = aWarp; break;
        }
        if (ph2 >= 1) ph2 -= 1; else if (ph2 < 0) ph2 += 1;
        var fr = aFrame, f0 = fr | 0, ff = fr - f0, f1 = f0 + 1 < tA.n ? f0 + 1 : f0, mm = tA.mips[aMip];
        var pp = ph2 * FS, ii = pp | 0, fi = pp - ii, b0 = f0 * (FS + 1) + ii, b1 = f1 * (FS + 1) + ii;
        var va = mm[b0] + (mm[b0 + 1] - mm[b0]) * fi, vb = mm[b1] + (mm[b1 + 1] - mm[b1]) * fi;
        x = va + (vb - va) * ff;
        if (rm > 0) x = x * (1 - rm) + x * lastB * rm * 1.5;
        aL += x * _gAL[i]; aR += x * _gAR[i]; aMono += x * _wA[i];
      }
      aL *= aLev; aR *= aLev; aMono *= aLev;
    }
    // ---- osc B (FM/RM source = A current)
    if (bOn) {
      var srcA = aMono / (aLev > 1e-6 ? aLev : 1);
      for (i = 0; i < nB; i++) {
        ph = phB[i] + _incB[i]; if (ph >= 1) ph -= 1; phB[i] = ph;
        var pb2 = ph, rmb = 0;
        switch (bWM) {
          case 1: pb2 = ph + bWarp * (ph * ph - ph); break;
          case 2: pb2 = ph + bWarp * (ph - ph * ph); break;
          case 3: { var pvb = 0.5 + 0.45 * bWarp; pb2 = ph < pvb ? 0.5 * ph / pvb : 0.5 + 0.5 * (ph - pvb) / (1 - pvb); break; }
          case 4: { var pvb2 = 0.5 - 0.45 * bWarp; pb2 = ph < pvb2 ? 0.5 * ph / pvb2 : 0.5 + 0.5 * (ph - pvb2) / (1 - pvb2); break; }
          case 5: { var qb = ph * (1 + 7 * bWarp); pb2 = qb - Math.floor(qb); break; }
          case 6: pb2 = ph + bWarp * ((ph < 0.5 ? 2 * ph : 2 - 2 * ph) - ph); break;
          case 7: { var stb = 64 - 60 * bWarp; pb2 = Math.floor(ph * stb) / stb; break; }
          case 8: { var qb2 = ph + bWarp * 3 * srcA; pb2 = qb2 - Math.floor(qb2); break; }
          case 9: rmb = bWarp; break;
        }
        if (pb2 >= 1) pb2 -= 1; else if (pb2 < 0) pb2 += 1;
        var frb = bFrame, g0 = frb | 0, gf = frb - g0, g1 = g0 + 1 < tB.n ? g0 + 1 : g0, mb = tB.mips[bMip];
        var pq = pb2 * FS, jj = pq | 0, fj = pq - jj, c0 = g0 * (FS + 1) + jj, c1 = g1 * (FS + 1) + jj;
        var wa = mb[c0] + (mb[c0 + 1] - mb[c0]) * fj, wb = mb[c1] + (mb[c1 + 1] - mb[c1]) * fj;
        x = wa + (wb - wa) * gf;
        if (rmb > 0) x = x * (1 - rmb) + x * srcA * rmb * 1.5;
        bL2 += x * _gBL[i]; bR2 += x * _gBR[i]; bMono += x * _wB[i];
      }
      bL2 *= bLev; bR2 *= bLev; bMono *= bLev;
      lastB = bMono / (bLev > 1e-6 ? bLev : 1);
    } else lastB = 0;

    var mL = aL + bL2, mR = aR + bR2, cen = 0;
    // ---- sub
    if (subOn && subLev > 0) {
      phS += subInc; if (phS >= 1) phS -= 1;
      var sx;
      if (subW === 0) sx = Math.sin(PI2 * phS);
      else if (subW === 1) sx = 4 * Math.abs(phS - 0.5) - 1;
      else if (subW === 2) sx = th(Math.sin(PI2 * phS) * 6) * 0.9;
      else sx = (2 * phS - 1) * 0.8;
      cen += sx * subLev;
    }
    // ---- noise
    if (nzLev > 0) {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      var w = rng / 2147483648 - 1;
      if (nzPink) { pk0 = 0.99765 * pk0 + w * 0.099046; pk1 = 0.963 * pk1 + w * 0.2965164; pk2 = 0.57 * pk2 + w * 1.0526913; w = (pk0 + pk1 + pk2 + w * 0.1848) * 0.25; }
      cen += w * nzLev;
    }
    mL += cen; mR += cen;

    // ---- filter (stereo)
    var yL, yR;
    if (fMix <= 0.001 && fType !== 6) { yL = mL; yR = mR; }
    else {
      yL = this._filt(fType, fL, mL, pre, post, g, k, a1, a2, a3, k2, a1b, a2b, a3b, v, cbL, cw);
      yR = this._filt(fType, fR, mR, pre, post, g, k, a1, a2, a3, k2, a1b, a2b, a3b, v, cbR, cw);
      if (fType === 6) { cbL[cw] = this._cl; cbR[cw] = this._cr; cw = (cw + 1) & 4095; yL = this._yl; yR = this._yr; }
      if (fMix < 0.999) { yL = mL + (yL - mL) * fMix; yR = mR + (yR - mR) * fMix; }
    }
    var amp = e1 * ampBase;
    bl[s_i] += yL * amp; br[s_i] += yR * amp;
  }
  v.e1 = e1; v.e1s = e1s; v.phS = phS; v.cw = cw; v.rng = rng; v.pk0 = pk0; v.pk1 = pk1; v.pk2 = pk2; v.lastB = lastB;
};

var _WGT = [1, 0.55, 0.3];
/* One channel of the multimode filter. State array s (Float64Array(12)). */
EP._filt = function (type, s, x, pre, post, g, k, a1, a2, a3, k2, a1b, a2b, a3b, v, cb, cw) {
  var v1, v2, v3, y;
  if (type <= 4) {
    if (pre > 1.001) x = th(x * pre) * post;
    v3 = x - s[1]; v1 = a1 * s[0] + a2 * v3; v2 = s[1] + a2 * s[0] + a3 * v3;
    s[0] = 2 * v1 - s[0]; s[1] = 2 * v2 - s[1];
    if (type === 0) return v2;
    if (type === 1) {
      var w3 = v2 - s[3], w1 = a1b * s[2] + a2b * w3, w2 = s[3] + a2b * s[2] + a3b * w3;
      s[2] = 2 * w1 - s[2]; s[3] = 2 * w2 - s[3]; return w2;
    }
    if (type === 2) return x - k * v1 - v2;
    if (type === 3) return v1 * k;
    return x - k * v1;
  }
  if (type === 5) { // dirty ladder
    var u = th(x * (1 + pre * 0.5) - k * s[3]);
    s[0] += g * (u - th(s[0])); s[1] += g * (th(s[0]) - th(s[1])); s[2] += g * (th(s[1]) - th(s[2])); s[3] += g * (th(s[2]) - th(s[3]));
    return s[3] * post * (1 + k * 0.12) * 1.2;
  }
  if (type === 6) { // comb: stores new sample via caller
    var rd = cw - g, ri = Math.floor(rd), fr = rd - ri, i0 = ri & 4095, i1 = (ri + 1) & 4095;
    var del = cb[i0] + (cb[i1] - cb[i0]) * fr;
    y = x + del * k;
    y = th(y * 0.8) * 1.25;
    if (cb === v.cbL) { this._cl = y; this._yl = y * (1 - k * 0.35); } else { this._cr = y; this._yr = y * (1 - k * 0.35); }
    return y;
  }
  // formant: 3 parallel bandpass SVFs, states s[0..5]
  var out = 0, wgt = _WGT, j;
  for (j = 0; j < 3; j++) {
    var gg = v.fg[j], kk = v.fk[j], aa1 = 1 / (1 + gg * (gg + kk)), aa2 = gg * aa1, aa3 = gg * aa2;
    var q3 = x - s[j * 2 + 1], q1 = aa1 * s[j * 2] + aa2 * q3, q2 = s[j * 2 + 1] + aa2 * s[j * 2] + aa3 * q3;
    s[j * 2] = 2 * q1 - s[j * 2]; s[j * 2 + 1] = 2 * q2 - s[j * 2 + 1];
    out += q1 * kk * wgt[j];
  }
  return out * 2.2;
};

/* ---- FX chain + master ---- */
EP._fx = function (L, R, off, cn, bl, br, s, gm) {
  var p = this.p, sr = this.sr, i, j;
  var drv = clamp(s.fxDrive + gm[15], 0, 1), dpre = 1 + drv * 9, dpost = 1 / (1 + drv * 3);
  var chMix = clamp(s.chMix + gm[29], 0, 1), dlMix = clamp(s.dlMix + gm[13], 0, 1), rvMix = clamp(s.rvMix + gm[14], 0, 1);
  var chDepthS = (0.002 + p.chDepth * 0.006) * sr, chBase = 0.012 * sr, chInc = p.chRate / sr;
  var dtT = p.dlTime * sr / 1000, fb = clamp(p.dlFb + gm[30], 0, 0.95), dlen = this.dbL.length;
  var rvFb = 0.7 + 0.28 * p.rvSize, rvDamp = 0.15 + 0.6 * p.rvDamp;
  var vm = clamp(s.vol * (1 + gm[31]), 0, 1), vol = vm * vm * 1.1;
  var cbL = this.cbufL, cbR = this.cbufR, cw = this.cw, cph = this.cph;
  var dbL = this.dbL, dbR = this.dbR, dw = this.dw, dt = this.dt, dlpL = this.dlpL, dlpR = this.dlpR;
  var rcL = this.rcL, rcR = this.rcR, rci = this.rci, rcs = this.rcs, raL = this.raL, raR = this.raR, rai = this.rai;
  var doDrive = drv > 0.002, doCh = chMix > 0.002, doDl = dlMix > 0.002, doRv = rvMix > 0.002;
  var pk = 0;
  for (i = 0; i < cn; i++) {
    var xl = bl[i], xr = br[i];
    if (doDrive) { xl = th(xl * dpre) * dpost; xr = th(xr * dpre) * dpost; }
    if (doCh) {
      cbL[cw & 8191] = xl; cbR[cw & 8191] = xr;
      var dL = chBase + chDepthS * Math.sin(PI2 * cph), dR = chBase + chDepthS * Math.sin(PI2 * cph + 1.5708);
      var rL = cw - dL, iL = Math.floor(rL), fL = rL - iL, rR = cw - dR, iR = Math.floor(rR), fR = rR - iR;
      var wL = cbL[iL & 8191] + (cbL[(iL + 1) & 8191] - cbL[iL & 8191]) * fL, wR = cbR[iR & 8191] + (cbR[(iR + 1) & 8191] - cbR[iR & 8191]) * fR;
      xl = xl * (1 - chMix * 0.4) + wL * chMix * 0.8; xr = xr * (1 - chMix * 0.4) + wR * chMix * 0.8;
      cw = (cw + 1) & 8191; cph += chInc; if (cph >= 1) cph -= 1;
    }
    if (doDl || dlMix > 0.0005) {
      dt += (dtT - dt) * 0.0008;
      var rd = dw - dt; if (rd < 0) rd += dlen;
      var ri = Math.floor(rd), fr = rd - ri, i1 = ri + 1 >= dlen ? 0 : ri + 1;
      var wl = dbL[ri] + (dbL[i1] - dbL[ri]) * fr, wr2 = dbR[ri] + (dbR[i1] - dbR[ri]) * fr;
      dlpL += (wl - dlpL) * 0.45; dlpR += (wr2 - dlpR) * 0.45;
      dbL[dw] = th(xl + dlpR * fb); dbR[dw] = th(xr + dlpL * fb);
      dw++; if (dw >= dlen) dw = 0;
      xl += wl * dlMix; xr += wr2 * dlMix;
    }
    if (doRv) {
      var inp = (xl + xr) * 0.015, oL = 0, oR = 0;
      for (j = 0; j < 8; j++) {
        var bufL = rcL[j], bufR = rcR[j], ix = rci[j], iy = rci[8 + j];
        var yl = bufL[ix], yr = bufR[iy];
        rcs[j] = yl * (1 - rvDamp) + rcs[j] * rvDamp; bufL[ix] = inp + rcs[j] * rvFb;
        rcs[8 + j] = yr * (1 - rvDamp) + rcs[8 + j] * rvDamp; bufR[iy] = inp + rcs[8 + j] * rvFb;
        if (++ix >= bufL.length) ix = 0; if (++iy >= bufR.length) iy = 0; rci[j] = ix; rci[8 + j] = iy;
        oL += yl; oR += yr;
      }
      for (j = 0; j < 4; j++) {
        var al = raL[j], ar = raR[j], ax = rai[j], ay = rai[4 + j];
        var bo = al[ax]; var no = -oL + bo; al[ax] = oL + bo * 0.5; oL = no;
        bo = ar[ay]; no = -oR + bo; ar[ay] = oR + bo * 0.5; oR = no;
        if (++ax >= al.length) ax = 0; if (++ay >= ar.length) ay = 0; rai[j] = ax; rai[4 + j] = ay;
      }
      xl = xl + oL * rvMix * 3.2; xr = xr + oR * rvMix * 3.2;
    }
    xl = th(xl * vol); xr = th(xr * vol);
    L[off + i] = xl; R[off + i] = xr;
    // scope
    if (++this.scopeDec >= 4) { this.scopeDec = 0; this.scope[this.scopeW] = xl; this.scopeW = (this.scopeW + 1) & 255; }
  }
  this.cw = cw; this.cph = cph; this.dw = dw; this.dt = dt; this.dlpL = dlpL; this.dlpR = dlpR;
};

var API = { Engine: Engine, makeTable: makeTable, buildTable: buildTable, TABLE_NAMES: TABLE_NAMES, PARAMS: PARAMS, DESTS: DESTS, SRCS: SRCS, FS: FS, fft: fft, frameFromSpectrum: frameFromSpectrum, normFrame: normFrame, MAXV: MAXV, CT: CT };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Strata = API;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));

