#!/usr/bin/env python3
"""Reliability baseline for the verify -> text -> code -> validate chain (simulations only, no org changes).

  python3 reliability_code_entry.py <version> <runs_per_format> [formats...]

Runs digital check-claim conversations for Linus Smith (ZIP 10305, DOB 6/23/1988) with a fresh fake caller_number per run (the backend throttles texts per number), so the real code
text goes nowhere. The simulated caller then types a random six digit number in one of several formats. A run PASSES when
validate_security_code is called exactly once or more with exactly those digits (the code itself is not expected to validate,
because the real code is never visible). This measures the failure the logs show: the model not copying six digits reliably.
Also reports the share of runs where the AVA asked for the code at all. Nothing is deleted.
"""
import sys, json, re, time, random, importlib.util, pathlib

VERSION = sys.argv[1]
N = int(sys.argv[2])
FORMATS = sys.argv[3:] or ["bare", "sentence", "spaced", "embedded"]
sys.argv = ["x"]
HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("ba", HERE / "build_ava.py")
ba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ba)
AID = "f99f22cb-12f6-4791-b8dc-10f4ea54ea5e"
m = ba.Mcp()
rnd = random.Random(20261016)

FMT = {
    "bare": lambda c: c,
    "sentence": lambda c: "my code is " + c,
    "spaced": lambda c: " ".join(c),
    "embedded": lambda c: f"ok it says {c}, thanks",
    "grouped": lambda c: f"{c[:3]} {c[3:]}",
}


def send(sid, prev, text):
    b = {}
    for _ in range(5):
        _e, b = m.tool("cicero_send_message", {"agentId": AID, "sessionId": sid, "text": text, "previousTurnId": prev, "version": VERSION})
        if "raw" in b and ("429" in str(b) or "500" in str(b)):
            time.sleep(8)
            continue
        return b
    return b


CLAIMS = [("smith", "12201", "June 23, 1988"), ("smith", "10001", "June 23, 1988"), ("jones", "10305", "November 13, 1970"),
          ("jones", "12201", "November 13, 1970"), ("jones", "10001", "November 13, 1970"), ("smith", "10305", "June 23, 1988")]
NONUM = bool(__import__("os").environ.get("NO_CALLER_NUMBER"))
SENDS = {}


def one(fmt, n):
    # rotate claims (the backend allows 3 texts per claim per 15 minutes) and use the least used one
    cl = min(CLAIMS[:int(__import__("os").environ.get("N_CLAIMS", "5"))], key=lambda c: SENDS.get(c, 0))
    SENDS[cl] = SENDS.get(cl, 0) + 1
    ln, zp, dob = cl
    for _ in range(4):
        _e, b = m.tool("cicero_start_session", {"agentId": AID, "version": VERSION, "language": "en-us",
                       "startContext": {"conversation_id": f"rel-{fmt}-{n}", "interaction_channel": "digital", "contact_reason": "check_claim",
                                        "has_claim_id": "unsure", **({} if NONUM else {"caller_number": "+1555555" + str(rnd.randint(1000, 9999))})}})
        if b.get("sessionId"):
            break
        time.sleep(8)
    sid, prev = b.get("sessionId"), b.get("turnId")
    code = "".join(str(rnd.randint(0, 9)) for _ in range(6))
    if n % 3 == 0:                                 # leading zero case
        code = "0" + code[1:]
    called = []
    asked = False
    last = ""
    for t in ["hello", ln, zp, dob, "CODE"]:
        if t == "CODE":
            t = FMT[fmt](code)
        b = send(sid, prev, t)
        prev = b.get("turnId") or prev
        for c in b.get("toolCalls") or []:
            called.append((c["name"], c.get("input")))
        text = str(b.get("text") or b.get("agentText") or "")
        last = text
        if t != "CODE" and re.search(r"six digits|all six|the code", text, re.I):
            asked = True
    m.tool("cicero_end_session", {"agentId": AID, "sessionId": sid, "version": VERSION})
    time.sleep(3)
    val = [i for (nme, i) in called if nme == "validate_security_code"]
    exact = any((v or {}).get("code") == code for v in val)
    ok = exact
    why = "" if ok else ("validate not called" if not val else "wrong digits sent: " + json.dumps(val[0].get("code")) + " expected " + code)
    print(f"{fmt:9s} run {n}: {'PASS' if ok else 'FAIL'} {why}", flush=True)
    if not ok:
        print("     tools:", [c[0] for c in called], "| last reply:", last[:230].replace("\n", " "), flush=True)
    return ok


tot = {}
for f in FORMATS:
    for n in range(1, N + 1):
        tot.setdefault(f, []).append(one(f, n))
print("SUMMARY", VERSION, {f: f"{sum(v)}/{len(v)}" for f, v in tot.items()}, f"overall {sum(sum(v) for v in tot.values())}/{sum(len(v) for v in tot.values())}")
m.p.terminate()
