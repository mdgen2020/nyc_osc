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
- **C5 PARTLY DONE, BLOCKED ON CAPACITY (2026-10-14, author-approved "try c5"):** `.ava-lifecycle/mikedai_OSC_ClaimAssistant/build_mocks.py mocks` created 1 of 9 planned mock data actions (`mikedai_OSC_Mock_CreateServiceCase`, id in `mock-state.json`), then the draft endpoint refused: "Maximum action count (500) for organization exceeded. Delete actions or drafts before creating new." Read-only counts: 598 data actions in the org (limit 500) plus 42 drafts. 8 more mocks are needed; 598 + 8 - 500 = 106 would have to be cleared to be sure, although the platform accepted the 8 real actions and this first mock while over 500, so enforcement is inconsistent. Nothing was deleted and no asset is recommended for deletion. No mock-bound AVA version was created, no evaluation was run, and production stays v2.0 (confirmed: latest production-published version is 2.0).
- **Opening-loop finding (2026-10-14, text simulation against v2.0, no data actions invoked):** after the greeting, if the caller does not clearly say whether the claim is their own or someone else's ("I'm not sure", "I don't know", "Hello?"), the AVA re-asks the same own-or-someone-else question every turn and never offers a representative. A clear answer ("It's my own claim") moves on. This matches the live voice call where an unscripted caller heard the question repeated. **Fix attempts (author-approved "fix_ava", all test-only, production untouched):** v3.0 added example answers and "accept plain phrasings"; v4.0 added "ask at most twice, then offer a representative"; v5.0 changed it to "ask once, then move on to verification". In text simulation, clear answers work in every version ("It's mine" moves on; "It's for my mother" offers a representative), and the example answers now appear in the question. **The loop on vague replies is not fixed:** v3.0, v4.0 and v5.0 all still repeated the own-or-someone-else question on "I'm not sure", "I don't know", "Hello?" (4 asks, no representative offer), so the model does not reliably follow a repeat-limit instruction. Versions 3.0, 4.0 and 5.0 exist as TestReady; the latest production-published version is still 2.0 and the bot flows still use it. Options left: remove the own-or-someone-else question as a gate (verification still protects the claim; departs from the original spec), or promote v5.0 for its example answers and accept the loop on non-answers.
- **v5.0 PROMOTED TO PRODUCTION (2026-10-14, author chose "promote v5.0", confirmed twice):** `build_ava.py promote --author-approved-production` published 5.0 (status Succeeded, ProductionReady); readback shows the latest production-published version is now 5.0 (it was 2.0). The bot flows use `ver_latestPublished`, so live calls now run 5.0. Before promoting, a text simulation of 5.0 showed the estate path works (sympathy, offer of a representative, `create_service_case`, then escalation). The production guard in `build_ava.py` now approves exactly 5.0. **Known limit, unchanged:** with several vague replies in a row the AVA can still repeat the own-or-someone-else question. The superseded versions 2.0, 3.0 and 4.0 were not deleted. Not re-verified on a real call yet.
- **SIMPLIFIED PERSONA MODEL (2026-10-15, author request after "Quillfeather isn't working"; BUILT LOCALLY AND AS A TEST-ONLY AVA VERSION, NOT YET LIVE):** one caller, Linus Smith (born 1988-06-23), and the person he may ask about, Gloria Jones (born 1970-11-13). The ZIP code selects the scenario for both: 10305 documents required, 12201 check mailed, 10001 check not received (representative). The author chose that mapping and chose that Gloria's claims are verified like anyone else's (last name, ZIP, date of birth, then the code), which deliberately relaxes the earlier "no third-party claim details" guardrail for this fictional demo; a story, hospital stay or relationship still never replaces the details. Changes: fixtures, seed, tests and demo script rewritten (6 claims, `DEMO-200001..3` and `DEMO-300001..3`, new IDs so nothing existing is touched); callers are never asked for a Claim ID; the own-or-someone-else question is removed from the AVA (this also removes the opening loop); the first message now says what the caller can ask for; ZIP is accepted when spoken as digit words; the website form asks for last name, ZIP and date of birth. **Security changes:** core now requires every attribute the caller gives to match one unique claim (the Postgres store already worked this way; the in-memory store was looser), and without a Claim ID the failure counter is scoped by last name so varying the ZIP or date of birth cannot dodge the 3-attempt limit (side effect: three wrong guesses lock that last name for 15 minutes). Backend 55 tests and web 19 tests pass. The older claims (Quillfeather and the rest) are left in the live database untouched and are simply no longer used. AVA versions 6.0, 7.0 and 8.0 are test-only; production is still 5.0. **Not done until approved:** applying the seed to Supabase, redeploying the Edge Function (the core change), and promoting 8.0 to production. Text simulation of 8.0: the opening lists what the caller can ask for, details are collected one at a time with no repeated question, `lastName`, `zip` (`12201`, from spoken digits) and `dob` (`1970-11-13`) reach the tool correctly, and a story-only caller is declined. Verification outcomes (code sent, status) cannot be seen until the seed is applied.
- **C3 COMPLETE (2026-10-14):** after the author freed one `bot` slot, `mikedai_OSC_VoiceBotFlow` (bot, `3282ace4-5a5b-47b8-8690-c2414e3934ec`) and `mikedai_OSC_VoiceClaimFlow` (inboundcall, `5d6564e6-41b5-4874-b69f-eb41c57875f5`) were validated and published. Read-back confirms all four flows exist and are published; digital ids: bot `c41b44bc-083a-4e76-af58-d7b3f204f92e`, entry `077ea25f-1369-4429-a343-7bca8a0698cf`. None is wired to a DID or Messenger deployment. The history below is kept for the record.
- **C3 partly done earlier the same day (author-approved):**
  - Published: `mikedai_OSC_DigitalBotFlow` (digitalbot, `c41b44bc-083a-4e76-af58-d7b3f204f92e`) and `mikedai_OSC_DigitalClaimFlow` (inboundshortmessage). Both validated first. Not wired to any Messenger deployment or DID.
  - **Blocked: `mikedai_OSC_VoiceBotFlow` and `mikedai_OSC_VoiceClaimFlow` not created.** Architect refused to create the voice bot: "the maximum number of flows allowed for that type is 500" (`architect.flow.cannot.create.type.max.exceeded`, type `bot`). The flow list API shows only 246 `bot` flows to this client, so the count Architect enforces is higher than what is visible (likely division access). Needed: **1** free slot of type `bot`. Nothing deleted and no asset suggested for removal. `VoiceClaimFlow` depends on it. The flow file validated clean on its own earlier except for the missing bot flow.
  - Flow fixes made along the way: data action category is the action's own `mikedai_OSC_Data_Actions`, not the integration name; each `transferToAcd` carries `failureOutputs`; each bot flow ends in a terminating `exitBotFlow` (a failed transfer falls through).
