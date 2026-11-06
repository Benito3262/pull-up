import sys, asyncio
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:4173'
PAGES=[('home','/'),('tickets','/tickets'),('host','/host'),('explore','/explore'),('event','/e/4'),('past','/past'),('suggestions','/ideas'),('leaderboard','/leaderboard'),('how','/how'),('create','/create')]
async def main():
    async with async_playwright() as p:
        import shutil; ex=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome'); b=await p.chromium.launch(executable_path=ex) if ex else await p.chromium.launch()
        for vp,(w,h,m) in {'desktop':(1440,900,False),'mobile':(390,844,True)}.items():
            ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if m else 1,is_mobile=m)
            pg=await ctx.new_page(); errs=[]
            pg.on('pageerror',lambda e: errs.append(str(e)))
            for name,path in PAGES:
                await pg.goto(BASE+path,wait_until='networkidle'); await pg.wait_for_timeout(2500)
                await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))"); await pg.wait_for_timeout(900)
                await pg.screenshot(path=f'/workspace/pull-up/shots/{name}-{vp}.png',full_page=True)
                txt=await pg.inner_text('main'); print(vp,name,len(txt),txt[:90].replace('\n',' | '))
            print('ERRORS',errs)
        await b.close()
asyncio.run(main())
