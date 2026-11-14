"""Browser audio fuzz (Playwright, Chromium): random knob moves, notes and preset changes on the real page,
while the signal that reaches the speakers is watched. Fails on NaN, page errors or a peak above full scale.
   python3 test/audio_fuzz.py [steps] [seed]"""
import os,sys,json,random
from playwright.sync_api import sync_playwright
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
TAP="""(()=>{window.__peak=0;window.__nan=0;window.__max=0;const oc=AudioNode.prototype.connect;const seen=new WeakMap();
AudioNode.prototype.connect=function(d){const r=oc.apply(this,arguments);try{if(d instanceof AudioDestinationNode){const c=d.context;if(!(c instanceof OfflineAudioContext)){let a=seen.get(c);if(!a){a=c.createAnalyser();a.fftSize=2048;seen.set(c,a);const buf=new Float32Array(2048);setInterval(()=>{a.getFloatTimeDomainData(buf);for(let i=0;i<buf.length;i++){const v=buf[i];if(v!==v||v===Infinity||v===-Infinity)window.__nan++;else{const m=v<0?-v:v;if(m>window.__peak)window.__peak=m;if(m>window.__max)window.__max=m}}},25)}oc.call(this,a)}}}catch(e){}return r}})()"""
KNOB="""(a)=>{const k=[...document.querySelectorAll('[role=slider]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});if(!k.length)return 0;const e=k[Math.floor(a.r*k.length)];
for(let i=0;i<a.n;i++)e.dispatchEvent(new KeyboardEvent('keydown',{key:a.up?'ArrowUp':'ArrowDown',bubbles:true,cancelable:true}));return k.length}"""
PD="""(a)=>{const k=[...document.querySelectorAll(a.sel)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight});if(!k.length)return 0;const e=k[Math.floor(a.r*k.length)],r=e.getBoundingClientRect();
const o={bubbles:true,cancelable:true,pointerId:a.id,pointerType:'touch',isPrimary:true,clientX:r.left+r.width*a.x,clientY:r.top+r.height*a.y,button:0,buttons:1};e.dispatchEvent(new PointerEvent('pointerdown',o));
setTimeout(()=>{const t=Object.assign({},o,{buttons:0});e.dispatchEvent(new PointerEvent('pointerup',t));window.dispatchEvent(new PointerEvent('pointerup',t))},a.ms);return k.length}"""
app='BEHEMOTH'
APPS={
 'GRAINS':dict(path='index.html',init="localStorage.setItem('grains.cfg.v1',JSON.stringify({acc:0,tips:'off',ui:'full'}))",start="#startBtn",
   tabs="[...document.querySelectorAll('#tabs button')].filter(b=>b.offsetWidth)",keys='#kb .wk, .wk',extra=["document.querySelector('#pNext').click()","document.querySelector('#gRnd,#rndBtn')&&document.querySelector('#gRnd,#rndBtn').click()"]),
 'BEHEMOTH':dict(path='index.html',init="localStorage.setItem('behemoth.tour','1');localStorage.setItem('beh.cfg',JSON.stringify({tips:'off',level:'full'}))",start="#startBtn",
   tabs="[...document.querySelectorAll('nav#tabs button')].filter(b=>b.offsetWidth)",keys='.wk',extra=["document.querySelector('.pnav[aria-label=\"Next preset\"]').click()"]),
 'ELEPHANT':dict(path='index.html',init="localStorage.setItem('elephant-ui','full');sessionStorage.setItem('elephant-boot','1');localStorage.setItem('elephant-tour','1');localStorage.setItem('elephant-coach','all')",start=None,
   tabs="[...document.querySelectorAll('.nav button')].filter(b=>b.offsetWidth&&b.dataset.tab!=='sys')",keys='.pad',extra=[]),
 'SUSPIRE':dict(path='index.html',init="",start=None,tabs="[]",keys='.pad',extra=["document.querySelector('#hSnd').click()","document.querySelector('#diceBtn').click()"]),
}
N=int(sys.argv[1]) if len(sys.argv)>1 else 150;rnd=random.Random(int(sys.argv[2]) if len(sys.argv)>2 else 7);A=APPS[app]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    c=b.new_context(viewport={'width':393,'height':852},has_touch=True,is_mobile=True);pg=c.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
    pg.on('console',lambda m:errs.append(m.text[:160]) if m.type=='error' and 'ERR_' not in m.text else None)
    pg.add_init_script(TAP)
    if A['init']:pg.add_init_script(A['init'])
    pg.goto('file://'+B+A['path']);pg.wait_for_timeout(4500 if app=='SUSPIRE' else 900)
    if A['start']:
        try:pg.locator(A['start']).click(timeout=1500)
        except Exception:pass
    if app=='ELEPHANT':
        pg.evaluate("(()=>{const b=document.querySelector('.startrow .chip');b&&b.click()})()");pg.wait_for_timeout(1500)
        pg.evaluate("GRUI.playToggle()")
    pg.evaluate("var b=document.getElementById('helpDone');b&&b.click();var t=document.querySelector('#tour');t&&t.remove()");pg.wait_for_timeout(800)
    hot=[];silent=0;knobs=0
    for i in range(N):
        if i%12==0 and A['tabs']!='[]':
            pg.evaluate("(r)=>{const t=%s;if(t.length)t[Math.floor(r*t.length)].click()}"%A['tabs'],rnd.random())
        if A['extra'] and rnd.random()<.06:
            try:pg.evaluate(rnd.choice(A['extra']))
            except Exception:pass
        for _ in range(3):
            n=pg.evaluate(KNOB,dict(r=rnd.random(),n=rnd.choice([1,3,10,60,60]),up=rnd.random()<.5));knobs=max(knobs,n or 0)
        for f in range(rnd.choice([1,1,2,4])):
            pg.evaluate(PD,dict(sel=A['keys'],r=rnd.random(),id=10+f,x=rnd.random()*.8+.1,y=rnd.random()*.8+.1,ms=rnd.choice([40,150,400])))
        pg.evaluate("window.__peak=0");pg.wait_for_timeout(180)
        pk=pg.evaluate("window.__peak")
        if pk>1.0:hot.append((i,round(pk,2)))
        if pk<1e-4:silent+=1
    r=pg.evaluate("[window.__nan,window.__max]")
    print(f"{app}: {N} steps, sliders seen {knobs}, NaN samples {r[0]}, max peak {r[1]:.2f}, steps above 1.0: {len(hot)} {hot[:6]}, silent steps {silent}, page errors {len(errs)} {errs[:3]}")
    b.close()
    sys.exit(1 if r[0] or errs or r[1]>1.02 else 0)
