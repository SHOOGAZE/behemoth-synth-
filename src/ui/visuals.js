/* ------------------------------------------------ canvas helpers */
var dpr = Math.min(2, window.devicePixelRatio || 1);
function fit(cv, hCss) {
  if (cv._fg === layoutGen && cv._fh === hCss && cv._fit) return cv._fit;
  var w = Math.max(40, Math.round(cv.clientWidth || cv.parentNode && cv.parentNode.clientWidth || 300)), ht = hCss || parseInt(cv.dataset.h || '100', 10); if (cv.dataset.ls && window.matchMedia && matchMedia('(orientation: landscape) and (max-height: 540px)').matches) ht = Math.round(ht * 0.9);
  if (cv.dataset.grow) { var vw = window.innerWidth; ht = Math.round(ht * (vw >= 1100 ? 1.65 : vw >= 700 ? 1.45 : 1)); }
  cv.style.height = ht + 'px';
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(ht * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(ht * dpr); }
  var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); cv._fg = layoutGen; cv._fh = hCss; cv._fit = { g: g, w: w, h: ht }; return cv._fit;
}
var _cssv = {};
function cssv(n) { return _cssv[n] || (_cssv[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#fff'); }
var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
/* tween helper: ease in/out over ms, calls step(u 0..1), then done */
function anim(ms, step, done) {
  if (REDUCE) { step(1); done && done(); return function () { }; }
  var t0 = performance.now(), id = 0, dead = false;
  (function f(now) {
    if (dead) return;
    var u = clamp((now - t0) / ms, 0, 1), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    step(e); if (u < 1) id = requestAnimationFrame(f); else done && done();
  })(t0);
  return function () { dead = true; cancelAnimationFrame(id); };
}
/* live feed: effective (modulated) value of a normalised destination, from the engine's source taps */
function effNorm(dest, n) { var s = n, i, r; for (i = 0; i < ROUTES.length; i++) { r = ROUTES[i]; if (r.d === dest) s += A.lv[r.s] * r.a; } return clamp(s, 0, 1); }
var liveFns = [];
var idleTick = 0;
function soundOn() { return A.lv[15] > 0.5 || A.lvl > 0.01; }
var lastVis = 0;
function visLoop(now) {
  requestAnimationFrame(visLoop);
  if (document.hidden) return;
  if (A.mode === 'script') { if (now - lastVis < 32) return; lastVis = now; }   /* audio runs on this thread in compat mode: keep drawing at ~30 fps so it never starves */
  if (now - lastAct > 1800 && !soundOn() && ++idleTick % 8) return;
  A.lvl += (clamp(A.peak, 0, 1) - A.lvl) * 0.2;
  var i; for (i = 0; i < liveFns.length; i++) { try { liveFns[i](now); } catch (e) { } }
  for (i = 0; i < knobs.length; i++) if (knobs[i].hasMod && isVis(knobs[i].el)) knobs[i].live();
  for (i = 0; i < capEls.length; i++) capLive(i);
}
function capLive(i) {
  var c = capEls[i], s = SRC[i], v = A.lv[i], q;
  if (s.id === 'lfo1' || s.id === 'lfo2' || s.id === 'tilt') q = (v + 1) / 2; else if (s.kind === 'env' || s.kind === 'macro') q = v; else q = 0;
  q = clamp(q, 0, 1); if (Math.abs(q - (c._lv || 0)) > 0.012) { c._lv = q; c.style.setProperty('--lv', q.toFixed(3)); }
}
var vis = [], layoutGen = 0;
function drawAllVis() { layoutGen++; vis.forEach(function (f) { try { f(); } catch (e) { } }); }
/* layout reads are cached per layout generation: reading offsetParent / clientWidth every frame forces a reflow, which starved the audio thread on phones */
function isVis(el) { if (el._vg !== layoutGen) { el._vg = layoutGen; el._vv = !!el.offsetParent; } return el._vv; }
function cvW(cv) { if (cv._wg !== layoutGen) { cv._wg = layoutGen; cv._ww = cv.clientWidth; } return cv._ww; }
var relayoutT = 0;
function relayout() { layoutGen++; clearTimeout(relayoutT); relayoutT = setTimeout(drawAllVis, 140); }

/* 3D wavetable stack: static layer cached offscreen; per frame only the live slice is drawn */
function TableView(slot, hgt) {
  var cv = h('canvas', { class: 'vis', 'data-h': hgt || 104, 'data-ls': 1, 'data-grow': 1 }), bgc = document.createElement('canvas');
  var posK = slot ? 'bPos' : 'aPos', dest = slot ? 1 : 0, PTS = 96, SKEW = 26, AMP = 11, G = null, pos = null, dirty = true, lastSig = '';
  function build(c, t) {
    var W = c.w, H = c.h, Ln = Math.min(t.n, 22), dy = (H - 36) / Math.max(1, Ln - 1), lines = [], li, i, f, yb, xo, a;
    for (li = 0; li < Ln; li++) {
      f = Math.round(li * (t.n - 1) / Math.max(1, Ln - 1)); yb = H - 12 - li * dy; xo = SKEW * li / Math.max(1, Ln - 1); a = new Float32Array(PTS * 2);
      for (i = 0; i < PTS; i++) { a[2 * i] = xo + 8 + (W - 16 - SKEW) * i / (PTS - 1); a[2 * i + 1] = yb - t.data[f * 2048 + Math.floor(i / PTS * 2048)] * AMP; }
      lines.push(a);
    }
    G = { W: W, H: H, Ln: Ln, dy: dy, lines: lines, n: t.n, data: t.data, dpr: dpr };
    bgc.width = cv.width; bgc.height = cv.height; var g = bgc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineJoin = 'round';
    for (li = 0; li < Ln; li++) {
      a = lines[li]; g.beginPath(); for (i = 0; i < PTS; i++) i ? g.lineTo(a[2 * i], a[2 * i + 1]) : g.moveTo(a[2 * i], a[2 * i + 1]);
      g.lineWidth = 1; g.strokeStyle = 'rgba(170,170,170,' + (0.2 + 0.4 * li / Ln).toFixed(3) + ')'; g.stroke();
    }
  }
  function path(g, a) { for (var i = 0; i < PTS; i++) i ? g.lineTo(a[2 * i], a[2 * i + 1]) : g.moveTo(a[2 * i], a[2 * i + 1]); }
  function paint(now) {
    var c = fit(cv), g = c.g, t = TAB[slot], W = c.w, H = c.h; if (!t) return;
    if (!G || G.W !== W || G.H !== H || G.data !== t.data || G.n !== t.n || G.dpr !== dpr || bgc.width !== cv.width) build(c, t);
    var acc = cssvCache.accent, Ln = G.Ln, sp = clamp(pos, 0, 1) * (Ln - 1), li, i, a, d;
    g.clearRect(0, 0, W, H); g.drawImage(bgc, 0, 0, W, H); g.lineJoin = 'round'; g.lineCap = 'round';
    /* neighbouring slices light up and fall off: the stack seems to flow around the cursor */
    for (li = Math.max(0, Math.floor(sp) - 2); li <= Math.min(Ln - 1, Math.ceil(sp) + 2); li++) {
      d = Math.abs(li - sp); if (d > 2.2) continue; var k = 1 - d / 2.2;
      g.beginPath(); path(g, G.lines[li]); g.lineWidth = 1 + 1.2 * k; g.strokeStyle = accA((0.5 * k * k).toFixed(3)); g.stroke();
    }
    /* the live waveform at the interpolated position, breathing with the output level */
    var ff = clamp(pos, 0, 1) * (t.n - 1), f0 = Math.floor(ff), f1 = Math.min(f0 + 1, t.n - 1), u = ff - f0;
    var yb = H - 12 - sp * G.dy, xo = SKEW * sp / Math.max(1, Ln - 1), amp = AMP * (1 + (REDUCE ? 0 : 0.35 * A.lvl)), lx = [], ly = [];
    g.beginPath();
    for (i = 0; i < PTS; i++) {
      var idx = Math.floor(i / PTS * 2048), v = t.data[f0 * 2048 + idx] * (1 - u) + t.data[f1 * 2048 + idx] * u, x = xo + 8 + (W - 16 - SKEW) * i / (PTS - 1), y = yb - v * amp;
      lx.push(x); ly.push(y); i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.lineWidth = 7; g.strokeStyle = accA(.18); g.stroke(); g.lineWidth = 2.4; g.strokeStyle = acc; g.stroke();
    if (!REDUCE) { /* a spark travelling along the live line */
      var j = Math.floor(((now * 0.0006) % 1) * (PTS - 1)); g.beginPath(); g.arc(lx[j], ly[j], 5, 0, 7); g.fillStyle = accA(.22); g.fill(); g.beginPath(); g.arc(lx[j], ly[j], 2.2, 0, 7); g.fillStyle = '#fff'; g.fill();
    }
    /* cursor rail: dim = knob position, bright = modulated position */
    var base = clamp(P[posK], 0, 1) * (Ln - 1), yB = H - 12 - base * G.dy, yL = H - 12 - sp * G.dy;
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(1, yB - 3.5); g.lineTo(6, yB); g.lineTo(1, yB + 3.5); g.fill();
    g.fillStyle = acc; g.beginPath(); g.moveTo(1, yL - 4.5); g.lineTo(7, yL); g.lineTo(1, yL + 4.5); g.fill();
  }
  function tick(now, force) {
    if (cv.isConnected) cv._was = true; else if (cv._was) { var q = liveFns.indexOf(tick); if (q >= 0) liveFns.splice(q, 1); return; }
    if (!force && !isVis(cv)) return;
    var eff = effNorm(dest, clamp(P[posK], 0, 1)); var dt = clamp((now || 0) - (tick.t || now || 0), 0, 64); tick.t = now; pos = pos == null || force ? eff : pos + (eff - pos) * (REDUCE ? 1 : 1 - Math.exp(-dt / 40));
    var moving = !REDUCE && (A.voices > 0 || A.lvl > 0.01), sig = Math.round(pos * 4000) + '|' + P[posK];
    if (!force && !dirty && !moving && sig === lastSig) return;
    lastSig = sig; dirty = false; paint(now || performance.now());
  }
  var drag = null;
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, p: P[posK] }; });
  cv.addEventListener('pointermove', function (e) { if (!drag) return; setP(posK, clamp(drag.p + (e.clientX - drag.x) / (cv.clientWidth * 0.9), 0, 1)); });
  cv.addEventListener('pointerup', function () { drag = null; }); cv.addEventListener('pointercancel', function () { drag = null; });
  function full() { G = null; dirty = true; tick(performance.now(), true); }
  vis.push(full); liveFns.push(tick); binders.push({ k: posK, fn: function () { dirty = true; } });
  cv.redraw = full; return cv;
}

/* ADSR graph editor */
function EnvEditor(pre, color, hgt) {
  var cv = h('canvas', { class: 'vis', 'data-h': hgt || 116 }), node = -1;
  var K = { A: pre + 'A', D: pre + 'D', S: pre + 'S', R: pre + 'R' };
  function nt(t) { return Math.log(1 + t * 60) / Math.log(1 + 8 * 60); }
  function it(n) { return clamp((Math.exp(clamp(n, 0, 1) * Math.log(481)) - 1) / 60, 0.001, 8); }
  function geo(W, H) {
    var m = 14, sa = 0.28 * (W - 2 * m), sd = 0.3 * (W - 2 * m), sr = 0.28 * (W - 2 * m), ss = 0.14 * (W - 2 * m);
    var x0 = m, xA = x0 + sa * nt(P[K.A]), xD = xA + sd * nt(P[K.D]) + 4, xS = xD + ss, xR = xS + sr * nt(P[K.R]) + 4;
    var yT = 12, yB = H - 14, y = function (v) { return yB - v * (yB - yT); };
    return { m: m, sa: sa, sd: sd, sr: sr, x0: x0, xA: xA, xD: xD, xS: xS, xR: xR, yT: yT, yB: yB, y: y,
      pts: [[xA, y(1)], [xD, y(P[K.S])], [xR, y(0)]] };
  }
  function draw() {
    var c = fit(cv), g = c.g, W = c.w, H = c.h, G = geo(W, H), col = cssv(color);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,135,160,.14)'; g.lineWidth = 1;
    for (var i = 0; i <= 4; i++) { var yy = G.yT + (G.yB - G.yT) * i / 4; g.beginPath(); g.moveTo(8, yy); g.lineTo(W - 8, yy); g.stroke(); }
    g.beginPath(); g.moveTo(G.x0, G.yB);
    // attack (linear), decay (exp), sustain, release (exp)
    g.lineTo(G.xA, G.y(1));
    for (var j = 1; j <= 16; j++) { var u = j / 16, v = P[K.S] + (1 - P[K.S]) * Math.exp(-4.6 * u); g.lineTo(G.xA + (G.xD - G.xA) * u, G.y(v + (P[K.S] - v) * u * u * 0 )); }
    g.lineTo(G.xS, G.y(P[K.S]));
    for (j = 1; j <= 16; j++) { var u2 = j / 16, v2 = P[K.S] * Math.exp(-6.9 * u2); g.lineTo(G.xS + (G.xR - G.xS) * u2, G.y(v2)); }
    g.lineTo(G.xR, G.yB);
    var grad = g.createLinearGradient(0, G.yT, 0, G.yB); grad.addColorStop(0, col + '55'); grad.addColorStop(1, col + '05');
    g.fillStyle = grad; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.lineJoin = 'round'; g.stroke();
    G.pts.forEach(function (p, i) { g.beginPath(); g.arc(p[0], p[1], node === i ? 10 : 7, 0, 7); g.fillStyle = node === i ? col : cssv('--scr-panel'); g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); });
    g.fillStyle = cssv('--scr-mute'); g.font = '10px ' + cssv('--f-mono');
    g.fillText('A ' + FMT.time(P[K.A]), 10, H - 3); g.fillText('D ' + FMT.time(P[K.D]), Math.max(76, G.xA + 6), H - 3);
    g.fillText('S ' + Math.round(P[K.S] * 100) + '%', W / 2 + 8, H - 3); g.fillText('R ' + FMT.time(P[K.R]), W - 70, H - 3);
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    var p = pos(e), G = geo(cv.clientWidth, parseInt(cv.dataset.h, 10)), best = 1e9; node = -1;
    G.pts.forEach(function (q, i) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < best) { best = d; node = i; } });
    if (best > 56) node = -1; draw();
  });
  cv.addEventListener('pointermove', function (e) {
    if (node < 0) return; var p = pos(e), W = cv.clientWidth, H = parseInt(cv.dataset.h, 10), G = geo(W, H);
    if (node === 0) setP(K.A, it((p[0] - G.x0) / G.sa));
    else if (node === 1) { setP(K.D, it((p[0] - G.xA - 4) / G.sd)); setP(K.S, clamp((G.yB - p[1]) / (G.yB - G.yT), 0, 1)); }
    else setP(K.R, it((p[0] - G.xS - 4) / G.sr));
    draw();
  });
  function up() { node = -1; draw(); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  /* live level: a glowing line shows where the envelope is right now (env 1 = amp, env 2 = mod) */
  var lvIdx = pre === 'e2' ? 2 : 14, lastLv = -1;
  function liveEnv() {
    if (!cv.isConnected || !isVis(cv)) return;
    var q = A.lv[lvIdx]; if (Math.abs(q - lastLv) < 0.004 && !(q === 0 && lastLv !== 0)) return; lastLv = q;
    draw(); if (q <= 0.002) return;
    var g = cv.getContext('2d'), W = cvW(cv), H = parseInt(cv.dataset.h, 10), G = geo(W, H), y = G.y(clamp(q, 0, 1)), col = cssv(color);
    g.beginPath(); g.moveTo(8, y); g.lineTo(W - 8, y); g.lineWidth = 5; g.strokeStyle = col + '30'; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = col; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(W - 12, y, 4, 0, 7); g.fillStyle = col; g.fill(); g.beginPath(); g.arc(W - 12, y, 9, 0, 7); g.fillStyle = col + '30'; g.fill();
  }
  liveFns.push(liveEnv);
  vis.push(draw); [K.A, K.D, K.S, K.R].forEach(function (k) { binders.push({ k: k, fn: draw }); });
  return cv;
}

