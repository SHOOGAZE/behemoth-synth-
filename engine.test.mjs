// Smoke test of the DSP core: node test/engine.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8'), ctx);
const S = ctx.Strata;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('FAIL', m); } else console.log('ok  ', m); };

ok(S.TABLE_NAMES.length >= 6, 'factory wavetables registered');
for (const n of S.TABLE_NAMES) { const t = S.makeTable(n); ok(t.n > 0 && t.data.every(Number.isFinite), `wavetable "${n}" is finite`); }

const e = new S.Engine(48000);
e.handle({ t: 'on', n: 48, vel: 0.8, id: 1 });
const L = new Float32Array(128), R = new Float32Array(128); let peak = 0, bad = 0;
for (let i = 0; i < 400; i++) { e.process(L, R, 128); for (let j = 0; j < 128; j++) { const v = Math.abs(L[j]); if (!Number.isFinite(v)) bad++; if (v > peak) peak = v; } }
ok(bad === 0, 'no NaN/Infinity in output');
ok(peak > 0.01 && peak < 2, `audible but not clipping hard (peak ${peak.toFixed(2)})`);
e.handle({ t: 'off', id: 1 });
for (let i = 0; i < 3000; i++) e.process(L, R, 128);
ok(Math.max(...L.map(Math.abs)) < 1e-3, 'note decays to silence after release');
process.exit(fail ? 1 : 0);
