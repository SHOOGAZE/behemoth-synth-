/* DOT TEXT: a text element is shown as one dot-matrix line (5x7 glyphs, Latin and Cyrillic, no font file).
   The element keeps its text, so readers, translations and tests are unaffected; only a canvas is painted instead. */
var DOTF = (function () {
  var g = {
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110', 'C': '01110 10001 10000 10000 10000 10001 01110',
    'D': '11110 10001 10001 10001 10001 10001 11110', 'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001', 'I': '01110 00100 00100 00100 00100 00100 01110',
    'J': '00111 00010 00010 00010 00010 10010 01100', 'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 11001 10101 10011 10001 10001 10001', 'O': '01110 10001 10001 10001 10001 10001 01110',
    'P': '11110 10001 10001 11110 10000 10000 10000', 'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100', 'U': '10001 10001 10001 10001 10001 10001 01110',
    'V': '10001 10001 10001 10001 10001 01010 00100', 'W': '10001 10001 10001 10101 10101 11011 10001', 'X': '10001 10001 01010 00100 01010 10001 10001',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00010 00100 01000 11111',
    '3': '11110 00001 00001 01110 00001 00001 11110', '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000', '8': '01110 10001 10001 01110 10001 10001 01110',
    '9': '01110 10001 10001 01111 00001 00010 01100',
    'Б': '11111 10000 10000 11110 10001 10001 11110', 'Г': '11111 10000 10000 10000 10000 10000 10000', 'Д': '00110 01010 01010 01010 01010 11111 10001',
    'Ё': '01010 11111 10000 11110 10000 10000 11111', 'Ж': '10101 10101 10101 01110 10101 10101 10101', 'З': '01110 10001 00001 00110 00001 10001 01110',
    'И': '10001 10001 10011 10101 11001 10001 10001', 'Й': '01010 00100 10001 10011 10101 11001 10001', 'Л': '00111 01001 01001 01001 01001 01001 10001',
    'П': '11111 10001 10001 10001 10001 10001 10001', 'У': '10001 10001 10001 01111 00001 10001 01110', 'Ф': '00100 01110 10101 10101 10101 01110 00100',
    'Ц': '10010 10010 10010 10010 10010 11111 00001', 'Ч': '10001 10001 10001 01111 00001 00001 00001', 'Ш': '10101 10101 10101 10101 10101 10101 11111',
    'Щ': '10101 10101 10101 10101 10101 11111 00001', 'Ъ': '11000 01000 01000 01110 01001 01001 01110', 'Ы': '10001 10001 10001 11001 10101 10101 11001',
    'Ь': '10000 10000 10000 11110 10001 10001 11110', 'Э': '01110 10001 00001 00111 00001 10001 01110', 'Ю': '10010 10101 10101 11101 10101 10101 10010',
    'Я': '01111 10001 10001 01111 00101 01001 10001',
    ' ': '00000 00000 00000 00000 00000 00000 00000', '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000',
    ':': '00000 01100 01100 00000 01100 01100 00000', ';': '00000 01100 01100 00000 01100 00100 01000', '!': '00100 00100 00100 00100 00100 00000 00100',
    '?': '01110 10001 00001 00010 00100 00000 00100', '-': '00000 00000 00000 11111 00000 00000 00000', '+': '00000 00100 00100 11111 00100 00100 00000',
    '=': '00000 00000 11111 00000 11111 00000 00000', '/': '00001 00010 00010 00100 01000 01000 10000', '%': '11001 11010 00010 00100 01000 01011 10011',
    '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000', '\'': '00100 00100 01000 00000 00000 00000 00000',
    '"': '01010 01010 00000 00000 00000 00000 00000', '_': '00000 00000 00000 00000 00000 00000 11111', '#': '01010 01010 11111 01010 11111 01010 01010',
    '*': '00000 10101 01110 11111 01110 10101 00000', '<': '00010 00100 01000 10000 01000 00100 00010', '>': '01000 00100 00010 00001 00010 00100 01000',
    '~': '00000 00000 01000 10101 00010 00000 00000', '·': '00000 00000 00000 00100 00000 00000 00000', '×': '00000 10001 01010 00100 01010 10001 00000',
    '…': '00000 00000 00000 00000 00000 00000 10101', '▸': '01000 01100 01110 01111 01110 01100 01000', '●': '00000 01110 11111 11111 11111 01110 00000'
  };
  var alias = { 'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', '–': '-', '—': '-', '•': '·', '−': '-', '’': '\'', ' ': ' ' };
  var out = {}, k;
  for (k in g) out[k] = g[k].split(' ');
  for (k in alias) out[k] = out[alias[k]];
  return out;
})();
function dotText(src, opt) {
  opt = opt || {};
  if (!src || src._dot) return;
  var cv = document.createElement('canvas'), pending = 0, last = '';
  cv.className = 'dotcv'; cv.setAttribute('aria-hidden', 'true');
  src.classList.add('dotsrc'); src._dot = cv; src.parentNode.insertBefore(cv, src.nextSibling);
  function avail() {
    var p = src.parentNode, cs = getComputedStyle(p), w = p.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0), i, c, gap = parseFloat(cs.columnGap) || 0;
    if (cs.display.indexOf('flex') >= 0 && cs.flexDirection.indexOf('column') < 0) for (i = 0; i < p.children.length; i++) { c = p.children[i]; if (c !== cv && c !== src && c.offsetWidth) w -= c.offsetWidth + gap; }
    return Math.max(20, w);
  }
  function draw() {
    pending = 0;
    var t = (src.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase(), cs = getComputedStyle(src), fs = parseFloat(cs.fontSize) || 16, d = window.devicePixelRatio || 1,
      pitch = Math.max(1.8, Math.min(opt.max || 4, fs * (opt.k || 0.17))), av = avail(), n = t.length, cols = n * 6 - 1, maxChars, i, j, y, x, gl, ctx, W, H, r, on, off, key;
    if (cols * pitch > av) { pitch = av / cols; if (pitch < 1.8) { pitch = 1.8; maxChars = Math.max(1, Math.floor((av / pitch + 1) / 6)); t = t.slice(0, Math.max(0, maxChars - 1)) + '…'; n = t.length; cols = n * 6 - 1; } }
    key = t + '|' + pitch.toFixed(2) + '|' + cs.color + '|' + d; if (key === last) return; last = key;
    W = Math.max(1, Math.ceil(cols * pitch)); H = Math.ceil(7 * pitch);
    cv.width = Math.ceil(W * d); cv.height = Math.ceil(H * d); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.marginTop = cs.marginTop;
    ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); r = pitch * 0.4 * d; on = cs.color; off = 'rgba(255,255,255,.06)';
    for (i = 0; i < n; i++) {
      gl = DOTF[t.charAt(i)] || DOTF['?'];
      for (y = 0; y < 7; y++) for (x = 0; x < 5; x++) {
        ctx.fillStyle = gl[y].charAt(x) === '1' ? on : off; ctx.beginPath(); ctx.arc((i * 6 + x + .5) * pitch * d, (y + .5) * pitch * d, r, 0, 6.2832); ctx.fill();
      }
    }
  }
  function soon() { if (!pending) pending = requestAnimationFrame(draw); }
  new MutationObserver(soon).observe(src, { childList: true, characterData: true, subtree: true });
  window.addEventListener('resize', soon); window.addEventListener('orientationchange', soon);
  if (window.ResizeObserver) new ResizeObserver(soon).observe(src.parentNode);
  draw();
}

(function dotInit() { var o = document.getElementById('oledName'), pn = document.getElementById('presetName'); if (o && !o._dot) { dotText(o, { k: 0.1, max: 2.5 }); if (pn) { var cp = function () { o.textContent = pn.textContent; }; cp(); new MutationObserver(cp).observe(pn, { childList: true, characterData: true, subtree: true }); } } else if (!o) setTimeout(dotInit, 120); })();
