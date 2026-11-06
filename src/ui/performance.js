/* tilt */
var tiltOn = false;
function enableTilt() {
  function listen() {
    tiltOn = true; $('#tiltBtn').textContent = 'Tilt on'; $('#tiltBtn').classList.add('pri');
    window.addEventListener('deviceorientation', function (e) {
      var land = window.innerWidth > window.innerHeight, v = land ? e.beta : e.gamma; if (v == null) return;
      A.send({ t: 'tilt', v: clamp(v / 40, -1, 1) });
    });
  }
  try {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') listen(); else toast('Motion access was declined'); }).catch(function () { toast('Motion is not available here'); });
    } else if ('DeviceOrientationEvent' in window) listen(); else toast('Motion is not available here');
  } catch (e) { toast('Motion is not available here'); }
}

/* QPM */
var qpmEl, snaps = store('behemoth.snaps') || [null, null, null, null], morphRaf = 0;
var INTKEYS = { aOct: 1, aSemi: 1, aUni: 1, aWMode: 1, bOct: 1, bSemi: 1, bUni: 1, bWMode: 1, fType: 1, subWave: 1, subOct: 1, nzType: 1, aOn: 1, bOn: 1, subOn: 1, mono: 1, voices: 1, arpOn: 1, arpMode: 1, arpRate: 1, arpOct: 1, l1Smooth: 1, l2Smooth: 1 };
function recallSnap(i) {
  var s = snaps[i]; if (!s) { toast('Hold the pad to store a snapshot'); return; }
  var from = {}, k; cancelAnimationFrame(morphRaf);
  for (k in P) from[k] = P[k];
  for (k in s.p) if (INTKEYS[k]) setP(k, s.p[k], true);
  ROUTES = s.routes.map(function (r) { return { s: r.s, d: r.d, a: r.a }; }); A.send({ t: 'mod', routes: ROUTES });
  var t0 = performance.now(), dur = 450;
  (function step(now) {
    var u = clamp(((now || performance.now()) - t0) / dur, 0, 1), e = u * u * (3 - 2 * u);
    for (k in s.p) if (!INTKEYS[k] && S.PARAMS[k]) { P[k] = from[k] + (s.p[k] - from[k]) * e; A.send({ t: 'p', k: k, v: P[k] }); }
    for (var i = 0; i < knobs.length; i++) knobs[i].update();
    if (u < 1) morphRaf = requestAnimationFrame(step); else { refreshAll(); }
  })();
  $$('.snap').forEach(function (b, j) { b.classList.toggle('on', j === i); });
}
function buildQpm() {
  qpmEl = h('div', { id: 'qpm' });
  var holdBtn = h('button', { class: 'btn hold', type: 'button', style: 'min-width:92px;min-height:44px' }, h('i'), 'EXIT'), ht = 0, hs = 0;
  function holdStart(e) { e.preventDefault(); hs = performance.now(); var bar = $('i', holdBtn); (function f() { if (!hs) return; var u = (performance.now() - hs) / 600; bar.style.width = clamp(u, 0, 1) * 100 + '%'; if (u >= 1) { hs = 0; bar.style.width = '0'; closeQpm(); } else ht = requestAnimationFrame(f); })(); }
  function holdEnd() { hs = 0; $('i', holdBtn).style.width = '0'; }
  holdBtn.addEventListener('pointerdown', holdStart); holdBtn.addEventListener('pointerup', holdEnd); holdBtn.addEventListener('pointercancel', holdEnd); holdBtn.addEventListener('pointerleave', holdEnd);
  var top = h('div', { class: 'qtop' }, h('span', { class: 't' }, 'BEHEMOTH · LIVE'), h('span', { id: 'qpmName', style: 'font-family:var(--f-mono);font-size:12px;color:var(--mute)' }), holdBtn);
  var macros = h('div', { class: 'qcol' }, [1, 2, 3, 4].map(function (i) { return Knob({ k: 'm' + i, label: 'Macro ' + i, big: true, color: 'var(--c-macro)' }).el; }));
  var pad = h('div', { id: 'surfaceQ' }), padWrap = h('div', { style: 'min-height:0;display:flex;flex-direction:column' }); pad.style.flex = '1'; padWrap.append(pad);
  Surface(pad, 8);
  var sn = h('div', { class: 'qcol' });
  [0, 1, 2, 3].forEach(function (i) {
    var b = h('button', { class: 'snap', type: 'button' }), t = 0, held = false;
    function label() { b.innerHTML = 'SNAP ' + (i + 1) + '<small>' + (snaps[i] ? 'stored' : 'hold to store') + '</small>'; }
    label();
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); held = false; t = setTimeout(function () { held = true; var o = { p: {}, routes: ROUTES.map(function (r) { return { s: r.s, d: r.d, a: r.a }; }) }; for (var k in P) o.p[k] = P[k]; snaps[i] = o; store('behemoth.snaps', snaps); label(); toast('Snapshot ' + (i + 1) + ' stored'); }, 650); });
    b.addEventListener('pointerup', function () { clearTimeout(t); if (!held) recallSnap(i); }); b.addEventListener('pointercancel', function () { clearTimeout(t); });
    sn.append(b);
  });
  sn.append(holdButton('snap', 'flex-basis:30%;min-height:56px'), h('button', { class: 'snap', type: 'button', style: 'flex-basis:30%;min-height:56px', onclick: panicAll }, 'PANIC'), h('button', { class: 'snap', id: 'qArp', type: 'button', style: 'flex-basis:30%;min-height:56px', onclick: function () { setP('arpOn', P.arpOn >= 0.5 ? 0 : 1); this.classList.toggle('on', P.arpOn >= 0.5); } }, 'ARP'));
  qpmEl.append(top, h('div', { class: 'qmid' }, macros, padWrap, sn)); document.body.append(qpmEl);
}
function openQpm() { qpmEl.classList.add('on'); $('#qpmName').textContent = curPreset; $('#qArp').classList.toggle('on', P.arpOn >= 0.5); refreshAll(); try { if (qpmEl.requestFullscreen) qpmEl.requestFullscreen().catch(function () { }); } catch (e) { } }
function closeQpm() { qpmEl.classList.remove('on'); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { } }


