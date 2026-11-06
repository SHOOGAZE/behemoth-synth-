/* ------------------------------------------------ views */
var views = {};
function oscCard(slot) {
  var p = slot ? 'b' : 'a', name = slot ? 'B' : 'A', tn = h('span', null, 'Basic Shapes');
  var tb = h('button', { class: 'tn', type: 'button', onclick: function () { openTable(slot); } }, tn, h('i', null, 'EDIT'));
  binders.push({ k: p + 'Pos', fn: function () { tn.textContent = TAB[slot] ? TAB[slot].name : ''; } });
  vis.push(function () { tn.textContent = TAB[slot] ? TAB[slot].name : ''; });
  var warpOpts = [{ l: 'OFF', v: 0 }, { l: 'BEND +', v: 1 }, { l: 'BEND −', v: 2 }, { l: 'ASYM +', v: 3 }, { l: 'ASYM −', v: 4 }, { l: 'SYNC', v: 5 }, { l: 'MIRROR', v: 6 }, { l: 'QUANT', v: 7 }, { l: slot ? 'FM (A)' : 'FM (B)', v: 8 }, { l: slot ? 'RM (A)' : 'RM (B)', v: 9 }];
  return card('Oscillator ' + name, [
    h('div', { class: 'tabhead' }, tb, Switch(p + 'On')),
    TableView(slot, 104),
    Chips(p + 'WMode', warpOpts),
    h('div', { class: 'row' }, Knob({ k: p + 'Pos', label: 'Position', dest: slot ? 1 : 0 }).el, Knob({ k: p + 'Warp', label: 'Warp', dest: slot ? 3 : 2 }).el, Knob({ k: p + 'Lev', label: 'Level', dest: slot ? 5 : 4 }).el,
      Knob({ k: p + 'Uni', label: 'Unison', kind: 'int', fmt: FMT.num }).el, Knob({ k: p + 'Det', label: 'Detune', dest: slot ? dstIdx('bDet') : 10 }).el),
    h('div', { class: 'row' }, Knob({ k: p + 'Blend', label: 'Blend', dest: dstIdx(p + 'Blend') }).el, Knob({ k: p + 'Spread', label: 'Spread', dest: dstIdx(p + 'Spread') }).el, Knob({ k: p + 'Pan', label: 'Pan', fmt: FMT.pan, dest: dstIdx(p + 'Pan') }).el,
      Knob({ k: p + 'Oct', label: 'Octave', kind: 'int', fmt: FMT.int, dest: dstIdx(p + 'Oct') }).el, Knob({ k: p + 'Semi', label: 'Semi', kind: 'int', fmt: FMT.int }).el),
    h('div', { class: 'row' }, Knob({ k: p + 'Fine', label: 'Fine', fmt: FMT.cents, dest: dstIdx(p + 'Fine') }).el)
  ].concat(slot ? [] : []), 'osc');
}
function buildSound() {
  var v = views.sound;
  v.append(oscCard(0), oscCard(1));
  v.append(card('Sub & Noise', [
    h('div', { class: 'ctlrow' }, h('span', { class: 'lab' }, 'Sub'), Switch('subOn'), Chips('subWave', ['SINE', 'TRI', 'SQR', 'SAW']), Chips('subOct', [{ l: '−1', v: 1 }, { l: '−2', v: 2 }])),
    h('div', { class: 'row' }, Knob({ k: 'subLev', label: 'Sub', dest: 11 }).el, Knob({ k: 'nzLev', label: 'Noise', dest: 12 }).el),
    Chips('nzType', ['WHITE', 'PINK'])
  ]));
  v.append(card('Filter', [
    Chips('fType', ['LP 12', 'LP 24', 'HP', 'BAND', 'NOTCH', 'LADDER', 'COMB', 'FORMANT']),
    h('div', { class: 'row' }, Knob({ k: 'fCut', label: 'Cutoff', fmt: FMT.cut, dest: 7 }).el, Knob({ k: 'fRes', label: 'Reso', dest: 8 }).el, Knob({ k: 'fDrive', label: 'Drive', dest: 9 }).el,
      Knob({ k: 'fKey', label: 'Key trk' }).el, Knob({ k: 'fEnv', label: 'Env amt', fmt: FMT.signed }).el),
    h('div', { class: 'row' }, Knob({ k: 'fMix', label: 'Mix' }).el)
  ]));
  v.append(card('Amp envelope', [EnvEditor('e1', '--accent', 116),
    h('div', { class: 'empty' }, 'Drag the three nodes. Velocity sensitivity:'), h('div', { class: 'row' }, Knob({ k: 'vel', label: 'Velocity' }).el)]));
}
function buildMod() {
  var v = views.mod;
  v.append(card('Macros', h('div', { class: 'row' }, [1, 2, 3, 4].map(function (i) { return Knob({ k: 'm' + i, label: 'Macro ' + i, color: 'var(--c-macro)' }).el; })), ''));
  [0, 1].forEach(function (i) {
    var shp = h('div', { class: 'chips' });
    ['sine', 'tri', 'saw', 'ramp', 'sq', 'rnd'].forEach(function (s) { shp.append(h('button', { class: 'chip', type: 'button', onclick: function () { LFO[i] = shape(s); A.send({ t: 'lfo', i: i, pts: LFO[i] }); drawAllVis(); } }, s.toUpperCase())); });
    v.append(card('LFO ' + (i + 1), [LfoEditor(i), shp, h('div', { class: 'row' }, Knob({ k: 'l' + (i + 1) + 'Rate', label: 'Rate', kind: 'exp', fmt: FMT.hz, color: 'var(--c-lfo)', dest: dstIdx('l' + (i + 1) + 'Rate') }).el, h('div', { class: 'ctlrow', style: 'align-items:center;padding-right:8px' }, h('span', { class: 'lab', style: 'width:auto' }, 'Smooth'), Switch('l' + (i + 1) + 'Smooth')))]));
  });
  v.append(card('Envelope 2', [EnvEditor('e2', '--c-env', 116), h('div', { class: 'empty' }, 'Modulation envelope. Route it from the ENV 2 source.')]));
  routeBox = h('div', { id: 'routes' });
  addPanel = buildAddPanel();
  v.append(card('Mod matrix', [routeBox, h('div', { style: 'margin-top:6px' }), addPanel], 'wide'));
  renderRoutes();
}
function buildFx() {
  var v = views.fx;
  v.append(card('Drive', h('div', { class: 'row' }, Knob({ k: 'fxDrive', label: 'Drive', dest: 15 }).el)));
  v.append(card('Chorus', h('div', { class: 'row' }, Knob({ k: 'chMix', label: 'Mix', dest: dstIdx('chMix') }).el, Knob({ k: 'chRate', label: 'Rate', kind: 'exp', fmt: FMT.hz }).el, Knob({ k: 'chDepth', label: 'Depth' }).el)));
  v.append(card('Delay', h('div', { class: 'row' }, Knob({ k: 'dlMix', label: 'Mix', dest: 13 }).el, Knob({ k: 'dlTime', label: 'Time', kind: 'exp', fmt: FMT.ms }).el, Knob({ k: 'dlFb', label: 'Feedback', dest: dstIdx('dlFb') }).el)));
  v.append(card('Reverb', h('div', { class: 'row' }, Knob({ k: 'rvMix', label: 'Mix', dest: 14 }).el, Knob({ k: 'rvSize', label: 'Size' }).el, Knob({ k: 'rvDamp', label: 'Damp' }).el)));
  v.append(card('Voice & master', [
    h('div', { class: 'ctlrow' }, h('span', { class: 'lab' }, 'Mono'), Switch('mono'), h('span', { class: 'lab', style: 'margin-left:12px' }, 'Voices'), Stepper('voices', 1, function (x) { return Math.round(x) + ''; })),
    h('div', { class: 'row' }, Knob({ k: 'vol', label: 'Master', dest: dstIdx('vol') }).el, Knob({ k: 'glide', label: 'Glide' }).el, Knob({ k: 'bend', label: 'Bend range', kind: 'int', fmt: function (x) { return '±' + Math.round(x); } }).el)
  ], 'wide'));
}


