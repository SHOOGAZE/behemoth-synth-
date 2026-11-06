/* ------------------------------------------------ modulation capsules */
var capEls = [], ghost = null, cable = null;
function cableEl() {
  if (cable) return cable;
  cable = document.createElementNS(NS, 'svg'); cable.setAttribute('id', 'cable');
  cable.innerHTML = '<path class="glow"/><path class="core"/><circle class="end" r="5"/><circle class="start" r="4"/>'; document.body.append(cable); return cable;
}
function cableTo(from, x, y) {
  var c = cableEl(), r = from.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, sag = Math.max(y0, y) + 70 + Math.abs(x - x0) * 0.12;
  var d = 'M' + x0 + ' ' + y0 + 'C' + (x0 + (x - x0) * 0.2) + ' ' + sag + ' ' + (x0 + (x - x0) * 0.8) + ' ' + sag + ' ' + x + ' ' + y;
  $('.glow', c).setAttribute('d', d); $('.core', c).setAttribute('d', d);
  $('.end', c).setAttribute('cx', x); $('.end', c).setAttribute('cy', y); $('.start', c).setAttribute('cx', x0); $('.start', c).setAttribute('cy', y0);
}

/* macro names follow what the macro does in the current preset: the strongest route decides */
var MACRO_WORD = { aPos: 'Morph', bPos: 'Morph', aWarp: 'Warp', bWarp: 'Warp', aLev: 'Level', bLev: 'Level', pitch: 'Pitch', fCut: 'Bright', fRes: 'Res', fDrive: 'Drive', aDet: 'Width', subLev: 'Sub', nzLev: 'Noise', dlMix: 'Echo', rvMix: 'Space', fxDrive: 'Dirt' };
var macroKnobs = [];
function macroName(j) {
  var best = null, m = srcIdx('m' + (j + 1)); ROUTES.forEach(function (r) { if (r.s === m && (!best || Math.abs(r.a) > Math.abs(best.a))) best = r; });
  return best ? MACRO_WORD[DST[best.d].id] || DST[best.d].name : '';
}
function applyMacroNames() {
  for (var j = 0; j < 4; j++) {
    var i = srcIdx('m' + (j + 1)), w = macroName(j), nm = w ? 'M' + (j + 1) + ' ' + w : 'MACRO ' + (j + 1);
    SRC[i].name = nm;
    if (capEls[i] && capEls[i].firstChild) capEls[i].firstChild.nodeValue = nm;
    if (macroKnobs[j]) macroKnobs[j].setLabel(w || 'M' + (j + 1));
  }
}
function updateCaps() {
  capEls.forEach(function (c, i) {
    c.classList.toggle('sel', SEL === i);
    var n = ROUTES.filter(function (r) { return r.s === i; }).length;
    $('.n', c).textContent = n ? n : '';
  });
  var hint = $('#hint');
  if (SEL == null) hint.innerHTML = 'Drag a source onto a knob, or tap it and drag knobs to set depth.';
  else { hint.style.setProperty('--sc', 'var(' + srcVar(SRC[SEL]) + ')'); hint.innerHTML = '<b>' + SRC[SEL].name + '</b> armed. Drag a ringed knob to set depth, double-tap to remove.'; }
}
function selectSrc(i) { SEL = SEL === i ? null : i; for (var k = 0; k < knobs.length; k++) knobs[k].update(); updateCaps(); renderRoutes(); }
function buildCaps() {
  var bar = $('#srcbar');
  bar.addEventListener('wheel', function (e) { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { bar.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  SRC.forEach(function (s, i) {
    var c = h('button', { class: 'cap ' + srcCls(s), type: 'button' }, s.name, h('span', { class: 'n' }));
    var st = null;
    c.addEventListener('pointerdown', function (e) { c.setPointerCapture(e.pointerId); st = { x: e.clientX, y: e.clientY, drag: false }; });
    c.addEventListener('pointermove', function (e) {
      if (!st) return;
      if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 12 && Math.abs(e.clientY - st.y) > Math.abs(e.clientX - st.x) * 0.6) {
        st.drag = true; ghost = c.cloneNode(true); ghost.classList.add('sel'); ghost.style.cssText = 'position:fixed;z-index:90;pointer-events:none;left:0;top:0'; document.body.append(ghost);
        bar.style.overflowX = 'hidden';
        var cb = cableEl(); cb.style.setProperty('--sc', 'var(' + srcVar(s) + ')'); cb.classList.remove('plug'); cb.classList.add('show'); cableTo(c, e.clientX, e.clientY);
        for (var k = 0; k < knobs.length; k++) if (knobs[k].o.dest != null) { knobs[k].el.classList.add('armed'); knobs[k].el.style.setProperty('--arm', 'var(' + srcVar(s) + ')'); }
      }
      if (st.drag) {
        ghost.style.transform = 'translate(' + (e.clientX - 40) + 'px,' + (e.clientY - 70) + 'px)'; cableTo(c, e.clientX, e.clientY);
        $$('.knob.drop').forEach(function (k) { k.classList.remove('drop'); });
        var t = document.elementFromPoint(e.clientX, e.clientY), kn = t && t.closest && t.closest('.knob[data-dest]');
        if (kn && kn.dataset.dest !== '') { kn.classList.add('drop'); kn.style.setProperty('--arm', 'var(' + srcVar(s) + ')'); }
      }
    });
    function fin(e, cancel) {
      if (!st) return;
      if (st.drag) {
        var t = document.elementFromPoint(e.clientX, e.clientY), kn = !cancel && t && t.closest && t.closest('.knob[data-dest]');
        if (kn && kn.dataset.dest !== '') {
          var d = +kn.dataset.dest; if (findRoute(i, d) < 0) setRoute(i, d, 0.5); SEL = i; toast(s.name + ' → ' + DST[d].name);
          var kr = kn.getBoundingClientRect(); cableTo(c, kr.left + kr.width / 2, kr.top + kr.width / 2 - 4); cable.classList.add('plug');
          kn.classList.remove('zap'); void kn.offsetWidth; kn.classList.add('zap'); setTimeout(function () { kn.classList.remove('zap'); }, 700);
        }
        if (cable && !cable.classList.contains('plug')) cable.classList.add('plug');
        setTimeout(function () { cable && cable.classList.remove('show'); }, 380);
        ghost && ghost.remove(); ghost = null; bar.style.overflowX = '';
        $$('.knob.drop').forEach(function (k) { k.classList.remove('drop'); });
        for (var k = 0; k < knobs.length; k++) knobs[k].update();
        updateCaps(); renderRoutes();
      } else if (!cancel) selectSrc(i);
      st = null;
    }
    c.addEventListener('pointerup', function (e) { fin(e, false); }); c.addEventListener('pointercancel', function (e) { fin(e, true); });
    capEls.push(c); bar.append(c);
  });
  updateCaps();
}
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

var routeBox, addPanel, addSrc = 0;
function renderRoutes() {
  if (!routeBox) return;
  routeBox.innerHTML = '';
  if (!ROUTES.length) routeBox.append(h('div', { class: 'empty' }, 'No routes yet. Drag a coloured source from the strip above onto any ringed knob, or add one below.'));
  ROUTES.forEach(function (r, idx) {
    var s = SRC[r.s], sl = h('input', { type: 'range', min: -100, max: 100, step: 1, value: Math.round(r.a * 100), 'aria-label': 'Depth' });
    var amt = h('span', { class: 'amt' }, (r.a > 0 ? '+' : '') + Math.round(r.a * 100) + '%');
    sl.addEventListener('input', function () { r.a = sl.value / 100; amt.textContent = (r.a > 0 ? '+' : '') + sl.value + '%'; A.send({ t: 'mod', routes: ROUTES }); for (var k = 0; k < knobs.length; k++) knobs[k].update(); });
    var row = h('div', { class: 'route ' + srcCls(s) }, h('i', { class: 'dot' }),
      h('div', { class: 'nm' }, h('b', null, s.name), ' → ', DST[r.d].name, h('br'), amt),
      sl, h('button', { type: 'button', 'aria-label': 'Remove route', onclick: function () { ROUTES.splice(idx, 1); routesChanged(); } }, '✕'));
    sl.style.setProperty('--sc', 'var(' + srcVar(s) + ')');
    routeBox.append(row);
  });
}
function buildAddPanel() {
  var sc = h('div', { class: 'chips' }), dc = h('div', { class: 'chips' });
  SRC.forEach(function (s, i) { var c = h('button', { type: 'button', class: 'chip ' + srcCls(s), onclick: function () { addSrc = i; paint(); } }, s.name); sc.append(c); });
  DST.forEach(function (d, i) { dc.append(h('button', { type: 'button', class: 'chip', onclick: function () { if (findRoute(addSrc, i) < 0) setRoute(addSrc, i, 0.5); else toast('Route already exists'); } }, d.name)); });
  function paint() { $$('.chip', sc).forEach(function (c, i) { c.classList.toggle('on', i === addSrc); }); }
  paint();
  return h('div', null, h('div', { class: 'empty' }, '1. Pick a source'), sc, h('div', { class: 'empty' }, '2. Tap a destination to add the route'), dc);
}


