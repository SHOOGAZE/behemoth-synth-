/* strings with numbers or names inside */
var I18N_RULES = [
  [/^Oct (\d+)$/, { ru: 'Окт $1' }],
  [/^Frame (\d+)\/(\d+)$/, { ru: 'Кадр $1/$2' }],
  [/^Wavetable · OSC ([AB])$/, { ru: 'Вейвтейбл · OSC $1' }],
  [/^Snapshot (\d+) stored$/, { ru: 'Снимок $1 сохранён' }],
  [/^SNAP (\d+)$/, { ru: 'СНИМОК $1' }],
  [/^Saved “(.*)”$/, { ru: 'Сохранено «$1»' }],
  [/^Patch (\d+)$/, { ru: 'Патч $1' }],
  [/^MACRO (\d)$/, { ru: 'МАКРО $1' }],
  [/^ENV (\d)$/, { ru: 'ОГИБ $1' }],
  [/^Imported (\d+) frames? \((\d+) samples each\)$/, { ru: 'Импортировано кадров: $1 (по $2 семплов)' }],
  [/^Tune ([+-]?\d+)c · A4 ([\d.]+) Hz$/, { ru: 'Строй $1c · A4 $2 Гц' }]
];
var curLang = 'en', i18nRec = new WeakMap(), i18nObs = null, I18N_LC = {};
['ru'].forEach(function (l) { I18N_LC[l] = {}; for (var k in I18N[l]) I18N_LC[l][k.toLowerCase()] = I18N[l][k]; });

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
  curLang = code === 'ru' ? 'ru' : 'en'; CFG.lang = curLang;
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

