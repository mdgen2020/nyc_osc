# External preflight (consolidated, awaiting your approval)

**Phase 1 is complete. No external write of any kind has been made.** Nothing below happens until you explicitly approve it, and approving one operation does not approve any other. Nothing is reported as done unless it is done.

Date: 2026-10-14. Unofficial demo, fictional data only.

## 1. Decisions captured from you

| Topic | Decision |
|---|---|
| Local location | Self-contained `mikedai_OSC_UnclaimedFunds/`; nothing outside it modified |
| GitHub | New repo `mdgen2020/mikedai_OSC_UnclaimedFunds_Demo` (not created; existing repos untouched) |
| Voice entry | You repoint a DID **or** call the flow from another flow (manual, on existing assets, not done by me) |
| ANI | Your test number maps to persona **Linus**; never committed; only a keyed hash is seeded after approval |
| Language | English only |

## 2. Genesys Cloud target

| Item | Value |
|---|---|
| Org | `GenesysSC12` |
| Org ID | `b1aefa00-9ebc-413b-bacf-1039f14d11be` |
| Region | `prod` (`api.mypurecloud.com`) |
| Division | `Home` |

## 3. Assets to reuse, unchanged

| Asset | ID | Verdict |
|---|---|---|
| Queue `support_miked` | `dc15ad2c-7917-413f-9a00-4f52df4d4602` | Reused. **Please confirm the name:** the live name is `Support_MikeD` (case differs). Flows use the name; a read-only lookup resolved it |
| Knowledge source `Miked_SharePT` | `93cb697a-ec20-4ad5-8740-80498e098fd9` | Reused. SharePoint, manual trigger |
| Knowledge Setting `MikeD_KB_Config` | `6b16df4b-37fb-4ac5-ba06-a9d2319724d3` | **Recommended reuse** (bound only to `Miked_SharePT`, answer generation on, stateful, en-US). Alternatives: `Miked_SharePT_Setting` `fef2cae9-41ab-46da-be67-e95203808eb4`, `miked_mv_KB` `048d8a14-e178-4301-beb6-499a71dacb09`. The shared library also holds other demos' content regardless of setting. If you prefer, I propose `mikedai_OSC_GeneralKnowledgeSetting` instead |
| `miked_SecurityCodeGenerator` | `753dd321-a959-40c9-92f3-ebe5e65b1f77` | **Not reusable** (cannot guarantee `^[0-9]{6}$`). Left unchanged; a new action is proposed |

## 4. New assets proposed

| Asset | Type | Notes |
|---|---|---|
| `mikedai_OSC_SupabaseWebServices` | Web Services integration | Credentials entered by **you** in Admin. Integration count vs `actions.integration.max` (100) not yet checked |
| 8 data actions | See `docs/data-actions.md` | `SecurityCodeGenerator`, `RecognizeCaller`, `VerifyClaimIdentity`, `ValidateSecurityCode`, `GetClaimSummary`, `StartFictionalClaim`, `SendClaimNotice`, `CreateServiceCase` |
| `mikedai_OSC_ClaimAssistant` | AVA | `agents.max` is 400; current usage not checked |
| `mikedai_OSC_VoiceBotFlow`, `_VoiceClaimFlow`, `_DigitalBotFlow`, `_DigitalClaimFlow` | Architect flows | Summarization and wrap-up assignment on both bot flows |
| `MikeD_Summary_Config` (existing, reused unchanged) | Summary setting | Author chose reuse (2026-10-14). Read-only check done: exists, `maskPII` all off, so the summary is not masked by the platform (see `genesys-cloud-setup.md`) |
| `mikedai_OSC_Messenger` | Web Messaging deployment | Routed to the digital flow |

## 5. Blockers (nothing here is "fixed" by deleting anything)