- **A5 done (2026-10-14, author-approved):** one row in `mikedai_OSC_caller_recognition` maps the author's test number to `Linus` as a keyed hash only (64 hex characters; the hash was computed locally by the author with the function's HMAC secret, so neither the number nor the secret was seen by the agent or written anywhere). Verified read-only: 1 row, first name `Linus`. The number is not in the repo. Recognition itself cannot be exercised until the Genesys flow exists (it needs the Genesys key and a real call).
- **Still true:** the action has no success output, so a failed text is detectable only as a tool error. The AVA tool's empty output type (`SmsSendResult`) is untested against `create_version`. Evaluation runs would need an extra mock action for this tool (capacity).
- **SIMPLIFIED MODEL GO-LIVE (2026-10-15, author chose "apply data, redeploy, test, then promote if all pass"):**
  - **Applied:** the 6 new claims (`DEMO-200001..3` Linus Smith, `DEMO-300001..3` Gloria Jones) are in Supabase, added alongside the old rows (nothing deleted). Read back: 6 new rows with the expected ZIPs, DOBs and statuses. The old demo claims (Quillfeather and others) are still there and unused.
  - **Edge Function:** `mikedai_OSC_claim_ops` is now platform version 9 (v8 added the last-name-scoped attempt counter; v9 fixed a real bug found by the live test: `postgres.js` returns `date` columns as JS `Date`, and `String(date).slice(0,10)` produced `"Wed Jun 22"`, so the date-of-birth match could never succeed and `statusChangedOn`/`mailedOn` were garbled; now `dateOnly()` in core). Backend tests 56/56 pass. Files read back were not re-diffed after v9.
  - **AVA test versions 8.0 to 14.0 (all TestReady, production untouched at 5.0):** 9.0 stopped forcing the six-digit code to be a verbatim substring of the utterance; 10.0 to 12.0 added explicit "copy the caller's digits" instructions and relaxed the "guess" wording of one guardrail; 13.0 clarified that a six-digit number after the code request is the code, not a phone number; 14.0 stopped reading masked digits aloud (`contact ending in 02` made the model confuse them with the typed code).
  - **Digital-channel test results on 14.0 (real data actions, real Supabase, no SMS sent; the harness shows the generated code, which stands in for the demo inbox):** Linus 10305/12201/10001 and Gloria 10305/12201/10001 each reach the right claim summary (documents required / check mailed / check not received then an offer of a representative). The representative hand-off ran once (`create_service_case`, then Escalation). Across 9 full runs of 14.0, **7 passed and 2 failed**: once the AVA never called `validate_security_code`, once it sent `000000` instead of the digits the user typed. The failure is the model not copying a bare six-digit number reliably; a code typed as `My code is 123456` or as spaced digits passed every time it was tried. A failed code never exposes claim details (the AVA refuses and offers a representative).
  - **Promoted to production (2026-10-15, author choice "promote 14.0 anyway" after being told 7 of 9 full runs passed):** `build_ava.py promote --author-approved-production` published 14.0 (Succeeded, ProductionReady); read-back shows the latest production-published version is 14.0 (it was 5.0). The bot flows use `ver_latestPublished`, so live calls now run 14.0. The guard in `build_ava.py` now approves exactly 14.0. Version 5.0 and the other versions were not deleted. **Not verified on a real call yet.** A smoke test of 14.0 after the backend change passed (Linus 12201).
  - **Send limit relaxed (author choice, Edge Function version 10):** a correct code now clears that claim's send counter, so repeating a scenario no longer locks it. Still limited: 3 sends per claim between successful verifications, a 30-second gap between sends, 3 wrong codes per session, 3 wrong attribute sets per last name (15-minute lock). Backend tests 57/57.
  - **Known limit (open):** the AVA occasionally mishandles a bare six-digit code (about 1 run in 5 in text simulation). If it happens, the caller can type the code again or say it with spaces; a failed code never exposes claim details.

## Code step: delivered digits now differ from the hidden value (2026-10-15, Edge Function version 11)
- Why: bare six-digit replies sometimes failed (reply "000000", or no `validate_security_code` call), while "My code is 123456" and spaced digits always worked. Working theory: the platform treats a user message identical to an `undisclosed` value specially.
- What: `securityCode` held by the AVA (undisclosed) is now a hidden value. The digits texted to the caller (`smsMessage`) are derived from it server-side (`deliveredCode` in `handler.ts`, keyed HMAC), so what the caller types never equals the hidden value. No Data Action contract or AVA change; the website path is unchanged.
- Tests: backend 58 of 58 (new test: hidden value differs from delivered digits; hidden value does not validate; delivered digits do).
- Live re-test on AVA 14.0 (Cicero text, bare six digits typed): 8 of 9 clean runs reached `validate_security_code` with the right digits and returned the claim summary; 1 run stopped before validating; 0 "000000" substitutions (previously the common failure). Not proof of a fix: sample is small.
- Note: the 3-sends-per-claim limit now clears on a successful validation; a failed run leaves it set until the 15-minute lock expires.

## Voice SMS step fixed and promoted: AVA 20.0 (2026-10-15)
- Symptom (live call): after the code text was sent, the AVA ended the session with an empty reply and the bot flow transferred the caller to `Support_MikeD`. Reproduced in text simulation with the voice context (versions 14.0, 15.0, 17.0).
- Cause: the reused action "Agentless SMS - MikeD" declares no output fields. After it returned, the AVA gave an empty reply and exited. Declaring fields the action does not have is rejected at publish (16.0). Wording changes did not help.
- Fix: `send_verification_text` now targets the existing action **MikeD_SMS_with_response** (`custom_-_61b6b5e2-ce57-400c-a285-147738bdfa62`; inputs FromMOBILE, MOBILE, BODY; outputs conversationId, fromAddress, toAddress). `MOBILE` is the caller number from the start context, `BODY` is the server-built SMS text, and `FromMOBILE` is the fixed org sender number written in the input description and instruction.
- Verified in text simulation with the voice context on 20.0: text sent, AVA asks for the six digits, bare code validates, claim status returned, follow-up answered.
- Promoted to production on author approval. Previous production version: 14.0.
- Notes: version 16.0 failed to publish (never live). 15.0, 17.0, 18.0 and 19.0 were test-only or failed drafts. No data action was created, changed or deleted.

## Transfer after escalation: bot flows republished (2026-10-15)
- Symptom (live call): after ID&V and status, the AVA went quiet; asking for a transfer disconnected the call. The bot flow only transferred when `Flow.HandoffCaseId` was set, and it was empty, so the flow exited and the entry flow disconnected.
- Change: `mikedai_OSC_VoiceBotFlow` (id `3282ace4-5a5b-47b8-8690-c2414e3934ec`) and `mikedai_OSC_DigitalBotFlow` (id `c41b44bc-083a-4e76-af58-d7b3f204f92e`) now capture the AVA exit reason in `Flow.AvaExitReason`, write it to participant data `mikedai_OSC_AvaExitReason`, and transfer to `Support_MikeD` when the exit reason contains "escal" even without a case ID. Both published as version 2.0 (same flows, nothing deleted or unpublished).
- Still to confirm on a live call: the real exit-reason text. Check participant attribute `mikedai_OSC_AvaExitReason`.
- AVA 22.0 (closing wording: never an empty reply after "thank you") is test-only; production remains 20.0 until promotion is approved.

## Voice bot flow: Agent Escalation now runs the transfer task (2026-10-15)
- Author finding: the call-AVA action's Agent Escalation handling was "Exit the Flow", so an escalation exited the bot flow and the entry flow disconnected the caller.
- Change: `agentEscalationHandling` in `mikedai_OSC_VoiceBotFlow` now runs the existing task "Transfer to queue" (Support_MikeD). Published as a new version of the same flow; nothing deleted. The digital bot flow is unchanged (escalation disabled there).

## Shorter introduction, no disclaimer (2026-10-15)
- Author finding: the transfer to an agent now completes on a live call. Request: shorten the intro, no demo statement or disclaimer, make it realistic.
- `mikedai_OSC_VoiceClaimFlow`: initial greeting is now just "Welcome." (was a long unofficial-demonstration notice). Published as a new version of the same flow.
- AVA 23.0 (TEST-ONLY, not promoted; production stays 20.0): first reply no longer welcomes again on voice and never says demonstration or fictional unless asked; no spoken "demonstration text" mention; goodbye is "Thank you for contacting the Office of Unclaimed Funds. Goodbye." It also carries 22.0's closing-wording rule.
- Not tested: the Cicero simulation endpoint returned 403 for all versions at the time. The SMS body still starts "Unofficial demo (fictional data)"; not changed.

## AVA 23.0 promoted to production (2026-10-15)
- Promoted on author approval, without a simulation run (the Cicero endpoint returned 403). Previous production version: 20.0 (rollback target: republish 20.0 with the promote guard changed).
- Includes the short intro with no demo disclaimer and the closing-wording rule. No data action, flow or other object was created, changed or deleted by this step.

## Greeting: AVA welcomes the caller (2026-10-15)
- Author request: the AVA should welcome the caller to the department, then ask how it can help.
- AVA 25.0 promoted to production (previous production 23.0; 24.0 was a test-only draft). First reply: "Welcome to the New York State Office of Unclaimed Funds. How can I help you today?" (prefixed with "Hello, <first name>." when the caller was recognized). Text simulation, voice context, 4 of 4 runs matched. No demo wording.
- `mikedai_OSC_VoiceClaimFlow`: initial greeting removed (was "Welcome.") so the caller hears one welcome. Published as a new version of the same flow (validator warning only: "Initial Greeting has no audio set"). Nothing deleted.
- Note: simulation 403s earlier were caused by running the harness inside the shell sandbox; unsandboxed runs work.

## Greeting option A: the phone flow welcomes, the AVA asks how it can help (2026-10-15)
- Why: a short pause before the AVA spoke (caller-number lookup plus AVA start-up). The flow now plays "Welcome to the Office of Unclaimed Funds." immediately, so the pause is covered.
- `mikedai_OSC_VoiceClaimFlow`: initial greeting is "Welcome to the Office of Unclaimed Funds." Published as a new version of the same flow. Nothing deleted.
- AVA 27.0 promoted to production (previous production 25.0; 26.0 was a test-only draft). Voice: first reply is only "How can I help you today?". Digital: "Welcome to the New York State Office of Unclaimed Funds. How can I help you today?". Text simulation, 2 runs per channel, all matched. On voice the AVA did not add "Hello, <first name>" in simulation.
- Caller recognition finding: the `mikedai_OSC_RecognizeCaller` test with the author's number returned `recognized: false` in both number formats. The seeded hash does not match what the deployed function computes (different secret or number at seed time). Needs a re-seed by the author (see `scripts/mikedai_OSC_seed_ani.ts`); until then the first-name greeting cannot work.

