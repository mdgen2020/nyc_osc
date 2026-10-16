// Tool-contract tests for the narrow Genesys Data Actions: each action's example input must satisfy its declared
// input schema, and the REAL backend response (called at the action's fixed URL path) must exactly match its declared
// output schema. Run: deno test --allow-read --allow-env --allow-net tests/backend
import AjvModule from "npm:ajv@8";
// deno-lint-ignore no-explicit-any
const Ajv = (AjvModule as any).default ?? AjvModule;
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { makeDemoDeps } from "../../supabase/functions/_shared/mikedai_OSC_memory_store.ts";
import { GENESYS_OUTPUT_KEYS, handle } from "../../supabase/functions/mikedai_OSC_claim_ops/handler.ts";
import { POLICY, PRODUCTION_POLICY } from "../../supabase/functions/_shared/mikedai_OSC_types.ts";

// The deployed service runs the relaxed DEMO_POLICY. These tests prove the lockout logic, so they pin the production values.
Object.assign(POLICY, PRODUCTION_POLICY);

const NAMES = [
  "SecurityCodeGenerator", "RecognizeCaller", "VerifyClaimIdentity", "ValidateSecurityCode",
  "GetClaimSummary", "StartFictionalClaim", "SendClaimNotice", "CreateServiceCase",
];
const ajv = new Ajv({ allErrors: true, strict: false });
// deno-lint-ignore no-explicit-any
const actions: Record<string, any> = {};
for (const n of NAMES) {
  const c = JSON.parse(Deno.readTextFileSync(new URL(`../../data-actions/mikedai_OSC_${n}.json`, import.meta.url)));
  actions[c.config.request.requestUrlTemplate.split("/").pop()] = {
    c, vin: ajv.compile(c.contract.input.inputSchema), vout: ajv.compile(c.contract.output.successSchema),
  };
}

const env = { sharedKey: "k", allowedOrigins: [], demoRevealCode: true };
const G = { "x-mikedai-osc-key": "k" };
type Ctx = Awaited<ReturnType<typeof makeDemoDeps>>;
/** Calls the backend exactly the way the Data Action does: fixed path, flat body, no "operation" field. */
async function call(ctx: Ctx, op: string, body: Record<string, unknown>) {
  const a = actions[op];
  assert(a, `no contract for ${op}`);
  assert(a.vin(body), `${op} input does not match declared schema: ${JSON.stringify(a.vin.errors)}`);
  const res = await handle(new Request(`https://f.test/functions/v1/mikedai_OSC_claim_ops/${op}`, { method: "POST", headers: { "content-type": "application/json", ...G }, body: JSON.stringify(body) }), ctx.deps, env);
  const out = await res.json();
  assert(a.vout(out), `${op} output does not match declared schema: ${JSON.stringify(a.vout.errors)} :: ${JSON.stringify(out)}`);
  return out;
}
const genBoth = async (ctx: Ctx) => { const g = await call(ctx, "generateSecurityCode", {}); return { hidden: g.securityCode as string, delivered: String(g.smsMessage).match(/\b\d{6}\b/)![0] }; };
const gen = async (ctx: Ctx) => (await call(ctx, "generateSecurityCode", {})).securityCode as string;

Deno.test("contracts: eight narrow actions, prefixed, no secrets, no operation switch", () => {
  assertEquals(Object.keys(actions).length, 8);
  for (const { c } of Object.values(actions)) {
    assert(c.name.startsWith("mikedai_OSC_"));
    assert(c.integrationName.startsWith("mikedai_OSC_"));
    assertFalse(/eyJ|sb_secret|sb_publishable|service_role/i.test(JSON.stringify(c)));
    assert(c.config.request.headers["x-mikedai-osc-key"].startsWith("${credentials."));
    assertFalse("operation" in c.contract.input.inputSchema.properties, "no operation switch is exposed");
    assertEquals(c.contract.input.inputSchema.additionalProperties, false);
    assertEquals(c.contract.output.successSchema.additionalProperties, false);
  }
  assertEquals(actions.generateSecurityCode.c.contract.input.inputSchema.properties, {});
});

