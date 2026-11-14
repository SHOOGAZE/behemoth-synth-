// Fuzz test of the DSP core: random settings, modulation routes and chords must never produce NaN or run away.
//   node test/fuzz.test.mjs [runs] [seed]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8'), ctx);
const S = ctx.Strata;
const RUNS = +process.argv[2] || 200; let seed = +process.argv[3] || 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const INT = /On$|Oct$|Semi$|Uni$|Mode$|Wave$|Type$|Poles$|Sync$|Shape$/;
const keys = Object.keys(S.PARAMS);
let bad = 0, hot = 0, worst = 0, worstAt = '';
const L = new Float32Array(128), R = new Float32Array(128);
for (let run = 0; run < RUNS; run++) {
  const e = new S.Engine(run % 2 ? 44100 : 48000), p = {};
  for (const k of keys) {
    const d = S.PARAMS[k]; let v;
    const r = rnd();
    if (r < .12) v = d[1]; else if (r < .24) v = d[2]; else v = d[1] + rnd() * (d[2] - d[1]);   // extremes are common on purpose
    if (INT.test(k)) v = Math.round(v);
    p[k] = v;
  }
  if (rnd() < .9) p.aOn = 1;
  e.handle({ t: 'bulk', p });
  const routes = [];
  for (let i = 0, n = (rnd() * 9) | 0; i < n; i++) routes.push({ s: (rnd() * S.SRCS.length) | 0, d: (rnd() * S.DESTS.length) | 0, a: rnd() * 2 - 1 });
  e.handle({ t: 'mod', routes });
  for (let i = 0; i < 2; i++) { const pts = []; for (let j = 0; j < 64; j++) pts.push(rnd() * 2 - 1); e.handle({ t: 'lfo', i, pts }); }
  const notes = 1 + ((rnd() * 5) | 0);
  for (let i = 0; i < notes; i++) e.handle({ t: 'on', n: 12 + ((rnd() * 96) | 0), vel: rnd(), id: i + 1, poly: true });
  let peak = 0, nan = 0;
  for (let b = 0; b < 180; b++) {                       // about half a second
    if (b === 60) { e.handle({ t: 'wheel', v: rnd() * 2 - 1 }); e.handle({ t: 'tilt', v: rnd() * 2 - 1 }); e.handle({ t: 'bend', id: 1, v: rnd() * 2 - 1 }); }
    if (b === 120) for (let i = 0; i < notes; i++) e.handle({ t: 'off', id: i + 1 });
    e.process(L, R, 128);
    for (let j = 0; j < 128; j++) { const a = Math.abs(L[j]), c = Math.abs(R[j]); if (!(a < 1e9) || !(c < 1e9)) nan++; else { if (a > peak) peak = a; if (c > peak) peak = c; } }
  }
  if (nan) { bad++; if (bad <= 5) console.error('NaN/Inf in run', run, JSON.stringify(p).slice(0, 300)); }
  if (peak > 1.5) hot++;
  if (peak > worst) { worst = peak; worstAt = 'run ' + run; }
}
console.log(`${RUNS} random patches: ${bad} with NaN/Infinity, ${hot} with peak above 1.5, worst peak ${worst.toFixed(2)} (${worstAt})`);
process.exit(bad || worst > 4 ? 1 : 0);