## Caller recognition fixed (2026-10-15)
- The HMAC secret `mikedai_OSC_HMAC_SECRET` was reset by the author (it was not on hand). The first re-seed row did not match the deployed function (secret mismatch); the second row, generated by the author after correcting it, did.
- Inserted two author-supplied rows (keyed hashes only, first name Linus) into `mikedai_OSC_caller_recognition` (now 3 rows: the original 10-14 row and the first re-seed row are unused). Nothing deleted.
- Verified with the Genesys data action test of `mikedai_OSC_RecognizeCaller` using the author's number in both formats (`tel:+1…` and `+1…`): `recognized: true, firstName: Linus`.
- Side effect of the reset: any verification code issued before the reset is invalid.
- Open: on voice the AVA did not say "Hello, <first name>" in text simulation even when given a first name. To re-check on a live call.

## Greeting by name: AVA 28.0 promoted (2026-10-15)
- Finding: the AVA's opening line is the `greeting` returned when the session starts (not a reply to the caller). My earlier greeting checks looked at the reply to "Hello", so they missed it. Production 27.0 opened voice calls with only "How can I help you today?" and never used the first name.
- AVA 28.0 promoted to production on author approval (previous production 27.0). Start-session greeting, text simulation, 2 runs each: voice with first name "Hello, Linus. How can I help you today?"; voice without a name "Hello. How can I help you today?"; digital "Welcome to the New York State Office of Unclaimed Funds. How can I help you today?".
- Not tested on a live call yet. Recognition of the author's number returns `recognized: true` (see the previous section).

## Code wording and caller interruption (2026-10-15)
- AVA 29.0 promoted to production (previous production 28.0), author approved without a text test. After verify, on voice, the AVA says exactly "I've sent the code to the mobile number we have on file." (no "text message", no "the phone you are calling from"). Not yet heard on a live call.
- `mikedai_OSC_VoiceBotFlow`: barge-in (`enableBargeIn`) turned on so the caller can interrupt the AVA. Published as a new version of the same flow. Nothing deleted.
- Watch for: background noise or the caller's "mm-hm" can cut the AVA off mid-sentence. If that happens, barge-in can be turned off again.

## Demo script updated (2026-10-15)
- `docs/demo-script.md` now describes the current voice greeting ("Welcome to the Office of Unclaimed Funds." then "Hello, Linus. How can I help you today?"), the "I've sent the code to the mobile number we have on file." wording, and that callers can interrupt.
- Live-call checks confirmed by the author: greeting by name, transfer to an agent, code wording, interruption.

## Agent script and external contact before the transfer (2026-10-15)
- Script: `miked_script_2026` (`09d11916-8ffd-4feb-9e6b-9568aaf8bfe3`). The script's own routing already sends `customer_selection` = `135` to the page named "NYS OSC" (id `6a5e2a69…`; the author calls it "NYC OSC"). No script change was made by the agent.
- `mikedai_OSC_VoiceBotFlow` published as version 5.0 (same flow, nothing deleted). In the "Transfer to queue" task, before the transfer: (1) data action "Get External Contact by Phone Number" (`custom_-_59e238d3-b336-492d-a47a-c34a8943d0a0`) with the caller number; (2) pick the contact whose first name equals the recognized first name (that phone number belongs to four external contacts: Kimberly Green, Linus Smith, Diane Martin, Jack Cabral; without the pick the first one, Kimberly, would show); (3) Set Screen Pop `miked_script_2026` with `customer_selection` = `135`, contact fields, `agent_summary` = AVA handoff summary, `TicketNumber` and `claim_number` = AVA case reference, `contact_info` = phone, `customer_name`; all other script inputs are blank.
- Not yet tested on a live call. The "pick by first name" step uses `FindFirst` on a collection; if it does not behave as expected the left panel shows the first contact in the list.
- The AVA summary is short today (Reason, Inquiry, Verification, Automation completed). To show more (status category, documents, outstanding, next step) the AVA's case inputs need extending.

## Script screen pop confirmed on a live call (2026-10-15)
- Author confirmed on a live call: the left section shows the right contact (Linus Smith, picked by first name from the four contacts on that number) and the center shows the ticket number and the AVA summary. The "pick by first name" step works.
- Open: script formatting (the summary text is multi-line and is cut off in the center box; author is fixing this in the script). The summary shows "Verification: unverified" even for a verified caller on some runs (known limitation: the verification token is not always passed to the case tool).

## 2026-10-15: agent summary verification matches reality (AVA 30.0)

- Problem: the AVA sometimes omitted the optional `verificationToken` on `CreateServiceCase`, so the backend downgraded verified callers to "unverified" in the agent summary (29.0: verified in 1 of 3 simulation runs).
- Fix: AVA 30.0 instructions always pass the token after a successful code check, and leave it empty otherwise. The server-side downgrade is unchanged on purpose (security).
- Simulation: 30.0 reported "verified" in 4 of 4 runs when verified, and "unverified" in 2 of 2 when the caller asked for an agent before verifying.
- Promoted to production with author approval. Rollback version: 29.0.

## 2026-10-15: digital experience (AVA 31.0, web chat flows, website)

- AVA 31.0 promoted to production on author approval (previous production 30.0). On digital it now texts the code to the mobile on file when `caller_number` is present ("I've sent the code to the mobile number we have on file"), greets by first name, and skips "How can I help?" when the website form already gave the reason (check claim, check a check, lost Claim ID).
- `mikedai_OSC_DigitalClaimFlow` published as a new version: reads the website form answers from the Messenger attributes (`mikedai_OSC_reason`, `mikedai_OSC_hasClaimId`), recognizes the visitor from the mobile number on file (`mikedai_OSC_RecognizeCaller`), and passes the first name, the number, the reason and the claim-ID answer to the bot flow. The mobile number is held in the flow variable `Flow.OnFileMobile`; the tracked YAML holds the placeholder `+1XXXXXXXXXX` and the real number is substituted into a temporary copy at publish time so it never enters the repository.
- `mikedai_OSC_DigitalBotFlow` published as a new version: new input `Flow.CallerNumber` (mapped to the AVA's `caller_number`); on a transfer it now looks up the External Contact by that number and sets the `miked_script_2026` screen pop (`customer_selection` 135, summary and ticket number) exactly as on voice.
- Live Web Messaging test (guest API, deployment `mikedai_OSC_Messenger`): greeting "Hello, Linus. I can help you check your claim status."; form reason reached the AVA; details collected one at a time; "I've sent the code to the mobile number we have on file" (a real SMS was sent to the demo mobile); asking for a person reached "I'm transferring you to a representative now"; "thank you" then "goodbye" ends with a goodbye and a disconnect.
- Website: removed the demo banner, the "Demo" tag and the acknowledgment checkbox; the footer keeps one short non-affiliation line; page title and home wording made neutral. 19 web tests pass; production build passes. Not yet pushed to GitHub.
- Known gap: general questions ("what documents do I need?") return "I couldn't find..." because the knowledge file has not been uploaded to the SharePoint library behind `Miked_SharePT` (step D1, author only).

## 2026-10-16: website chat window did not open (fixed, pushed)

- Causes, found with a headless Chrome run against the live site: (1) the Pages build passed an empty `VITE_GENESYS_ENVIRONMENT`, so Messenger refused to load ("requires a deploymentId and environment"); (2) the Content-Security-Policy blocked `api-cdn.mypurecloud.com`, where Messenger loads its configuration; (3) the page kept a reference to the Genesys queue stub, which the bootstrap replaces, so `Messenger.open` was silently dropped.
- Fixes in `web/src/lib/messenger.ts`, `web/index.html` and `.github/workflows/mikedai_OSC_pages.yml`: default the environment to `prod`, allow `api-cdn` in the CSP, call `window.Genesys` at call time and open on `Messenger.ready`. Pushed to `mdgen2020/nyc_osc` (commits `28bc2d8`, `9942a38`, `a1b1bc9`); the backend source files the web tests depend on were committed in `9942a38` (already deployed to Supabase).
- Verified on `https://mdgen2020.github.io/nyc_osc/` with a fresh browser profile: the chat window opens by itself within a second of pressing Start chat.

## 2026-10-16: web chat feedback (AVA 33.0, digital flows)

- Feedback from a live web chat: (1) greeted by name with no way of knowing who the visitor was; (2) had to ask repeatedly to be transferred; (3) a second run texted a code but validation failed.
- AVA 33.0 promoted to production on author approval (previous production 31.0; 32.0 was an intermediate test version). Web chat: no greeting by name, and the greeting always starts "Welcome to the New York State Office of Unclaimed Funds." Voice is unchanged ("Hello, Linus." still comes from the caller's number). When a visitor asks for a person, an agent or a representative, the assistant says one short sentence, creates the case and transfers with no confirmation question.
- `mikedai_OSC_DigitalClaimFlow` and `mikedai_OSC_DigitalBotFlow` published as new versions: the recognized first name now goes only to the new bot-flow input `Flow.ContactHint` (used to pick the right External Contact for the agent screen pop) and is no longer passed to the AVA as `first_name`.
- Simulation (digital): greeting started with "Welcome" and the transfer happened on the first request in 4 of 4 runs; verified status still reported as "verified" in 2 of 2 completed runs (one run returned empty replies from the simulator). Live Web Messaging check after publishing: "Welcome to the New York State Office of Unclaimed Funds..." then "I'm connecting you with a representative now."
- Code failure: the audit log shows the second run created one code, checked one attempt (failed) and never reached a second attempt; the first run verified normally. The cause (a digit mis-copied by the assistant, or an older text typed) cannot be told from the database alone; the chat text is needed.
- GitHub: the only failed Pages run was the intermediate push `28bc2d8`; runs for `9942a38` and `a1b1bc9` succeeded and the site is deployed.

## Chat feedback round 2 (AVA 34.0, DigitalBotFlow v5, DigitalClaimFlow v4) - 2026-10-16

- **Goodbye, then transfer.** "ok transfer me" was read as an ending (it starts with "ok"), so the AVA sent the UserExit goodbye even though a case existed and the flow still transferred. AVA 34.0 states that any message asking for a transfer, person, agent or representative is a transfer request even if it starts with ok/thanks, and never to use UserExit after `create_service_case`. Simulated 5/5 runs end in the Escalation message.
- **Repeated apology after about a minute.** DigitalBotFlow `noInputsTimeout` raised from 1 to 10 minutes; the no-input apology is now "Are you still there?" (it no longer repeats the last answer after one idle minute).
- **External Contact on the web conversation.** DigitalClaimFlow now searches the External Contact (search term placeholder `demo-contact@example.invalid` in the repo, real email substituted only in a temp copy at publish time, like the mobile number), reads the conversation's communication id ("Get Message CommunicationID"), and runs "Set External Contact" with mediaType `MESSAGE` before calling the bot. The agent's Profile panel should show the contact instead of "Create Contact". Customer Journey follows the contact once identified; web-visit history from before the chat may only link if the site identifies the visitor (not done).
- Rollback: AVA 33.0 (production-published before), previous flow versions via Architect version history.

## Chat feedback round 3: transfer redesign (AVA 35.0, DigitalBotFlow v6, DigitalClaimFlow v5) - 2026-10-16

- **Root cause of the slow transfer.** DigitalBotFlow had `enableAgentEscalation: false`, so the AVA's Escalation event was ignored: the AVA improvised its own "connecting you" line and kept chatting, and the transfer only ran after the AVA eventually exited (sometimes with the Goodbye message).
- **Fix.** `enableAgentEscalation: true` (handling: exit the bot flow). DigitalBotFlow now only runs the AVA, records the exit reason and returns `Flow.HandoffCaseId` / `Flow.HandoffSummary` (outputs). DigitalClaimFlow does the whole handoff after the bot exits: External Contact phone lookup, screen pop (`miked_script_2026`), "Get Message CommunicationID" + "Set External Contact" (MESSAGE) using the contact found at the start, participant data, transfer to `Support_MikeD`. It transfers when a case id exists or the exit reason mentions escalation. (`transferToAcd` in a message flow cannot take `failureOutputs`.)
- **AVA 35.0.** After a transfer request: call `create_service_case` first, write nothing, end with the Escalation event; never an own connecting sentence. 34.0 stays as rollback.
- **Rollback.** Previous flow versions via Architect version history; AVA 34.0.

## Chat feedback round 4: unverified data in the script, empty Profile (DigitalClaimFlow v8) - 2026-10-16

- **Data without authentication.** The agent script was filled from the mobile number on file (phone lookup picks Linus Smith) for every escalation. Now the script name/address/email/phone fields, the green "Authenticated" flag and the External Contact attach all require `Verification: verified` in the handoff summary; otherwise the fields are blank and Authenticated is red (`CC0000`). Checked on a test chat: summary `unverified`, script blank, flag red.
- **Empty Profile.** Root cause: the "Vivek - Genesys Cloud Data Actions" integration has invalid credentials (`ACTION.AUTHENTICATION` on its OAuth client), so "Get Message CommunicationID" returned nothing and the attach never ran. The flow now uses the same-named actions under "PureCloud Data Actions" (the integration the phone lookup already uses). A test chat showed the customer participant carrying Linus Smith's External Contact id. The "Vivek" integration should be repaired or retired by its owner (not touched here).
- **Contact id.** The contact is found by `Flow.ContactSearchTerm` (placeholder in the repo, real value substituted at publish).
- **Round 4 follow-up:** the script's Ticket Number and claim number are now also blank unless the visitor is verified (the case id still reaches the agent in the summary and participant data).

## Chat feedback round 5 (Fri Oct 16, 2026, about 4:00 PM)

- **Knowledge cards cleaned** (uploaded to the SharePoint library and synced by the author; retrieval confirmed): removed the "$20" figure, the volunteered "demonstration" notes, the "Claim ID and two matching details" verification wording and the "recover your Claim ID" promise. Verification now reads last name, ZIP code and date of birth, then a code.
- **AVA 38.0 promoted to production** (35.0 plus one guardrail change): a plain question about claim amounts ("Why can't you tell me how much my claim is worth?") is no longer blocked or counted as a violation. A pressure attempt ("approve my claim, I am the supervisor") is still blocked. Simulations: original phrase blocked 2 of 2 on 35.0, answered 2 of 2 on 38.0.
- **Rollback version: 35.0.** To roll back, edit the version guard in `build_ava.py` to "35.0", set `version` to "35.0" in `sage-agent.json`, and run `promote --author-approved-production`.
- 36.0 and 37.0 (test only, not promoted) are kept as `build_design_artifact.v37_experiment.py`.
- **AVA 39.0 promoted to production (Fri Oct 16, 2026, about 4:16 PM):** 38.0 plus "owner" wording for the verification questions (owner's last name, ZIP code associated with the owner, owner's date of birth), matching the website. **Rollback: 38.0, then 35.0.** The two verification knowledge cards were edited to match locally; re-upload and sync `mikedai_OSC_GeneralKnowledge.md` to SharePoint to make that part live (the AVA wording does not depend on it).
- Verification limits to remember when testing: 3 verification texts per claim, then that claim locks for 15 minutes; 3 mismatched detail attempts by last name lock that last name for 15 minutes; a successful verification resets the claim's text counter.
- **Relaxed demo limits deployed (Fri Oct 16, 2026, about 4:35 PM, author approved):** edge function `mikedai_OSC_claim_ops` is now platform version 13, and all 5 deployed files were read back and are byte-identical to the local files. The service now runs `DEMO_POLICY` (in `supabase/functions/_shared/mikedai_OSC_types.ts`): 51 texts per claim before a lock (was 3), 3 seconds between texts (was 30), 20 wrong detail attempts per last name (was 3), 10 wrong codes per session (was 3), and any lock clears after 60 seconds (was 15 minutes). Verification itself is unchanged: details, then a texted code. The original values are kept as `PRODUCTION_POLICY`, and the backend tests pin them so the lockout logic stays proven (57 pass; 2 pre-existing failures about data-action id fixtures are unrelated). **Rollback:** in `mikedai_OSC_types.ts` set `POLICY = { ...PRODUCTION_POLICY }` and redeploy the function.

## Chat feedback round 6 (Wed Oct 21, 2026, about 11:15 AM)

- **AVA 40.0 promoted to production** (39.0 plus two wording changes): the code message now says "I've sent an authorization code to the mobile number we have on file. Please provide all six digits of the code together." (so callers stop asking "what code?"), and claim status is stated exactly as the system gives it (no more "under review, but we need additional documents" for a documents-required claim). **Rollback: 39.0, then 38.0, then 35.0.**
- Simulated on 40.0 before promotion: authorization-code wording, the amount question (answered, no refusal), a request for a person before verifying (immediate transfer), and a goodbye (ends politely, no transfer). The status wording cannot be simulated end to end because the real texted code is not visible, so it needs one live check.
- Known mismatch: the text message body itself still says "your verification code is ..." (backend `verificationSmsText`). Changing it to "authorization code" needs an edge function redeploy.
