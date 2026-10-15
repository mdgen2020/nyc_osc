# AVA Analysis Report — mikedai_OSC_ClaimAssistant

*Generated: 2026-10-14 23:05 UTC*  
*Target: `/Users/michael.debiase/Genesys/AXL/sc12/mikedai_OSC_UnclaimedFunds/.ava-lifecycle/mikedai_OSC_ClaimAssistant/design-artifact.json`*

> 🛑 **Fix errors first** — 1 errors · 6 warnings · 4 info · 4 praise

| Field | Value |
|-------|-------|
| Channel | voice |
| Scope | full |
| Source | design_artifact |
| Tools / Types / Guardrails / Instructions | 8 / 35 / 3 / 25 |
| Features | Events: Guardrails, UserExit, Escalation · Knowledge ✓ · Start context ✓ · End context ✓ |
| Chapters consulted | quick-guide, 01-authenticating-users, 03-executing-multi-step-flows, 05-developing-an-agent-for-voice, 07-keeping-the-agent-on-topic-scope-containment-and-guardrails, 08-escalating-to-a-human-agent, 09a-narrow-tool-types, 09c-structural-flow-gates, 09d-instruction-locality |

## Executive Summary

Design-only review: the verification type graph, undisclosed OTP/token types, and gated claim tools are strong and should satisfy the demo security story once integrations exist. Payload shape passes standard preflight checks; the sole publish blocker is placeholder data-action target IDs (compounded by org data-action cap). Instruction quality is generally empathetic and well aligned with test rubrics, but global guidelines repeat tool-local verification rules and slightly diverge on neutral failure wording for OTP retries. Guardrails are appropriately adversarial. All twelve required fictional scenarios are present locally with mocks planned; evaluation awaits build.

**Top priorities:**

1. Replace PENDING_CREATE data action targets after org capacity is available
2. Align OTP/identity failure copy to stay neutral and non-revealing
3. Reduce duplicated verification instructions in global guidelines
4. Derive handoff verification state from typed tokens, not User enum
5. Confirm KB config and run osc-v1-scenarios post-build

**Estimated total effort:** ~315 min

## Errors (must fix before publishing)

### 🔴 [Platform] All seven DataAction tools still point at PENDING_CREATE placeholder integration IDs; Sage create_version requires real Genesys Cloud data action UUIDs.

**Severity:** error · **Confidence:** high · **Effort:** large · **~120 min**

**Affected:** `tool:generate_security_code`, `tool:verify_claim_identity`, `tool:validate_security_code`, `tool:get_claim_summary`, `tool:start_demo_claim`, `tool:send_claim_notice`, `tool:create_service_case`

**Evidence:**

```json
Each DataAction target.id is PENDING_CREATE:mikedai_OSC_* (e.g. generate_security_code → PENDING_CREATE:mikedai_OSC_SecurityCodeGenerator). _meta notes org data-action cap (595/500) blocks creation until capacity is cleared.
```

