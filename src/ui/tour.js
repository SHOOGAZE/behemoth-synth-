/* ------------------------------------------------ tutorial (step by step) and contextual tips */
var TOUR_ALL = [
  { title: 'Welcome', text: 'BEHEMOTH is a wavetable bass synth. This short tour shows the essentials. You can skip it and replay it any time from the menu: Tutorial & tips.' },
  { sel: '#dock', alt: '#top', title: 'Play', text: 'Tap the keys. HOLD sustains notes, ARP arpeggiates them, the square stops all sound, the arrows icon makes the keys bigger (full-screen Stage in landscape) and the chevron hides them.' },
  { sel: '#presetBtn', title: 'Presets', text: 'Tap here to browse presets. Star favourites, search, or press Random preset. Mutate and Randomize create new sounds from the current one.' },
  { sel: '#top .pnav[aria-label="Undo"]', title: 'Undo and compare', text: 'Undo any edit, and use A/B to compare your changes with the original preset.' },
  { sel: '#recBtn', title: 'Record', text: 'REC captures what you play. When you stop, you can listen, save a WAV file or share it.' },
  { sel: '#v-sound .knob', tab: 'sound', title: 'Knobs', text: 'Drag a knob up or down. The value shows above your finger. Double-tap resets it to default.' },
  { sel: '#srcbar', tab: 'sound', title: 'Modulation', text: 'Drag a coloured source (LFO, envelope, macro) onto a ringed knob to make it move. Tap a source, then drag a knob to set the depth. Double-tap a knob to remove the route.' },
  { sel: '#tabs', title: 'Screens', text: 'SOUND shapes the tone, MOD holds LFOs and the routing matrix, FX adds drive, chorus, delay and reverb, PLAY has the touchpad, chords, arpeggiator and step sequencer.' },
  { sel: '#v-play .card', tab: 'play', title: 'Touchpad', text: 'One finger per voice. Slide to glide, move up and down for brightness.' },
  { sel: '#top .menu', tab: 'sound', title: 'Settings', text: 'The menu holds MIDI learn, language, text size, contrast and this tutorial. Turn tips off there if you do not need them.' }
];
var tourEl = null;
function tourStart(force) {
  if (tourEl || (!force && store('behemoth.tour'))) return;
  /* the simple level has no MOD tab and no source strip */
  var TOUR = TOUR_ALL;
  if (CFG.level !== 'full') TOUR = TOUR_ALL.filter(function (t) { return t.sel !== '#srcbar'; }).map(function (t) {
    return t.sel === '#tabs' ? { sel: t.sel, title: t.title, text: 'SOUND shapes the tone, FX adds drive, chorus, delay and reverb, PLAY has the touchpad, chords, arpeggiator and step sequencer. For MOD, LFOs and the routing matrix open the menu and set Level to Full.' } : t;
  });
  var i = 0, veil = h('div', { id: 'tour' }, h('div', { class: 'tspot' }), h('div', { class: 'tcard' }, h('b'), h('p'), h('div', { class: 'tdots' }),
    h('div', { class: 'btns' }, h('button', { class: 'btn', type: 'button', onclick: done }, 'Skip'), h('button', { class: 'btn', type: 'button', id: 'tBack', onclick: function () { go(-1); } }, 'Back'), h('button', { class: 'btn pri', type: 'button', id: 'tNext', onclick: function () { go(1); } }, 'Next'))));
  tourEl = veil; document.body.append(veil);
  function done() { veil.remove(); tourEl = null; store('behemoth.tour', 1); showTab(curTab); }
  function go(d) { i += d; if (i >= TOUR.length) { done(); return; } if (i < 0) i = 0; show(d); }
  function show(dir) {
    var t = TOUR[i], sp = $('.tspot', veil), card = $('.tcard', veil);
    if (t.tab && curTab !== t.tab) showTab(t.tab);
    setTimeout(function () {
      var el = t.sel ? ($(t.sel) || null) : null;
      if (el && el.offsetParent === null && t.alt) el = $(t.alt);
      if (t.sel && (!el || el.offsetParent === null)) { go(dir || 1); return; }
      if (el) { try { var sc = el.closest('#views'); if (sc) { var er = el.getBoundingClientRect(), sr = sc.getBoundingClientRect(); if (er.top < sr.top + 6 || er.bottom > sr.bottom - 6) sc.scrollTop += er.top - sr.top - 40; } } catch (e) { } }
      var r = el ? el.getBoundingClientRect() : null, pad = 6;
      sp.style.cssText = r ? 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px' : 'left:50%;top:40%;width:0;height:0';
      $('b', card).textContent = (i + 1) + '/' + TOUR.length + ' · ' + t.title; $('p', card).textContent = t.text;
      $('.tdots', card).innerHTML = TOUR.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('');
      $('#tBack', veil).style.visibility = i ? 'visible' : 'hidden'; $('#tNext', veil).textContent = i === TOUR.length - 1 ? 'Done' : 'Next';
      var vh = window.innerHeight, below = !r || r.top < vh / 2;
      card.style.top = below ? (r ? Math.min(vh - 230, r.bottom + 16) : Math.round(vh * 0.28)) + 'px' : 'auto'; card.style.bottom = below ? 'auto' : (vh - r.top + 16) + 'px';
    }, t.tab ? 140 : 0);
  }
  show(1);
}
var TIPS = {
  sound: 'Oscillators A and B make the raw tone. Drag the knobs, and tap EDIT on a wavetable to draw your own.',
  mod: 'LFOs and envelopes move knobs for you. Drag a coloured source from the strip onto a ringed knob.',
  fx: 'Drive, chorus, delay and reverb finish the sound. Their mix knobs can be modulated too.',
  play: 'Play the touchpad, set a chord, an arpeggio rhythm or the step sequencer.'
};
var tipEl = null, tipT = 0;
function hideTip() { clearTimeout(tipT); if (tipEl) { tipEl.remove(); tipEl = null; } }
function maybeTip(n) {
  hideTip();
  if (CFG.tips !== 'on' || tourEl || !store('behemoth.tour') || !TIPS[n]) return;
  var seen = store('behemoth.tipsSeen') || {}; if (seen[n]) return;
  tipEl = h('div', { id: 'tip' }, h('p', null, TIPS[n]), h('div', { class: 'tbtns' },
    h('button', { class: 'btn pri', type: 'button', onclick: function () { seen[n] = 1; store('behemoth.tipsSeen', seen); hideTip(); } }, 'Got it'),
    h('button', { class: 'btn', type: 'button', onclick: function () { CFG.tips = 'off'; applyCfg(); repaintSettings(); hideTip(); toast('Tips off — turn them on in the menu'); } }, 'Turn off tips')));
  document.body.append(tipEl); tipT = setTimeout(hideTip, 14000);
}

