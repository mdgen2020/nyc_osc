#!/usr/bin/env python3
"""mikedai_OSC_ C5 setup: create mock data actions and a TEST-ONLY AVA version bound to them.

CREATE-ONLY. Never deletes, never modifies the real data actions, never touches the production version (2.0).
The test version is published with testOnly=true (asserted). Credentials come from .cursor/mcp.json, never printed.

  python3 build_mocks.py check     # read-only: name collisions, current latest published version
  python3 build_mocks.py mocks     # create the mock data actions (mikedai_OSC_Mock_*)
  python3 build_mocks.py version   # create_version from the artifact with tool targets swapped to the mocks
  python3 build_mocks.py publish   # publish_version(testOnly=true) for the mock-bound version
  python3 build_mocks.py verify    # confirm production is still the version the flows use
"""
import copy, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_ava as ba  # noqa: E402  (reuses the stdio MCP client; its main() only runs under __main__)

PROJECT = HERE.parents[1]
CONTRACTS = PROJECT / "data-actions"
PLAN = json.loads((HERE / "mock-plan.json").read_text())["actions"]
STATE = HERE / "mock-state.json"          # ids only
SAGE = HERE / "sage-agent.json"            # production tracking: NOT modified by this script
PROD_VERSION = "2.0"

FAIL = "We couldn't verify that information. Please check what you entered and try again."
DEFAULTS = {
    "mikedai_OSC_SecurityCodeGenerator": PLAN["mikedai_OSC_SecurityCodeGenerator"]["cases"][0]["response"],
    "mikedai_OSC_RecognizeCaller": {"recognized": False},
    "mikedai_OSC_VerifyClaimIdentity": {"outcome": "failed", "sessionId": "id-0", "message": FAIL, "humanHelpRecommended": False},
    "mikedai_OSC_ValidateSecurityCode": {"outcome": "failed", "message": FAIL, "humanHelpRecommended": False},
    "mikedai_OSC_GetClaimSummary": {"ok": False, "error": "STATUS_UNAVAILABLE", "message": "Status is unavailable right now."},
    "mikedai_OSC_SendClaimNotice": {"ok": True, "deliverySimulated": True, "message": "The notice was prepared in the demo's simulated inbox."},
}
# Free-text actions use the plan's default_mock as the default.
for n in ("mikedai_OSC_CreateServiceCase", "mikedai_OSC_StartFictionalClaim"):
    DEFAULTS[n] = PLAN[n]["default_mock"]


def prim(s):
    return {"type": s.get("type", "string")}


def conv(s, top=False):
    """Contract schema -> the harness's restricted schema (primitives, objects, arrays; no pattern/enum/length)."""
    t = s.get("type")
    if t == "object":
        o = {"type": "object", "properties": {k: conv(v) for k, v in (s.get("properties") or {}).items()}}
        return o
    if t == "array":
        return {"type": "array", "items": conv(s.get("items") or {"type": "string"})}
    return prim(s)


def input_schema(contract):
    i = contract["contract"]["input"]["inputSchema"]
    return {"properties": {k: {"type": v.get("type", "string")} for k, v in i.get("properties", {}).items()},
            "required": i.get("required", [])}


def mock_name(real):
    return real.replace("mikedai_OSC_", "mikedai_OSC_Mock_", 1)


def specs():
    out = {}
    for f in sorted(CONTRACTS.glob("mikedai_OSC_*.json")):
        c = json.loads(f.read_text())
        real = c["name"]
        cases = PLAN.get(real, {}).get("cases", [])
        out[real] = {
            "name": mock_name(real),
            "description": f"mikedai_OSC_ evaluation MOCK of {real}. Fictional data only. Not for production use.",
            "input": input_schema(c),
            "output": conv(c["contract"]["output"]["successSchema"]),
            "defaultMock": {"response": DEFAULTS[real]},
            "mockResponses": [{"input": x["input"], "response": x["response"]} for x in cases],
        }
    # The reused Agentless SMS action is mocked so evaluation never sends a real text.
    out["Agentless SMS - MikeD"] = {
        "name": "mikedai_OSC_Mock_AgentlessSms",
        "description": "mikedai_OSC_ evaluation MOCK of the reused Agentless SMS action. Never sends a real text.",
        "input": {"properties": {"PhoneNumber": {"type": "string"}, "MessageContent": {"type": "string"}}, "required": ["PhoneNumber"]},
        "output": {"type": "object", "properties": {"status": {"type": "string"}}},
        "defaultMock": {"response": {"status": "accepted"}},
        "mockResponses": [],
    }
    return out