Deno.test("contracts: declared output properties are exactly the handler's allow-list (no drift)", () => {
  for (const [op, keys] of Object.entries(GENESYS_OUTPUT_KEYS)) {
    assertEquals(Object.keys(actions[op].c.contract.output.successSchema.properties).sort(), [...keys].sort(), op);
  }
});

Deno.test("contracts: tool-binding limit: every action has at most 6 declared inputs and no secret-bearing field names", () => {
  for (const { c } of Object.values(actions)) {
    const props = Object.keys(c.contract.input.inputSchema.properties);
    assert(props.length <= 6);
    assertFalse(props.some((p) => /password|secret|ssn|otp/i.test(p)));
  }
});

Deno.test("contract: generator output is exactly six digits and matches the declared schema", async () => {
  const ctx = await makeDemoDeps();
  const { vout } = actions.generateSecurityCode;
  for (let i = 0; i < 500; i++) {
    const securityCode = await gen(ctx);
    assertEquals(securityCode.length, 6);
  }
  assertFalse(vout({ securityCode: "12345", smsMessage: "x" }));
  assertFalse(vout({ securityCode: 123456, smsMessage: "x" }));
  assertFalse(vout({ securityCode: "1234567", smsMessage: "x" }));
  assertFalse(vout({ securityCode: "123456" })); // smsMessage is required
});

Deno.test("contract: generator also returns the complete SMS body for the Agentless SMS action", async () => {
  const ctx = await makeDemoDeps();
  const { vout } = actions.generateSecurityCode;
  for (let i = 0; i < 50; i++) {
    const out = await call(ctx, "generateSecurityCode", {});
    assertEquals(Object.keys(out).sort(), ["securityCode", "smsMessage"]); // allow-list: nothing else reaches Genesys
    assert(vout(out));
    assert(/\b\d{6}\b/.test(out.smsMessage), "the SMS carries a six digit code");
    assertFalse(out.smsMessage.includes(out.securityCode), "the hidden value is not what the caller receives");
    assert(out.smsMessage.length <= 160, "fits one SMS segment");
    assertFalse(/https?:|www\./i.test(out.smsMessage), "no links in the verification text");
    assertFalse(/DEMO-\d|@/.test(out.smsMessage), "no claim data or contact details in the verification text");
  }
});

Deno.test("contract: full journey through the real actions (voice path for Linus Smith, ZIP 10305)", async () => {
  const ctx = await makeDemoDeps();
  const rec = await call(ctx, "recognizeCaller", { ani: "+12125550102" });
  assertEquals(rec, { recognized: true, firstName: "Linus" });
  assertEquals(await call(ctx, "recognizeCaller", { ani: "anonymous" }), { recognized: false });

  const { hidden: code, delivered } = await genBoth(ctx);
  const v1 = await call(ctx, "verifyClaimIdentity", { lastName: "Smith", zip: "10305", dob: "1988-06-23", securityCode: code });
  assertEquals(v1.outcome, "code_sent");
  assertFalse(JSON.stringify(v1).includes(code) || JSON.stringify(v1).includes(delivered), "the code is never returned");
  const bad = await call(ctx, "validateVerificationCode", { sessionId: v1.sessionId, code: delivered === "000000" ? "000001" : "000000" });
  assertEquals(bad.outcome, "failed");
  const ok = await call(ctx, "validateVerificationCode", { sessionId: v1.sessionId, code: delivered });
  assertEquals(ok.outcome, "verified");
  const t = ok.verificationToken;

  const sum = await call(ctx, "getClaimSummary", { verificationToken: t });
  assertEquals(sum.status, "documents_required");
  assertEquals(sum.furtherActionNeeded, true);
  assert(sum.documents.some((d: { category: string }) => d.category === "proof_old_address"));
  assertFalse("amount" in sum);
  assertEquals((await call(ctx, "sendNotice", { verificationToken: t, kind: "upload_link" })).deliverySimulated, true);
  assertEquals((await call(ctx, "sendNotice", { verificationToken: t, kind: "claim_notice" })).ok, true);
  const sc = await call(ctx, "createServiceCase", { verificationToken: t, reason: "Claimant requested an agent", inquiry: "self", verification: "verified", automationCompleted: "Verified and checked status" });
  assertEquals(sc.queueId, "dc15ad2c-7917-413f-9a00-4f52df4d4602");
  assertFalse(/Smith|10305|1988-06-23|DEMO-200001/.test(sc.summary), "summary has no PII or full Claim ID");
  assert(/Verification: verified/.test(sc.summary));

  // error shapes also conform
  const forged = await call(ctx, "getClaimSummary", { verificationToken: "forged" });
  assertEquals(forged.ok, false);
  assertEquals((await call(ctx, "sendNotice", { verificationToken: "forged", kind: "upload_link" })).ok, false);
});

