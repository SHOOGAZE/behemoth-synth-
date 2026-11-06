/* ------------------------------------------------ audio */
var A = { ctx: null, node: null, eng: null, mode: 'off', q: [], peak: 0, lvl: 0, voices: 0, scope: new Float32Array(256), lv: new Float32Array(16) };
A.send = function (m) {
  if (this.mode === 'worklet') this.node.port.postMessage(m);
  else if (this.mode === 'script') this.eng.handle(m);
};
var WORKLET_PROC = "class StrataProc extends AudioWorkletProcessor{constructor(){super();this.e=new Strata.Engine(sampleRate);this.n=0;this.k=0;var s=this;this.port.onmessage=function(ev){try{s.e.handle(ev.data);}catch(err){s.port.postMessage({err:String(err)});}};}process(i,o){var out=o[0];if(!out||!out[0])return true;this.e.process(out[0],out[1]||out[0],out[0].length);this.n+=out[0].length;this.k+=out[0].length;if(this.k>=384){this.k=0;this.port.postMessage({m:2,lv:new Float32Array(this.e.live)});}if(this.n>=2048){this.n=0;var e=this.e;this.port.postMessage({m:1,peak:e.peak,v:e.nVoices,w:e.scopeW,sc:new Float32Array(e.scope)});e.peak=0;}return true;}}registerProcessor('strata',StrataProc);";
function syncAll() {
  A.send({ t: 'bulk', p: P });
  A.send({ t: 'mod', routes: ROUTES }); if (typeof arpPatSend === 'function') arpPatSend();
  A.send({ t: 'lfo', i: 0, pts: LFO[0] }); A.send({ t: 'lfo', i: 1, pts: LFO[1] });
  for (var s = 0; s < 2; s++) if (TAB[s]) A.send({ t: 'table', slot: s, data: TAB[s].data, n: TAB[s].n });
}
function initAudio() {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return Promise.reject(new Error('Web Audio is not available in this browser.'));
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
  A.ctx = new AC({ latencyHint: 'interactive' });
  var ctx = A.ctx, resume = ctx.resume ? ctx.resume() : Promise.resolve();
  return resume.then(function () {
    var src = document.getElementById('engine-src').textContent + '\n' + WORKLET_PROC;
    if (ctx.audioWorklet && window.Blob && window.URL) {
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      return ctx.audioWorklet.addModule(url).then(function () {
        A.node = new AudioWorkletNode(ctx, 'strata', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
        A.node.port.onmessage = function (ev) { var d = ev.data; if (d.m === 2) A.lv.set(d.lv); else if (d.m) { A.peak = Math.max(A.peak, d.peak); A.voices = d.v; A.scope = d.sc; A.scopeW = d.w; } else if (d.err) console.warn('engine', d.err); };
        A.node.connect(ctx.destination); A.mode = 'worklet';
      });
    }
    throw new Error('no worklet');
  }).catch(function (err) {
    console.warn('AudioWorklet unavailable, using ScriptProcessor fallback:', err && err.message);
    A.eng = new S.Engine(ctx.sampleRate);
    var sp = ctx.createScriptProcessor(window.matchMedia && matchMedia('(pointer: coarse)').matches ? 2048 : 1024, 0, 2);
    sp.onaudioprocess = function (ev) { var o = ev.outputBuffer; A.eng.process(o.getChannelData(0), o.getChannelData(1), o.length); A.peak = Math.max(A.peak, A.eng.peak); A.eng.peak = 0; A.lv.set(A.eng.live); A.voices = A.eng.nVoices; A.scope = A.eng.scope; A.scopeW = A.eng.scopeW; };
    sp.connect(ctx.destination); A.sp = sp; A.mode = 'script';
  }).then(function () { syncAll(); });
}


/* ------------------------------------------------ parameter plumbing */
var lastAct = 0;
function setP(k, v, silent) {
  var d = S.PARAMS[k]; if (!d) return;
  lastAct = performance.now(); histMark();
  v = clamp(v, d[1], d[2]);
  P[k] = v;
  A.send({ t: 'p', k: k, v: v });
  if (!silent) refreshParam(k);
}
function refreshParam(k) { for (var i = 0; i < knobs.length; i++) if (knobs[i].o.k === k) knobs[i].update(); for (i = 0; i < binders.length; i++) binders[i].k === k && binders[i].fn(); }
function refreshAll() { var i; for (i = 0; i < knobs.length; i++) knobs[i].update(); for (i = 0; i < binders.length; i++) binders[i].fn(); drawAllVis(); renderRoutes(); updateCaps(); }
function routesChanged() {
  applyMacroNames(); histMark();
  lastAct = performance.now();
  A.send({ t: 'mod', routes: ROUTES });
  for (var i = 0; i < knobs.length; i++) knobs[i].update();
  renderRoutes(); updateCaps();
  var any = false; ROUTES.forEach(function (r) { any = true; });
}
function findRoute(s, d) { for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].s === s && ROUTES[i].d === d) return i; return -1; }
function routeAmt(s, d) { var i = findRoute(s, d); return i < 0 ? 0 : ROUTES[i].a; }
function setRoute(s, d, a) {
  var i = findRoute(s, d);
  if (Math.abs(a) < 0.015) { if (i >= 0) ROUTES.splice(i, 1); }
  else if (i >= 0) ROUTES[i].a = a;
  else { if (ROUTES.length >= 24) { toast('Matrix full (24 routes)'); return; } ROUTES.push({ s: s, d: d, a: a }); }
  routesChanged();
}
function removeRoute(s, d) { var i = findRoute(s, d); if (i >= 0) { ROUTES.splice(i, 1); routesChanged(); } }


