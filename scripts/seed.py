#!/usr/bin/env python3
"""Seed app.pullup-970962.testnet with real demo events via near-cli-rs. Logs tx hashes to seed-txs.txt"""
import subprocess, json, time, re, sys
C='app.pullup-970962.testnet'; H='pu-host-970962.testnet'
NAMES=['mira','jonas','priya','leo','sana','theo','yuki','noah']
G=[f'{n}.{H}' for n in NAMES]+['pu-g1-970962.testnet','pu-g2-970962.testnet','pu-g3-970962.testnet']
log=open('/workspace/pull-up/seed-txs.txt','a')
def run(args):
    for a in range(3):
        r=subprocess.run(['near']+args+['network-config','testnet','sign-with-legacy-keychain','send'],capture_output=True,text=True)
        out=r.stdout+r.stderr
        m=re.search(r'Transaction ID: (\w+)',out)
        if m: return m.group(1),out
        print('RETRY',out[-400:],flush=True); time.sleep(3)
    raise SystemExit('fail')
def call(signer,method,args,dep='0 NEAR'):
    h,out=run(['contract','call-function','as-transaction',C,method,'json-args',json.dumps(args),'prepaid-gas','100 Tgas','attached-deposit',dep,'sign-as',signer])
    log.write(f'{method}|{signer}|{h}\n'); log.flush(); print(method,signer,h,flush=True); return out
def view(m,a):
    r=subprocess.run(['near','contract','call-function','as-read-only',C,m,'json-args',json.dumps(a),'network-config','testnet','now'],capture_output=True,text=True)
    return r.stdout+r.stderr
if 'accounts' in sys.argv:
    for g in G[:8]:
        h,_=run(['account','create-account','fund-myself',g,'1.3 NEAR','autogenerate-new-keypair','save-to-legacy-keychain','sign-as',H])
        print('acct',g,h,flush=True)
now=int(time.time()*1000); D=86400000; HR=3600000
events=[
 # title, host, dep, deadline, meta, guests idx, checkins idx, close
 ("Founders Breakfast: Lisbon", H, '0.2', now+12*60000, dict(description="Pastéis, coffee and 10-minute founder updates. Bring one problem you're stuck on.",category="Meetup",location="Lisbon · LX Factory",cover="sunrise",starts_ms=now-2*HR,capacity=12), [0,1,2,3,4,5],[0,1,2,3,4], True),
 ("Rust on NEAR: Contract Workshop", 'pu-g1-970962.testnet','0.1', now+12*60000, dict(description="Hands-on: write, test and deploy your first NEAR contract in 90 minutes. Laptops required.",category="Workshop",location="Online · Discord stage",cover="code",starts_ms=now-5*HR,capacity=30), [0,1,2,3,5,6,7,9],[0,2,3,5,6,9], True),
 ("Sunrise Run Club 5K", 'pu-g2-970962.testnet','0.1', now+12*60000, dict(description="Easy-pace 5K at 6:30. No-shows fund the post-run coffee for everyone who made it.",category="Fitness",location="Riverside Park · North gate",cover="trail",starts_ms=now-3*HR,capacity=20), [1,3,4,6,7],[1,4,7], True),
 ("Hackathon Demo Watch Party", H,'0.1', now+8*HR, dict(description="Live-watching NEAR Hackathon demos together. Doors open now — check in at the door with your QR.",category="Watch party",location="Online · X Spaces + Discord",cover="stage",starts_ms=now-20*60000,capacity=50), [0,2,4,6,8,9],[0,2,6], False),
 ("Open Studio: Deep Work Session", 'pu-g3-970962.testnet','0.15', now+5*HR, dict(description="Three 50-minute focus blocks, phones in the box. Show up or fund everyone else's lunch.",category="Co-working",location="Berlin · Kreuzberg loft",cover="studio",starts_ms=now-40*60000,capacity=16), [1,3,5,7],[1,5], False),
 ("Vinyl & Vibes Listening Night", 'pu-g1-970962.testnet','0.25', now+3*D, dict(description="Front-to-back album listening, no talking during sides. Limited seats, deposit holds yours.",category="Social",location="London · Peckham",cover="vinyl",starts_ms=now+3*D-2*HR,capacity=24), [0,4,7],[], False),
 ("AI Agents Study Group #4", 'pu-g2-970962.testnet','0.1', now+5*D, dict(description="We read one paper a week and build a tiny agent from it. This week: tool use and payments.",category="Study group",location="Online · Google Meet",cover="night",starts_ms=now+5*D-HR,capacity=15), [2,3,8],[], False),
 ("Rooftop Builders Mixer", H,'0.2', now+9*D, dict(description="Sunset drinks for builders shipping on NEAR. Deposit is your RSVP; pull up and earn back more.",category="Meetup",location="New York · Williamsburg rooftop",cover="brunch",starts_ms=now+9*D-3*HR,capacity=40), [1,5,6,9],[], False),
]
for i,(t,host,dep,dl,meta,gs,cis,close) in enumerate(events):
    eid=i+1
    if eid < int(sys.argv[-1] if sys.argv[-1].isdigit() else 1): continue
    if eid > 1 or 'skip1' not in sys.argv: out=call(host,'create_event',{"title":t,"deposit":str(int(float(dep)*1e6))+'0'*18,"check_in_deadline_ms":dl,"meta":meta},'0.05 NEAR')
    print('event',eid,flush=True)
    for g in gs: call(G[g],'deposit',{"event_id":eid,"ticket":f"tk-{eid}-{g}"},f'{dep} NEAR')
    for g in cis: call(host,'check_in',{"event_id":eid,"guest":G[g],"ticket":f"tk-{eid}-{g}"})
    if close:
        call(host,'close',{"event_id":eid})
        for g in cis[:2]: call(G[g],'claim',{"event_id":eid},)
print('DONE')