Deno.test("contract: start claim (fictional) conforms and is never submitted to OSC", async () => {
  const ctx = await makeDemoDeps();
  const r = await call(ctx, "startClaim", { lastName: "Fictional", zip: "00099", relationship: "estate", destination: "x@example.test", demoAcknowledged: true });
  assertEquals(r.ok, true);
  assertEquals(r.submittedToOsc, false);
  assertEquals(r.escalationRecommended, true);
  assertEquals((await call(ctx, "startClaim", { lastName: "F", zip: "1", relationship: "self", destination: "x@example.test", demoAcknowledged: false })).error, "DEMO_ACK_REQUIRED");
  // a claim started without a DOB can still be verified with last name + ZIP
  const code = await gen(ctx);
  assertEquals((await call(ctx, "verifyClaimIdentity", { claimId: r.claimId, lastName: "Fictional", zip: "00099", securityCode: code })).outcome, "code_sent");
});

Deno.test("contract: payment fields (optional) conform for a mailed check; no Claim ID needed", async () => {
  const ctx = await makeDemoDeps();
  const { hidden, delivered } = await genBoth(ctx);
  const v = await call(ctx, "verifyClaimIdentity", { lastName: "Smith", zip: "12201", dob: "1988-06-23", securityCode: hidden });
  assertEquals(v.outcome, "code_sent");
  const t = (await call(ctx, "validateVerificationCode", { sessionId: v.sessionId, code: delivered })).verificationToken;
  const p = await call(ctx, "getClaimSummary", { verificationToken: t });
  assertEquals(p.paymentState, "check_mailed");
  assertEquals(p.mailedOn, "2026-10-05");
});

Deno.test("security: attribute lockout is claim-scoped; a new session (or omitted sessionId) cannot reset it", async () => {
  const ctx = await makeDemoDeps();
  const wrong = { claimId: "DEMO-200001", lastName: "Wrong", zip: "99999" };
  const outcomes: string[] = [];
  for (let i = 0; i < 3; i++) outcomes.push((await call(ctx, "verifyClaimIdentity", { ...wrong, securityCode: await gen(ctx) })).outcome);
  assertEquals(outcomes, ["failed", "failed", "locked"]);
  // correct attributes, fresh session: still locked
  const r = await call(ctx, "verifyClaimIdentity", { claimId: "DEMO-200001", lastName: "Smith", zip: "10305", securityCode: await gen(ctx) });
  assertEquals(r.outcome, "locked");
  assertEquals(r.humanHelpRecommended, true);
  // the same neutral behavior for a Claim ID that does not exist (no enumeration)
  const ghost = [];
  for (let i = 0; i < 3; i++) ghost.push((await call(ctx, "verifyClaimIdentity", { claimId: "DEMO-999999", lastName: "Wrong", zip: "1", securityCode: await gen(ctx) })).outcome);
  assertEquals(ghost, ["failed", "failed", "locked"]);
});

Deno.test("security: resend throttle and limit are claim-scoped (cannot be bypassed without a sessionId)", async () => {
  const ctx = await makeDemoDeps();
  const attrs = { lastName: "Smith", zip: "10305", dob: "1988-06-23" };
  assertEquals((await call(ctx, "verifyClaimIdentity", { ...attrs, securityCode: await gen(ctx) })).outcome, "code_sent");
  assertEquals((await call(ctx, "verifyClaimIdentity", { ...attrs, securityCode: await gen(ctx) })).outcome, "throttled");
  for (let i = 0; i < 2; i++) { // sends 2 and 3 (1 + maxResends) are allowed once the throttle window passes
    ctx.advance(31_000);
    assertEquals((await call(ctx, "verifyClaimIdentity", { ...attrs, securityCode: await gen(ctx) })).outcome, "code_sent");
  }
  ctx.advance(31_000);
  const over = await call(ctx, "verifyClaimIdentity", { ...attrs, securityCode: await gen(ctx) });
  assertEquals(over.outcome, "throttled");
  assertEquals(over.humanHelpRecommended, true);
});

