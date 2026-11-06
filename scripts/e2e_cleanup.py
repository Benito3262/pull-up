import subprocess,json,re
C='app.pullup-970962.testnet'
def sh(a): r=subprocess.run(['near']+a,capture_output=True,text=True); return r.stdout+r.stderr
def tx(signer,m,args):
    o=sh(['contract','call-function','as-transaction',C,m,'json-args',json.dumps(args),'prepaid-gas','50 Tgas','attached-deposit','0 NEAR','sign-as',signer,'network-config','testnet','sign-with-legacy-keychain','send'])
    h=re.search(r'Transaction ID: (\w+)',o); p=re.search(r'panicked: ([^"\)]+)',o); print(m,signer,h and h.group(1),p and p.group(1),flush=True)
import sys
for eid in map(int,sys.argv[1:]):
    o=sh(['contract','call-function','as-read-only',C,'list_guests','json-args',json.dumps({"event_id":eid}),'network-config','testnet','now'])
    gs=json.loads(o[o.index('['):o.rindex(']')+1]); print(eid,gs)
    tx('e2e-g8-0932.testnet','close',{"event_id":eid})
    for g,_ in gs: tx(g,'claim',{"event_id":eid})