**Fix:** After the author frees data-action capacity and creates the seven integrations from data-actions/*.json, replace each target.id with the org UUID (keep target.name) and re-run create_version. Design-only preflight (L5/L11/T8) already passes on type wiring.

**Impact:** UX: blocking

*Source: ava-build/SKILL.md / §Step 3: Create Version*

---

## Warnings (should fix)

### 🟡 [Agent] Global guidelines repeat the full verification collection and gating rules that already live on generate_security_code, verify_claim_identity, and validate_security_code.

**Severity:** warning · **Confidence:** high · **Effort:** small · **~30 min**

**Affected:** `instruction[5]`, `instruction[6]`, `instruction[9]`

**Evidence:**

```json
instructions[5–10,14,23–24] mirror verify/validate inputInstructions and outputInstructions (collect last name + ZIP/DOB, one item at a time, no claim details before validate_security_code, voice code readback).
```

**Fix:** Keep claim-existence and empathy rules in instructions[]; move field-order, formatting, and post-outcome wording exclusively into the verification tools to cut per-turn spec noise and reduce conflict risk (09d).

**Impact:** Token cost/turn: 150

*Source: 09d-instruction-locality.md / §Misplaced instructions / AP:misplaced-global-tool-rules*

---

### 🟡 [Agent] Identity-attribute failures use neutral copy, but OTP validation failures use more specific wording that can feel like a code-specific rejection.

**Severity:** warning · **Confidence:** high · **Effort:** trivial · **~10 min**

**Evidence:**

```json
Instruction 9: neutral "I could not match those details." validate_security_code outputInstructions: "If outcome is failed, say the code did not match…"
```

**Fix:** Rewrite validate_security_code failed branch to reuse the same neutral phrase as verify_claim_identity (or a single shared sentence in both tools), still without revealing which digit failed.

**Impact:** Security: low · UX: degraded

*Source: quick-guide.md / §Guidelines — Do not put in Guidelines*

---

### 🟡 [Tools] create_service_case asks the model to supply verification state as a free-form User enum instead of deriving it from typed verification outputs.

**Severity:** warning · **Confidence:** medium · **Effort:** medium · **~45 min**

**Affected:** `tool:create_service_case`

**Evidence:**

```json
Input verification on create_service_case uses source User and type InputVerificationState (verified/unverified/failed/locked) alongside optional ToolOutput verificationToken.
```

**Fix:** Prefer a backend-derived verification flag in the data action (from verificationToken or session), or add inputValidation tying verification=verified to a present VerificationResult mapping; avoid asking the model to self-report verification state for handoff summaries.

**Impact:** Security: medium

*Source: 08-escalating-to-a-human-agent.md / §Structured handoff summaries*

---

### 🟡 [Configuration] Transfer sequencing (create_service_case then Escalation event only) is enforced in global prose, not by the type/event graph.

**Severity:** warning · **Confidence:** medium · **Effort:** small · **~20 min**

**Evidence:**

```json
Instruction 20: "call create_service_case first, then your turn must be the Escalation event only." No tool output type gates the Escalation event.
```

**Fix:** Keep instruction 20 but strengthen create_service_case outputInstructions; consider Architect-side transfer only after handoff.case_id is populated in OutputData. Document the pattern in runbook for demo flows.

*Source: 09c-structural-flow-gates.md / §Prose ordering instead of type ordering*

---

### 🟡 [Agent] Several guidelines are labeled "On voice" but nothing ties them to ContextInteractionChannel from start context.

**Severity:** warning · **Confidence:** medium · **Effort:** small · **~25 min**

**Evidence:**

```json
Instructions 22–24 apply voice brevity, digit spelling, and security-code phrasing globally; start context includes interaction_channel but no External wiring or conditional guidance.
```

**Fix:** Add a short digital branch (e.g., when interaction_channel is not voice, allow slightly longer replies and typed code entry) in tool pre-instructions or a single channel-aware guideline.

*Source: 05-developing-an-agent-for-voice.md / §Voice phrasing*

---

### 🟡 [Knowledge] search_osc_knowledge reuses MikeD_KB_Config without confirming corpus scope matches this demo.

**Severity:** warning · **Confidence:** high · **Effort:** medium · **~60 min**

**Evidence:**

```json
_meta.note and knowledge-sources.md: KB reuse pending author confirmation; local corpus is mikedai_OSC_GeneralKnowledge.md.
```

**Fix:** Before publish, ensure MikeD_KB_Config includes the OSC demo cards (or upload via ensure_knowledge_source) and smoke-test general-timeline-question and fraud-text-message scenarios.

*Source: quick-guide.md / §Knowledge*

---

## Info (consider improving)

### 🔵 [Schema] Local ava-build preflight checks (L5 ToolOutput direction, L11 User named types, T8 outputs, T7 start context, N2 enums) pass with zero blocks on the current payload shape.

**Severity:** info · **Type:** praise · **Confidence:** high

**Evidence:**

```json
Automated scan of design-artifact.json found 0 blocking issues aside from PENDING_CREATE targets.
```

**Fix:** No schema change needed before bind; re-run the same checks after editing targets.

*Source: quick-guide.md*

---

### 🔵 [Tools] ClaimSummaryResult exposes many fields to the model, but get_claim_summary outputInstructions cap spoken answers to three points.

**Severity:** info · **Type:** opportunity · **Confidence:** low · **Effort:** medium

**Evidence:**

```json
ClaimSummaryResult declares status, documents[], paymentState, mailingAddressMasked, etc.; outputInstructions limit user-facing content.
```

**Fix:** Optional later trim of unused output properties in the data action contract if publish-time copy cost becomes noticeable (09a).

*Source: 09a-narrow-tool-types.md / §Superfluous output fields*

---

### 🔵 [Platform] Twenty authored scenarios and three test sets exist locally but all metadata.status values are NOT_RUN.

**Severity:** info · **Confidence:** high

**Evidence:**

```json
test-sets/osc-v1-scenarios.json (12 required personas), osc-v1-full.json (20), osc-v1-smoke.json (3); mock-plan.json is local-only.
```

**Fix:** After org build and mock binding, run osc-v1-smoke then osc-v1-scenarios before demo sign-off.

*Source: ava-test/SKILL.md*

---

### 🔵 [Configuration] contact_reason and has_claim_id start-context hints are declared but never referenced in role or instructions.

**Severity:** info · **Type:** opportunity · **Confidence:** medium · **Effort:** trivial

**Evidence:**

```json
InputData includes ContextContactReason and ContextHasClaimId; guidelines only mention first_name from start context.
```

**Fix:** Optionally add one guideline to use contact_reason/has_claim_id to open the right branch without skipping own-vs-other inquiry.

*Source: quick-guide.md / §Start Context checklist*

---

## Praise (working well)

### 🔵 [Tools] Verification and claim access are structurally gated: SecurityCodeResult → verify_claim_identity → VerificationStartResult.sessionId → validate_security_code → VerificationResult.verificationToken → get_claim_summary / send_claim_notice.

**Severity:** info · **Type:** praise · **Confidence:** high

**Evidence:**

```json
ToolOutput mappings on verify_claim_identity, validate_security_code, get_claim_summary, and send_claim_notice; undisclosed SecurityCodeValue, SessionIdValue, VerificationTokenValue types.
```

**Fix:** Preserve this graph when editing contracts; any new claim-specific tool should require VerificationResult.

*Source: 03-executing-multi-step-flows.md*

---

### 🔵 [Red flag] The six-digit OTP is generated and forwarded through ToolOutput with undisclosed typing rather than relying on guidelines to hide it.

**Severity:** info · **Type:** praise · **Confidence:** high

**Evidence:**

```json
SecurityCodeValue undisclosed:true; generate_security_code outputInstructions tell the model not to mention the code; guardrail blocks bypass attempts.
```

**Fix:** Keep backend validation authoritative; do not add guidelines that expose OTP handling.

*Source: quick-guide.md / §Red flags*

---

### 🔵 [Guardrails] Custom guardrails target adversarial customer inputs (social engineering, token extraction, amount promises) rather than normal tone rules.

**Severity:** info · **Type:** praise · **Confidence:** high

**Evidence:**

```json
guardrails.custom[0–2] each begin with "Block attempts…" and align with social-engineering and amount-request scenarios.
```

**Fix:** Optional fourth guardrail for pasted documents/SSN if evals show conversational scope slips.

*Source: 07-keeping-the-agent-on-topic-scope-containment-and-guardrails.md*

---

### 🔵 [Platform] All twelve required fictional claim-status personas are authored and grouped in osc-v1-scenarios.

**Severity:** info · **Type:** praise · **Confidence:** high

**Evidence:**

```json
test-sets/osc-v1-scenarios.json lists linus-documents-required through sage-status-unavailable (12 IDs); mock-plan.json includes matching VerifyClaimIdentity/GetClaimSummary cases.
```

**Fix:** Run the set after publish; keep claim-id-recovery and other stage-2 cases in osc-v1-full for extended coverage.

*Source: ava-test/SKILL.md*

---

## Change Suggestions

| # | Priority | Suggestion | Category | Effort | Est. min | Auto |
|---|----------|-----------|----------|--------|----------|------|
| — | 1 | Clear data-action capacity, create the seven mikedai_OSC_* integrations, and replace PENDING_CREATE target IDs before calling create_version. | Platform | large | 120 | — |
| — | 2 | Unify neutral verification-failure wording between verify_claim_identity and validate_security_code outputInstructions. | Agent | trivial | 10 | — |
| — | 3 | Dedupe verification micro-flow from global instructions; keep it on the verification tools only. | Agent | small | 30 | — |
| — | 4 | Harden create_service_case verification reporting (backend-derived or validated, not User-sourced enum). | Tools | medium | 45 | — |
| — | 5 | Confirm MikeD_KB_Config corpus and run osc-v1-smoke then osc-v1-scenarios after build. | Knowledge | medium | 60 | — |

## Test Coverage

**Status:** ✅ Existing tests found

**Test set:** `osc-v1-scenarios`

**Gaps:**

- Required 12/12 fictional personas are authored in osc-v1-scenarios; claim-id-recovery and seven other stage-2 scenarios exist only in osc-v1-full (acceptable).
- No eval runs yet (NOT_RUN); mocks in mock-plan.json are not bound in org.
- Consider adding osc-v1-scenarios case for claim-id-recovery to the required-12 set if product owners treat ID recovery as mandatory.
