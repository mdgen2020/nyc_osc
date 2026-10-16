// mikedai_OSC_ migration + RLS tests against a real Postgres engine (PGlite, WASM). Local only, no network DB.
// Run: deno test --allow-read --allow-env --allow-net tests/backend/mikedai_OSC_migration_rls.test.ts
import { assert, assertEquals, assertFalse, assertRejects } from "jsr:@std/assert@1";
import { PGlite } from "npm:@electric-sql/pglite@0.2.17";

const read = (p: string) => Deno.readTextFile(new URL(p, import.meta.url));
const migration = await read("../../supabase/migrations/20261014170000_mikedai_OSC_init.sql");
const seed = await read("../../supabase/seed/mikedai_OSC_seed.sql");

async function freshDb() {
  const db = new PGlite();
  await db.exec("create role anon nologin; create role authenticated nologin;");
  await db.exec(migration);
  return db;
}

Deno.test("migration is idempotent (applies twice) and seed is idempotent", async () => {
  const db = await freshDb();
  await db.exec(migration);
  await db.exec(seed); await db.exec(seed);
  const r = await db.query<{ n: number }>(`select count(*)::int as n from "mikedai_OSC_core"."mikedai_OSC_claims"`);
  assertEquals(r.rows[0].n, 6); // Linus Smith x3 ZIP codes, Gloria Jones x3
  const c = await db.query<{ n: number }>(`select count(*)::int as n from "mikedai_OSC_core"."mikedai_OSC_claimant_contacts"`);
  assertEquals(c.rows[0].n, 6); // every demo claim has a contact on file
});

Deno.test("29 every project table has RLS enabled and anon/authenticated cannot read or write", async () => {
  const db = await freshDb(); await db.exec(seed);
  const t = await db.query<{ relname: string; relrowsecurity: boolean }>(
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'mikedai_OSC_core' and c.relkind = 'r'`);
  assert(t.rows.length >= 13, `expected >=13 tables, got ${t.rows.length}`);
  for (const row of t.rows) {
    assert(row.relrowsecurity, `RLS disabled on ${row.relname}`);
    assert(row.relname.startsWith("mikedai_OSC_"), `table missing prefix: ${row.relname}`);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assertRejects(() => db.query(`select * from "mikedai_OSC_core"."${row.relname}"`), Error, "permission denied");
      await assertRejects(() => db.query(`delete from "mikedai_OSC_core"."${row.relname}"`), Error, "permission denied");
      await db.exec("reset role");
    }
  }
});

Deno.test("verification codes and tokens store hashes, schema has no plaintext code/OTP/token column", async () => {
  const db = await freshDb();
  const cols = await db.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'mikedai_OSC_core'`);
  const names = cols.rows.map((r) => `${r.table_name}.${r.column_name}`);
  assert(names.includes("mikedai_OSC_verification_codes.code_hash"));
  assert(names.includes("mikedai_OSC_verification_tokens.token_hash"));
  assertFalse(names.some((n) => /\.(code|otp|token|password|ssn)$/.test(n)), "plaintext sensitive column found");
});

Deno.test("document receipts enforce 10 MB and allowed types; status values are constrained", async () => {
  const db = await freshDb(); await db.exec(seed);
  const id = (await db.query<{ id: string }>(`select id from "mikedai_OSC_core"."mikedai_OSC_claims" limit 1`)).rows[0].id;
  const ins = (type: string, size: number) => db.query(`insert into "mikedai_OSC_core"."mikedai_OSC_document_receipts" (receipt_ref, claim_id, category, file_type, file_size_bytes) values ($1, $2, 'other', $3, $4)`, [`R-${type}-${size}`, id, type, size]);
  await ins("pdf", 10485760);
  await assertRejects(() => ins("pdf", 10485761));
  await assertRejects(() => ins("exe", 100));
  await assertRejects(() => db.query(`update "mikedai_OSC_core"."mikedai_OSC_claims" set status_code = 'bogus'`));
});

Deno.test("static policy: migration and seed contain no DROP, TRUNCATE, DELETE, or ALTER on existing objects", () => {
  for (const [name, sql] of [["migration", migration], ["seed", seed]] as const) {
    const noComments = sql.replace(/--.*$/gm, "");
    assertFalse(/\bdrop\s/i.test(noComments), `${name}: DROP found`);
    assertFalse(/\btruncate\b/i.test(noComments), `${name}: TRUNCATE found`);
    assertFalse(/\bdelete\s+from\b/i.test(noComments), `${name}: DELETE found`);
    assertFalse(/\bcreate\s+or\s+replace\b/i.test(noComments), `${name}: CREATE OR REPLACE found`);
  }
  // The only ALTER is RLS enablement, scoped to this project's own schema inside the DO block.
  const alters = migration.replace(/--.*$/gm, "").match(/\balter\s+\w+[^;]*/gi) ?? [];
  assertEquals(alters.length, 1);
  assert(/enable row level security/i.test(alters[0] ?? ""));
  // Every identifier we create carries the exact, case-sensitive prefix.
  for (const m of migration.matchAll(/create (?:table|schema) if not exists ("[^"]+")(?:\.("[^"]+"))?/g)) {
    assert((m[2] ?? m[1]).startsWith(`"mikedai_OSC_`), `unprefixed object: ${m[0]}`);
  }
});
