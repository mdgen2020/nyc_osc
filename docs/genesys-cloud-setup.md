# Genesys Cloud setup (build specification; nothing here has been applied)

Org `GenesysSC12`, ID `b1aefa00-9ebc-413b-bacf-1039f14d11be`, region `prod` (`api.mypurecloud.com`), division `Home`. **No asset is modified or deleted.** Steps marked **AUTHOR** are manual on purpose.

## Reuse unchanged

| Asset | ID | Note |
|---|---|---|
| Queue `support_miked` | `dc15ad2c-7917-413f-9a00-4f52df4d4602` | Live name is `Support_MikeD` (case differs). Flows reference the name, which a read-only lookup confirmed resolves. Escalation always targets this queue |
| Knowledge source `Miked_SharePT` | `93cb697a-ec20-4ad5-8740-80498e098fd9` | SharePoint, manual trigger |
| Knowledge Setting `MikeD_KB_Config` | `6b16df4b-37fb-4ac5-ba06-a9d2319724d3` | Recommended reuse (answerGeneration true, en-US, bound only to `Miked_SharePT`). Author must confirm. Alternatives bound to the same source: `Miked_SharePT_Setting`, `miked_mv_KB` |

## New assets (proposed), in dependency order

1. **Data capacity first (AUTHOR):** the org is over its 500-action cap (595). Creating the 8 actions needs 103 cleared. Not done by the agent.
2. **Integration** `mikedai_OSC_SupabaseWebServices` (Web Services) with credentials `supabasePublishableKey` and `mikedaiOscKey`. **AUTHOR enters the secret values in Admin; they never go through chat.**
3. **8 Data Actions** from `data-actions/*.json` (see [`data-actions.md`](data-actions.md)).
4. **AVA** `mikedai_OSC_ClaimAssistant`: from `design-artifact.json` via the AVA harness (`create_ava`, `create_version`, `publish_version`), after replacing the `PENDING_CREATE:` target IDs with the real action IDs.
5. **Summary setting: reuse the existing `MikeD_Summary_Config`** (`a09f07f6-aa6e-4415-99c5-b5e7dc83a8ad`), unchanged, at the author's direction. Read-only check: English, Concise, grouped bullets, labels Resident / Agent Extraordinaire, **`maskPII` all off**. So the platform does not mask the summary; the safeguards are upstream (the code is a hidden tool output, `createServiceCase` sanitizes the handoff text, and the AVA is told never to repeat sensitive values). The caller's phone number is in the voice start context and could appear in a summary. Fictional demo data only; do not use real claimants with this setting.
6. **Archy flows**, in this order (create then publish each): `mikedai_OSC_VoiceBotFlow`, `mikedai_OSC_VoiceClaimFlow`, `mikedai_OSC_DigitalBotFlow`, `mikedai_OSC_DigitalClaimFlow`. Bot flows enable summarization and wrap-up assignment.
7. **Web Messaging deployment** `mikedai_OSC_Messenger` (id `134b113e-cba9-49c6-9540-f849df8cf4b0`, created and Active), routed to `mikedai_OSC_DigitalClaimFlow`. It reuses the existing `MikeD_WebMessaging` configuration (v15) unchanged, because the org is at its configuration limit; no `mikedai_OSC_` configuration exists. Domains: all allowed (author decision); content profile `Miked_allowall` (reused unchanged). Its deployment ID goes into `VITE_GENESYS_DEPLOYMENT_ID` for the website. Inherited from the reused configuration: image attachments on, journey events on, Spanish enabled.
8. **SharePoint (AUTHOR):** upload `mikedai_OSC_GeneralKnowledge.md` to the library/folder behind `Miked_SharePT`, then run an **incremental** sync, then verify retrieval. The harness covers only FileUpload sources, not SharePoint, and the human-readable library and folder names are unresolved (Graph IDs only).
9. **Voice entry (AUTHOR):** repoint a DID **or** call `mikedai_OSC_VoiceClaimFlow` from another flow via Transfer to Flow. Not done by the agent because it changes an existing asset.

## Flow behavior

- `VoiceClaimFlow`: greets once with the demo disclaimer, calls `mikedai_OSC_RecognizeCaller` with `Call.Ani` (convenience only; failure or timeout continues neutrally), then calls the voice bot flow with `Flow.FirstName` and `Flow.CallerNumber` (`Replace(Call.Ani, "tel:", "")`, voice only; the bot flow hands it to the AVA as `caller_number` so `send_verification_text` can text the code).
- Bot flows: call the AVA, map `handoff.case_id` and `handoff.summary` to flow variables, set participant data `mikedai_OSC_HandoffCaseId` and `mikedai_OSC_HandoffSummary`, and transfer to `Support_MikeD` only when the AVA produced a case. Failure and timeout also transfer.
- Web Messenger context keys (`mikedai_OSC_reason`, `mikedai_OSC_hasClaimId`, `mikedai_OSC_language`, `mikedai_OSC_source`) are non-sensitive. **Mapping them into the digital flow's `Flow.ContactReason` and `Flow.HasClaimId` is not wired and is unverified**; the inputs are currently `noValue`. Confirm how the Messenger attributes surface in the message flow, then map them.

## Read-only Archy validation results (2026-10-14)

| Flow | Result |
|---|---|
| `mikedai_OSC_VoiceBotFlow`, `mikedai_OSC_DigitalBotFlow` | Syntax and schema pass. Only error: AVA `mikedai_OSC_ClaimAssistant` not found (expected) |
| `mikedai_OSC_VoiceClaimFlow` | Only error: data action `mikedai_OSC_RecognizeCaller` not found (expected) |
| `mikedai_OSC_DigitalClaimFlow` | A real defect was found and fixed (state had no terminating action; a `disconnect` was added). Only error now: `mikedai_OSC_DigitalBotFlow` not found (expected) |

Queue lookup for `Support_MikeD` succeeded. Re-validate after each referenced asset exists; flow validation is not complete until then.

## Wrap-up codes

See [`wrapup-code-mapping.md`](wrapup-code-mapping.md): only 4 of 16 associated codes fit, and the queue's associations cannot be changed by this project.

## Permissions to expect

Archy needs `agentic:virtualAgent:view` (to resolve the AVA by name) and the usual flow permissions; the repo's Archy README covers the OAuth client. The AVA harness client is a different permission set.