Deno.test("contract: undeclared fields and malformed inputs are rejected by the declared input schemas", () => {
  assertFalse(actions.getClaimSummary.vin({ verificationToken: "t", extra: 1 }));
  assertFalse(actions.validateVerificationCode.vin({ sessionId: "s", code: "12345" }));
  assertFalse(actions.verifyClaimIdentity.vin({ lastName: "x", securityCode: "12ab56" }));
  assertFalse(actions.sendNotice.vin({ verificationToken: "t", kind: "bulk_export" }));
  assertFalse(actions.createServiceCase.vin({ reason: "r", inquiry: "self", verification: "maybe" }));
});

Deno.test("security: a handoff cannot claim verified without a valid token (state is backend-derived)", async () => {
  const ctx = await makeDemoDeps();
  const forged = await call(ctx, "createServiceCase", { reason: "Wants an agent", inquiry: "self", verification: "verified" });
  assert(/Verification: unverified/.test(forged.summary), forged.summary);
  const bad = await call(ctx, "createServiceCase", { verificationToken: "forged", reason: "Wants an agent", inquiry: "self", verification: "verified" });
  assert(/Verification: unverified/.test(bad.summary), bad.summary);
});

Deno.test("AVA output types exactly match the data action output contracts (names, primitives, arrays, required)", () => {
  const art = JSON.parse(Deno.readTextFileSync(new URL("../../.ava-lifecycle/mikedai_OSC_ClaimAssistant/design-artifact.json", import.meta.url)));
  // deno-lint-ignore no-explicit-any
  const T: Record<string, any> = Object.fromEntries(art.types.map((t: { name: string }) => [t.name, t]));
  const prim = (name: string): string => (T[name] && T[name].type !== "object" && T[name].type !== "array" ? T[name].type : name);
  // deno-lint-ignore no-explicit-any
  const tools = art.tools.filter((t: any) => t.type === "DataAction" && String(t.target.name).startsWith("mikedai_OSC_"));
  assertEquals(tools.length, 7); // the reused Agentless SMS action has its own test below
  for (const tool of tools) {
    const op = tool.target.name.replace("mikedai_OSC_", "");
    const action = Object.values(actions).find((a) => a.c.name === tool.target.name)!;
    const schema = action.c.contract.output.successSchema;
    const ot = T[tool.output];
    assertEquals(ot.direction, "output");
    // every property the AVA declares exists in the contract with the same primitive type
    for (const p of ot.properties) {
      const cp = schema.properties[p.name];
      assert(cp, `${op}: AVA property ${p.name} is not in the contract`);
      if (p.type === "array") {
        assertEquals(cp.type, "array");
        // deno-lint-ignore no-explicit-any
        const itemProps = T[p.items].properties.map((x: any) => x.name).sort();
        assertEquals(itemProps, Object.keys(cp.items.properties).sort(), `${op}: array item shape`);
      } else {
        assertEquals(prim(p.type), cp.type, `${op}.${p.name}: primitive type`);
      }
      assertEquals(!!p.required, schema.required.includes(p.name) || !!p.required && schema.required.includes(p.name), `${op}.${p.name}: required flag`);
    }
    // required-in-contract fields must be required in the AVA type
    for (const r of schema.required) assert(ot.properties.some((p: { name: string; required: boolean }) => p.name === r && p.required), `${op}: contract-required ${r} must be required in the AVA type`);
    // tool inputs reference real contract inputs, and ToolOutput mappings point at real output fields
    for (const i of tool.inputs) assert(i.targetName in action.c.contract.input.inputSchema.properties, `${op}: input ${i.targetName}`);
  }
  // opaque values are never declared as disclosed
  for (const n of ["SecurityCodeValue", "SecurityCodeMessageValue", "SessionIdValue", "VerificationTokenValue"]) assertEquals(T[n].undisclosed, true);
});

