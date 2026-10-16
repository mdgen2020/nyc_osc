// Exports a mock-response plan by running the REAL backend (in-memory) through each fictional scenario with a fixed
// mock security code. Output is a local file only; creating mock data actions in the org needs author approval.
// Run: deno run --allow-read --allow-write scripts/mikedai_OSC_export_mock_plan.ts
import { makeDemoDeps } from "../supabase/functions/_shared/mikedai_OSC_memory_store.ts";
import { FIXTURE_CLAIMS } from "../supabase/functions/_shared/mikedai_OSC_fixtures.ts";
import { handle } from "../supabase/functions/mikedai_OSC_claim_ops/handler.ts";
import { verificationSmsText } from "../supabase/functions/_shared/mikedai_OSC_core.ts";

const MOCK_CODE = "482916";
const env = { sharedKey: "k", allowedOrigins: [], demoRevealCode: false };
const ctx = await makeDemoDeps();
type Case = { input: Record<string, unknown>; response: unknown };
const plan: Record<string, { cases: Case[]; default_mock?: unknown }> = {};
const add = (a: string, input: Record<string, unknown>, response: unknown) => { (plan[a] ??= { cases: [] }).cases.push({ input, response }); };

async function call(op: string, body: Record<string, unknown>) {
  const res = await handle(new Request(`https://f.test/${op}`, { method: "POST", headers: { "content-type": "application/json", "x-mikedai-osc-key": "k" }, body: JSON.stringify(body) }), ctx.deps, env);
  return await res.json();
}

add("mikedai_OSC_SecurityCodeGenerator", {}, { securityCode: MOCK_CODE, smsMessage: verificationSmsText(MOCK_CODE) });
add("mikedai_OSC_RecognizeCaller", { ani: "+12125550102" }, await call("recognizeCaller", { ani: "+12125550102" }));

for (const c of FIXTURE_CLAIMS) {
  const vin = { lastName: c.lastName, zip: c.zip, dob: c.dob, securityCode: MOCK_CODE };
  const v = await call("verifyClaimIdentity", vin);
  add("mikedai_OSC_VerifyClaimIdentity", vin, v);
  if (v.outcome !== "code_sent") continue;
  if (c.scenario === 1) { // wrong code first (scenario: failed OTP then success)
    add("mikedai_OSC_ValidateSecurityCode", { sessionId: v.sessionId, code: "000000" }, await call("validateVerificationCode", { sessionId: v.sessionId, code: "000000" }));
  }
  const ok = await call("validateVerificationCode", { sessionId: v.sessionId, code: MOCK_CODE });
  add("mikedai_OSC_ValidateSecurityCode", { sessionId: v.sessionId, code: MOCK_CODE }, ok);
  add("mikedai_OSC_GetClaimSummary", { verificationToken: ok.verificationToken }, await call("getClaimSummary", { verificationToken: ok.verificationToken }));
  if (c.scenario === 1) {
    for (const kind of ["upload_link", "claim_notice"]) {
      add("mikedai_OSC_SendClaimNotice", { verificationToken: ok.verificationToken, kind }, await call("sendNotice", { verificationToken: ok.verificationToken, kind }));
    }
  }
}

// Scenario 9: details that match nothing behave exactly like a mismatch.
const nf = { lastName: "Nobody", zip: "99999", dob: "1900-01-01", securityCode: MOCK_CODE };
add("mikedai_OSC_VerifyClaimIdentity", nf, await call("verifyClaimIdentity", nf));
// Scenario 10: repeated mismatches lock out (distinct wrong ZIPs so exact-input mocks stay unambiguous).
for (const zip of ["99991", "99992", "99993"]) {
  const i = { lastName: "Smith", zip, dob: "1988-06-23", securityCode: MOCK_CODE };
  add("mikedai_OSC_VerifyClaimIdentity", i, await call("verifyClaimIdentity", i));
}

// Free-text inputs cannot be matched exactly, so these use a default mock.
plan["mikedai_OSC_CreateServiceCase"] = {
  cases: [],
  default_mock: await call("createServiceCase", { reason: "Caller asked for a representative", inquiry: "self", verification: "verified", automationCompleted: "Verified and checked status" }),
};
plan["mikedai_OSC_StartFictionalClaim"] = {
  cases: [],
  default_mock: await call("startClaim", { lastName: "Fictional", zip: "00099", relationship: "self", destination: "demo@example.test", demoAcknowledged: true }),
};

const out = {
  _comment: "LOCAL PLAN ONLY. No mock data actions have been created in the org. Responses were produced by the real backend with a fixed mock security code. replace_mock_responses replaces the whole table, so pass each action's full case list.",
  mockSecurityCode: MOCK_CODE,
  actions: plan,
};
Deno.writeTextFileSync(new URL("../.ava-lifecycle/mikedai_OSC_ClaimAssistant/mock-plan.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.cases.length])));
