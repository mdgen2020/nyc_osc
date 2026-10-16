import sys, json, re, time
sel=sys.argv[1:]; sys.argv=["x"]; sys.argv_sel=sel
import importlib.util
spec=importlib.util.spec_from_file_location("ba","build_ava.py"); ba=importlib.util.module_from_spec(spec); spec.loader.exec_module(ba)
AID="f99f22cb-12f6-4791-b8dc-10f4ea54ea5e"; V="14.0"
m=ba.Mcp()
def send(sid,prev,text):
    for a in range(4):
        e,b=m.tool("cicero_send_message",{"agentId":AID,"sessionId":sid,"text":text,"previousTurnId":prev,"version":V})
        if "raw" in b and "429" in str(b): time.sleep(8); continue
        return b
    return b
def run(name, intro, ln, zp, dob, followup):
    print("=====",name)
    for a in range(4):
        e,b=m.tool("cicero_start_session",{"agentId":AID,"version":V,"startContext":{"conversation_id":"t2-"+name,"interaction_channel":"digital","contact_reason":"claim_status"}})
        if "sessionId" in b or "session_id" in b: break
        time.sleep(8)
    sid=b.get("sessionId") or b.get("session_id"); prev=b.get("turnId") or b.get("turn_id")
    code=None; tools=[]
    for t in [intro,ln,zp,dob,"CODE",followup]+(["Yes, please connect me to a representative."] if name.endswith("10001") else []):
        if t=="CODE":
            if not code: print("NO CODE"); break
            t=FMT(code)
        b=send(sid,prev,t); prev=b.get("turnId") or b.get("turn_id") or prev
        if not (b.get("text") or b.get("agentText")) and not b.get("toolResults"):
            time.sleep(10); b=send(sid,prev,"Please continue."); prev=b.get("turnId") or b.get("turn_id") or prev
        for c_ in b.get("toolCalls") or []: print("   CALL",c_["name"],json.dumps(c_["input"]))
        for r in b.get("toolResults") or []:
            tools.append(r["name"])
            if r["name"]=="generate_security_code":
                mm=re.search(r'(\d{6})',r.get("output",""));  code=mm.group(1) if mm else code
            if r["name"] in("verify_claim_identity","validate_security_code"): print("  ",r["name"],re.sub(r'"sessionId":"[^"]+",?','',r.get("output",""))[:160],"ERR" if r.get("error") else "")
            if r["name"]=="get_claim_summary": print("  summary:",r.get("output","")[:350])
        print("USER:",t); print("AVA :",str(b.get("text") or b.get("agentText") or "")[:450])
    print("TOOLS:",tools)
    m.tool("cicero_end_session",{"agentId":AID,"sessionId":sid,"version":V}); time.sleep(6)
import sys
sel=sys.argv_sel
FMTS={'sentence':lambda c:'My code is '+c,'spaced':lambda c:' '.join(c)}
FMT=lambda c:c
cases=[
 ("linus_10305","I want to check on my claim","Smith","10305","June 23, 1988","What is the status of my claim?"),
 ("linus_12201","I want to check on my claim","Smith","12201","June 23, 1988","What is the status of my claim?"),
 ("linus_10001","I want to check on my claim","Smith","10001","June 23, 1988","Where is my check?"),
 ("gloria_10305","I'm checking on a claim for someone else","Jones","10305","November 13, 1970","What is the status of the claim?"),
 ("gloria_12201","I'm checking on a claim for someone else","Jones","12201","November 13, 1970","What is the status of the claim?"),
 ("gloria_10001","I'm checking on a claim for someone else","Jones","10001","November 13, 1970","Where is the check?"),
]
for c in cases:
    name,fmt=(c[0],None)
    for x in sel:
        n,_,f=x.partition(':')
        if n==c[0]:
            FMT=FMTS.get(f,lambda c:c); run(*c)
m.p.terminate()