/* Drawable LFO */
function LfoEditor(i) {
  var cv = h('canvas', { class: 'vis', 'data-h': 104 }), last = -1, tmr = 0;
  var pts = function () { return LFO[i]; }, col = function () { return cssv('--c-lfo'); };
  function draw() {
    var c = fit(cv), g = c.g, W = c.w, H = c.h, a = pts(), sm = P['l' + (i + 1) + 'Smooth'] >= 0.5, m = 10;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,135,160,.16)'; g.lineWidth = 1;
    for (var q = 0; q <= 4; q++) { g.beginPath(); g.moveTo(m, m + (H - 2 * m) * q / 4); g.lineTo(W - m, m + (H - 2 * m) * q / 4); g.stroke(); }
    for (q = 0; q <= 4; q++) { g.beginPath(); g.moveTo(m + (W - 2 * m) * q / 4, m); g.lineTo(m + (W - 2 * m) * q / 4, H - m); g.stroke(); }
    g.beginPath();
    for (var k = 0; k <= 64; k++) {
      var v = a[k & 63], x = m + (W - 2 * m) * k / 64, y = m + (H - 2 * m) * (1 - (v + 1) / 2);
      if (!sm) { var x2 = m + (W - 2 * m) * (k + 1) / 64; if (k === 0) g.moveTo(x, y); else g.lineTo(x, y); if (k < 64) g.lineTo(x2, y); } else (k ? g.lineTo(x, y) : g.moveTo(x, y));
    }
    g.lineWidth = 2.2; g.strokeStyle = col(); g.lineJoin = 'round'; g.stroke();
    g.lineTo(W - m, H - m); g.lineTo(m, H - m); g.closePath(); g.fillStyle = col() + '18'; g.fill();
  }
  function setAt(e) {
    var r = cv.getBoundingClientRect(), m = 10, x = (e.clientX - r.left - m) / (r.width - 2 * m), y = (e.clientY - r.top - m) / (r.height - 2 * m);
    var idx = clamp(Math.round(x * 64 - (P['l' + (i + 1) + 'Smooth'] >= 0.5 ? 0 : 0.5)), 0, 63), v = clamp(1 - 2 * y, -1, 1), a = pts();
    if (last >= 0 && Math.abs(idx - last) > 1) { var s = idx > last ? 1 : -1, v0 = a[last]; for (var j = last; j !== idx; j += s) a[j] = v0 + (v - v0) * (j - last) / (idx - last); }
    a[idx] = v; last = idx; draw();
    if (!tmr) tmr = setTimeout(function () { tmr = 0; A.send({ t: 'lfo', i: i, pts: a }); }, 40);
  }
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); last = -1; setAt(e); });
  cv.addEventListener('pointermove', function (e) { if (e.buttons || e.pressure > 0 || last >= 0) { if (last >= 0) setAt(e); } });
  function up() { last = -1; A.send({ t: 'lfo', i: i, pts: pts() }); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  /* playhead: the real LFO phase and value, straight from the engine */
  var idleLfo = false;
  function liveLfo() {
    if (!cv.isConnected || !isVis(cv) || last >= 0) return;
    if (A.lv[15] < 0.5) { if (idleLfo) return; idleLfo = true; draw(); return; } idleLfo = false;
    draw(); var g = cv.getContext('2d'), W = cvW(cv), H = parseInt(cv.dataset.h, 10), m = 10, ph = A.lv[12 + i], v = A.lv[i], x = m + (W - 2 * m) * ph, y = m + (H - 2 * m) * (1 - (v + 1) / 2), c = col();
    g.beginPath(); g.moveTo(x, m); g.lineTo(x, H - m); g.lineWidth = 1; g.strokeStyle = c + '66'; g.stroke();
    g.beginPath(); g.arc(x, y, 9, 0, 7); g.fillStyle = c + '30'; g.fill(); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = c; g.stroke();
  }
  liveFns.push(liveLfo);
  vis.push(draw); binders.push({ k: 'l' + (i + 1) + 'Smooth', fn: draw });
  return cv;
}


