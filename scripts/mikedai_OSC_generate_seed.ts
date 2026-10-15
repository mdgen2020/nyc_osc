// Generates supabase/seed/mikedai_OSC_seed.sql from the fictional fixtures.
// Run: deno run --allow-write=supabase/seed scripts/mikedai_OSC_generate_seed.ts
// Idempotent output (ON CONFLICT DO NOTHING). Contains NO ANI: the author's test number is hashed separately
// by scripts/mikedai_OSC_seed_ani.ts and is never committed.
import { FIXTURE_CLAIMS } from "../supabase/functions/_shared/mikedai_OSC_fixtures.ts";
import { maskDestination } from "../supabase/functions/_shared/mikedai_OSC_core.ts";

const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
const C = `"mikedai_OSC_core"."mikedai_OSC_claims"`;
const lines: string[] = ["-- mikedai_OSC_ fictional seed data. Generated; do not edit by hand.", "-- Additive and idempotent. No real people, numbers or addresses.", ""];

for (const c of FIXTURE_CLAIMS) {
  lines.push(`insert into ${C} (claim_ref, claimant_last_name, claimant_zip, claimant_dob, owner_deceased, status_code, status_changed_on, next_action, human_help_recommended) values (${q(c.claimRef)}, ${q(c.lastName)}, ${q(c.zip)}, ${q(c.dob)}, ${c.ownerDeceased}, ${q(c.status)}, ${q(c.statusChangedOn)}, ${q(c.nextAction)}, ${c.humanHelp}) on conflict (claim_ref) do nothing;`);
  const id = `(select id from ${C} where claim_ref = ${q(c.claimRef)})`;
  if (c.contact) {
    lines.push(`insert into "mikedai_OSC_core"."mikedai_OSC_claimant_contacts" (claim_id, channel, destination, masked_destination) select ${id}, ${q(c.contact.channel)}, ${q(c.contact.destination)}, ${q(maskDestination(c.contact.channel, c.contact.destination))} where not exists (select 1 from "mikedai_OSC_core"."mikedai_OSC_claimant_contacts" where claim_id = ${id});`);
  }
  for (const d of c.docs) {
    lines.push(`insert into "mikedai_OSC_core"."mikedai_OSC_requested_documents" (claim_id, category, state) select ${id}, ${q(d.category)}, ${q(d.state)} where not exists (select 1 from "mikedai_OSC_core"."mikedai_OSC_requested_documents" where claim_id = ${id} and category = ${q(d.category)});`);
  }
  lines.push(`insert into "mikedai_OSC_core"."mikedai_OSC_payment_status" (claim_id, payment_state, mailed_on, mailing_address_masked) values (${id}, ${q(c.payment)}, ${q(c.mailedOn)}, ${c.payment === "none" ? "null" : q("•••• Fictional Lane")}) on conflict (claim_id) do nothing;`);
  lines.push("");
}
await Deno.writeTextFile("supabase/seed/mikedai_OSC_seed.sql", lines.join("\n"));
console.log(`wrote ${FIXTURE_CLAIMS.length} claims`);
