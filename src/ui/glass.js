/* black-and-white glass over the displays: gradients only, no backdrop-filter. The highlight follows the finger. */
(function () {
  function wrap(c) {
    if (!c.parentNode || (c.parentNode.classList && c.parentNode.classList.contains('glass'))) return;
    var g = document.createElement('div'); g.className = 'glass'; c.parentNode.insertBefore(g, c); g.appendChild(c);
    function mv(e) {
      var r = g.getBoundingClientRect(); if (!r.width) return;
      g.style.setProperty('--gx', Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)).toFixed(0) + '%');
      g.style.setProperty('--gy', Math.max(-10, Math.min(60, (e.clientY - r.top) / r.height * 60 - 10)).toFixed(0) + '%');
    }
    g.addEventListener('pointermove', mv, { passive: true }); g.addEventListener('pointerdown', mv, { passive: true });
  }
  function scan() { var l = document.querySelectorAll('canvas.vis'), i; for (i = 0; i < l.length; i++) wrap(l[i]); }
  scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
