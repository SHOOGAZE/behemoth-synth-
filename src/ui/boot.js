/* ------------------------------------------------ header meters */
function headerLoop() {
  var sc = $('#scope'), g, W, H;
  (function frame() {
    var c = fit(sc, 34); g = c.g; W = c.w; H = c.h; g.clearRect(0, 0, W, H);
    var a = A.scope, w = A.scopeW | 0, i;
    g.beginPath(); for (i = 0; i < 256; i++) { var v = a[(w + i) & 255] || 0, x = i / 255 * W, y = H / 2 - v * (H / 2 - 3); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = 1.4; g.strokeStyle = cssvCache.accent; g.stroke();
    var pk = A.peak; A.peak *= 0.85; $('#meter b').style.height = clamp(pk, 0, 1) * 100 + '%'; $('#voices').textContent = (A.voices | 0) + 'v';
    requestAnimationFrame(frame);
  })();
}
var cssvCache = { accent: '#ff5a14' };



/* ------------------------------------------------ boot */
function buildUi() {
  var app = $('#app');
  app.innerHTML = '';
  app.append(
    h('header', { id: 'top' }, h('span', { class: 'logo' }, 'BEHEMOTH'),
      h('div', { class: 'pgroup' }, h('button', { class: 'pnav', type: 'button', 'aria-label': 'Previous preset', onclick: function () { stepPreset(-1); } }, '‹'),
        h('button', { id: 'presetBtn', type: 'button', onclick: function () { presetSheet.open(); } }, h('span', { id: 'presetName' }, curPreset), h('i', null, 'PRESETS')),
        h('button', { class: 'pnav', type: 'button', 'aria-label': 'Next preset', onclick: function () { stepPreset(1); } }, '›'),
        histBtn('undo', '↶', 'Undo', histUndo), histBtn('ab', 'A/B', 'Compare with the saved preset', abToggle, 'pnav ab')),
      h('canvas', { id: 'scope', 'aria-label': 'Oscilloscope' }), h('div', { class: 'meter', id: 'meter' }, h('b')), h('div', { id: 'voices' }, '0v'),
      h('button', { class: 'hbtn rec', id: 'recBtn', type: 'button', 'aria-label': 'Record audio', onclick: toggleRec }, 'REC'),
      h('button', { class: 'hbtn stg', type: 'button', 'aria-label': 'Stage: fullscreen keys and pad', onclick: openStage }, 'STAGE'),
      h('button', { class: 'hbtn ico menu', type: 'button', 'aria-label': 'Menu', onclick: function () { settingsSheet.open(); buzz(6); }, html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' })),
    h('div', { id: 'srcbar' }), h('div', { id: 'hint' }),
    h('main', { id: 'views' }, ['sound', 'mod', 'fx', 'play'].map(function (n) { var d = h('div', { class: 'view', id: 'v-' + n }); views[n] = d; return d; })),
    buildDock(),
    h('aside', { id: 'rail' }, h('nav', { id: 'tabs' }, [['sound', 'SOUND'], ['mod', 'MOD'], ['fx', 'FX'], ['play', 'PLAY']].map(function (t, i) { return h('button', { type: 'button', 'data-t': t[0], class: i ? '' : 'on', onclick: function () { showTab(t[0]); } }, h('span', null, t[1])); }))));
  buildCaps(); buildSound(); buildMod(); buildFx(); buildPlay(); buildPresetSheet(); buildSettings(); buildTableSheet(); buildQpm(); buildStage(); buildRec();
  showTab('sound');
  applyTheme(); applyMotion(); applyWake(); setLang(CFG.lang);
}
var curTab = 'sound';
function showTab(n) {
  curTab = n;
  $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === n); });
  for (var k in views) views[k].classList.toggle('on', k === n);
  var strip = (n === 'sound' || n === 'mod' || n === 'fx') ? 'flex' : 'none'; $('#srcbar').style.display = strip; $('#hint').style.display = strip; $('#dock').style.display = (n === 'play' && CFG.dockPlay !== 'on') ? 'none' : '';
  $('#views').scrollTop = 0; setTimeout(drawAllVis, 0); maybeTip(n);
}
function boot() {
  setTable(0, 'Glass Bells', true); setTable(1, 'Glass Bells', true);
  buildUi();
  var last = store('behemoth.last'), idx = -1; FACTORY.forEach(function (f, i) { if (f.name === last) idx = i; });
  var ul = userPresets().filter(function (u) { return u.name === last; })[0];
  if (ul) applyPreset(ul, true); else { var f = FACTORY[idx >= 0 ? idx : 1], p = {}; for (var k in f.p) p[k] = f.p[k]; applyPreset({ name: f.name, p: p, routes: f.routes, tables: f.tables, lfo: f.lfo }, true); }
  headerLoop(); requestAnimationFrame(visLoop);
  window.addEventListener('resize', relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe($('#views'));
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.__behemoth = { setP: setP, HIST: HIST, AB: AB, midiNote: midiNote, MIDI: MIDI, Hold: Hold, A: A, P: P, ROUTES: function () { return ROUTES; }, S: S, applyPreset: applyPreset, FACTORY: FACTORY, setRoute: setRoute };
  var btn = $('#startBtn'), err = $('#startErr'), hz = $('#startHz');
  btn.addEventListener('click', function () {
    btn.disabled = true; hz.textContent = 'loading…'; hz.classList.add('busy');
    initAudio().then(function () { $('#start').style.display = 'none'; initMidi(); toast('Audio running · ' + (A.mode === 'worklet' ? 'AudioWorklet' : 'compat mode')); drawAllVis(); setTimeout(tourStart, 900); })
      .catch(function (e) { err.textContent = String(e && e.message || e); btn.disabled = false; hz.classList.remove('busy'); hz.textContent = 'touch anywhere to retry'; });
  });
}
var installEv = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEv = e; if (typeof repaintSettings === 'function') repaintSettings(); });
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
