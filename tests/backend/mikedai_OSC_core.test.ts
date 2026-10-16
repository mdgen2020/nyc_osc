// mikedai_OSC_ backend tests. Run: deno test --allow-none tests/backend
import { assert, assertEquals, assertFalse, assertMatch, assertNotEquals } from "jsr:@std/assert@1";
import * as core from "../../supabase/functions/_shared/mikedai_OSC_core.ts";
import { makeDemoDeps } from "../../supabase/functions/_shared/mikedai_OSC_memory_store.ts";
import { handle } from "../../supabase/functions/mikedai_OSC_claim_ops/handler.ts";
import { FIXTURE_CLAIMS, TEST_EDGE_CLAIMS } from "../../supabase/functions/_shared/mikedai_OSC_fixtures.ts";
import { DEMO_POLICY, POLICY, PRODUCTION_POLICY } from "../../supabase/functions/_shared/mikedai_OSC_types.ts";

// The deployed service runs the relaxed DEMO_POLICY. These tests prove the lockout logic, so they pin the production values.
Object.assign(POLICY, PRODUCTION_POLICY);

const byScenario = (n: number) => [...FIXTURE_CLAIMS, ...TEST_EDGE_CLAIMS].find((c) => c.scenario === n)!;
// Simplified demo: callers give last name, ZIP and date of birth. They never need a Claim ID.
const attrs = (c: ReturnType<typeof byScenario>) => ({ lastName: c.lastName, zip: c.zip, dob: c.dob });
// Scenarios: 1-3 Linus Smith (10305 documents required, 12201 check mailed, 10001 check not received), 4-6 Gloria Jones (same ZIPs).
// 11-15 are test-only edge cases.

/** Full happy-path verification; returns token. Uses the generator exactly as the Genesys action would. */
async function verify(ctx: Awaited<ReturnType<typeof makeDemoDeps>>, scenario: number) {
  const c = byScenario(scenario);
  const b = await core.beginVerification(ctx.deps, attrs(c));
  assertEquals(b.outcome, "attributes_ok");
  const code = core.generateSecurityCode();
  const s = await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: code });
  assert(s.ok);
  const v = await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code });
  assertEquals(v.outcome, "verified");
  return { token: (v as { verificationToken: string }).verificationToken, sessionId: b.sessionId, code };
}

Deno.test("5 code generation is exactly six digits, string, leading zeros preserved", () => {
  let leadingZero = false;
  for (let i = 0; i < 20000; i++) {
    const c = core.generateSecurityCode();
    assertEquals(typeof c, "string");
    assertMatch(c, /^[0-9]{6}$/);
    if (c.startsWith("0")) leadingZero = true;
  }
  assert(leadingZero, "expected at least one code with a leading zero in 20000 samples");
});

Deno.test("1/2/3 caller recognition is convenience only", async () => {
  const ctx = await makeDemoDeps();
  const hit = await core.recognizeCaller(ctx.deps, "(212) 555-0102");
  assertEquals(hit, { recognized: true, firstName: "Linus" });
  assertEquals(await core.recognizeCaller(ctx.deps, "+12125550999"), { recognized: false });
  assertEquals(await core.recognizeCaller(ctx.deps, "anonymous"), { recognized: false });
  assertEquals(await core.recognizeCaller(ctx.deps, ""), { recognized: false });
  assertFalse("claimId" in hit, "ANI recognition must not mention a claim");
});

Deno.test("6 successful verification returns only an opaque token, and never the code", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  const code = "012345";
  const s = await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: code });
  assertFalse(JSON.stringify(s).includes(code));
  const v = await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code });
  assertEquals(v.outcome, "verified");
  assertMatch((v as { verificationToken: string }).verificationToken, /^[0-9a-f]{32}$/);
  assertFalse(JSON.stringify(v).includes(code));
});

Deno.test("7 failed OTP followed by success; code is single use", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "123456" });
  assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "000000" })).outcome, "failed");
  assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "123456" })).outcome, "verified");
  assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "123456" })).outcome, "failed");
});

Deno.test("8 verification lockout after repeated bad codes; correct code no longer works", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "123456" });
  for (let i = 0; i < 2; i++) assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "000000" })).outcome, "failed");
  const third = await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "000000" });
  assertEquals(third.outcome, "locked");
  assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "123456" })).outcome, "locked");
});