1. **Data action capacity.** `actions.total.max` = **500**, current usage = **595** (95 over). New actions needed: **8**. You would need to clear **103** (595 + 8 - 500) for me to create them. If you also want mock data actions for evaluation, up to **7 more**. Whether Genesys rejects creates for an org already over its cap is unconfirmed. I will not delete anything, and I am not recommending any asset for deletion; if you want a read-only capacity analysis, ask separately.
2. **Wrap-up codes.** Only 4 of the queue's 16 codes fit (Claim Assistance, Documentation Request, Transfer, FAQs Only). 16 of 20 OSC outcomes have no usable code. The queue's associations are immutable here, so any new code would be unusable by the queue. **No new codes proposed.** Full table: `docs/wrapup-code-mapping.md`.
3. **SharePoint location unresolved.** `Miked_SharePT` exposes Graph site and folder IDs only. The site is `genesyslab.sharepoint.com` (`sites/genesyslab.sharepoint.com,0da9609d-…,e192a797-…`); the library and folder names need Microsoft Graph access I do not have. Upload must be manual by you. Target filename: `mikedai_OSC_GeneralKnowledge.md`.
4. **Voice code delivery is undecided** (see section 9, decision 1). Without it a caller on voice has nowhere to read the code from.
5. **Digital Messenger attribute mapping unverified** (`docs/genesys-cloud-setup.md`).

## 6. Wrap-up codes

Selected (existing, on the queue): Claim Assistance `9c2f2957-c122-4040-b3a6-5e8f55dff4ac`, Documentation Request `3fe746f5-a028-487d-9c83-931907af855d`, Transfer `4a529566-e3d4-4d6d-80d0-aa7dfc726a0f`, FAQs Only `0466a272-a014-4786-ba7b-83932cc7d940`. **New: none.** I will not modify the queue or its associations.

## 7. Supabase

Project `ogfrsveuxbpyfseldkgx` (`https://ogfrsveuxbpyfseldkgx.supabase.co`) only.

Read-only discovery (2026-10-14): **no tables** in `public` or `mikedai_OSC_core`, **no Edge Functions**, **no migrations**. Other schemas were not inspected. So there are no name collisions in what was checked.

To create (all additive, idempotent): schema `"mikedai_OSC_core"` with 14 tables, RLS on every table with no policies and `anon`/`authenticated` revoked; fictional seed; Edge Function `mikedai_OSC_claim_ops`. Nothing existing is altered.

## 8. GitHub

| Item | Value |
|---|---|
| Repo (new) | `mdgen2020/mikedai_OSC_UnclaimedFunds_Demo` |
| Branch | `main` |
| Pages URL | `https://mdgen2020.github.io/mikedai_OSC_UnclaimedFunds_Demo/` |
| Workflow | `.github/workflows/mikedai_OSC_pages.yml` (tests, build, deploy) |

## 9. Decisions I need from you

1. **How should a voice caller receive the code?** (a) Real SMS to your test number through a channel you choose or configure; (b) a demo-only code display on a web page you keep open. I recommend (a). (b) would require storing the code in recoverable form for demo claims, which weakens the "hash codes" requirement, so I will not do it without your explicit say-so.
2. Confirm queue naming (`Support_MikeD` vs `support_miked`).
3. Confirm reuse of `MikeD_KB_Config` (or choose a new setting).
4. ~~Summary setting~~ Resolved: reuse `MikeD_Summary_Config` unchanged (author, 2026-10-14).
5. Whether to proceed with the blockers as they stand, or pause until you have addressed capacity.

## 10. Exact external operations proposed (approve any subset)

