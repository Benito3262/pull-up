#!/usr/bin/env python3
"""E2E test of Pull Up on testnet with fresh faucet wallets. Writes e2e-results.json"""
import subprocess, json, time, re, urllib.request, base64
C='app.pullup-970962.testnet'; S=open('/workspace/pull-up/test-wallets/suffix').read().strip()
A=lambda n:f'e2e-{n}-{S}.testnet'
RPC='https://test.rpc.fastnear.com'
R={'events':[],'edge':[]}
def rpc(method,params):
    for i in range(5):
        try:
            req=urllib.request.Request(RPC,json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),{'Content-Type':'application/json'})
            return json.load(urllib.request.urlopen(req,timeout=20))['result']
        except Exception as e: time.sleep(2)
    raise SystemExit('rpc fail')
def bal(a): return int(rpc('query',{"request_type":"view_account","finality":"final","account_id":a})['amount'])
def view(m,a): 
    r=rpc('query',{"request_type":"call_function","finality":"final","account_id":C,"method_name":m,"args_base64":base64.b64encode(json.dumps(a).encode()).decode()})
    return json.loads(bytes(r['result']))
def call(signer,method,args,dep='0 NEAR',expect_fail=None):
    for t in range(3):
        r=subprocess.run(['near','contract','call-function','as-transaction',C,method,'json-args',json.dumps(args),'prepaid-gas','100 Tgas','attached-deposit',dep,'sign-as',signer,'network-config','testnet','sign-with-legacy-keychain','send'],capture_output=True,text=True)
        out=r.stdout+r.stderr; m=re.search(r'Transaction ID: (\w+)',out)
        failed=('Smart contract panicked' in out) or ('ExecutionError' in out) or r.returncode!=0
        if m or 'panicked' in out: break
        time.sleep(3)
    h=m.group(1) if m else None
    err=(re.search(r'panicked: ([^\n"\\]+)',out) or re.search(r'(Smart contract panicked[^\n]*)',out))
    err=err.group(1).strip() if err else ''
    print(method,signer.split('-')[1],h,'FAIL '+err if failed else 'ok',flush=True)
    if expect_fail is not None:
        R['edge'].append(dict(case=expect_fail,method=method,signer=signer,tx=h,rejected=failed,error=err))
    elif failed: raise SystemExit(f'unexpected fail {method} {out[-600:]}')
    return h
Y=10**24
def new_event(host,title,stake,mins,cap,meta_extra):
    nid=view('get_next_event_id',{})
    dl=int(time.time()*1000)+mins*60000
    h=call(host,'create_event',{"title":title,"deposit":str(int(stake*1e6))+'0'*18,"check_in_deadline_ms":dl,"meta":dict(description=meta_extra,category="E2E test",location="Lagos · NEAR testnet",cover="stage",starts_ms=dl-30*60000,capacity=cap)},'0.05 NEAR')
    return nid,dl,h
plan=[ # host, title, stake, cap, guests, shows
 ('h1','E2E2 · Lagos Builders Night',0.5,6,['g1','g2','g3','g4','g5','g6'],['g1','g2','g3','g4']),
 ('h2','E2E2 · Everyone Pulls Up',0.3,0,['g6','g7','g8'],['g6','g7','g8']),
 ('h1','E2E2 · Nobody Came (refund)',0.2,0,['g2','g3'],[]),
 ('h2','E2E2 · Dust Split (1 of 4 flakes)',0.1,0,['g1','g4','g5','g7'],['g1','g4','g7']),
]
ev=[]
allacc=[A(x) for x in ['h1','h2','g1','g2','g3','g4','g5','g6','g7','g8']]
B0={a:bal(a) for a in allacc}; C0=bal(C)
for host,title,stake,cap,gs,shows in plan:
    eid,dl,h=new_event(A(host),title,stake,14,cap,'Automated end-to-end test run with fresh faucet wallets.')
    e=dict(id=eid,host=A(host),title=title,stake=stake,cap=cap,guests=gs,shows=shows,deadline=dl,txs={'create':h})
    for g in gs: e['txs'][f'deposit:{g}']=call(A(g),'deposit',{"event_id":eid,"ticket":f"e2e-{eid}-{g}"},f'{stake} NEAR')
    ev.append(e)