Deno.test("expired code is rejected", async () => {
  let now = new Date("2026-10-14T12:00:00Z");
  const ctx = await makeDemoDeps({ now: () => now });
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "123456" });
  now = new Date(now.getTime() + 11 * 60 * 1000);
  assertEquals((await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code: "123456" })).outcome, "failed");
});

Deno.test("resend throttle and limit", async () => {
  let now = new Date("2026-10-14T12:00:00Z");
  const ctx = await makeDemoDeps({ now: () => now });
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  assert((await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "111111" })).ok);
  const t = await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "222222" });
  assertEquals((t as { error: string }).error, "RESEND_THROTTLED");
  for (let i = 0; i < 2; i++) { now = new Date(now.getTime() + 31_000); assert((await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "333333" })).ok); }
  now = new Date(now.getTime() + 31_000);
  assertEquals(((await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: "444444" })) as { error: string }).error, "RESEND_LIMIT");
});

Deno.test("invalid code formats are refused by the backend contract", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  for (const bad of ["12345", "1234567", "12345a", "", " 12345"]) {
    const r = await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: bad });
    assertFalse(r.ok);
  }
});

Deno.test("9/10 claim not found is indistinguishable from mismatch (no enumeration)", async () => {
  const ctx = await makeDemoDeps();
  const missing = await core.beginVerification(ctx.deps, { claimId: "DEMO-999999", lastName: "Nobody", zip: "99999" });
  const mismatch = await core.beginVerification(ctx.deps, { claimId: "DEMO-200001", lastName: "Wrong", zip: "99999" });
  const strip = (r: Record<string, unknown>) => { const { sessionId: _s, ...rest } = r; return rest; };
  assertEquals(strip(missing as never), strip(mismatch as never));
  assertEquals(missing.outcome, "failed");
  assertEquals((missing as { message: string }).message, (mismatch as { message: string }).message);
});

Deno.test("attribute lockout after repeated failures in a session", async () => {
  const ctx = await makeDemoDeps();
  let sid: string | undefined;
  let last;
  for (let i = 0; i < 3; i++) { last = await core.beginVerification(ctx.deps, { sessionId: sid, claimId: "DEMO-200001", lastName: "Wrong", zip: "1" }); sid = last.sessionId; }
  assertEquals(last!.outcome, "locked");
  // even correct details are refused while locked
  assertEquals((await core.beginVerification(ctx.deps, { sessionId: sid, ...attrs(byScenario(1)) })).outcome, "locked");
});

Deno.test("Claim ID alone is not sufficient", async () => {
  const ctx = await makeDemoDeps();
  assertEquals((await core.beginVerification(ctx.deps, { claimId: "DEMO-200001" })).outcome, "failed");
  assertEquals((await core.beginVerification(ctx.deps, { claimId: "DEMO-200001", lastName: "Smith" })).outcome, "failed");
});

Deno.test("no Claim ID is needed: last name + ZIP + date of birth find exactly one claim", async () => {
  const ctx = await makeDemoDeps();
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const b = await core.beginVerification(ctx.deps, attrs(byScenario(n)));
    assertEquals(b.outcome, "attributes_ok", `scenario ${n}`);
  }
  // Last name + date of birth alone match three claims (three ZIP codes), so they are ambiguous and fail neutrally.
  const c = byScenario(1);
  assertEquals((await core.beginVerification(ctx.deps, { lastName: c.lastName, dob: c.dob })).outcome, "failed");
  // Two matching attributes are enough when they are unambiguous: last name + ZIP.
  assertEquals((await core.beginVerification(ctx.deps, { lastName: c.lastName, zip: c.zip })).outcome, "attributes_ok");
});