| # | Operation | Credential or access needed | Depends on |
|---|---|---|---|
| A1 | Supabase: apply migration `20261014170000_mikedai_OSC_init.sql` | Supabase MCP (project-scoped) | none |
| A2 | Supabase: apply seed `mikedai_OSC_seed.sql` | same | A1 |
| A3 | Supabase: set function secrets `mikedai_OSC_HMAC_SECRET`, `mikedai_OSC_DATAACTION_API_KEY`, `mikedai_OSC_ALLOWED_ORIGINS` | **You** set them (dashboard or `supabase secrets set`); values never pass through chat | none |
| A4 | Supabase: deploy `mikedai_OSC_claim_ops` | Supabase MCP | A1, A3 |
| A5 | Supabase: seed your ANI as a keyed hash only | the HMAC secret, run locally by you | A1, A3 |
| B1 | GitHub: create repo, push, enable Pages, run workflow | GitHub auth (the `mdgen2020` account) | none |
| C1 | Genesys: create integration and 8 data actions | You enter credentials; capacity cleared | Blocker 1, A4 |
| C2 | Genesys: create and publish AVA | AVA harness (existing OAuth) | C1 |
| C3 | Genesys: create and publish 4 flows with Archy | Archy OAuth with `agentic:virtualAgent:view` | C1, C2, summary setting |
| C4 | Genesys: Web Messaging deployment, then set `VITE_GENESYS_DEPLOYMENT_ID` | Admin permissions | C3 |
| C5 | Genesys: create mock data actions and run evaluation | AVA harness; uses extra capacity | C2 |
| D1 | **You:** upload the knowledge file to SharePoint, run an incremental sync, I verify | SharePoint access (yours) | none |
| D2 | **You:** repoint a DID or Transfer to Flow | Admin | C3 |

## 11. Completed locally, with evidence

- Backend, contract, migration and RLS tests: **52 passed**. Website tests: **19 passed**. Production build and Edge Function type-check: **pass**.
- Knowledge: 23 cards, strict local validation 0 fail / 0 warn. Not uploaded.
- AVA critique: 1 error (placeholder targets, blocked by capacity), warnings fixed or accepted.
- Archy read-only validation: only missing-asset errors remain, after one real defect was fixed.
- No existing asset modified. Nothing in Genesys Cloud deleted.

## 12. Not done (stated plainly)

Every external write; every conversational test; platform summary and wrap-up behavior; closed-queue behavior; SharePoint retrieval; `PgStore` against a live database; real-device mobile testing; the Pages workflow run; the Genesys read-only check of `MikeD_Summary_Config`.

## 13. Decisions and execution log (2026-10-14)

**Decisions by the author:** real SMS for the voice verification code (channel not yet chosen); approved **Supabase only** (A1, A2, A4); author sets Edge Function secrets (A3); reuse Knowledge Setting `MikeD_KB_Config` (`6b16df4b-37fb-4ac5-ba06-a9d2319724d3`) unchanged.
**Not approved and not done:** B1 (GitHub), C1-C5 (Genesys), D1/D2. (A5 was approved and done later; see 13.2.)

| Op | Result | Evidence |
|---|---|---|
| A1 | Done. Project `ogfrsveuxbpyfseldkgx`, migration name `mikedai_OSC_init` (the platform assigns its own version number; the file name `20261014170000_...` is local only). | 14 tables in schema `"mikedai_OSC_core"`, RLS on for all 14, 0 policies, `anon` has no schema usage. Security advisor: 14 INFO "RLS enabled, no policy" (intended), no warnings. |
| A2 | Done. | 11 claims, 10 contacts, 11 payment rows, 5 requested documents, 0 caller-recognition rows (no ANI). |
| A3 | **Author action.** Not verified by me. | Function currently returns an error until `mikedai_OSC_HMAC_SECRET` is set. |
| A4 | Deployed: `mikedai_OSC_claim_ops`, ACTIVE, version 1, `verify_jwt=false` (the function authenticates itself: shared key header or approved-origin allowlist, fail-closed, tested). | Unauthenticated probe returns HTTP 500 `WORKER_ERROR` (no secrets set; a zero-length HMAC key crashes boot). Fails closed. Source is fixed locally to return 503 instead; **v2 not yet deployed**. |

**Not yet verified:** `PgStore` against the live database (needs the secrets, then a live smoke test with fictional data); real-SMS delivery (no channel exists yet, deliveries remain simulated).

### 13.1 Update after secrets were set (author set A3 in the dashboard)

