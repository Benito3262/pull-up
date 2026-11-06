import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await b.new_page(viewport={'width':1200,'height':630})
        await pg.goto('http://localhost:4173/'); await pg.wait_for_selector('.hero-art .mascot')
        m=await pg.evaluate("(()=>{const s=document.querySelector('.hero-art .mascot').cloneNode(true);s.setAttribute('width','400');s.setAttribute('height','448');s.style.color='#F4F1FF';s.style.filter='drop-shadow(0 30px 40px rgba(255,94,98,.4))';return s.outerHTML})()")
        fav=open('public/favicon.svg').read().replace('<svg ','<svg width="44" height="48" ')
        html=open('og.html').read().replace('MASCOT',m).replace('FAVSVG',fav)
        await pg.set_content(html); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='public/og.png')
        await b.close()
asyncio.run(main())
