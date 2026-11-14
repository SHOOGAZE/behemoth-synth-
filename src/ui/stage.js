/* STAGE: the whole screen becomes one instrument - split keyboard (two rows) or one big touch pad; BACK returns to the normal view */
var stageEl = null, stageMode = store('beh.stage') === 'pad' ? 'pad' : 'split';
/* minimum key width: landscape rows are short, so keys can be narrower and more octaves fit */
function stagePer() { var land = window.innerWidth > window.innerHeight; return (land ? { s: 38, m: 46, l: 54 } : { s: 46, m: 62, l: 76 })[CFG.skw] || (land ? 54 : 76); }
function buildStage() {
  var pad = h('div', { id: 'surfaceS' }), main = h('div', { class: 'main' }), nameEl = h('div', { class: 'sname' }, '');
  function stageForce() { var el = this, w = (el.clientWidth || window.innerWidth), per = stagePer(); return clamp(Math.ceil((w / per - 1) / 7 - .1), 1, 5); }
  /* finger-sized keys: height follows key width (~4.6:1), never the screen height */
  function keyDims() {
    var w = main.clientWidth || window.innerWidth, H = main.clientHeight || window.innerHeight * .6, per = stagePer();
    var oc = clamp(Math.ceil((w / per - 1) / 7 - .1), 1, 5), kw = w / (7 * oc + 1), kh = clamp(Math.round(kw * 4.6), 120, 250);
    return { kh: Math.min(kh, Math.max(110, H)), H: H };
  }
  pad._cols = 12;
  var padS = Surface(pad, 12);
  var bSplit = h('button', { type: 'button', onclick: function () { setMode('split'); } }, 'SPLIT'), bPad = h('button', { type: 'button', onclick: function () { setMode('pad'); } }, 'PAD');
  var glide = h('button', { class: 'pill', type: 'button', onclick: function () { PL.glide = !PL.glide; gl(); } }, 'GLIDE');
  function gl() { glide.classList.toggle('on', !!PL.glide); }
  function setMode(m) {
    stageMode = m; store('beh.stage', m); bSplit.classList.toggle('on', m === 'split'); bPad.classList.toggle('on', m === 'pad');
    main.innerHTML = ''; main.className = 'main m-' + m; glide.style.display = m === 'pad' ? '' : 'none';
    var D = keyDims();
    stageEl.style.setProperty('--kh', D.kh + 'px');
    /* a phone held sideways has room for one row only: a single keyboard at the global octave, as tall as the screen allows */
    var one = !!(window.matchMedia && matchMedia('(orientation: landscape) and (max-height: 540px)').matches);
    bSplit.textContent = one ? 'KEYS' : 'SPLIT'; if (typeof i18nEl === 'function') i18nEl(bSplit);
    if (m === 'split') {
      var wrap = h('div', { class: 'splitw' });
      if (one) stageEl.style.setProperty('--kh', clamp(D.H - 8, 110, 300) + 'px');
      /* two rows around the global octave: upper = Oct+1, lower = Oct-1 (the OCT control in the bar moves both) */
      (one ? [[0, 7000]] : [[1, 7000], [-1, 8000]]).forEach(function (r) {
        var el = h('div', { class: 'kbd' });
        el._force = function () { return stageForce.call(el); }; el._oct = function () { return clamp(PL.oct + r[0], 0, 7); }; el._idb = r[1];
        wrap.append(h('div', { class: 'splitrow' }, el));
      });
      main.append(wrap); requestAnimationFrame(function () { $$('.kbd', wrap).forEach(buildKeyboard); });
    }
    else { main.append(pad, h('div', { class: 'padinfo' }, 'X  PITCH / NOTE    Y  BRIGHTNESS'), h('div', { class: 'pady' })); padS.rebuild(); }
  }
  var back = h('button', { class: 'hbtn back', type: 'button', 'aria-label': 'Back', onclick: closeStage, html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M15 5l-7 7 7 7"/></svg>BACK' });
  var arp = h('button', { class: 'pill', type: 'button', onclick: function () { setP('arpOn', P.arpOn >= 0.5 ? 0 : 1); } }, 'ARP');
  function arpFn() { arp.classList.toggle('on', P.arpOn >= 0.5); } binders.push({ k: 'arpOn', fn: arpFn }); arpFn();
  /* three groups: navigation (back, mode), preset, controls. On a phone in portrait they are rows of one panel; elsewhere they flatten into one bar */
  var sctl = h('div', { class: 'sctl' }, holdButton('pill'), OctControl(), arp, glide, h('button', { class: 'pill', type: 'button', 'aria-label': 'Panic', onclick: panicAll }, '■'));
  var bar = h('div', { class: 'sbar' },
    h('div', { class: 'snav' }, back, h('div', { class: 'seg' }, bSplit, bPad)),
    h('div', { class: 'spre' },
      h('button', { class: 'pill', type: 'button', 'aria-label': 'Previous preset', onclick: function () { stepPreset(-1); }, html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' }), nameEl,
      h('button', { class: 'pill', type: 'button', 'aria-label': 'Next preset', onclick: function () { stepPreset(1); }, html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' })),
    sctl);
  var mrow = h('div', { class: 'smacros' });
  for (var mj = 0; mj < 4; mj++) { var mk = Knob({ k: 'm' + (mj + 1), label: 'M' + (mj + 1), big: false }); macroKnobs[mj] = mk; mrow.append(mk.el); }
  var mdef = store('behemoth.stageMacros'); if (mdef == null) mdef = true;
  var mbtn = h('button', { class: 'pill' + (mdef ? ' on' : ''), type: 'button', 'aria-label': 'Macro knobs', onclick: function () { mdef = !mdef; store('behemoth.stageMacros', mdef); mbtn.classList.toggle('on', mdef); stageEl.classList.toggle('macros', mdef); requestAnimationFrame(function () { stageEl._set(stageMode); }); } }, 'MACRO');
  sctl.insertBefore(mbtn, sctl.lastChild);
  stageEl = h('div', { id: 'stage', role: 'dialog', 'aria-label': 'Stage' }, bar, mrow, h('div', { class: 'sbody' }, h('div', { class: 'wgrp' }, Wheel('pitch'), Wheel('mod')), main));
  function hand() { stageEl.classList.toggle('lh', CFG.hand === 'left'); } stageEl._hand = hand; hand();
  stageEl._name = nameEl; stageEl._set = setMode; stageEl._gl = gl; stageEl.classList.toggle('macros', !!mdef); applyMacroNames();
  document.body.append(stageEl);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stageEl.classList.contains('on')) closeStage(); });
  window.addEventListener('resize', function () { if (stageEl.classList.contains('on')) { requestAnimationFrame(function () { stageEl._set(stageMode); }); } });
}
function openStage(mode) {
  if (!stageEl) return; hideTip(); stageEl._hand();
  if (typeof mode === 'string') { stageMode = mode === 'pad' ? 'pad' : 'split'; store('beh.stage', stageMode); } stageEl.classList.add('on'); stageEl._name.textContent = curPreset; stageEl._gl(); stageEl._set(stageMode);
  try { var d = document.documentElement; if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().catch(function () { }); } catch (e) { }
}
function closeStage() {
  if (!stageEl) return; stageEl.classList.remove('on'); Hold.fingers = 0;
  try { if (document.fullscreenElement) document.exitFullscreen(); if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { }
}
var kbdEl;
function buildPlay() {
  var v = views.play, surf = h('div', { id: 'surface' });
  v.append(card('Living surface', [surf,
    h('div', { class: 'empty' }, 'One finger per voice. Slide sideways to glide between notes, move up and down for the Y-AXIS source, press harder for PRESSURE.')], 'wide',
    [holdButton('mini'), h('button', { class: 'mini on', type: 'button', id: 'glideBtn', onclick: function () { PL.glide = !PL.glide; this.classList.toggle('on', PL.glide); } }, 'Glide'),
      h('button', { class: 'mini ico fsbtn', type: 'button', 'aria-label': 'Full-screen touchpad', onclick: function () { openStage('pad'); }, html: ico('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>').replace('width="20" height="20"', 'width="16" height="16"') })]));
  Surface(surf, 8);
  var scaleChips = h('div', { class: 'chips' }), rootChips = h('div', { class: 'chips' });
  function paintScale() {
    scaleChips.innerHTML = ''; SCALES.forEach(function (s, i) { scaleChips.append(h('button', { type: 'button', class: 'chip' + (PL.scale === i ? ' on' : ''), onclick: function () { PL.scale = i; paintScale(); rebuildSurfaces(); } }, s[0])); });
    rootChips.innerHTML = ''; NN.forEach(function (n, i) { rootChips.append(h('button', { type: 'button', class: 'chip' + (PL.root === i ? ' on' : ''), onclick: function () { PL.root = i; paintScale(); rebuildSurfaces(); rebuildKbds(); } }, n)); });
  }
  paintScale();
  var octStep = OctControl();
  kbdEl = h('div', { class: 'kbd' }); buildKeyboard(kbdEl);
  v.append(card('Scale & keys', [h('div', { class: 'ctlrow' }, h('span', { class: 'lab' }, 'Octave'), octStep), scaleChips, rootChips, kbdEl]));
  v.append(card('Arpeggiator', [
    h('div', { class: 'ctlrow' }, h('span', { class: 'lab' }, 'Arp'), Switch('arpOn'), h('span', { class: 'lab', style: 'margin-left:10px' }, 'Tempo'), Stepper('bpm', 2, function (x) { return Math.round(x) + ' BPM'; })),
    Chips('arpMode', ['UP', 'DOWN', 'UP/DN', 'RANDOM', 'ORDER']), Chips('arpRate', ['1/4', '1/8', '1/16', '1/32', '1/8T', '1/16T']),
    h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:0' }, Chips('arpOct', [{ l: '1 oct', v: 1 }, { l: '2 oct', v: 2 }, { l: '3 oct', v: 3 }, { l: '4 oct', v: 4 }])), Knob({ k: 'arpGate', label: 'Gate' }).el),
    h('div', { class: 'row' }, Knob({ k: 'arpSwing', label: 'Swing', fmt: FMT.pct }).el, Knob({ k: 'arpProb', label: 'Chance' }).el, Knob({ k: 'arpHuman', label: 'Humanize' }).el, Knob({ k: 'arpAcc', label: 'Accent' }).el)
  ]));
  /* rhythm pattern for the arpeggiator */
  var apGrid = h('div', { class: 'sqgrid sm' }); for (var ai = 0; ai < 16; ai++) { (function (i) {
    var c = h('div', { class: 'sq', 'data-s': 1 }, h('b', null, ''), h('i', null, String(i + 1))), d = null;
    c.addEventListener('pointerdown', function (e) { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) { } d = { y: e.clientY, o: ARPPAT.offs[i], moved: false }; });
    c.addEventListener('pointermove', function (e) { if (!d) return; var dy = d.y - e.clientY; if (Math.abs(dy) > 8) { d.moved = true; if (!ARPPAT.on) ARPPAT.on = true; ARPPAT.offs[i] = clamp(d.o + Math.round(dy / 9), -24, 24); if (!ARPPAT.steps[i]) ARPPAT.steps[i] = 1; arpPatPaint(); apOn.classList.add('on'); } });
    c.addEventListener('pointerup', function () { if (!d) return; if (!d.moved) { if (!ARPPAT.on) { ARPPAT.on = true; apOn.classList.add('on'); } ARPPAT.steps[i] = (ARPPAT.steps[i] + 2) % 3; buzz(4); } arpPatPaint(); arpPatSend(); d = null; });
    c.addEventListener('pointercancel', function () { d = null; });
    apEls.push(c); apGrid.append(c); })(ai); }
  var apOn = h('button', { class: 'chip', type: 'button', onclick: function () { ARPPAT.on = !ARPPAT.on; apOn.classList.toggle('on', ARPPAT.on); arpPatPaint(); arpPatSend(); } }, 'Rhythm pattern');
  apOn.classList.toggle('on', ARPPAT.on);
  var apLen = h('div', { class: 'chips' }); [4, 8, 12, 16].forEach(function (n) { var b = h('button', { type: 'button', class: 'chip' + (ARPPAT.len === n ? ' on' : ''), onclick: function () { ARPPAT.len = n; $$('.chip', apLen).forEach(function (x) { x.classList.toggle('on', +x.dataset.n === n); }); arpPatPaint(); arpPatSend(); } }, n + ' steps'); b.dataset.n = n; apLen.append(b); });
  arpPatPaint();
  v.append(card('Arp rhythm', [h('div', { class: 'chips' }, apOn), apLen, apGrid, h('div', { class: 'empty' }, 'Tap a step: rest → note → accent. Drag a step up or down to transpose it (semitones). The pattern shapes the arpeggiator in time.')]));
  /* chord memory */
  var chordChips = h('div', { class: 'chips' });
  function paintChords() { chordChips.innerHTML = ''; CHORDS.forEach(function (c, i) { chordChips.append(h('button', { type: 'button', class: 'chip' + (chordIdx === i ? ' on' : ''), onclick: function () { chordIdx = i; store('behemoth.chord', i); paintChords(); } }, c[0])); }); }
  paintChords();
  var vlBtn = h('button', { type: 'button', class: 'chip' + (voiceLead ? ' on' : ''), onclick: function () { voiceLead = !voiceLead; vlLast = null; store('behemoth.vl', voiceLead ? '1' : '0'); vlBtn.classList.toggle('on', voiceLead); toast(voiceLead ? 'Voice leading on' : 'Voice leading off'); } }, 'Voice leading');
  v.append(card('Chord memory', [chordChips, h('div', { class: 'chips' }, vlBtn), h('div', { class: 'empty' }, 'One key plays the whole chord. Voice leading keeps the upper notes close to the previous chord. Combine with the arpeggiator for instant patterns.')]));
  /* step sequencer */
  var sqGrid = h('div', { class: 'sqgrid' }); for (var si = 0; si < 16; si++) sqGrid.append(SeqStep(si));
  var sqPlay = h('button', { class: 'btn pri', type: 'button', onclick: function () { SEQ.on ? seqStop() : seqStart(); } }, 'Play'); seqBtns.push(sqPlay);
  var sqLen = h('div', { class: 'chips' }); [8, 16].forEach(function (n) { var b = h('button', { type: 'button', class: 'chip' + (SEQ.len === n ? ' on' : ''), onclick: function () { SEQ.len = n; $$('.chip', sqLen).forEach(function (x) { x.classList.toggle('on', +x.dataset.n === n); }); seqSave(); seqPaint(); } }, n + ' steps'); b.dataset.n = n; sqLen.append(b); });
  var sqRand = h('button', { class: 'btn', type: 'button', onclick: function () { var sc = [0, 0, 0, 12, 7, 5, 10, 3]; SEQ.steps.forEach(function (st, i) { st.s = Math.random() < .7 ? (Math.random() < .25 ? 2 : 1) : 0; st.n = pick(sc); }); seqSave(); seqPaint(); } }, 'Random');
  var sqClr = h('button', { class: 'btn', type: 'button', onclick: function () { SEQ.steps.forEach(function (st) { st.s = 0; st.n = 0; }); seqSave(); seqPaint(); } }, 'Clear');
  v.append(card('Step sequencer', [h('div', { class: 'btns' }, sqPlay, sqRand, sqClr, h('button', { class: 'btn', type: 'button', onclick: seqExportMidi }, 'MIDI')), sqLen, sqGrid,
    h('div', { class: 'empty' }, 'Tap a step: rest → note → accent. Drag a step up or down to change its pitch (semitones). While it runs, the keys transpose the pattern. Tempo, rate and gate come from the arpeggiator.')]));
  seqPaint();
  var tiltBtn = h('button', { class: 'btn', type: 'button', id: 'tiltBtn' }, 'Enable tilt');
  tiltBtn.addEventListener('click', enableTilt);
  v.append(card('Performance', [
    h('div', { class: 'btns' }, h('button', { class: 'btn pri', type: 'button', onclick: openQpm }, 'Quick Performance Mode'), tiltBtn,
      h('button', { class: 'btn', type: 'button', onclick: panicAll }, 'Panic')),
    h('div', { class: 'empty', id: 'tiltInfo' }, 'Tilt turns the phone into a TILT modulation source. Route it from the source strip. Quick Performance Mode shows four big macros, four snapshots and a full-screen surface.')]));
}