E1=ev[0]['id']
call(A('g7'),'deposit',{"event_id":E1,"ticket":"x"},'0.5 NEAR',expect_fail='capacity full → deposit rejected')
call(A('g1'),'deposit',{"event_id":ev[1]['id'],"ticket":"x"},'0.1 NEAR',expect_fail='wrong deposit amount rejected')
call(A('g6'),'deposit',{"event_id":ev[1]['id'],"ticket":"x2"},'0.3 NEAR',expect_fail='same guest deposits twice rejected')
call(A('h1'),'deposit',{"event_id":E1,"ticket":"x"},'0.5 NEAR',expect_fail='host deposits into own event rejected')
call(A('g1'),'check_in',{"event_id":E1,"guest":A('g2'),"ticket":f"e2e-{E1}-g2"},expect_fail='non-host check-in rejected')
call(A('h1'),'check_in',{"event_id":E1,"guest":A('g2'),"ticket":"forged"},expect_fail='forged QR ticket rejected')
call(A('h1'),'check_in',{"event_id":E1,"guest":A('g8'),"ticket":"z"},expect_fail='check-in of non-depositor rejected')
call(A('g8'),'close',{"event_id":E1},expect_fail='early close by non-host rejected')
call(A('g1'),'claim',{"event_id":E1},expect_fail='claim before close rejected')
for e in ev:
    for g in e['shows']: e['txs'][f'check_in:{g}']=call(e['host'],'check_in',{"event_id":e['id'],"guest":A(g),"ticket":f"e2e-{e['id']}-{g}"})
call(A('h1'),'check_in',{"event_id":E1,"guest":A('g1'),"ticket":f"e2e-{E1}-g1"},expect_fail='double check-in rejected')
json.dump(dict(ev=ev,B0=B0,C0=C0,R=R),open('/workspace/pull-up/e2e-state.json','w'),indent=1)
wait=max(e['deadline'] for e in ev)/1000-time.time()+15
print('waiting',int(wait),'s',flush=True); time.sleep(max(0,wait))
call(A('g8'),'deposit',{"event_id":ev[3]['id'],"ticket":"late"},'0.1 NEAR',expect_fail='late deposit after deadline rejected')
call(ev[0]['host'],'check_in',{"event_id":E1,"guest":A('g5'),"ticket":f"e2e-{E1}-g5"},expect_fail='late check-in after deadline rejected')
for i,e in enumerate(ev):
    closer=A('g8') if i==1 else e['host']   # anyone may close after deadline
    hb=bal(e['host'])
    e['txs']['close']=call(closer,'close',{"event_id":e['id']})
    time.sleep(3); e['host_dust_yocto']=bal(e['host'])-hb + (0 if closer!=e['host'] else 0)
    claimers=e['shows'] if e['shows'] else e['guests']
    e['claims']={}
    for g in claimers:
        b=bal(A(g)); h=call(A(g),'claim',{"event_id":e['id']}); time.sleep(2)
        st=rpc('EXPERIMENTAL_tx_status',{"tx_hash":h,"sender_account_id":A(g),"wait_until":"FINAL"})
        amt=sum(int(a['Transfer']['deposit']) for rc in st['receipts'] for a in rc['receipt'].get('Action',{}).get('actions',[]) if isinstance(a,dict) and 'Transfer' in a and rc['receiver_id']==A(g) and rc['predecessor_id']==C)
        e['claims'][g]=dict(tx=h,transfer_yocto=str(amt),net_delta_yocto=str(bal(A(g))-b))
    v=view('get_event',{"event_id":e['id']}); e['view']=v
ev0=ev[0]
call(A('g1'),'claim',{"event_id":E1},expect_fail='double claim rejected')
call(A('g5'),'claim',{"event_id":E1},expect_fail='no-show claim rejected')
call(A('g8'),'claim',{"event_id":E1},expect_fail='stranger claim rejected')
call(A('h1'),'close',{"event_id":E1},expect_fail='second close rejected')
B1={a:bal(a) for a in allacc}; C1=bal(C)
json.dump(dict(ev=ev,B0=B0,B1=B1,C0=C0,C1=C1,R=R),open('/workspace/pull-up/e2e-state.json','w'),indent=1)
print('DONE')