Deno.test("voice SMS: send_verification_text reuses the existing Agentless SMS action and never exposes the code or the number", () => {
  const art = JSON.parse(Deno.readTextFileSync(new URL("../../.ava-lifecycle/mikedai_OSC_ClaimAssistant/design-artifact.json", import.meta.url)));
  // deno-lint-ignore no-explicit-any
  const T: Record<string, any> = Object.fromEntries(art.types.map((t: { name: string }) => [t.name, t]));
  // deno-lint-ignore no-explicit-any
  const tool = art.tools.find((t: any) => t.name === "send_verification_text");
  assert(tool, "tool exists");
  // reused unchanged, by its real id; not a new action (no data action capacity needed)
  assertEquals(tool.target.id, "custom_-_cd38af67-d58b-4eb5-abc9-3f8c055ddf58");
  assertEquals(tool.target.name, "Agentless SMS - MikeD");
  assert(!art._meta.pending_data_actions.includes("Agentless SMS - MikeD"));
  // input names match the existing action's schema exactly
  const schemaProps = Object.keys(tool.schemas.inputs.properties).sort();
  assertEquals(schemaProps, ["MessageContent", "PhoneNumber"]);
  assertEquals(tool.inputs.map((i: { targetName: string }) => i.targetName).sort(), schemaProps);
  // number: Architect-supplied start context (External, never a User source). The existing action REQUIRES PhoneNumber and the
  // platform then requires fallbackToUser=true, so the controls are instruction + guardrail text (asserted below).
  const phone = tool.inputs.find((i: { targetName: string }) => i.targetName === "PhoneNumber");
  assertEquals(phone.source, "External");
  assertEquals(phone.type, "ContextCallerNumber");
  assertEquals(phone.required, true);   // matches the existing action's schema ("required": ["PhoneNumber"])
  assertEquals(phone.fallbackToUser, true); // forced by the platform for a required External input
  assert(tool.inputInstructions.join(" ").includes("never accept or use a number the caller says"));
  assert(tool.inputInstructions.join(" ").includes("do not call this tool"));
  assert(art.guardrails.custom.some((g: { instruction: string }) => /other than the one this assistant already has/.test(g.instruction)));
  assertEquals(tool.inputs.find((i: { targetName: string }) => i.targetName === "MessageContent").required, false); // optional in the existing action
  assert(art.types.find((t: { name: string }) => t.name === "InputData").properties.some((p: { name: string; type: string }) => p.name === "caller_number" && p.type === "ContextCallerNumber"));
  assertEquals(T.ContextCallerNumber.userUtteranceSubstring, false);
  // body: the server-built message, mapped tool-to-tool from a hidden output; the model never composes or sees the code
  const msg = tool.inputs.find((i: { targetName: string }) => i.targetName === "MessageContent");
  assertEquals(msg.source, "ToolOutput");
  assertEquals(msg.mapping, ["SecurityCodeResult", "smsMessage"]);
  assertEquals(T.SecurityCodeMessageValue.undisclosed, true);
  // the number and the code appear in no other tool's inputs or outputs
  // deno-lint-ignore no-explicit-any
  for (const t of art.tools.filter((x: any) => x.type === "DataAction" && x.name !== "send_verification_text")) {
    assertFalse(t.inputs.some((i: { type: string }) => i.type === "ContextCallerNumber"), `${t.name} must not receive the caller number`);
  }
});

Deno.test("voice SMS: Architect passes the caller's number to the AVA on voice only, never on digital, and never writes it to a literal", () => {
  const voice = Deno.readTextFileSync(new URL("../../archy/mikedai_OSC_VoiceBotFlow.yaml", import.meta.url));
  const digital = Deno.readTextFileSync(new URL("../../archy/mikedai_OSC_DigitalBotFlow.yaml", import.meta.url));
  const entry = Deno.readTextFileSync(new URL("../../archy/mikedai_OSC_VoiceClaimFlow.yaml", import.meta.url));
  assert(/caller_number:\s*\n\s*exp: Flow\.CallerNumber/.test(voice));
  assert(/caller_number:\s*\n\s*noValue: true/.test(digital));
  assert(/Flow\.CallerNumber:\s*\n\s*exp: Replace\(Call\.Ani, "tel:", ""\)/.test(entry));
  for (const y of [voice, digital, entry]) assertFalse(/\+?\d{10,}/.test(y.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "")), "no phone number literal in any flow");
});