Deno.test("the demo model: two people, three ZIP codes, the ZIP code selects the scenario", async () => {
  const expected: Record<string, { status: string; payment: string }> = {
    "10305": { status: "documents_required", payment: "none" },
    "12201": { status: "check_mailed", payment: "check_mailed" },
    "10001": { status: "check_not_received", payment: "check_not_received" },
  };
  const people = [{ last: "Smith", dob: "1988-06-23", first: "Linus" }, { last: "Jones", dob: "1970-11-13", first: "Gloria" }];
  assertEquals(FIXTURE_CLAIMS.length, 6);
  for (const p of people) {
    for (const [zip, want] of Object.entries(expected)) {
      const ctx = await makeDemoDeps();
      const b = await core.beginVerification(ctx.deps, { lastName: p.last, zip, dob: p.dob });
      assertEquals(b.outcome, "attributes_ok", `${p.first} ${zip}`);
      const code = core.generateSecurityCode();
      assert((await core.sendVerificationCode(ctx.deps, { sessionId: b.sessionId, securityCode: code })).ok);
      const v = await core.validateVerificationCode(ctx.deps, { sessionId: b.sessionId, code }) as { verificationToken: string };
      const sum = await core.getClaimSummary(ctx.deps, v.verificationToken) as { status: string; paymentState: string; humanHelpRecommended: boolean };
      assertEquals(sum.status, want.status, `${p.first} ${zip}`);
      assertEquals(sum.paymentState, want.payment, `${p.first} ${zip}`);
      assertEquals(sum.humanHelpRecommended, zip === "10001", `${p.first} ${zip}`);
    }
  }
});

Deno.test("one matching attribute is never enough, and a mix of two people's details picks no claim", async () => {
  const ctx = await makeDemoDeps();
  assertEquals((await core.beginVerification(ctx.deps, { lastName: "Smith", zip: "99999", dob: "2000-01-01" })).outcome, "failed");
  assertEquals((await core.beginVerification(ctx.deps, { lastName: "Jones" })).outcome, "failed");
  // Smith + 12201 with Gloria's date of birth: every value the caller gives must match one claim, and none does.
  assertEquals((await core.beginVerification(ctx.deps, { lastName: "Smith", zip: "12201", dob: "1970-11-13" })).outcome, "failed");
  // Gloria's name with Linus's ZIP and date of birth: also nothing.
  assertEquals((await core.beginVerification(ctx.deps, { lastName: "Jones", zip: "10305", dob: "1988-06-23" })).outcome, "failed");
});

Deno.test("attribute-only lockout cannot be dodged by changing the ZIP or date of birth on each guess", async () => {
  const ctx2 = await makeDemoDeps();
  const bad: string[] = [];
  for (const [zip, dob] of [["11111", "2000-01-01"], ["22222", "2001-02-02"], ["33333", "2002-03-03"]]) {
    bad.push((await core.beginVerification(ctx2.deps, { lastName: "Smith", zip, dob })).outcome);
  }
  assertEquals(bad, ["failed", "failed", "locked"]);
  // correct details, brand-new session: still locked for that last name
  assertEquals((await core.beginVerification(ctx2.deps, attrs(byScenario(1)))).outcome, "locked");
  // another last name is unaffected
  assertEquals((await core.beginVerification(ctx2.deps, attrs(byScenario(4)))).outcome, "attributes_ok");
});

Deno.test("11 verification service unavailable when no contact on file", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(11)));
  assertEquals(b.outcome, "unavailable");
  assertEquals((b as { humanHelpRecommended: boolean }).humanHelpRecommended, true);
});

Deno.test("10/16 protected data requires a token; amount is never returned", async () => {
  const ctx = await makeDemoDeps();
  for (const fn of [core.getClaimStatus, core.getRequiredDocuments, core.getPaymentStatus, core.resendClaimNotice]) {
    const r = await fn(ctx.deps, "forged-token");
    assertEquals((r as { error: string }).error, "VERIFICATION_REQUIRED");
  }
  const { token } = await verify(ctx, 1);
  const s = await core.getClaimStatus(ctx.deps, token);
  assertFalse(/amount|\$/i.test(JSON.stringify(s)));
});

Deno.test("12 status resolution for each status scenario", async () => {
  for (const n of [1, 2, 3, 4, 5, 6, 14, 15]) {
    const ctx = await makeDemoDeps();
    const c = byScenario(n);
    const { token } = await verify(ctx, n);
    const s = await core.getClaimStatus(ctx.deps, token) as Record<string, unknown>;
    assertEquals(s.status, c.status);
    assertEquals(s.statusChangedOn, c.statusChangedOn);
    assert(typeof s.nextAction === "string" && s.nextAction);
    assertFalse(/\d{4}-\d{2}-\d{2}/.test(String(s.processingWindow)), "no exact completion dates");
  }
});

Deno.test("12 status service unavailable is reported without inventing data", async () => {
  const ctx = await makeDemoDeps();
  const { token } = await verify(ctx, 12);
  const s = await core.getClaimStatus(ctx.deps, token);
  assertEquals((s as { error: string }).error, "STATUS_UNAVAILABLE");
});

Deno.test("13 documentation-required journey then documents-received", async () => {
  const ctx = await makeDemoDeps();
  const { token } = await verify(ctx, 1);
  const before = await core.getRequiredDocuments(ctx.deps, token) as { furtherActionNeeded: boolean; documents: { category: string; state: string }[] };
  assertEquals(before.furtherActionNeeded, true);
  assertEquals(before.documents[0], { category: "proof_old_address", state: "required" });
  const r = await core.createUploadReceipt(ctx.deps, { token, category: "proof_old_address", fileType: "PDF", sizeBytes: 2_000_000 }) as { ok: boolean; receiptId: string };
  assert(r.ok); assertMatch(r.receiptId, /^RCPT-\d{6}$/);
  const after = await core.getRequiredDocuments(ctx.deps, token) as { furtherActionNeeded: boolean };
  assertEquals(after.furtherActionNeeded, false);
});

Deno.test("upload limits: formats and 10 MB", async () => {
  const ctx = await makeDemoDeps();
  const { token } = await verify(ctx, 1);
  for (const ft of ["pdf", "PNG", "jpg", "jpeg", "tif", "tiff"]) assert((await core.createUploadReceipt(ctx.deps, { token, category: "other", fileType: ft, sizeBytes: 1000 })).ok);
  assertEquals(((await core.createUploadReceipt(ctx.deps, { token, category: "other", fileType: "exe", sizeBytes: 1000 })) as { error: string }).error, "UNSUPPORTED_FILE_TYPE");
  assertEquals(((await core.createUploadReceipt(ctx.deps, { token, category: "other", fileType: "pdf", sizeBytes: 10 * 1024 * 1024 + 1 })) as { error: string }).error, "FILE_TOO_LARGE");
  assert((await core.createUploadReceipt(ctx.deps, { token, category: "other", fileType: "pdf", sizeBytes: 10 * 1024 * 1024 })).ok);
});

Deno.test("13 documents received / under review scenario status", async () => {
  const ctx = await makeDemoDeps();
  const { token } = await verify(ctx, 14);
  const s = await core.getClaimStatus(ctx.deps, token) as { status: string; documentStatus: { received: number } };
  assertEquals(s.status, "under_review"); assertEquals(s.documentStatus.received, 1);
});

Deno.test("13 approved / check preparing / check mailed payments", async () => {
  const c6 = await makeDemoDeps(); const t6 = (await verify(c6, 15)).token;
  const p6 = await core.getPaymentStatus(c6.deps, t6) as { paymentState: string; humanHelpRecommended: boolean };
  assertEquals(p6.paymentState, "check_preparing"); assertFalse(p6.humanHelpRecommended);
  const c7 = await makeDemoDeps(); const t7 = (await verify(c7, 2)).token;
  const p7 = await core.getPaymentStatus(c7.deps, t7) as { paymentState: string; mailedOn: string; guidance: string };
  assertEquals(p7.paymentState, "check_mailed"); assertEquals(p7.mailedOn, "2026-10-05"); assert(p7.guidance.includes("180 days"));
});

Deno.test("8 check not received recommends a human", async () => {
  const ctx = await makeDemoDeps(); const { token } = await verify(ctx, 3);
  const p = await core.getPaymentStatus(ctx.deps, token) as { paymentState: string; humanHelpRecommended: boolean };
  assertEquals(p.paymentState, "check_not_received"); assert(p.humanHelpRecommended);
});

