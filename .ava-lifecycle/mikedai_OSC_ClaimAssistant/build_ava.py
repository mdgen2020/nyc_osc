#!/usr/bin/env python3
"""mikedai_OSC_ C2: create / version / TestReady-publish the AVA by calling the ava-harness MCP tools over stdio.

Sends design-artifact.json straight from disk (no retyping). TestReady only: this script never publishes to production
(testOnly is hard-coded true and asserted before the call). It never deletes anything. Credentials come from .cursor/mcp.json and are not printed.

  python3 build_ava.py create     # create_ava (idempotent by name)
  python3 build_ava.py version    # create_version from the artifact
  python3 build_ava.py publish    # publish_version(testOnly=true)
  python3 build_ava.py promote --author-approved-production   # PRODUCTION publish of version 2.0 only (author approved)
"""
import json, os, subprocess, sys, pathlib, datetime

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]                      # sc12 repo root
ART = HERE / "design-artifact.json"
OUT = HERE / "sage-agent.json"
cfg = json.loads((ROOT / ".cursor/mcp.json").read_text())["mcpServers"]["ava-harness"]


class Mcp:
    def __init__(self):
        env = {**os.environ, **cfg.get("env", {})}
        self.p = subprocess.Popen([cfg["command"], *cfg.get("args", [])], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=subprocess.DEVNULL, env=env, text=True, bufsize=1)
        self.n = 0
        self.rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "mikedai_OSC_build", "version": "1"}})
        self.note("notifications/initialized")

    def _send(self, o):
        self.p.stdin.write(json.dumps(o) + "\n"); self.p.stdin.flush()

    def note(self, m, params=None):
        self._send({"jsonrpc": "2.0", "method": m, **({"params": params} if params else {})})

    def rpc(self, m, params):
        self.n += 1
        self._send({"jsonrpc": "2.0", "id": self.n, "method": m, "params": params})
        while True:
            line = self.p.stdout.readline()
            if not line:
                sys.exit("harness closed the connection")
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get("id") == self.n:
                if "error" in r:
                    sys.exit("rpc error: " + json.dumps(r["error"])[:1500])
                return r["result"]

    def tool(self, name, args):
        r = self.rpc("tools/call", {"name": name, "arguments": args})
        txt = "".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
        try:
            body = json.loads(txt)
        except Exception:
            body = {"raw": txt}
        return r.get("isError", False), body


def definition():
    a = json.loads(ART.read_text())
    d = {k: a[k] for k in ("role", "instructions", "guardrails", "tools", "types", "events", "settings")}
    d["model"] = "Preview"  # new AVAs use Preview (ava-build skill)
    return a, d


def state():
    return json.loads(OUT.read_text()) if OUT.exists() else {}


def save(st):
    OUT.write_text(json.dumps(st, indent=2) + "\n")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in ("create", "version", "publish", "promote"):
        sys.exit(__doc__)
    if cmd == "promote":
        # PRODUCTION publish: locks the version contract and lets bot flows route live traffic to it. Author-approved 2026-10-14
        # (Architect only accepts a production-published AVA). Requires an explicit flag and exactly the version approved.
        if "--author-approved-production" not in sys.argv:
            sys.exit("refusing: production publish needs --author-approved-production")
        st0 = state()
        aid, ver = st0.get("agent_id"), str(st0.get("version"))
        if ver != "2.0":
            sys.exit(f"refusing: only version 2.0 was approved for production (current is {ver})")
        m = Mcp()
        args = {"agentId": aid, "version": ver, "testOnly": False}
        err, b = m.tool("publish_version", args)
        print("publish_version (PRODUCTION):", "ERROR" if err else "ok", json.dumps(b)[:700])
        status = (b or {}).get("status")
        st0["publish_status"] = "ProductionReady" if status == "Succeeded" else f"production-publish-not-completed ({status})"
        st0["last_synced_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save(st0)
        m.p.terminate()
        sys.exit(0 if status == "Succeeded" else 1)
    a, d = definition()
    m = Mcp()
    st = state()
    if cmd == "create":
        err, b = m.tool("create_ava", {"name": a["name"], "description": "mikedai_OSC_ demo: unofficial NYS Office of the State Comptroller unclaimed funds claim assistant. Fictional data only."})
        print("create_ava:", "ERROR" if err else "ok", json.dumps(b)[:600])
        if err:
            sys.exit(1)
        aid = b.get("id") or b.get("agent_id") or b.get("agentId")
        st.update({"agent_name": a["name"], "agent_id": aid})
        save(st)
        print("agent_id:", aid)
    elif cmd == "version":
        aid = st.get("agent_id") or sys.exit("run `create` first")
        err, b = m.tool("create_version", {"agentId": aid, "definition": d})
        print("create_version:", "ERROR" if err else "ok", json.dumps(b)[:2500])
        if err:
            sys.exit(1)
        st["version"] = b.get("version") or b.get("id") or b.get("versionId")
        st["version_response_keys"] = sorted(b.keys()) if isinstance(b, dict) else None
        save(st)
        print("version:", st["version"])
    else:
        aid = st.get("agent_id") or sys.exit("run `create` first")
        ver = st.get("version") or sys.exit("run `version` first")
        args = {"agentId": aid, "version": str(ver), "testOnly": True}  # schema key is `testOnly`; default (false) = PRODUCTION
        assert args["testOnly"] is True and set(args) == {"agentId", "version", "testOnly"}, "refusing: must be TestReady only"
        err, b = m.tool("publish_version", args)
        print("publish_version:", "ERROR" if err else "ok", json.dumps(b)[:3000])
        status = (b or {}).get("status")
        st["publish_status"] = "TestReady" if status == "Succeeded" else f"not-published ({status})"
        st["last_synced_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save(st)
        if err or status != "Succeeded":
            sys.exit(1)
    m.p.terminate()


if __name__ == "__main__":
    main()
