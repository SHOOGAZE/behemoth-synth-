/* strings with numbers or names inside */
var I18N_RULES = [
  [/^Oct (\d+)$/, { ru: 'Окт $1', de: 'Okt $1', es: 'Oct $1' }],
  [/^Frame (\d+)\/(\d+)$/, { ru: 'Кадр $1/$2', de: 'Frame $1/$2', es: 'Fotograma $1/$2' }],
  [/^Wavetable · OSC ([AB])$/, { ru: 'Вейвтейбл · OSC $1', de: 'Wavetable · OSC $1', es: 'Wavetable · OSC $1' }],
  [/^Snapshot (\d+) stored$/, { ru: 'Снимок $1 сохранён', de: 'Snapshot $1 gespeichert', es: 'Instantánea $1 guardada' }],
  [/^SNAP (\d+)$/, { ru: 'СНИМОК $1', de: 'SNAP $1', es: 'INSTANT. $1' }],
  [/^Saved “(.*)”$/, { ru: 'Сохранено «$1»', de: '„$1“ gespeichert', es: 'Guardado «$1»' }],
  [/^Patch (\d+)$/, { ru: 'Патч $1', de: 'Patch $1', es: 'Parche $1' }],
  [/^MACRO (\d)$/, { ru: 'МАКРО $1', de: 'MAKRO $1', es: 'MACRO $1' }],
  [/^ENV (\d)$/, { ru: 'ОГИБ $1', de: 'HÜLL $1', es: 'ENV $1' }],
  [/^Imported (\d+) frames? \((\d+) samples each\)$/, { ru: 'Импортировано кадров: $1 (по $2 семплов)', de: '$1 Frame(s) importiert (je $2 Samples)', es: '$1 fotograma(s) importados ($2 muestras c/u)' }],
  [/^Tune ([+-]?\d+)c · A4 ([\d.]+) Hz$/, { ru: 'Строй $1c · A4 $2 Гц', de: 'Stimmung $1c · A4 $2 Hz', es: 'Afinación $1c · A4 $2 Hz' }]
];
var curLang = 'en', i18nRec = new WeakMap(), i18nObs = null, I18N_LC = {};
['ru', 'de', 'es'].forEach(function (l) { I18N_LC[l] = {}; for (var k in I18N[l]) I18N_LC[l][k.toLowerCase()] = I18N[l][k]; });
function detectLang() { var l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return l === 'ru' || l === 'de' || l === 'es' ? l : 'en'; }
function trPiece(k) {
  var d = I18N[curLang], t = d[k], i, m;
  if (t !== undefined) return t;
  t = I18N_LC[curLang][k.toLowerCase()];
  if (t !== undefined) return k === k.toUpperCase() ? t.toUpperCase() : t;
  for (i = 0; i < I18N_RULES.length; i++) { m = I18N_RULES[i][0].exec(k); if (m) return I18N_RULES[i][1][curLang].replace(/\$(\d)/g, function (_, n) { return m[+n]; }); }
  return undefined;
}
/* translate one string; ' · ' and ' → ' joined strings are translated piece by piece */
function trText(en) {
  if (curLang === 'en') return en;
  var k = en.trim(), t, parts;
  if (!k || !/[A-Za-z]/.test(k)) return en;
  t = trPiece(k);
  if (t === undefined && /( · | → )/.test(k)) { parts = k.split(/( · | → )/); t = parts.map(function (p, i) { return i % 2 ? p : (trPiece(p.trim()) || p); }).join(''); if (t === k) t = undefined; }
  return t === undefined ? en : en.replace(k, t);
}
function i18nNode(n) {
  var rec = i18nRec.get(n), en = rec && n.nodeValue === rec.out ? rec.en : n.nodeValue, out = trText(en);
  if (out !== n.nodeValue) n.nodeValue = out;
  i18nRec.set(n, { en: en, out: out });
}
var I18N_ATTR = ['aria-label', 'placeholder', 'title'];
function i18nEl(el) {
  I18N_ATTR.forEach(function (a) {
    var v = el.getAttribute(a); if (v == null) return;
    var rec = i18nRec.get(el) || {}, r = rec[a], en = r && v === r.out ? r.en : v, out = trText(en);
    if (out !== v) el.setAttribute(a, out);
    rec[a] = { en: en, out: out }; i18nRec.set(el, rec);
  });
}
function i18nSweep(root) {
  if (root.nodeType === 3) { i18nNode(root); return; }
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|CANVAS)$/.test(root.tagName)) return;
  i18nEl(root);
  for (var c = root.firstChild; c; c = c.nextSibling) i18nSweep(c);
}
function setLang(code) {
  curLang = code === 'auto' ? detectLang() : code; if (curLang !== 'ru' && curLang !== 'de' && curLang !== 'es') curLang = 'en';
  document.documentElement.lang = curLang;
  if (i18nObs) i18nObs.disconnect();
  i18nSweep(document.body);
  if (!i18nObs) i18nObs = new MutationObserver(function (list) {
    if (curLang === 'en') return;
    i18nObs.disconnect();
    list.forEach(function (m) { if (m.type === 'characterData') i18nNode(m.target); else if (m.type === 'attributes') i18nEl(m.target); else m.addedNodes.forEach(i18nSweep); });
    i18nObs.takeRecords(); i18nObs.observe(document.body, I18N_OPTS);
  });
  i18nObs.observe(document.body, I18N_OPTS);
}
var I18N_OPTS = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTR };

