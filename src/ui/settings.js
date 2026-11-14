/* ------------------------------------------------ side menu (one button reaches everything) + settings sheet */
var setRepaint = [];
function toggleFullscreen() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { } }
function applyAll() { applyCfg(); applyTheme(); applyMotion(); applyWake(); setLang(CFG.lang); showTab(curTab); rebuildKbds(); }

/* a row of chips bound to one CFG key */
function cfgChips(label, key, opts, after) {
  var row = h('div', { class: 'chips' });
  function paint() {
    row.innerHTML = '';
    opts.forEach(function (o) { row.append(h('button', { type: 'button', class: 'chip' + (String(CFG[key]) === String(o[0]) ? ' on' : ''), onclick: function () { CFG[key] = o[0]; applyCfg(); paint(); buzz(5); if (after) after(); } }, o[1])); });
  }
  setRepaint.push(paint); paint();
  return h('div', { class: 'setg' }, label ? h('div', { class: 'lab2' }, label) : null, row);
}
function slider(label, min, max, step, get, set, fmt) {
  var out = h('span', { class: 'sval' }), inp = h('input', { type: 'range', min: min, max: max, step: step });
  function paint() { inp.value = get(); out.textContent = fmt(+get()); }
  inp.addEventListener('input', function () { set(+inp.value); out.textContent = fmt(+inp.value); });
  setRepaint.push(paint); paint();
  return h('div', { class: 'setg' }, h('div', { class: 'lab2' }, h('span', null, label), out), inp);
}
function section(title, open, kids) { var d = h('details', { class: 'sec' }, h('summary', null, title), h('div', { class: 'secb' }, kids)); if (open) d.open = true; return d; }
function repaintSettings() { setRepaint.forEach(function (f) { f(); }); }
function tuneText(c) { return (c > 0 ? '+' : '') + Math.round(c) + 'c · ' + (440 * Math.pow(2, c / 1200)).toFixed(1) + ' Hz'; }

function buildSettings() {
  settingsSheet = Sheet('settingsSheet', 'Settings');
  settingsSheet.body.append(
    section('Tutorial & tips', false, [
      cfgChips('Tips', 'tips', [['on', 'On'], ['off', 'Off']], hideTip),
      h('div', { class: 'btns' },
        h('button', { class: 'btn pri', type: 'button', onclick: function () { settingsSheet.close(); setTimeout(function () { tourStart(true); }, 250); } }, 'Start tutorial'),
        h('button', { class: 'btn', type: 'button', onclick: function () { store('behemoth.tipsSeen', {}); toast('Tips will show again'); } }, 'Reset tips'))]),
    section('Illumination', true, [
      slider('Glow', 0, 1.6, 0.05, function () { return CFG.glow; }, function (v) { CFG.glow = v; applyCfg(); applyTheme(); }, function (v) { return Math.round(v * 100) + '%'; })]),
    section('Interface', false, [
      cfgChips('Level', 'level', [['simple', 'Simple'], ['full', 'Full']], function () { showTab(curTab); }),
      cfgChips('Text size', 'text', [['m', 'Normal'], ['l', 'Large']]),
      cfgChips('Contrast', 'contrast', [['normal', 'Normal'], ['high', 'High']]),
      cfgChips('Knob size', 'ksize', [['s', 'Small'], ['m', 'Normal'], ['l', 'Large']], drawAllVis),
      cfgChips('Knob sensitivity', 'ksens', [[0.6, 'Fine'], [1, 'Normal'], [1.7, 'Fast']]),
      cfgChips('Hand', 'hand', [['right', 'Right-handed'], ['left', 'Left-handed']]),
      cfgChips('Mod source strip', 'srcbar', [['on', 'Shown'], ['off', 'Hidden']], function () { showTab(curTab); }),
      cfgChips('Hints', 'hint', [['on', 'On'], ['off', 'Off']], function () { showTab(curTab); }),
      cfgChips('Scope & meter', 'meters', [['on', 'On'], ['off', 'Off']]),
      cfgChips('Animations', 'motion', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], applyMotion),
      cfgChips('Vibration', 'haptics', [['on', 'On'], ['off', 'Off']], function () { buzz(20); }),
      cfgChips('Keep screen awake', 'wake', [['off', 'Off'], ['on', 'On']], applyWake)]),
    section('Keyboard', false, [
      cfgChips('Keyboard span', 'keys', [['auto', 'Auto'], ['1', '1 oct'], ['2', '2 oct'], ['3', '3 oct']], rebuildKbds),
      cfgChips('Stage key size', 'skw', [['s', 'Small'], ['m', 'Normal'], ['l', 'Large']], function () { if (stageEl && stageEl.classList.contains('on')) stageEl._set(stageMode); }),
      cfgChips('Keyboard height', 'kh', [['s', 'Compact'], ['m', 'Medium'], ['l', 'Tall']], rebuildKbds),
      cfgChips('Pitch & mod wheels', 'wheels', [['auto', 'Auto'], ['on', 'Always'], ['off', 'Hidden']]),
      cfgChips('Keys dock on PLAY tab', 'dockPlay', [['off', 'Hidden'], ['on', 'Shown']], function () { showTab(curTab); })]),
    section('Audio & global', false, [
      slider('Master volume', 0, 1, 0.01, function () { return P.vol; }, function (v) { setP('vol', v); }, FMT.pct),
      slider('Master tune', -100, 100, 1, function () { return CFG.tune; }, function (v) { CFG.tune = v; setP('tune', v); applyCfg(); }, tuneText),
      slider('Polyphony', 1, S.MAXV || 16, 1, function () { return P.voices; }, function (v) { setP('voices', v); }, FMT.num),
      slider('Pitch-bend range', 0, 24, 1, function () { return P.bend; }, function (v) { setP('bend', v); }, function (v) { return Math.round(v) + ' st'; })]),
    buildMidiUi(),
    section('System', false, h('div', { class: 'btns' },
      h('button', { class: 'btn', type: 'button', onclick: panicAll }, 'Stop all notes'),
      (function () {
        var b = h('button', { class: 'btn', type: 'button', onclick: function () { if (installEv) { installEv.prompt(); installEv = null; repaintSettings(); } else toast('Use your browser menu: Add to Home Screen'); } }, 'Install app');
        setRepaint.push(function () { b.style.display = (installEv || /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) && !window.matchMedia('(display-mode: standalone)').matches ? '' : 'none'; });
        return b;
      })(),
      document.fullscreenEnabled ? h('button', { class: 'btn', type: 'button', onclick: toggleFullscreen }, 'Fullscreen') : null,
      h('button', { class: 'btn', type: 'button', onclick: function () { var l = CFG.lang; for (var k in CFG_DEFAULT) CFG[k] = CFG_DEFAULT[k]; CFG.lang = l; CFG.tune = 0; setP('tune', 0); applyAll(); repaintSettings(); toast('Interface reset'); } }, 'Reset interface'))));
  var langSheet = Sheet('langSheet', 'Language');
  langSheet.body.append(cfgChips('', 'lang', [['en', 'English'], ['ru', 'Русский']], function () { setLang(CFG.lang); repaintSettings(); }));
  settingsSheet.body.append(h('div', { class: 'btns' }, h('button', { class: 'btn', type: 'button', onclick: function () { langSheet.open(); } }, 'Language')));
  settingsSheet.onOpen = repaintSettings;
}

