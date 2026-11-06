/* ------------------------------------------------ wavetable editor */
var ed = { f: 0, mode: 'draw', spec: null, last: -1, tmr: 0 };
function buildTableSheet() {
  tableSheet = Sheet('tableSheet', 'Wavetable');
  var chips = h('div', { class: 'chips' }), view, cvE = h('canvas', { class: 'vis', 'data-h': 168 }), info = h('span', { class: 'amt', style: 'font-family:var(--f-mono);font-size:12px;color:var(--mute)' });
  var modeChips = h('div', { class: 'chips' });
  var fileIn = h('input', { type: 'file', accept: '.wav,audio/*', style: 'display:none', id: 'wavIn' });
  function cur() { return TAB[tsSlot]; }
  function paintChips() {
    chips.innerHTML = '';
    S.TABLE_NAMES.forEach(function (n) { chips.append(h('button', { type: 'button', class: 'chip' + (cur().name === n ? ' on' : ''), onclick: function () { setTable(tsSlot, n); ed.f = 0; ed.spec = null; paintChips(); refreshAll(); redraw(); } }, n)); });
    modeChips.innerHTML = '';
    [['draw', 'DRAW'], ['spec', 'SPECTRUM']].forEach(function (m) { modeChips.append(h('button', { type: 'button', class: 'chip' + (ed.mode === m[0] ? ' on' : ''), onclick: function () { ed.mode = m[0]; ed.spec = null; paintChips(); redraw(); } }, m[1])); });
    modeChips.append(h('button', { type: 'button', class: 'chip', onclick: function () { gotoFrame(ed.f - 1); } }, '◀'),
      h('button', { type: 'button', class: 'chip', onclick: function () { gotoFrame(ed.f + 1); } }, '▶'), info);
  }
  function gotoFrame(nf) {
    nf = clamp(nf, 0, cur().n - 1); if (nf === ed.f) return;
    ed.xfrom = frameView().slice(); ed.f = nf; ed.spec = null; syncPos();
    anim(200, function (u) { ed.xt = u; redraw(true); }, function () { ed.xfrom = null; redraw(); });
  }
  function syncPos() { var n = cur().n; setP(tsSlot ? 'bPos' : 'aPos', n > 1 ? ed.f / (n - 1) : 0); }
  function toCustom() {
    var t = cur(); if (t.name === 'Custom') return t;
    var n = Math.min(t.n, 32), data = new Float32Array(n * 2048), i;
    for (i = 0; i < n; i++) { var src = Math.round(i * (t.n - 1) / Math.max(1, n - 1)); data.set(t.data.subarray(src * 2048, (src + 1) * 2048), i * 2048); }
    lib.Custom = { n: n, data: data }; setTable(tsSlot, 'Custom'); ed.f = clamp(Math.round(P[tsSlot ? 'bPos' : 'aPos'] * (n - 1)), 0, n - 1); paintChips(); refreshAll();
    return cur();
  }
  function pushFrame(f) {
    var t = lib.Custom, fr = t.data.slice(f * 2048, (f + 1) * 2048);
    for (var s = 0; s < 2; s++) if (TAB[s].name === 'Custom') A.send({ t: 'frame', slot: s, f: f, data: fr });
    redraw(true);
  }
  function pushAll() { for (var s = 0; s < 2; s++) if (TAB[s].name === 'Custom') { TAB[s] = { name: 'Custom', n: lib.Custom.n, data: lib.Custom.data }; A.send({ t: 'table', slot: s, data: lib.Custom.data, n: lib.Custom.n }); } refreshAll(); redraw(); }
  function frameView() { var t = cur(); return t.data.subarray(ed.f * 2048, (ed.f + 1) * 2048); }
  function analyze() {
    var fr = frameView(), re = new Float64Array(2048), im = new Float64Array(2048);
    for (var i = 0; i < 2048; i++) re[i] = fr[i]; S.fft(re, im, false); ed.spec = { re: re, im: im };
  }
  function redraw(light) {
    var c = fit(cvE), g = c.g, W = c.w, H = c.h, t = cur(); if (!t) return;
    g.clearRect(0, 0, W, H); info.textContent = 'Frame ' + (ed.f + 1) + '/' + t.n + (t.name === 'Custom' ? '' : ' · tap to edit as Custom');
    var fr = frameView(), acc = cssvCache.accent;
    if (ed.xfrom) { var mx = new Float32Array(2048), uu = ed.xt || 0; for (var q2 = 0; q2 < 2048; q2++) mx[q2] = ed.xfrom[q2] * (1 - uu) + fr[q2] * uu; fr = mx; }
    g.strokeStyle = 'rgba(120,135,160,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    if (ed.mode === 'draw' && ed.ghost && ed.ga > 0.01) { /* the previous shape lingers and fades while you reshape it */
      g.beginPath(); for (var gx = 0; gx < W; gx += 2) { var gv = ed.ghost[Math.floor(gx / W * 2047)], gy = H / 2 - gv * (H / 2 - 8); gx ? g.lineTo(gx, gy) : g.moveTo(gx, gy); }
      g.setLineDash([5, 4]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,235,230,' + (0.35 * ed.ga).toFixed(3) + ')'; g.stroke(); g.setLineDash([]);
    }
    if (ed.mode === 'draw') {
      g.beginPath();
      for (var x = 0; x < W; x++) { var i0 = Math.floor(x / W * 2048), i1 = Math.max(i0 + 1, Math.floor((x + 1) / W * 2048)), mn = 9, mx = -9; for (var i = i0; i < i1 && i < 2048; i++) { var v = fr[i]; if (v < mn) mn = v; if (v > mx) mx = v; } var yv = H / 2 - (mx + mn) / 2 * (H / 2 - 8); x ? g.lineTo(x, yv) : g.moveTo(x, yv); }
      g.lineWidth = 7; g.strokeStyle = accA(.16); g.stroke(); g.lineWidth = 2.4; g.strokeStyle = acc; g.stroke();
      if (ed.ptr && ed.pa > 0.01) { var px = ed.ptr.x * W, py = ed.ptr.y * H, rr = 7 + 16 * (1 - ed.pa); g.beginPath(); g.arc(px, py, rr, 0, 7); g.lineWidth = 2; g.strokeStyle = accA((0.8 * ed.pa).toFixed(3)); g.stroke(); g.beginPath(); g.arc(px, py, 3.5, 0, 7); g.fillStyle = 'rgba(255,230,225,' + ed.pa.toFixed(3) + ')'; g.fill(); }
    } else {
      if (!ed.spec) analyze();
      var NB = 32, bw = W / NB;
      for (var h2 = 1; h2 <= NB; h2++) {
        var amp = Math.hypot(ed.spec.re[h2], ed.spec.im[h2]) * 2 / 2048, bh = Math.sqrt(clamp(amp, 0, 1)) * (H - 20);
        g.fillStyle = acc; g.globalAlpha = 0.85; g.fillRect((h2 - 1) * bw + 2, H - 14 - bh, bw - 4, bh); g.globalAlpha = 1;
        if (h2 % 4 === 1 || h2 === NB) { g.fillStyle = cssv('--scr-mute'); g.font = '9px ' + cssv('--f-mono'); g.fillText(h2, (h2 - 1) * bw + 2, H - 3); }
      }
    }
    if (view) view.redraw();
  }
  function lastEditPoint(e) { var r = cvE.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  function edit(e) {
    var p = lastEditPoint(e);
    if (ed.mode === 'draw') {
      var fr = lib.Custom.data, base = ed.f * 2048, idx = clamp(Math.round(p[0] * 2047), 0, 2047), v = clamp(1 - 2 * (p[1] * 168 - 8) / (168 - 16), -1, 1) * 1;
      v = clamp(-( (p[1] - 0.5) * 2) * (168 / 2) / (168 / 2 - 8), -1, 1);
      if (ed.last >= 0 && Math.abs(idx - ed.last) > 1) { var s = idx > ed.last ? 1 : -1, v0 = fr[base + ed.last]; for (var j = ed.last; j !== idx; j += s) fr[base + j] = v0 + (v - v0) * (j - ed.last) / (idx - ed.last); }
      fr[base + idx] = v; ed.last = idx; ed.ptr = { x: p[0], y: p[1] }; ed.pa = 1; ed.ga = 1;
    } else {
      if (!ed.spec) analyze();
      var hh = clamp(Math.floor(p[0] * 32) + 1, 1, 32), amp = Math.pow(clamp(1 - (p[1] * 168 - 0) / (168 - 14), 0, 1), 2), cr = Math.hypot(ed.spec.re[hh], ed.spec.im[hh]) * 2 / 2048;
      if (cr < 1e-6) { ed.spec.re[hh] = 0; ed.spec.im[hh] = -amp * 2048 / 2; } else { var k = amp / cr; ed.spec.re[hh] *= k; ed.spec.im[hh] *= k; }
      ed.spec.re[2048 - hh] = ed.spec.re[hh]; ed.spec.im[2048 - hh] = -ed.spec.im[hh];
      var re = Float64Array.from(ed.spec.re), im = Float64Array.from(ed.spec.im); S.fft(re, im, true);
      var out = lib.Custom.data, base2 = ed.f * 2048, pk = 0, i;
      for (i = 0; i < 2048; i++) { re[i] /= 2048; if (Math.abs(re[i]) > pk) pk = Math.abs(re[i]); }
      var sc = pk > 1 ? 1 / pk : 1; for (i = 0; i < 2048; i++) out[base2 + i] = re[i] * sc;
    }
    if (!ed.tmr) ed.tmr = setTimeout(function () { ed.tmr = 0; pushFrame(ed.f); }, 60);
    redraw(true);
  }
  cvE.addEventListener('pointerdown', function (e) { e.preventDefault(); cvE.setPointerCapture(e.pointerId); ed.last = -1; if (cur().name !== 'Custom') { toCustom(); } ed.ghost = frameView().slice(); ed.ga = 1; ed.pa = 1; edit(e); ed.editing = true; });
  cvE.addEventListener('pointermove', function (e) { if (ed.editing) edit(e); });
  function fadeFx() {
    if (ed.fx) return; ed.fx = true;
    (function f() { ed.ga = Math.max(0, (ed.ga || 0) - 0.04); ed.pa = Math.max(0, (ed.pa || 0) - 0.07); redraw(true); if (ed.ga > 0 || ed.pa > 0) requestAnimationFrame(f); else { ed.fx = false; ed.ghost = null; ed.ptr = null; } })();
  }
  function up() { if (ed.editing) { ed.editing = false; ed.last = -1; pushFrame(ed.f); ed.spec = null; ed.mode === 'spec' && analyze(); fadeFx(); } }
  cvE.addEventListener('pointerup', up); cvE.addEventListener('pointercancel', up);

  function pushOne(f) { var fr = lib.Custom.data.slice(f * 2048, (f + 1) * 2048); for (var s = 0; s < 2; s++) if (TAB[s].name === 'Custom') A.send({ t: 'frame', slot: s, f: f, data: fr }); }
  function pushTable() { for (var s = 0; s < 2; s++) if (TAB[s].name === 'Custom') A.send({ t: 'table', slot: s, data: lib.Custom.data, n: lib.Custom.n }); }
  /* every tool is a tween: the wave melts from the old shape into the new one, sound and picture together */
  function act(label, fn, single) {
    return h('button', { class: 'btn', type: 'button', onclick: function () {
      if (ed.busy) return; toCustom(); var d = lib.Custom.data, n = lib.Custom.n, f0 = ed.f, before = d.slice(), after, lastPush = 0;
      fn(d, n); after = d.slice(); d.set(before); ed.busy = true; ed.spec = null;
      anim(single ? 300 : 420, function (u) {
        var i, lo = single ? f0 * 2048 : 0, hi = single ? (f0 + 1) * 2048 : d.length;
        for (i = lo; i < hi; i++) d[i] = before[i] + (after[i] - before[i]) * u;
        var now = performance.now(); if (u < 1 && now - lastPush > (single ? 45 : 160)) { lastPush = now; single ? pushOne(f0) : pushTable(); }
        redraw(true);
      }, function () { d.set(after); ed.busy = false; ed.spec = null; if (single) { pushOne(f0); refreshAll(); redraw(); } else pushAll(); });
    } }, label);
  }
  var tools = h('div', { class: 'btns' },
    act('Copy → all', function (d, n) { var s = d.slice(ed.f * 2048, (ed.f + 1) * 2048); for (var f = 0; f < n; f++) d.set(s, f * 2048); }),
    act('Morph first → last', function (d, n) { for (var f = 1; f < n - 1; f++) { var u = f / (n - 1); for (var i = 0; i < 2048; i++) d[f * 2048 + i] = d[i] * (1 - u) + d[(n - 1) * 2048 + i] * u; } }),
    act('Smooth', function (d) { var b = ed.f * 2048, c = d.slice(b, b + 2048); for (var i = 0; i < 2048; i++) d[b + i] = (c[(i + 2046) % 2048] + 2 * c[(i + 2047) % 2048] + 3 * c[i] + 2 * c[(i + 1) % 2048] + c[(i + 2) % 2048]) / 9; }, true),
    act('Normalize', function (d, n) { for (var f = 0; f < n; f++) S.normFrame(d, f * 2048); }),
    act('Reverse', function (d) { var b = ed.f * 2048, c = d.slice(b, b + 2048); for (var i = 0; i < 2048; i++) d[b + i] = c[2047 - i]; }, true),
    act('Sine', function (d) { var b = ed.f * 2048; for (var i = 0; i < 2048; i++) d[b + i] = Math.sin(2 * Math.PI * i / 2048); }, true),
    h('button', { class: 'btn pri', type: 'button', onclick: function () { fileIn.click(); } }, 'Import WAV'));
  /* morphing toolbox: every tool is tweened by act(); 'single' tools touch only the frame you are on */
  function frameOf(d, f) { return d.slice(f * 2048, (f + 1) * 2048); }
  function smoothed(c, passes) { var a = c, i, p, o; for (p = 0; p < passes; p++) { o = new Float32Array(2048); for (i = 0; i < 2048; i++) o[i] = (a[(i + 2046) % 2048] + a[(i + 2047) % 2048] + a[i] + a[(i + 1) % 2048] + a[(i + 2) % 2048]) / 5; a = o; } return a; }
  function randomHarmonics(nh) { var o = new Float32Array(2048), k, i, amp, ph; for (k = 1; k <= nh; k++) { amp = Math.random() / k; ph = Math.random() * 6.283; for (i = 0; i < 2048; i++) o[i] += amp * Math.sin(6.283 * k * i / 2048 + ph); } S.normFrame(o, 0); return o; }
  function perFrame(fn) { return function (d, n) { for (var f = 0; f < n; f++) { var c = fn(frameOf(d, f), f, n); d.set(c, f * 2048); S.normFrame(d, f * 2048); } }; }
  function onFrame(fn) { return function (d) { var b = ed.f * 2048, c = fn(frameOf(d, ed.f)); d.set(c, b); }; }
  var more = h('div', { class: 'btns' },
    act('Invert', onFrame(function (c) { return c.map(function (v) { return -v; }); }), true),
    act('Fold', onFrame(function (c) { return c.map(function (v) { return Math.sin(v * 2.4); }); }), true),
    act('Crush', onFrame(function (c) { return c.map(function (v) { return Math.round(v * 6) / 6; }); }), true),
    act('Skew', onFrame(function (c) { var o = new Float32Array(2048); for (var i = 0; i < 2048; i++) o[i] = c[Math.min(2047, Math.floor(Math.pow(i / 2048, 1.7) * 2048))]; return o; }), true),
    act('Shift', onFrame(function (c) { var o = new Float32Array(2048); for (var i = 0; i < 2048; i++) o[i] = c[(i + 256) % 2048]; return o; }), true),
    act('Random', onFrame(function () { return randomHarmonics(14); }), true),
    act('Brighter', perFrame(function (c) { var l = smoothed(c, 2); return c.map(function (v, i) { return v + 0.9 * (v - l[i]); }); })),
    act('Darker', perFrame(function (c) { return smoothed(c, 2); })),
    act('Random morph', function (d, n) { var keys = [randomHarmonics(10), randomHarmonics(14), randomHarmonics(8), randomHarmonics(18)], f, i, u, a, t; for (f = 0; f < n; f++) { u = n > 1 ? f / (n - 1) * 3 : 0; a = Math.min(2, Math.floor(u)); t = u - a; for (i = 0; i < 2048; i++) d[f * 2048 + i] = keys[a][i] * (1 - t) + keys[a + 1][i] * t; S.normFrame(d, f * 2048); } }),
    act('Harmonic sweep', function (d, n) { for (var f = 0; f < n; f++) { var nh = 1 + Math.round((n > 1 ? f / (n - 1) : 1) * 23), i, k; for (i = 0; i < 2048; i++) { var v = 0; for (k = 1; k <= nh; k++) v += Math.sin(6.283 * k * i / 2048) / k; d[f * 2048 + i] = v; } S.normFrame(d, f * 2048); } }),
    act('Sine → saw', function (d, n) { for (var f = 0; f < n; f++) { var u = n > 1 ? f / (n - 1) : 1; for (var i = 0; i < 2048; i++) d[f * 2048 + i] = Math.sin(6.283 * i / 2048) * (1 - u) + (1 - 2 * i / 2048) * u; S.normFrame(d, f * 2048); } }));
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0]; if (!f) return;
    f.arrayBuffer().then(function (buf) {
      var sizeHint = 0, u8 = new Uint8Array(buf, 0, Math.min(buf.byteLength, 4096)), s = '';
      for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      var m = /<!>(\d+)/.exec(s); if (m) sizeHint = parseInt(m[1], 10);
      var ctx = A.ctx || new (window.AudioContext || window.webkitAudioContext)();
      return ctx.decodeAudioData(buf.slice(0)).then(function (ab) {
        var ch = ab.getChannelData(0), len = ch.length, size = sizeHint > 0 && len % sizeHint === 0 ? sizeHint : (len % 2048 === 0 ? 2048 : (len % 1024 === 0 ? 1024 : (len % 512 === 0 ? 512 : (len <= 8192 ? len : 2048))));
        var frames = Math.max(1, Math.floor(len / size)), step = Math.max(1, Math.ceil(frames / 64)), n = Math.ceil(frames / step); if (n < 2) n = 2;
        var data = new Float32Array(n * 2048);
        for (var fi = 0; fi < n; fi++) {
          var srcF = Math.min(frames - 1, fi * step), off = srcF * size;
          for (var j = 0; j < 2048; j++) { var p = j / 2048 * size, i0 = Math.floor(p), fr = p - i0, a = ch[off + i0] || 0, b = ch[off + ((i0 + 1) % size)] || 0; data[fi * 2048 + j] = a + (b - a) * fr; }
          S.normFrame(data, fi * 2048);
        }
        lib.Custom = { n: n, data: data }; setTable(tsSlot, 'Custom'); ed.f = 0; ed.spec = null; paintChips(); refreshAll(); redraw();
        toast('Imported ' + n + ' frame' + (n > 1 ? 's' : '') + ' (' + size + ' samples each)');
        anim(900, function (u) { var q = u < 0.5 ? u * 2 : 2 - u * 2; ed.f = Math.round(q * (n - 1)); ed.spec = null; syncPos(); redraw(true); }, function () { ed.f = 0; ed.spec = null; syncPos(); redraw(); });
      });
    }).catch(function () { toast('Could not read that audio file'); });
    fileIn.value = '';
  });
  view = TableView(0, 96);
  tableSheet.onOpen = function () { var tv = TableView(tsSlot, 96); view.replaceWith(tv); view = tv; tableSheet.title.textContent = 'Wavetable · OSC ' + (tsSlot ? 'B' : 'A'); ed.f = clamp(Math.round(P[tsSlot ? 'bPos' : 'aPos'] * (cur().n - 1)), 0, cur().n - 1); ed.spec = null; paintChips(); setTimeout(function () { redraw(); }, 30); };
  tableSheet.body.append(chips, view, h('div', { style: 'height:8px' }), modeChips, cvE, tools, more, fileIn,
    h('div', { class: 'empty' }, 'Draw with a finger or use the spectrum bars. Editing a factory table makes a copy called Custom. Serum wavetable .wav files (2048-sample frames) import as they are.'));
}
function openTable(slot) { tsSlot = slot; tableSheet.open(); }


