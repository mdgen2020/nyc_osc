// Supabase Edge Function entrypoint. Secrets come from `supabase secrets set`; never from source.
import { handle } from "./handler.ts";
import { PgStore } from "../_shared/mikedai_OSC_pg_store.ts";
import { Deps } from "../_shared/mikedai_OSC_types.ts";

const secret = Deno.env.get("mikedai_OSC_HMAC_SECRET") ?? "";
// WebCrypto rejects a zero-length HMAC key, so only import when the secret is set (otherwise serve 503 below).
const key = secret
  ? await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  : null;
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const rand = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)).buffer);

const deps: Deps = {
  store: new PgStore(Deno.env.get("SUPABASE_DB_URL") ?? ""),
  now: () => new Date(),
  hmac: async (v) => hex(await crypto.subtle.sign("HMAC", key!, new TextEncoder().encode(v))),
  randomToken: () => rand(24),
  randomRef: (p) => `${p}${String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 899999))}`,
  // Demo: delivery is simulated. No SMS/email provider is called, and the code is never logged.
  deliverCode: async () => ({ simulated: true }),
};

const env = {
  sharedKey: Deno.env.get("mikedai_OSC_DATAACTION_API_KEY") ?? "",
  allowedOrigins: (Deno.env.get("mikedai_OSC_ALLOWED_ORIGINS") ?? "http://localhost:5173").split(",").map((s) => s.trim()),
  demoRevealCode: Deno.env.get("mikedai_OSC_DEMO_REVEAL_CODE") === "true",
};

if (!secret) console.error("mikedai_OSC_HMAC_SECRET is not set; refusing to serve.");
Deno.serve((req) => secret ? handle(req, deps, env) : new Response("Service not configured", { status: 503 }));
