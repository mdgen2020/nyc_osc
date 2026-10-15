// Prints (never writes) a SQL statement that maps the author's local test number to the fictional persona Linus,
// storing only a keyed hash. Run locally AFTER preflight approval; paste into the approved SQL path.
//   MIKEDAI_OSC_DEMO_ANI=<E.164 or 10-digit> mikedai_OSC_HMAC_SECRET=<secret> deno run --allow-env scripts/mikedai_OSC_seed_ani.ts
// The number and secret are read from the environment only. Output contains the hash, not the number.
import { normalizeAni } from "../supabase/functions/_shared/mikedai_OSC_core.ts";

const ani = normalizeAni(Deno.env.get("MIKEDAI_OSC_DEMO_ANI") ?? "");
const secret = Deno.env.get("mikedai_OSC_HMAC_SECRET") ?? "";
if (!ani || !secret) { console.error("Set MIKEDAI_OSC_DEMO_ANI and mikedai_OSC_HMAC_SECRET in the environment."); Deno.exit(1); }
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ani));
const hash = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
console.log(`insert into "mikedai_OSC_core"."mikedai_OSC_caller_recognition" (ani_hash, first_name) values ('${hash}', 'Linus') on conflict (ani_hash) do nothing;`);