Deno.test("14 deceased-owner claim recommends human escalation", async () => {
  const ctx = await makeDemoDeps(); const { token } = await verify(ctx, 13);
  const s = await core.getClaimStatus(ctx.deps, token) as { humanHelpRecommended: boolean; ownerDeceased: boolean };
  assert(s.humanHelpRecommended && s.ownerDeceased);
  const sc = await core.startClaim(ctx.deps, { lastName: "Fictional", zip: "00099", dob: "1960-01-01", relationship: "estate", channel: "email", destination: "x@example.test", demoAcknowledged: true }) as { escalationRecommended: boolean; submittedToOsc: boolean };
  assert(sc.escalationRecommended); assertFalse(sc.submittedToOsc);
});

Deno.test("stage 1 self claim starts without escalation and is never submitted to OSC", async () => {
  const ctx = await makeDemoDeps();
  const r = await core.startClaim(ctx.deps, { lastName: "Fictional", zip: "00099", dob: "1960-01-01", relationship: "self", channel: "email", destination: "x@example.test", demoAcknowledged: true }) as { ok: boolean; claimId: string; escalationRecommended: boolean; submittedToOsc: boolean };
  assert(r.ok); assertMatch(r.claimId, /^DEMO-\d{6}$/); assertFalse(r.escalationRecommended); assertFalse(r.submittedToOsc);
  assertFalse((await core.startClaim(ctx.deps, { lastName: "F", zip: "1", dob: "1960-01-01", relationship: "self", channel: "email", destination: "x@example.test", demoAcknowledged: false })).ok);
});

Deno.test("18 social engineering: a token only unlocks its own claim; other claim needs its own attributes", async () => {
  const ctx = await makeDemoDeps();
  const { token } = await verify(ctx, 1); // Linus verified
  const status = await core.getClaimStatus(ctx.deps, token) as { status: string };
  assertEquals(status.status, "documents_required");
  // Linus's details + someone else's Claim ID must fail neutrally
  const r = await core.beginVerification(ctx.deps, { claimId: "DEMO-300001", lastName: "Smith", zip: "10305" });
  assertEquals(r.outcome, "failed");
});

Deno.test("21-23 summaries are sanitized and allow-listed", async () => {
  const ctx = await makeDemoDeps();
  const { token, code } = await verify(ctx, 1);
  const nasty = "Caller Linus 10305 DOB 1988-06-23 claim DEMO-200001 email linus@example.test phone 212-555-0102 SSN 123-45-6789 token " + token + " code " + code;
  const r = await core.createServiceCase(ctx.deps, { token, reason: nasty, summary: { reason: nasty, inquiry: "self", verification: "verified", statusCategory: "documents_required", automationCompleted: "status lookup", outstanding: nasty, recommendedNext: "review documents" } });
  for (const bad of ["1988-06-23", "DEMO-200001", "linus@example.test", "212-555-0102", "123-45-6789", "10305"]) assertFalse(r.summary.includes(bad), `summary leaked ${bad}`);
  assert(r.summary.includes("Verification: verified"));
  assertEquals(r.queueId, "dc15ad2c-7917-413f-9a00-4f52df4d4602");
  assertFalse(JSON.stringify(ctx.store.cases).includes("1988-06-23"));
  // contained and transferred variants share the same shape
  const contained = core.buildSummary({ reason: "status", inquiry: "self", verification: "verified", resolution: "contained" });
  const transferred = core.buildSummary({ reason: "check issue", inquiry: "self", verification: "verified", transferReason: "check not received" });
  assert(contained.includes("Resolution: contained")); assert(transferred.includes("Transfer reason: check not received"));
  assertEquals(core.maskClaimRef("DEMO-200001"), "DEMO-••••01");
});

Deno.test("30 verification values are absent from audit log, stored rows, and logs", async () => {
  const ctx = await makeDemoDeps();
  const { token, code } = await verify(ctx, 1);
  const dump = JSON.stringify({ audit: ctx.store.auditLog, codes: ctx.store.codes, tokens: ctx.store.tokens, deliveries: ctx.store.deliveries });
  for (const secret of [code, token, "Smith", "10305", "1988-06-23", "DEMO-200001"]) assertFalse(dump.includes(secret), `leaked ${secret}`);
  assertNotEquals(ctx.store.codes[0].hash, code);
});