- **Security fix found and closed before any real use:** an origin-authenticated caller (Origin is spoofable by non-browser clients) could choose or fetch its own verification code through `generateSecurityCode`, `verifyClaimIdentity` or `sendVerificationCode` with a `securityCode`, then validate it and skip the one-time-code check. These are now Genesys-key-only; origin callers always get a server-generated code. Regression test added (49 backend tests pass).
- **A4 redeployed** (platform version 5, `verify_jwt=false`, ACTIVE) with that fix and the clean-503 boot fix.
- **Live smoke test (fictional data, no key used), all as expected:** no auth -> 401; origin `generateSecurityCode` -> refused; `recognizeCaller` -> not recognized; correct two attributes -> `attributes_ok` with masked contact; wrong attributes -> neutral failure; caller-chosen code -> validate fails, no token. `PgStore` now verified against the live database for these paths.
- **DB state after the test:** audit rows hold only event + outcome; stored code is a 64-char hash (not the code); 0 tokens issued; one attempt counter (1 failed attempt on `DEMO-100002`, cleared by the next successful check).
- **Still unverified live:** the Genesys-key path (needs the API key, which the author holds), the full validate -> token -> claim-summary path, document receipts, service cases, and real SMS.

### 13.2 Real SMS for voice (author decisions 2026-10-14) - designed and tested locally, nothing deployed

