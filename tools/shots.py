"""README screenshots: python3 tools/shots.py (needs Playwright + Chromium, run node build.mjs first)."""
import os
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
os.makedirs(D+'screenshots',exist_ok=True)
P=(390,844); L=(844,390); T=(820,1180)
TAB=lambda t:"document.querySelector('nav#tabs button[data-t=%s]').click()"%t
STG=lambda m:"document.querySelector('.hbtn.stg').click();setTimeout(()=>{const b=[...document.querySelectorAll('#stage .bar button, #stage button')].find(x=>x.textContent.trim()==='%s');b&&b.click()},200)"%m
S=[('sound',P,TAB('sound')),('modulation',P,TAB('mod')),('effects',P,TAB('fx')),('play',P,TAB('play')),
   ('wavetable-editor',P,"document.querySelector('.tn').click()"),
   ('presets',P,"document.querySelector('#presetBtn').click()"),
   ('dock-split',P,STG('SPLIT')),('dock-pad',P,STG('PAD')),
   ('landscape',L,TAB('sound')),('landscape-stage',L,STG('SPLIT')),
   ('tablet',T,TAB('sound'))]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for name,(w,h),js in S:
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2,has_touch=True,is_mobile=w<800 or h<800)
        pg=c.new_page(); pg.add_init_script("localStorage.setItem('behemoth.tour','1');localStorage.setItem('beh.cfg',JSON.stringify({tips:'off',level:'full'}))")
        pg.goto('file://'+D+'index.html'); pg.wait_for_timeout(700)
        try: pg.locator('#startBtn').click(timeout=1500)
        except Exception: pg.mouse.click(w//2,h//2)
        pg.wait_for_timeout(1800)
        pg.evaluate(js); pg.wait_for_timeout(900)
        pg.screenshot(path=D+'screenshots/'+name+'.png'); c.close()
    b.close()
print('screenshots written')