// ----------------------------------------------------------------------------- handler
const env = { sharedKey: "test-shared-key", allowedOrigins: ["https://pages.example.test", "http://localhost:5173"], demoRevealCode: false };
const req = (body: unknown, headers: Record<string, string> = {}) => new Request("https://f.test/", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

Deno.test("handler: unauthorized without shared key or approved origin", async () => {
  const ctx = await makeDemoDeps();
  assertEquals((await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }), ctx.deps, env)).status, 401);
  assertEquals((await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }, { origin: "https://evil.test" }), ctx.deps, env)).status, 401);
});

Deno.test("handler: fails closed when the shared key is unset (empty header must not match empty key)", async () => {
  const ctx = await makeDemoDeps();
  const unset = { sharedKey: "", allowedOrigins: [], demoRevealCode: false };
  assertEquals((await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }), ctx.deps, unset)).status, 401);
  assertEquals((await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }, { "x-mikedai-osc-key": "" }), ctx.deps, unset)).status, 401);
});

Deno.test("handler: an origin-authenticated caller cannot choose or fetch the code (no OTP bypass)", async () => {
  const ctx = await makeDemoDeps();
  const o = { origin: "http://localhost:5173" };
  const call = async (body: unknown) => (await handle(req(body, o), ctx.deps, env)).json();
  // Genesys-only operations are refused for origin callers.
  assertEquals((await call({ operation: "generateSecurityCode" })).error, "UNKNOWN_OPERATION");
  assertEquals((await call({ operation: "verifyClaimIdentity", claimId: "DEMO-200001", lastName: "Smith", zip: "10305", securityCode: "123456" })).error, "UNKNOWN_OPERATION");
  // A supplied code on the website path is ignored: the attacker's chosen code must not validate.
  const b = await call({ operation: "beginVerification", claimId: "DEMO-200001", lastName: "Smith", zip: "10305" });
  assertEquals(b.outcome, "attributes_ok");
  await call({ operation: "sendVerificationCode", sessionId: b.sessionId, securityCode: "123456" });
  const v = await call({ operation: "validateVerificationCode", sessionId: b.sessionId, code: "123456" });
  assertEquals(v.outcome, "failed");
  assertEquals(v.verificationToken, undefined);
});

Deno.test("handler: Genesys key and approved origin work; CORS only for approved origins", async () => {
  const ctx = await makeDemoDeps();
  const a = await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }, { "x-mikedai-osc-key": "test-shared-key" }), ctx.deps, env);
  assertEquals((await a.json()).firstName, "Linus");
  const b = await handle(req({ operation: "recognizeCaller", ani: "+12125550102" }, { origin: "http://localhost:5173" }), ctx.deps, env);
  assertEquals(b.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const o = await handle(new Request("https://f.test/", { method: "OPTIONS", headers: { origin: "https://evil.test" } }), ctx.deps, env);
  assertEquals(o.headers.get("access-control-allow-origin"), null);
});

Deno.test("15 tool timeout: transient failures are retried; persistent failures degrade safely", async () => {
  const ctx = await makeDemoDeps();
  ctx.store.failNext = 2;
  const ok = await handle(req({ operation: "beginVerification", claimId: "DEMO-200001", lastName: "Smith", zip: "10305" }, { "x-mikedai-osc-key": "test-shared-key" }), ctx.deps, env);
  assertEquals((await ok.json()).outcome, "attributes_ok");
  ctx.store.failNext = 10;
  const bad = await (await handle(req({ operation: "beginVerification", claimId: "DEMO-200001", lastName: "Smith", zip: "10305" }, { "x-mikedai-osc-key": "test-shared-key" }), ctx.deps, env)).json();
  assertEquals(bad.error, "SERVICE_UNAVAILABLE");
  assertEquals(bad.humanHelpRecommended, true);
  assertFalse(JSON.stringify(bad).includes("simulated timeout"));
});

