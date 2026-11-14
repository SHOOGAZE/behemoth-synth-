/* ------------------------------------------------ 16-step bass sequencer (keys transpose it) and arp rhythm pattern */
var SEQ = { on: false, steps: [], len: 16, pos: 0, base: 36, next: 0, timer: 0, offs: [], cur: -1 };
(function () {
  var o = store('behemoth.seq'), i;
  if (o && o.steps && o.steps.length === 16) { SEQ.steps = o.steps; SEQ.len = o.len || 16; }
  else for (i = 0; i < 16; i++) SEQ.steps.push({ n: [0, 0, 12, 0, 7, 0, 10, 5][i % 8], s: i % 2 === 0 ? 1 : (i % 4 === 3 ? 2 : 0) });   /* s: 0 rest, 1 note, 2 accent */
})();
function seqSave() { store('behemoth.seq', { steps: SEQ.steps, len: SEQ.len }); }
var seqEls = [];
function seqPaint() {
  seqEls.forEach(function (c, i) {
    var st = SEQ.steps[i]; c.classList.toggle('off', i >= SEQ.len); c.dataset.s = st.s; c.classList.toggle('cur', SEQ.on && SEQ.cur === i);
    c.firstChild.textContent = st.s ? (st.n > 0 ? '+' + st.n : st.n < 0 ? '' + st.n : '0') : '·';
  });
}
function seqStart() {
  if (!A.ctx || SEQ.on) { if (!A.ctx) toast('Start the audio first'); return; }
  var ap = $('#arpOnSw'); if (P.arpOn >= 0.5) setP('arpOn', 0);
  releaseLatched(); Hold.fingers = 0; A.send({ t: 'panic' });
  SEQ.on = true; SEQ.pos = 0; SEQ.cur = -1; SEQ.next = A.ctx.currentTime + 0.06; SEQ.offs = [];
  SEQ.timer = setInterval(seqTick, 8); seqUi();
}
function seqStop(quiet) {
  if (!SEQ.on) return; SEQ.on = false; clearInterval(SEQ.timer); SEQ.cur = -1;
  SEQ.offs.forEach(function (o) { A.send({ t: 'off', id: o.id }); }); SEQ.offs = []; seqPaint(); seqUi();
}
function seqTick() {
  var now = A.ctx.currentTime, i, o, step = 60 / P.bpm * ARP_DIV_UI[Math.round(P.arpRate)];
  for (i = SEQ.offs.length - 1; i >= 0; i--) if (SEQ.offs[i].t <= now) { A.send({ t: 'off', id: SEQ.offs[i].id }); SEQ.offs.splice(i, 1); }
  while (SEQ.next < now + 0.04) {
    var idx = SEQ.pos % SEQ.len, st = SEQ.steps[idx]; SEQ.cur = idx;
    if (st.s) {
      var id = 90000 + idx, note = clamp(SEQ.base + st.n, 0, 127);
      A.send({ t: 'off', id: id }); A.send({ t: 'on', n: note, vel: st.s === 2 ? 1 : 0.7, id: id });
      SEQ.offs.push({ id: id, t: SEQ.next + step * P.arpGate });
    }
    SEQ.pos++; SEQ.next += step; requestAnimationFrame(seqPaint);
  }
}
var ARP_DIV_UI = [1, 0.5, 0.25, 0.125, 1 / 3, 1 / 6];
var seqBtns = [];
function seqUi() { seqBtns.forEach(function (b) { b.classList.toggle('on', SEQ.on); b.textContent = SEQ.on ? 'Stop' : 'Play'; }); }
function SeqStep(i) {
  var c = h('div', { class: 'sq', 'data-s': 0 }, h('b', null, ''), h('i', null, String(i + 1)));
  var d = null;
  c.addEventListener('pointerdown', function (e) { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) { } d = { y: e.clientY, n: SEQ.steps[i].n, moved: false }; });
  c.addEventListener('pointermove', function (e) {
    if (!d) return; var dy = d.y - e.clientY;
    if (Math.abs(dy) > 7) { d.moved = true; var st = SEQ.steps[i]; st.n = clamp(d.n + Math.round(dy / 9), -12, 24); if (!st.s) st.s = 1; seqPaint(); }
  });
  c.addEventListener('pointerup', function () {
    if (!d) return; var st = SEQ.steps[i];
    if (!d.moved) st.s = (st.s + 1) % 3; seqSave(); seqPaint(); buzz(5); d = null;
  });
  c.addEventListener('pointercancel', function () { d = null; });
  seqEls.push(c); return c;
}
var ARPPAT = (store('behemoth.arppat') || { len: 8, steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], on: false });
if (!ARPPAT.offs) ARPPAT.offs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function arpPatSend() { A.send({ t: 'arppat', steps: ARPPAT.on ? ARPPAT.steps.slice(0, ARPPAT.len) : null, offs: ARPPAT.offs.slice(0, ARPPAT.len) }); store('behemoth.arppat', ARPPAT); }
var apEls = [];
function arpPatPaint() { apEls.forEach(function (c, i) { c.dataset.s = ARPPAT.steps[i]; c.classList.toggle('off', i >= ARPPAT.len || !ARPPAT.on); var o = ARPPAT.offs[i]; c.firstChild.textContent = o > 0 ? '+' + o : o < 0 ? '' + o : ''; }); }


/* export the step pattern as a Standard MIDI File (format 0, 480 ppq) */
function seqMidi(bars) {
  var ppq = 480, step = Math.round(ppq * ARP_DIV_UI[Math.round(P.arpRate)]), gate = Math.max(1, Math.round(step * P.arpGate)), ev = [], i, b, n = SEQ.len;
  for (b = 0; b < (bars || 4); b++) for (i = 0; i < n; i++) {
    var st = SEQ.steps[i]; if (!st.s) continue;
    var t = (b * n + i) * step, note = clamp(SEQ.base + st.n, 0, 127), v = st.s === 2 ? 120 : 90;
    ev.push([t, 0x90, note, v], [t + gate, 0x80, note, 0]);
  }
  ev.sort(function (a, c) { return a[0] - c[0] || a[1] - c[1]; });
  function vlq(x) { var o = [x & 127]; while ((x >>= 7)) o.unshift((x & 127) | 128); return o; }
  var tr = [0, 0xFF, 0x51, 3], us = Math.round(60000000 / P.bpm), last = 0;
  tr.push((us >> 16) & 255, (us >> 8) & 255, us & 255);
  ev.forEach(function (e) { tr = tr.concat(vlq(e[0] - last), [e[1], e[2], e[3]]); last = e[0]; });
  tr = tr.concat([0, 0xFF, 0x2F, 0]);
  var h = [0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, ppq >> 8, ppq & 255, 0x4D, 0x54, 0x72, 0x6B, (tr.length >>> 24) & 255, (tr.length >>> 16) & 255, (tr.length >>> 8) & 255, tr.length & 255];
  return new Blob([new Uint8Array(h.concat(tr))], { type: 'audio/midi' });
}
function seqExportMidi() {
  var url = URL.createObjectURL(seqMidi(4)), a = document.createElement('a');
  a.href = url; a.download = 'behemoth-seq.mid'; document.body.append(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000); toast('Saved behemoth-seq.mid');
}
