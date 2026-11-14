/* ------------------------------------------------ sheets */
function Sheet(id, title) {
  var bg = h('div', { class: 'sheetbg', onclick: close }), sh = h('div', { class: 'sheet', id: id });
  var body = h('div', { class: 'sbody' }), head = h('h2', null, h('span', null, title), h('button', { class: 'btn', type: 'button', 'aria-label': 'Close', onclick: close, html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' }));
  sh.append(h('div', { class: 'grab' }), head, body); document.body.append(bg, sh);
  function open() { bg.classList.add('on'); sh.classList.add('on'); S_.onOpen && S_.onOpen(); drawAllVis(); }
  function close() { bg.classList.remove('on'); sh.classList.remove('on'); S_.onClose && S_.onClose(); }
  var S_ = { body: body, head: head, open: open, close: close, title: head.firstChild };
  return S_;
}
var presetSheet, tableSheet, settingsSheet, tsSlot = 0;
function buildPresetSheet() {
  presetSheet = Sheet('presetSheet', 'Presets');
  var list = h('div', { class: 'plist' }), name = h('input', { type: 'text', id: 'pname', placeholder: 'Name for a new preset', maxlength: 32 });
  var io = h('textarea', { id: 'pio', placeholder: 'Paste a preset JSON here to import, or press Export.' });
  var catF = 'ALL', q = '', cats = h('div', { class: 'chips' }), search = h('input', { type: 'search', id: 'psearch', placeholder: 'Search presets', autocomplete: 'off' });
  search.addEventListener('input', function () { q = search.value.trim().toLowerCase(); paint(); });
  function paintCats() { cats.innerHTML = ''; ['ALL', 'FAV', 'RECENT', 'BASS', 'SUB', 'LEAD', 'PAD', 'ARP', 'PLUCK', 'FX', 'AGGRO', 'MELAN', 'METAL', 'VINTAGE', 'USER'].forEach(function (c) { cats.append(h('button', { type: 'button', class: 'chip' + (c === catF ? ' on' : ''), onclick: function () { catF = c; paint(); } }, c)); }); }
  var visible = [];
  function row(name, cat, load, del) {
    var fv = favs().indexOf(name) >= 0;
    return h('div', { class: 'pi' + (name === curPreset ? ' cur' : ''), onclick: function () { load(); paint(); } }, name, h('small', null, cat),
      h('span', { class: 'fav' + (fv ? ' on' : ''), role: 'button', 'aria-label': 'Favourite', onclick: function (e) { e.stopPropagation(); toggleFav(name); paint(); } }, fv ? '★' : '☆'), del || null);
  }
  function paint() {
    paintCats(); list.innerHTML = ''; visible = [];
    var fl = favs(), rc = store('behemoth.recent') || [];
    function ok(name, cat) {
      if (q && name.toLowerCase().indexOf(q) < 0 && cat.toLowerCase().indexOf(q) < 0) return false;
      if (catF === 'ALL') return true; if (catF === 'FAV') return fl.indexOf(name) >= 0; if (catF === 'RECENT') return rc.indexOf(name) >= 0; return catF === cat;
    }
    var items = [];
    FACTORY.forEach(function (f, i) { if (ok(f.name, f.cat)) items.push({ name: f.name, cat: f.cat, load: function () { loadFactory(i); } }); });
    userPresets().forEach(function (u, i) { if (ok(u.name, 'USER')) items.push({ name: u.name, cat: 'USER', load: function () { applyPreset(u); store('behemoth.last', u.name); }, del: h('span', { class: 'del', role: 'button', 'aria-label': 'Delete', onclick: function (e) { e.stopPropagation(); var l = userPresets(); l.splice(i, 1); store('behemoth.user', l); paint(); } }, '✕') }); });
    if (catF === 'RECENT') items.sort(function (a, b) { return rc.indexOf(a.name) - rc.indexOf(b.name); });
    visible = items;
    items.forEach(function (it) { list.append(row(it.name, it.cat, it.load, it.del)); });
    if (!items.length) list.append(h('div', { class: 'empty' }, catF === 'FAV' ? 'Tap ☆ on a preset to keep it here.' : 'No presets match.'));
  }
  var tools = h('div', { class: 'ptools' },
    histBtn('undo', '↶ Undo', 'Undo', histUndo, 'btn'), histBtn('redo', 'Redo ↷', 'Redo', histRedo, 'btn'), histBtn('ab', 'A/B', 'Compare with the saved preset', abToggle, 'btn'),
    h('button', { class: 'btn', type: 'button', onclick: function () { doMorph(0.12); } }, 'Mutate'),
    h('button', { class: 'btn', type: 'button', onclick: function () { doMorph(1); } }, 'Randomize'),
    h('button', { class: 'btn', type: 'button', onclick: function () { if (!visible.length) return; var it = visible[Math.floor(Math.random() * visible.length)]; it.load(); paint(); toast(it.name); } }, 'Random preset'));
  presetSheet.onOpen = paint; presetSheet.paint = paint;
  presetSheet.body.append(search, tools, cats, list,
    h('div', { class: 'btns' }, name, h('button', { class: 'btn pri', type: 'button', onclick: function () {
      var n = (name.value || '').trim() || ('Patch ' + (userPresets().length + 1)), l = userPresets().filter(function (x) { return x.name !== n; });
      var snap = snapshot(n); l.push(snap); if (!store('behemoth.user', l)) { /* storage may be blocked; keep in memory */ window.__userMem = l; }
      curPreset = n; $('#presetName').textContent = n; stageEl && stageEl._name && (stageEl._name.textContent = n); name.value = ''; paint(); toast('Saved “' + n + '”');
    } }, 'Save current')),
    h('div', { class: 'btns' },
      h('button', { class: 'btn', type: 'button', onclick: function () { io.value = JSON.stringify(snapshot(curPreset)); io.select(); try { navigator.clipboard.writeText(io.value).then(function () { toast('Copied to clipboard'); }, function () { toast('Select and copy the text'); }); } catch (e) { } } }, 'Export JSON'),
      h('button', { class: 'btn', type: 'button', onclick: function () { try { var o = JSON.parse(io.value); if (o.schema !== 'behemoth.preset' && o.schema !== 'strata.preset') throw 0; applyPreset(o); paint(); toast('Imported'); } catch (e) { toast('That is not a BEHEMOTH preset'); } } }, 'Import JSON')),
    io);
}