Deno.test("handler: the OTP is never returned to Genesys; website demo reveal is opt-in", async () => {
  const ctx = await makeDemoDeps();
  const b = await core.beginVerification(ctx.deps, attrs(byScenario(1)));
  const g = await (await handle(req({ operation: "sendVerificationCode", sessionId: b.sessionId, securityCode: "654321" }, { "x-mikedai-osc-key": "test-shared-key" }), ctx.deps, { ...env, demoRevealCode: true })).json();
  assertFalse(JSON.stringify(g).includes("654321")); assertFalse("demoCode" in g);
  const ctx2 = await makeDemoDeps();
  const b2 = await core.beginVerification(ctx2.deps, attrs(byScenario(1)));
  const off = await (await handle(req({ operation: "sendVerificationCode", sessionId: b2.sessionId }, { origin: "http://localhost:5173" }), ctx2.deps, env)).json();
  assertFalse("demoCode" in off);
  const ctx3 = await makeDemoDeps();
  const b3 = await core.beginVerification(ctx3.deps, attrs(byScenario(1)));
  const on = await (await handle(req({ operation: "sendVerificationCode", sessionId: b3.sessionId }, { origin: "http://localhost:5173" }), ctx3.deps, { ...env, demoRevealCode: true })).json();
  assertMatch(on.demoCode, /^[0-9]{6}$/);
});

Deno.test("dateOnly: Postgres date values (JS Date at UTC midnight) become YYYY-MM-DD, not a locale string", async () => {
  const { dateOnly } = await import("../../supabase/functions/_shared/mikedai_OSC_core.ts");
  assertEquals(dateOnly(new Date("1988-06-23")), "1988-06-23");
  assertEquals(dateOnly("1970-11-13"), "1970-11-13");
  assertEquals(dateOnly(null), "");
});

Deno.test("a verified caller can run the same scenario again: the per-claim send limit resets after a successful verification", async () => {
  const ctx = await makeDemoDeps();
  const c = byScenario(1);
  // Three full successful verifications in a row would hit the 3-send limit without the reset.
  for (let n = 0; n < 4; n++) {
    ctx.advance?.(60_000);
    const code = core.generateSecurityCode();
    const r = await core.verifyClaimIdentity(ctx.deps, { ...attrs(c), securityCode: code });
    assertEquals(r.outcome, "code_sent", `run ${n + 1}`);
    const v = await core.validateVerificationCode(ctx.deps, { sessionId: r.sessionId, code });
    assertEquals(v.outcome, "verified");
  }
});

Deno.test("handler: the hidden Genesys securityCode differs from the delivered digits, and the delivered digits validate", async () => {
  const ctx = await makeDemoDeps();
  const key = { "x-mikedai-osc-key": "test-shared-key" };
  const call = async (body: unknown) => (await handle(req(body, key), ctx.deps, env)).json();
  const g = await call({ operation: "generateSecurityCode" });
  const delivered = String(g.smsMessage).match(/\b\d{6}\b/)![0];
  assert(delivered !== g.securityCode, "hidden value must not equal what the caller types");
  const v = await call({ operation: "verifyClaimIdentity", claimId: "DEMO-200001", lastName: "Smith", zip: "10305", dob: "1988-06-23", securityCode: g.securityCode });
  assertEquals(v.outcome, "code_sent");
  assertEquals((await call({ operation: "validateVerificationCode", sessionId: v.sessionId, code: g.securityCode })).outcome, "failed");
  const ok = await call({ operation: "validateVerificationCode", sessionId: v.sessionId, code: delivered });
  assertEquals(ok.outcome, "verified");
});

Deno.test("demo policy: repeated verification texts are not throttled for long and wrong guesses do not lock quickly", async () => {
  const saved = { ...POLICY };
  Object.assign(POLICY, DEMO_POLICY);
  try {
    let now = new Date("2026-10-16T12:00:00Z");
    const ctx = await makeDemoDeps({ now: () => now });
    const a = attrs(byScenario(1));
    // 10 consecutive texts for the same claim, 4 seconds apart (the demo throttle is 3 seconds): all allowed
    for (let i = 0; i < 10; i++) {
      const r = await core.verifyClaimIdentity(ctx.deps, { ...a, securityCode: "123456" });
      assertEquals(r.outcome, "code_sent");
      now = new Date(now.getTime() + 4_000);
    }
    // 5 wrong guesses at the last name do not lock it (production would lock at 3)
    for (let i = 0; i < 5; i++) assertEquals((await core.beginVerification(ctx.deps, { ...a, zip: "99999" })).outcome, "failed");
    assertEquals((await core.beginVerification(ctx.deps, a)).outcome, "attributes_ok");
  } finally {
    Object.assign(POLICY, saved);
  }
});
