/* ------------------------------------------------ keyboard & MIDI */
var KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14 }, kdown = {};
window.addEventListener('keydown', function (e) { if (e.repeat || e.metaKey || e.ctrlKey || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; var s = KEYMAP[e.key]; if (s === undefined || kdown[e.key]) return; kdown[e.key] = 1; playOn(12 * (PL.oct + 1) + s, 0.8, 7000 + s); });
window.addEventListener('keyup', function (e) { var s = KEYMAP[e.key]; if (s === undefined) return; delete kdown[e.key]; playOff(7000 + s); });
/* ------------------------------------------------ MIDI: notes, pitch bend, sustain pedal, aftertouch, learnable CC */
var MIDI = { learning: false, target: null, map: null, held: {}, inputs: 0 };
var MIDI_DEFAULT = { 1: 'm1', 2: 'm2', 71: 'fRes', 74: 'fCut', 91: 'rvMix', 93: 'chMix' };
MIDI.map = store('behemoth.midimap') || JSON.parse(JSON.stringify(MIDI_DEFAULT));
function midiSave() { store('behemoth.midimap', MIDI.map); }
function knobFor(k) { for (var i = 0; i < knobs.length; i++) if (knobs[i].o.k === k) return knobs[i]; return null; }
function paramLabel(k) { var K = knobFor(k); return K ? K.o.label : k; }
function midiCC(cc, val) {
  var n = val / 127, k;
  if (cc === 64) { var down = val >= 64; if (down !== Hold.on) setHold(down, true); return; }
  if (cc === 120 || cc === 123) { panicAll(); return; }
  if (MIDI.learning) {
    if (MIDI.target) { MIDI.map[cc] = MIDI.target; midiSave(); toast('CC ' + cc + ' → ' + paramLabel(MIDI.target)); MIDI.target = null; midiMarks(); repaintSettings(); }
    return;
  }
  k = MIDI.map[cc]; if (!k) return;
  var K = knobFor(k), d = S.PARAMS[k]; if (!d) return;
  setP(k, K ? K.fromNorm(n) : d[1] + n * (d[2] - d[1]));
}
function midiMarks() { knobs.forEach(function (K) { K.el.classList.toggle('learn-target', MIDI.learning && MIDI.target === K.o.k); }); }
function midiPick(k, el) { MIDI.target = k; midiMarks(); buzz(8); $('#learnMsg').textContent = paramLabel(k) + ' — now move a controller'; }
function midiLearn(on) {
  MIDI.learning = on; MIDI.target = null; document.body.classList.toggle('learning', on); midiMarks();
  $('#learnBar').style.display = on ? 'flex' : 'none'; $('#learnMsg').textContent = 'Tap a knob, then move a controller';
}
function midiNote(d) {
  var c = d[0] & 0xf0, n = d[1];
  if (c === 0x90 && d[2] > 0) { MIDI.held[n] = 1; playOn(n, d[2] / 127, 8000 + n); }
  else if (c === 0x80 || c === 0x90) { delete MIDI.held[n]; playOff(8000 + n); }
  else if (c === 0xb0) midiCC(d[1], d[2]);
  else if (c === 0xe0) { var v = ((d[2] << 7) | d[1]) / 8192 - 1; for (var m = 0; m < 128; m++) A.send({ t: 'bend', id: 8000 + m, v: v * P.bend }); }
  else if (c === 0xd0) { for (var h2 in MIDI.held) A.send({ t: 'z', id: 8000 + +h2, v: d[1] / 127 }); }
  else if (c === 0xa0) A.send({ t: 'z', id: 8000 + n, v: d[2] / 127 });
}
function initMidi() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then(function (m) {
    function bind() { MIDI.inputs = 0; m.inputs.forEach(function (inp) { inp.onmidimessage = function (ev) { midiNote(ev.data); }; MIDI.inputs++; }); repaintSettings(); }
    bind(); m.onstatechange = bind;
  }).catch(function () { });
}
function buildMidiUi() {
  var bar = h('div', { id: 'learnBar', style: 'display:none' }, h('span', { id: 'learnMsg' }, ''), h('button', { class: 'btn pri', type: 'button', onclick: function () { midiLearn(false); } }, 'Done'));
  document.body.append(bar);
  var list = h('div', { class: 'mmap' }), status = h('div', { class: 'empty' }, '');
  function paint() {
    status.textContent = navigator.requestMIDIAccess ? (MIDI.inputs ? MIDI.inputs + ' MIDI input' + (MIDI.inputs > 1 ? 's' : '') + ' connected' : 'No MIDI input connected') : 'Web MIDI is not supported in this browser';
    list.innerHTML = '';
    var ccs = Object.keys(MIDI.map).map(Number).sort(function (a, b) { return a - b; });
    if (!ccs.length) list.append(h('div', { class: 'empty' }, 'No controller assignments'));
    ccs.forEach(function (cc) { list.append(h('div', { class: 'mrow2' }, h('span', null, 'CC ' + cc), h('b', null, paramLabel(MIDI.map[cc])), h('button', { type: 'button', 'aria-label': 'Remove', onclick: function () { delete MIDI.map[cc]; midiSave(); paint(); } }, '✕'))); });
  }
  setRepaint.push(paint); paint();
  return section('MIDI', false, [status,
    h('div', { class: 'btns' },
      h('button', { class: 'btn pri', type: 'button', onclick: function () { settingsSheet.close(); midiLearn(true); } }, 'MIDI learn'),
      h('button', { class: 'btn', type: 'button', onclick: function () { MIDI.map = JSON.parse(JSON.stringify(MIDI_DEFAULT)); midiSave(); paint(); } }, 'Defaults'),
      h('button', { class: 'btn', type: 'button', onclick: function () { MIDI.map = {}; midiSave(); paint(); } }, 'Clear all')),
    h('div', { class: 'empty' }, 'Sustain pedal (CC 64), pitch bend, channel and poly aftertouch work automatically.'), list]);
}

