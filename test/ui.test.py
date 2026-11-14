"""UI smoke test for BEHEMOTH (Playwright, Chromium): python3 test/ui.test.py  (pip install playwright)"""
import os, sys
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
fails = []
def check(name, cond, info=''):
    print(('ok   ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(info)))
    if not cond: fails.append(name)

def page(br, w, h, level=None, touch=True):
    ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    if level: pg.add_init_script("try{localStorage.setItem('beh.cfg',JSON.stringify({level:'%s',tips:'off'}))}catch(e){}" % level)
    pg.goto('file://' + D + 'index.html'); pg.wait_for_timeout(800)
    try: pg.locator('#startBtn').click(timeout=1500)
    except Exception: pg.mouse.click(w // 2, h // 2)
    pg.wait_for_timeout(800)
    pg.evaluate("var t=document.querySelector('#tour');t&&t.remove()")
    return ctx, pg, errs

with sync_playwright() as p:
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx, pg, errs = page(br, 390, 844)
    tabs = pg.evaluate("[...document.querySelectorAll('nav#tabs button')].map(b=>[b.dataset.t,getComputedStyle(b).display!=='none'])")
    check('boots with 4 tabs', len(tabs) == 4, tabs)
    lvl = pg.evaluate("document.documentElement.dataset.level")
    vis = {t: v for t, v in tabs}
    check('default level is simple, MOD tab hidden', lvl == 'simple' and not vis.get('mod'), (lvl, vis))
    for t in ['fx', 'play', 'sound']:
        pg.evaluate("document.querySelector('nav#tabs button[data-t=%s]').click()" % t); pg.wait_for_timeout(200)
    check('tab switching works', pg.evaluate("document.querySelector('nav#tabs button.on').dataset.t") == 'sound')
    check('no page errors (simple, phone)', not errs, errs[:3]); ctx.close()

    ctx, pg, errs = page(br, 390, 844, level='full')
    vis = pg.evaluate("Object.fromEntries([...document.querySelectorAll('nav#tabs button')].map(b=>[b.dataset.t,getComputedStyle(b).display!=='none']))")
    check('full level shows the MOD tab', vis.get('mod') is True, vis)
    pg.evaluate("document.querySelector('nav#tabs button[data-t=mod]').click()"); pg.wait_for_timeout(250)
    check('MOD tab opens in full', pg.evaluate("document.querySelector('nav#tabs button.on').dataset.t") == 'mod')
    check('no page errors (full, phone)', not errs, errs[:3]); ctx.close()

    ctx, pg, errs = page(br, 844, 390)
    check('landscape phone loads', pg.evaluate("innerWidth") == 844)
    check('no page errors (landscape)', not errs, errs[:3]); ctx.close()

    ctx, pg, errs = page(br, 1180, 820, touch=False)
    check('tablet loads, no page errors', not errs, errs[:3]); ctx.close()
    br.close()
if fails: print('FAILED:', fails); sys.exit(1)