- **Author reuses `Agentless SMS - MikeD` (`custom_-_cd38af67-d58b-4eb5-abc9-3f8c055ddf58`) unchanged** and chose to text the number the caller is calling from.
- **Author waived** the "no phone number in AVA start context" rule for this demo only (documented in `docs/security-and-privacy.md`). Cost: the number is visible to the model and may appear in transcripts.
- Built locally: AVA tool `send_verification_text`, start-context `caller_number` (voice only), hidden `smsMessage` output on the code generator, `Flow.CallerNumber` in the voice flows, updated trajectories for the 6 voice scenarios that verify. 52 backend tests pass (3 new). Read-only Archy validation of `VoiceClaimFlow`: only the expected missing-asset error; `VoiceBotFlow` was not re-validated.
- **Deployed (2026-10-14, author-approved):** Edge Function `mikedai_OSC_claim_ops` is now platform version 6, with `smsMessage`. All 5 deployed files were read back and are byte-identical to the local files. Probes against v6: no credentials returns 401; a spoofed approved origin on the Genesys-only `generateSecurityCode` returns `UNKNOWN_OPERATION` with no code or message. The Genesys-key path and the real SMS send are not yet verified live. Nothing created in Genesys.
- **C1 done (2026-10-14, author-approved), partly:** integration `mikedai_OSC_SupabaseWebServices` (`afb71179-06c7-4ae9-9fd0-b3627d8fe483`, custom-rest-actions, **disabled, no credentials**) and the 8 `mikedai_OSC_*` data actions were created (HTTP 201 each; org total 589 to 597, so the 500 cap was not enforced on create). Verified by read-back (name, integration, category, version 1). **Still needed from the author:** enter `mikedaiOscKey` and `supabasePublishableKey` in the integration's Credentials tab and activate it. Not tested through Genesys yet.
- **C1 live test FAILED (2026-10-14):** the integration is ACTIVE, but running `mikedai_OSC_SecurityCodeGenerator` fails at step 3 "Perform authentication": `${credentials.loginUrl}` is null. The integration's credential is the OAuth type (login URL, client id, client secret), not **User Defined**. The actions need a **User Defined** credential with two fields named exactly `mikedaiOscKey` and `supabasePublishableKey`. Author to fix in Admin (Integrations, `mikedai_OSC_SupabaseWebServices`, Configuration, Credentials). Re-test afterwards. No data was read or written by the test.
- **C1 RESOLVED (2026-10-14, author-approved tests):** the earlier `Unauthorized` was a shared-key mismatch (Supabase function logs showed the Genesys request reaching v6 and getting a 401 from our own check), followed by a missing `supabasePublishableKey` credential value. After the author corrected both, all 8 `mikedai_OSC_*` actions pass the Genesys data action test against fictional data (RecognizeCaller with a non-matching number; Generator; VerifyClaimIdentity, ValidateSecurityCode, GetClaimSummary, SendClaimNotice, CreateServiceCase on DEMO-100002; StartFictionalClaim). Test rows left in the demo database: claim DEMO-349825, case CASE-947400, one verification session. One real SMS test of the reused `Agentless SMS - MikeD` action was sent once to the author's phone and the author confirmed receipt. Not yet verified: `RecognizeCaller` returning `recognized: true` for the seeded ANI, and any end-to-end call or chat.
- **C2 done (2026-10-14, author-approved):** AVA `mikedai_OSC_ClaimAssistant` (`f99f22cb-12f6-4791-b8dc-10f4ea54ea5e`). Version 1.0 failed publish (the reused SMS action requires `PhoneNumber` and treats `MessageContent` as optional; my tool had them reversed). Version 2.0 fixed that and published **TestReady**, then, on the author's explicit yes, **ProductionReady** (Architect only accepts a production-published AVA in a bot flow). Version 2.0 is locked. 9 tools, 27 instructions and 4 guardrails. Ids in `.ava-lifecycle/mikedai_OSC_ClaimAssistant/sage-agent.json`.
  - **Security consequence (needs the author's eyes):** the platform requires `fallbackToUser: true` on a required External input (create_version returned 422 without it). So `send_verification_text.PhoneNumber` is External + `fallbackToUser`. If `caller_number` is empty (for example a blocked caller ID), the AVA could ask the caller for a number. Controls added: tool instructions forbid asking for or using a spoken number, a new guardrail blocks sending a code anywhere else, and the voice flow passes only the calling number. These are instruction-level controls, not hard enforcement, and a caller who names their own phone would receive the code. Untested (no evaluation run).
- **C4 BLOCKED (2026-10-14, nothing created):** `scripts/mikedai_OSC_create_messenger.py create` was stopped by the org: `POST /api/v2/webdeployments/configurations` returned HTTP 400 `resource.limit.exceeded` ("maximum number of configurations resources has been exceeded"). Read-only counts: 50 Web Messaging configurations in use (the API does not report the limit; 50 in use is consistent with a limit of 50), 29 deployments (no limit hit). C4 needs 1 new configuration plus 1 new deployment, so the author would need to free exactly 1 configuration slot. The agent cleared nothing and recommends no asset for removal. No `mikedai_OSC_` configuration or deployment exists; no state file was written. Reusing an existing configuration unchanged for the new deployment is an alternative that needs the author's choice.
- **C4 COMPLETE with a reused configuration (2026-10-14, author-approved):** creating a new configuration was refused by the org (`resource.limit.exceeded`; 50 Web Messaging configurations in use, 29 deployments). Nothing was deleted. At the author's direction the new deployment **`mikedai_OSC_Messenger`** (id `134b113e-cba9-49c6-9540-f849df8cf4b0`) reuses the existing configuration **`MikeD_WebMessaging`** (`e02788bd-2f44-49de-8c73-7fa8fbed6a78`, published v15) **unchanged**, and routes to `mikedai_OSC_DigitalClaimFlow`. Status read back `Active`. Domains are restricted (`allowAllDomains: false`) to `mdgen2020.github.io`; `localhost` was rejected by the API, so Messenger cannot be tried from a local dev server (the site falls back to the built-in local chat there). Script: `scripts/mikedai_OSC_create_messenger.py deploy-reuse` (GET/POST only). **Differences from the original design, inherited from the reused configuration:** image attachments are ON (JPEG/GIF/PNG, 10 MB), journey events are ON, and Spanish is enabled alongside English; the bot itself is English-only. Remaining: set the repo variable `VITE_GENESYS_DEPLOYMENT_ID` to the deployment id (part of B1) and verify the Messenger attribute mapping (still unverified, see genesys-cloud-setup.md).
- **C4 follow-up (2026-10-14, author-approved):** `mikedai_OSC_Messenger` was updated (PUT on our own deployment only, `update-own` in `scripts/mikedai_OSC_create_messenger.py`) to `allowAllDomains: true` (domain list cleared) and to use the existing content profile **`Miked_allowall`** (`e3281cfa-e263-442f-a445-2f6ab09a0390`, reused unchanged: all inbound media types, outbound `.docx` only). Read back `Active` with the flow and the `MikeD_WebMessaging` v15 configuration unchanged. Consequence: any web page that knows the deployment id can open this Messenger, and the content profile accepts any inbound file type (attachments are still limited to JPEG/GIF/PNG by the reused configuration). Acceptable for a fictional-data demo; revisit before any wider use. This also lets the Messenger run from `localhost`.
- **B1 PUSHED (2026-10-14, author-approved):** the project was pushed to the author's existing empty repo `mdgen2020/nyc_osc` (branch `main`, commit `b714d82`; the planned name `mikedai_OSC_UnclaimedFunds_Demo` was replaced by the author's choice). The first push was refused because the stored token lacked the `workflow` scope; the author added it and the retry succeeded. Excluded from the repo via `.gitignore` (kept local, they hold Genesys org/queue/action/integration ids): `docs/discovery/` and the five Genesys-API scripts (`create_data_actions`, `create_messenger`, three `discover_*`). Commits use `mdgen2020@users.noreply.github.com`. Staged-content scan found no secrets and no test ANI. **Not done:** Pages is not yet enabled (the author must set Settings > Pages > Source = GitHub Actions), and no workflow run has been verified. Expected URL: `https://mdgen2020.github.io/nyc_osc/`. The workflow builds with `VITE_GENESYS_DEPLOYMENT_ID` defaulted to the `mikedai_OSC_Messenger` id and `VITE_API_MODE` local (the site's own data API stays in-browser; the Messenger chat is the Genesys path). Docs still mention some Genesys ids (for example the org id).
- **C3 COMPLETE (2026-10-14):** after the author freed one `bot` slot, `mikedai_OSC_VoiceBotFlow` (bot, `3282ace4-5a5b-47b8-8690-c2414e3934ec`) and `mikedai_OSC_VoiceClaimFlow` (inboundcall, `5d6564e6-41b5-4874-b69f-eb41c57875f5`) were validated and published. Read-back confirms all four flows exist and are published; digital ids: bot `c41b44bc-083a-4e76-af58-d7b3f204f92e`, entry `077ea25f-1369-4429-a343-7bca8a0698cf`. None is wired to a DID or Messenger deployment. The history below is kept for the record.
- **C3 partly done earlier the same day (author-approved):**
  - Published: `mikedai_OSC_DigitalBotFlow` (digitalbot, `c41b44bc-083a-4e76-af58-d7b3f204f92e`) and `mikedai_OSC_DigitalClaimFlow` (inboundshortmessage). Both validated first. Not wired to any Messenger deployment or DID.
  - **Blocked: `mikedai_OSC_VoiceBotFlow` and `mikedai_OSC_VoiceClaimFlow` not created.** Architect refused to create the voice bot: "the maximum number of flows allowed for that type is 500" (`architect.flow.cannot.create.type.max.exceeded`, type `bot`). The flow list API shows only 246 `bot` flows to this client, so the count Architect enforces is higher than what is visible (likely division access). Needed: **1** free slot of type `bot`. Nothing deleted and no asset suggested for removal. `VoiceClaimFlow` depends on it. The flow file validated clean on its own earlier except for the missing bot flow.
  - Flow fixes made along the way: data action category is the action's own `mikedai_OSC_Data_Actions`, not the integration name; each `transferToAcd` carries `failureOutputs`; each bot flow ends in a terminating `exitBotFlow` (a failed transfer falls through).
- **A5 done (2026-10-14, author-approved):** one row in `mikedai_OSC_caller_recognition` maps the author's test number to `Linus` as a keyed hash only (64 hex characters; the hash was computed locally by the author with the function's HMAC secret, so neither the number nor the secret was seen by the agent or written anywhere). Verified read-only: 1 row, first name `Linus`. The number is not in the repo. Recognition itself cannot be exercised until the Genesys flow exists (it needs the Genesys key and a real call).
- **Still true:** the action has no success output, so a failed text is detectable only as a tool error. The AVA tool's empty output type (`SmsSendResult`) is untested against `create_version`. Evaluation runs would need an extra mock action for this tool (capacity).
