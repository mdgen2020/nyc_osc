# Test plan and results

Run date: 2026-10-14. **Automated: 47 backend tests and 19 website tests pass. Conversational tests are authored but NOT RUN.** A "pass" below means the named automated test ran and passed, not that the deployed system works.

```bash
deno test --allow-read --allow-env --allow-net tests/backend   # 47 passed, 0 failed
cd web && npm test                                              # 19 passed
cd web && VITE_BASE=/mikedai_OSC_UnclaimedFunds_Demo/ npm run build   # production build OK
deno check supabase/functions/mikedai_OSC_claim_ops/index.ts    # type-check OK
```

## The 30 required tests

Status key: **PASS** = automated and green; **AUTHORED / NOT RUN** = scenario exists in `.ava-lifecycle/mikedai_OSC_ClaimAssistant/test-cases/` but needs the deployed AVA; **PARTIAL** = part is automated.

| # | Required test | Status | Where |
|---|---|---|---|
| 1 | Recognized caller, own claim | PASS (recognition, backend) + AUTHORED (conversation) | `1/2/3 caller recognition...`, `linus-documents-required` |
| 2 | Recognized caller, deceased person's claim | PASS (backend path escalates) + AUTHORED | `14 deceased-owner...`, `orla-estate-escalation` |
| 3 | Unrecognized caller completes verification | PASS (backend) + AUTHORED | contract journey, `claim-id-recovery` |
| 4 | Digital visitor via website | PASS | web: home, start form, local chat |
| 5 | Exactly six-digit code | PASS | 20,000-sample test plus 500-sample contract test |
| 6 | Successful verification | PASS | `6 successful verification...` |
| 7 | Failed OTP then success | PASS + AUTHORED | `7 failed OTP...`, `wrong-code-then-correct` |
| 8 | Verification lockout | PASS + AUTHORED | code lockout, claim-scoped attribute lockout, `pip-lockout` |
| 9 | Claim not found, no enumeration | PASS + AUTHORED | `9/10 claim not found...`, `claim-not-found` |
| 10 | Claim-status resolution | PASS | `12 status resolution for each status scenario` |
| 11 | Documentation-required journey | PASS | `13 documentation-required journey...` |
| 12 | Documents-received journey | PASS | `13 documents received / under review...` |
| 13 | Approved / check-mailed journey | PASS | `13 approved / check preparing / check mailed...` |
| 14 | Deceased-owner escalation | PASS (backend) + AUTHORED | as #2 |
| 15 | Tool timeout and retry | PASS | `15 tool timeout...` (bounded retry, safe degradation) |
| 16 | Claim amount requested before verification | PASS (no amount ever returned; protected data needs a token) + AUTHORED (`amount-request`) | `10/16 protected data...` |
| 17 | Human-agent request | PASS (website) + AUTHORED | `17/21 human request...`, `orla`, `juno` |
| 18 | Social-engineering attempt | PASS (a token unlocks only its own claim) + AUTHORED | `18 social engineering...`, `social-engineering` |
| 19 | Empathy for grief | PASS (website responder) + AUTHORED | `responds to grief without cheer`, `orla-estate-escalation` |
| 20 | Empathy for frustration | PASS (website responder) + AUTHORED | `responds to frustration...`, `juno-check-not-received` |
| 21 | Secure sanitized transfer summary | PASS | `21-23 summaries are sanitized...`, handoff cannot claim verified without a token |
| 22 | Contained-session summary | **NOT RUN** (platform summarization on a deployed bot flow) | flags set in Archy YAML only |
| 23 | Transferred-session summary | PARTIAL: our sanitized summary is tested; the platform summary is NOT RUN | |
| 24 | Appropriate wrap-up code assignment | **NOT RUN, and blocked**: only 4 of 16 queue codes are usable | [`wrapup-code-mapping.md`](wrapup-code-mapping.md) |
| 25 | Closed or unavailable queue behavior | **NOT RUN** (needs the deployed flow and a closed-queue condition). Flow error handling routes to the queue; no custom closed-queue message is authored yet | |
| 26 | SharePoint-backed retrieval | **NOT RUN** (knowledge is not uploaded). Cards pass strict local validation (0 fail, 0 warn) | `fraud-text-message`, `general-timeline-question` authored |
| 27 | Mobile and keyboard accessibility | PARTIAL: axe (no violations on 5 pages), keyboard order, accessible names, WCAG contrast, mobile CSS and viewport meta in jsdom. **No real-device or Playwright run** | `web/tests/site.test.tsx` |
| 28 | GitHub Pages production build | PASS locally (`VITE_BASE=/...`). The deployed Pages workflow has NOT run | |
| 29 | Supabase Row Level Security | PASS in an in-process Postgres (PGlite): RLS on, anon/authenticated denied. **Not verified on the real project** | `migration_rls.test.ts` |
| 30 | Verification values absent from logs and summaries | PASS | `30 verification values are absent...` |

**Tool contracts:** responses exactly match declared Data Action output schemas, and AVA output types match those contracts (names, primitives, arrays, required flags).

## Authored conversational set (NOT RUN)

20 scenarios in `.ava-lifecycle/mikedai_OSC_ClaimAssistant/test-cases/`, grouped as `osc-v1-smoke` (3), `osc-v1-scenarios` (the 12 required fictional scenarios) and `osc-v1-full` (all 20). Each has a reference trajectory and a rubric covering goal, tool use, guardrail and tone/format. Deterministic mock responses for the data actions were exported from the real backend into `mock-plan.json`; the mock data actions themselves are **not created** (creating them writes to the org and consumes data action capacity).

Run order after approval and build: smoke, then scenarios, then full.

## Known gaps

`PgStore` against a live database; real-device mobile testing; platform summaries and wrap-up behavior; closed-queue behavior; SharePoint retrieval; every conversational test.