def st():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


def save(x):
    STATE.write_text(json.dumps(x, indent=2) + "\n")


def check(m):
    err, b = m.tool("list_resources", {"resourceType": "data_action", "name": "mikedai_OSC_Mock", "pageSize": 50})
    print("existing mikedai_OSC_Mock* data actions:", "ERROR" if err else "ok", json.dumps(b)[:400])
    aid = json.loads(SAGE.read_text())["agent_id"]
    err, b = m.tool("get_latest_published_version", {"agentId": aid})
    print("latest PRODUCTION-published version:", json.dumps(b)[:300])


def create_mocks(m):
    s = st()
    done = s.setdefault("mocks", {})
    for real, sp in specs().items():
        assert sp["name"].startswith("mikedai_OSC_Mock_")
        if real in done:
            print("skip (already created):", sp["name"])
            continue
        err, b = m.tool("create_mock_data_action", sp)
        print(f"create {sp['name']}: {'ERROR' if err else 'ok'}", ("" if not err else json.dumps(b)[:700]))
        if err:
            save(s)
            sys.exit(1)
        did = b.get("id") or b.get("dataActionId") or b.get("data_action_id")
        done[real] = {"mockName": sp["name"], "id": did}
        save(s)
    print("mocks:", {k: v["id"] for k, v in done.items()})


def mock_definition():
    a, d = ba.definition()
    d = copy.deepcopy(d)
    ids = st()["mocks"]
    swapped = 0
    for t in d["tools"]:
        nm = (t.get("target") or {}).get("name")
        if nm in ids:
            t["target"] = {"id": ids[nm]["id"], "name": ids[nm]["mockName"]}
            swapped += 1
    print("tools swapped to mocks:", swapped, "of", len(d["tools"]), "(knowledge tool stays real)")
    return d


def create_version(m):
    aid = json.loads(SAGE.read_text())["agent_id"]
    d = mock_definition()
    err, b = m.tool("create_version", {"agentId": aid, "definition": d})
    print("create_version (mock-bound):", "ERROR" if err else "ok", json.dumps(b)[:1500])
    if err:
        sys.exit(1)
    ver = b.get("version") or b.get("id") or b.get("versionId")
    assert str(ver) != PROD_VERSION, "refusing: new version collided with production"
    s = st()
    s["mock_version"] = ver
    save(s)
    print("mock-bound version:", ver)


def publish(m):
    s = st()
    aid, ver = json.loads(SAGE.read_text())["agent_id"], str(s["mock_version"])
    assert ver != PROD_VERSION
    args = {"agentId": aid, "version": ver, "testOnly": True}
    assert args["testOnly"] is True and set(args) == {"agentId", "version", "testOnly"}
    err, b = m.tool("publish_version", args)
    print("publish_version (testOnly):", "ERROR" if err else "ok", json.dumps(b)[:1500])
    status = (b or {}).get("status")
    s["mock_publish_status"] = "TestReady" if status == "Succeeded" else f"not-published ({status})"
    save(s)
    if err or status != "Succeeded":
        sys.exit(1)


def verify(m):
    aid = json.loads(SAGE.read_text())["agent_id"]
    err, b = m.tool("get_latest_published_version", {"agentId": aid})
    print("latest PRODUCTION-published version:", json.dumps(b)[:400])


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    fns = {"check": check, "mocks": create_mocks, "version": create_version, "publish": publish, "verify": verify}
    if cmd not in fns:
        sys.exit(__doc__)
    mcp = ba.Mcp()
    try:
        fns[cmd](mcp)
    finally:
        mcp.p.terminate()
