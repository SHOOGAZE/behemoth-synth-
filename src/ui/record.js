/* ------------------------------------------------ recording: capture the master output, save / share as 16-bit WAV */
var REC = { on: false, chunks: [], frames: 0, node: null, sink: null, t0: 0, timer: 0, url: '', blob: null, max: 300 };
function recSource() { return A.mode === 'worklet' ? A.node : A.mode === 'script' ? A.sp : null; }
function recFmt(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
function recStart() {
  var src = recSource(); if (!src || REC.on) { if (!src) toast('Start the audio first'); return; }
  REC.chunks = []; REC.frames = 0;
  REC.node = A.ctx.createScriptProcessor(4096, 2, 2);
  REC.sink = A.ctx.createGain(); REC.sink.gain.value = 0;
  REC.node.onaudioprocess = function (ev) {
    var l = ev.inputBuffer.getChannelData(0), r = ev.inputBuffer.numberOfChannels > 1 ? ev.inputBuffer.getChannelData(1) : l, n = l.length, b = new Int16Array(n * 2), i, v;
    for (i = 0; i < n; i++) { v = l[i]; b[2 * i] = (v < -1 ? -1 : v > 1 ? 1 : v) * 32767; v = r[i]; b[2 * i + 1] = (v < -1 ? -1 : v > 1 ? 1 : v) * 32767; }
    REC.chunks.push(b); REC.frames += n;
    if (REC.frames / A.ctx.sampleRate >= REC.max) setTimeout(recStop, 0);
  };
  src.connect(REC.node); REC.node.connect(REC.sink); REC.sink.connect(A.ctx.destination);
  REC.on = true; REC.t0 = performance.now(); buzz(12);
  var btn = $('#recBtn'); btn.classList.add('on');
  REC.timer = setInterval(function () { btn.textContent = '● ' + recFmt((performance.now() - REC.t0) / 1000); }, 250); btn.textContent = '● 0:00';
}
function wavBlob(chunks, frames, sr) {
  var data = frames * 4, buf = new ArrayBuffer(44 + data), dv = new DataView(buf), o = 44, i, c;
  function str(p, t) { for (var k = 0; k < t.length; k++) dv.setUint8(p + k, t.charCodeAt(k)); }
  str(0, 'RIFF'); dv.setUint32(4, 36 + data, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, data, true);
  for (c = 0; c < chunks.length; c++) { var ch = chunks[c]; for (i = 0; i < ch.length; i++, o += 2) dv.setInt16(o, ch[i], true); }
  return new Blob([buf], { type: 'audio/wav' });
}
function recStop() {
  if (!REC.on) return; REC.on = false; clearInterval(REC.timer);
  try { var src = recSource(); src && src.disconnect(REC.node); REC.node.disconnect(); REC.sink.disconnect(); } catch (e) { } REC.node.onaudioprocess = null;
  var btn = $('#recBtn'); btn.classList.remove('on'); btn.textContent = 'REC';
  if (REC.frames < A.ctx.sampleRate * 0.2) { toast('Recording too short'); return; }
  if (REC.url) URL.revokeObjectURL(REC.url);
  REC.blob = wavBlob(REC.chunks, REC.frames, A.ctx.sampleRate); REC.chunks = []; REC.url = URL.createObjectURL(REC.blob);
  recSheet.audio.src = REC.url; recSheet.info.textContent = recFmt(REC.frames / A.ctx.sampleRate) + ' · ' + (REC.blob.size / 1048576).toFixed(1) + ' MB · WAV 16-bit stereo';
  recSheet.open();
}
function recName() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return 'behemoth-' + String(curPreset).replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() + '-' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + '.wav'; }
var recSheet;
function buildRec() {
  recSheet = Sheet('recSheet', 'Recording');
  var audio = h('audio', { controls: true, style: 'width:100%;margin:6px 0 12px' }), info = h('div', { class: 'empty' }, '');
  var save = h('button', { class: 'btn pri', type: 'button', onclick: function () { if (!REC.blob) return; var a = h('a', { href: REC.url, download: recName() }); document.body.append(a); a.click(); a.remove(); toast('Saved'); } }, 'Save WAV');
  var share = h('button', { class: 'btn', type: 'button', onclick: function () {
    if (!REC.blob) return; var f = new File([REC.blob], recName(), { type: 'audio/wav' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'BEHEMOTH · ' + curPreset }).catch(function () { }); else toast('Sharing is not supported here — use Save');
  } }, 'Share');
  var drop = h('button', { class: 'btn', type: 'button', onclick: function () { audio.pause(); audio.removeAttribute('src'); REC.blob = null; recSheet.close(); } }, 'Discard');
  recSheet.body.append(info, audio, h('div', { class: 'btns' }, save, navigator.share ? share : null, drop));
  recSheet.audio = audio; recSheet.info = info; recSheet.onClose = function () { audio.pause(); };
}
function toggleRec() { REC.on ? recStop() : recStart(); }

