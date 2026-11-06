#!/usr/bin/env python3
"""Drive the real Pull Up UI (test-signer build) with Playwright: create → RSVP x3 → QR → scan 2 → close → claim."""
import asyncio, json, shutil, re, sys
from playwright.async_api import async_playwright
BASE='http://localhost:4199'; OUT='/workspace/pull-up/shots/e2e'; W='/workspace/pull-up/test-wallets'
def key(a): d=json.load(open(f'{W}/{a}.json')); return dict(accountId=a,privateKey=d['private_key'])
HOST='uihost.pu-g1-970962.testnet'; GU=['uig1.pu-g2-970962.testnet','uig2.pu-g3-970962.testnet','uig3.pu-g1-970962.testnet']
log={}
async def main():
    async with async_playwright() as p:
        ex=shutil.which('chromium') or shutil.which('google-chrome'); b=await p.chromium.launch(executable_path=ex) if ex else await p.chromium.launch()
        async def ctx(acct):
            c=await b.new_context(viewport={'width':1280,'height':900})
            if acct: await c.add_init_script(f"localStorage.setItem('pullup:test-signer', {json.dumps(json.dumps(key(acct)))})")
            pg=await c.new_page(); pg.on('pageerror',lambda e: print('PAGEERR',e)); return pg
        shot=lambda pg,n: pg.screenshot(path=f'{OUT}/{n}.png',full_page=True)
        h=await ctx(HOST)
        await h.goto(BASE+'/create',wait_until='networkidle')
        await h.fill('input[placeholder="Sunday Run Club"]','UI Test · Lagos Rooftop Pull Up')
        await h.fill('textarea','Created through the real website UI in an automated end-to-end test.')
        await h.fill('input[placeholder="City · venue, or Online"]','Lagos · Victoria Island')
        nums=h.locator('input[type=number]')
        await nums.nth(1).fill('0.2'); await nums.nth(2).fill('3')
        await shot(h,'01-create-form')
        await h.click('button:has-text("Create event")')
        await h.wait_for_url(re.compile(r'/e/\d+$'),timeout=60000)
        eid=int(h.url.rsplit('/',1)[1]); log['event']=eid; print('created',eid)
        await h.wait_for_timeout(3000); await shot(h,'02-event-created-host')
        codes={}
        for i,g in enumerate(GU):
            pg=await ctx(g); await pg.goto(f'{BASE}/e/{eid}',wait_until='networkidle'); await pg.wait_for_timeout(2000)
            if i==0: await shot(pg,'03-event-guest-before-rsvp')
            await pg.click('button:has-text("& RSVP")')
            await pg.wait_for_selector('[data-testid=copy-ticket]',timeout=60000)
            await pg.wait_for_timeout(2500)
            codes[g]=await pg.get_attribute('[data-testid=copy-ticket]','data-code')
            if i==0: await shot(pg,'04-guest-qr-ticket')
            await pg.context.close()
        # 4th wallet: capacity full? capacity=3 → host can't deposit; check UI shows full state via guest uig3? (already in). skip
        sc=await ctx(HOST); await sc.goto(f'{BASE}/e/{eid}/scan',wait_until='networkidle'); await sc.wait_for_timeout(2000)
        for g in GU[:2]:
            await sc.fill('[data-testid=manual-code]',codes[g]); await sc.click('form.manual-code button')
            await sc.wait_for_selector(f'text=Checked in {g}',timeout=60000); await sc.wait_for_timeout(1500)
        await sc.wait_for_timeout(5000); await shot(sc,'05-host-scanner-2-checked-in')
        # replay same code → should error
        await sc.fill('[data-testid=manual-code]',codes[GU[0]]); await sc.click('form.manual-code button'); await sc.wait_for_timeout(8000)
        log['replay_error']=await sc.locator('.error').first.inner_text() if await sc.locator('.error').count() else None
        await shot(sc,'06-scanner-replay-rejected')
        await h.goto(f'{BASE}/e/{eid}',wait_until='networkidle'); await h.wait_for_timeout(2000)
        await h.click('button:has-text("Close & settle")'); await h.wait_for_timeout(9000); await h.reload(wait_until='networkidle'); await h.wait_for_timeout(3000)
        await shot(h,'07-event-closed-host')
        for i,g in enumerate(GU):
            pg=await ctx(g); await pg.goto(f'{BASE}/e/{eid}',wait_until='networkidle'); await pg.wait_for_timeout(3000)
            btn=pg.locator('button:has-text("Claim")')
            if i<2:
                log[f'claim_label_{i}']=await btn.inner_text(); await btn.click(); await pg.wait_for_selector('text=Paid out',timeout=60000)
                await pg.wait_for_timeout(2000)
                if i==0: await shot(pg,'08-attendee-claimed')
                if i==0:
                    await pg.goto(BASE+'/tickets',wait_until='networkidle'); await pg.wait_for_timeout(4000); await shot(pg,'11-my-tickets-attendee')
            else:
                log['noshow_claim_button']=await btn.count(); await shot(pg,'09-noshow-no-claim')
            await pg.context.close()
        for n,path in [('10-past','/past'),('12-leaderboard','/leaderboard'),('13-home-stats-ticker','/'),('14-explore','/explore')]:
            await h.goto(BASE+path,wait_until='networkidle'); await h.wait_for_timeout(4000)
            await h.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))"); await h.wait_for_timeout(800)
            log[n]=(await h.inner_text('body')).count('UI Test'); await shot(h,n)
        await h.goto(BASE+'/host',wait_until='networkidle'); await h.wait_for_timeout(4000); await shot(h,'15-host-dashboard'); log['host_dash']=(await h.inner_text('body')).count('UI Test')
        await b.close()
    print(json.dumps(log,indent=1)); json.dump(log,open('/workspace/pull-up/e2e-ui.json','w'))
asyncio.run(main())
