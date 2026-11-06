// Assembles src/ into a single self-contained index.html:  node build.mjs   (add --check to verify index.html is up to date)
import { readFileSync, writeFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');

const CSS = ['base', 'header-tablet', 'skin', 'landscape', 'living', 'stage', 'menu-settings'].map((n) => `css/${n}.css`);
const UI = ['core', 'i18n-dict', 'i18n', 'audio', 'knob', 'visuals', 'modulation', 'presets-data', 'presets', 'history', 'sheets', 'settings',
  'wave-editor', 'views', 'play', 'stage', 'sequencer', 'performance', 'midi', 'record', 'tour', 'boot'].map((n) => `ui/${n}.js`);

const cat = (list) => list.map(read).join('');
const html = read('index.template.html')
  .replace('{{CSS}}', () => cat(CSS))
  .replace('{{ENGINE}}', () => read('engine.js'))
  .replace('{{UI}}', () => cat(UI));

const out = new URL('./index.html', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(out, 'utf8') !== html) { console.error('index.html is out of date: run node build.mjs'); process.exit(1); }
  console.log('index.html is up to date');
} else { writeFileSync(out, html); console.log('index.html built,', html.length, 'bytes'); }
