# Wrap-up code mapping (read-only analysis; nothing created or changed)

Source: read-only GETs on 2026-10-14 against org `GenesysSC12` (`b1aefa00-9ebc-413b-bacf-1039f14d11be`). The org has **1,191** wrap-up codes. The immutable escalation queue (`dc15ad2c-7917-413f-9a00-4f52df4d4602`, live name `Support_MikeD`) has **16** associated codes. Queue associations cannot be changed, so a code that is not already associated cannot be used by that queue, whether it is existing or newly created.

## Result: only 4 of the 16 queue codes are usable, and 16 of 20 OSC outcomes have no usable code

Codes on the queue and our assessment against "name, description, semantics already satisfy the requirement":

| Code on queue | ID | Description (as it exists) | Assessment |
|---|---|---|---|
| Claim Assistance | `9c2f2957-c122-4040-b3a6-5e8f55dff4ac` | "Used when the agent helps the caller with any information on their claim" | **Usable**, but generic. Cannot distinguish status vs payment vs ID recovery |
| Documentation Request | `3fe746f5-a028-487d-9c83-931907af855d` | "Use this wrap code when documents or documentation is discussed." | **Usable**, generic. Cannot distinguish required vs received |
| Transfer | `4a529566-e3d4-4d6d-80d0-aa7dfc726a0f` | "call or chat transfer" | **Usable** for any human handoff. Too coarse for the transfer reason |
| FAQs Only | `0466a272-a014-4786-ba7b-83932cc7d940` | "for when a caller only ask questions that are FAQs." | **Usable** for general-information, contained sessions |
| Account Information, Appointments, Driver's License, Existing Ticket, Forms Assistance, IT Support, RealID, Reported Emergency, Sales, Trip Planner Assistance, Vehicle Registration, Wrong transfer | various | other domains, or no description (Wrong transfer) | **Unsuitable** for OSC |

## Mapping (OSC outcome to code)

"Queue?" means associated with `support_miked` today. Any row marked **No** is a blocker for assignment on that queue. Where I list a code that exists elsewhere in the org, it is shown only as a read-only candidate; it was **not** modified and would still be unavailable to the queue.

| OSC outcome | Code name | Code ID | Existing / proposed | Queue? | Description (existing) or proposed text | Assignment method | Flows |
|---|---|---|---|---|---|---|---|
| Status resolved (contained) | Claim Assistance | `9c2f2957-c122-4040-b3a6-5e8f55dff4ac` | Existing | Yes | see above | Virtual Agent auto-assign (`assignWrapupCodes`) | voice + digital bot flows |
| General information only (contained) | FAQs Only | `0466a272-a014-4786-ba7b-83932cc7d940` | Existing | Yes | see above | Virtual Agent auto-assign | voice + digital |
| Claim started | none usable | n/a | Gap | n/a | Closest on queue: Claim Assistance (generic) | Auto-assign falls back to Claim Assistance | voice + digital |
| Claim ID recovery | none usable | n/a | Gap | n/a | Closest on queue: Claim Assistance | falls back to Claim Assistance | voice + digital |
| Documents required | Documentation Request | `3fe746f5-a028-487d-9c83-931907af855d` | Existing | Yes | see above | Virtual Agent auto-assign | voice + digital |
| Documents received | Documentation Request | `3fe746f5-a028-487d-9c83-931907af855d` | Existing (shared) | Yes | not distinguishable from "required" | Virtual Agent auto-assign | voice + digital |
| Under review | none usable | n/a | Gap | n/a | Org candidate (not on queue): `Claim Status` `ff895b51-1428-44b5-b658-de4ce04b82ef` ("requesting an update or information about the current status of an existing claim") | falls back to Claim Assistance | voice + digital |
| Additional information required | none usable | n/a | Gap | n/a | Org candidate (not on queue): `Claim Update` `2f445d7a-504a-408d-9736-bc0325f3abd6` | falls back to Documentation Request | voice + digital |
| Approved | none usable | n/a | Gap | n/a | Org candidate (not on queue): `Claim Payment Inquiry` `17e748b2-4117-4bf9-9113-b96b89e8df70` | falls back to Claim Assistance | voice + digital |
| Check mailed | none usable | n/a | Gap | n/a | same candidate as Approved | falls back to Claim Assistance | voice + digital |
| Check issue (not received, lost, wrong payee, expired) | none usable | n/a | Gap | n/a | same candidate as Approved | Transfer is used when escalated | voice + digital |
| Deceased owner | none usable | n/a | Gap | n/a | Org candidate (not on queue): `I-CASH Heir Claim - Documentation Needed` `0f542dcc-a298-4332-8ce0-fe885f8b0f85` (another demo's heir-claim code) | Transfer | voice + digital |
| Representative claim | none usable | n/a | Gap | n/a | no suitable code found | Transfer | voice + digital |
| Verification failed | none usable | n/a | Gap | n/a | no suitable code found | Transfer | voice + digital |
| Verification locked | none usable | n/a | Gap | n/a | no suitable code found | Transfer | voice + digital |
| Customer requested agent | Transfer | `4a529566-e3d4-4d6d-80d0-aa7dfc726a0f` | Existing | Yes | "call or chat transfer" | Virtual Agent auto-assign on escalation | voice + digital |
| Human escalation (other reasons) | Transfer | `4a529566-e3d4-4d6d-80d0-aa7dfc726a0f` | Existing (shared) | Yes | coarse: reason carried in the sanitized summary | Virtual Agent auto-assign | voice + digital |
| Fraud concern | none usable | n/a | Gap | n/a | `Fraud Reported` `ef25d96b-f965-49be-bc89-40be411d5f37` has **no description**, so it is classified unsuitable | Transfer | voice + digital |
| Service unavailable | none usable | n/a | Gap | n/a | no suitable code found | Transfer | voice + digital |
| Abandoned | none usable | n/a | Gap | n/a | no suitable code found | no code assigned | voice + digital |
| Unresolved | none usable | n/a | Gap | n/a | Org candidate (not on queue, vague): `Customer Issue Unresolved` `ac6d1a4a-ab15-4834-8f78-278d4ca3f0ba` | Transfer | voice + digital |

## Proposed new codes (only worthwhile if the queue's associations can later be extended by the queue owner)

Not proposed for creation now, because they could not be used by `support_miked` and creating unusable codes only consumes capacity. If the author later approves queue association changes through the queue owner, these distinct codes would close the gaps. Descriptions are written to be selectable by Copilot or the Virtual Agent and mutually distinguishable.

| Proposed code | When to select |
|---|---|
| Unclaimed Funds - Claim Started | The claimant began a (demo) claim and received a Claim ID. |
| Unclaimed Funds - Claim ID Recovered | The claimant verified and recovered or was re-sent a Claim ID. |
| Unclaimed Funds - Status Provided | A verified status was given and no further action was required from the claimant. |
| Unclaimed Funds - Under Review | The claim was reported as received or under review and no claimant action was needed. |
| Unclaimed Funds - Additional Information Required | The claim was waiting on information or documents from the claimant. |
| Unclaimed Funds - Approved or Check Mailed | The claim is approved, the check is being prepared, or the check was mailed. |
| Unclaimed Funds - Check Problem | The check was not received, lost, expired, incorrect, or could not be cashed. |
| Unclaimed Funds - Deceased Owner or Estate | The claim involves a deceased owner or estate. |
| Unclaimed Funds - Representative Claim | The contact is acting for someone else and authority must be confirmed. |
| Unclaimed Funds - Verification Failed or Locked | Verification did not succeed or the session was locked. |
| Unclaimed Funds - Fraud Concern | The contact reported suspected fraud or a suspicious request. |
| Unclaimed Funds - Service Unavailable | A required system was unavailable during the interaction. |

## Blocker summary for the author

1. Wrap-up codes outside the queue's 16 cannot be assigned. Fine-grained OSC outcome coding is **not achievable** without changing the queue's associations, which is prohibited here.
2. With no change, the Virtual Agent can only choose among Claim Assistance, Documentation Request, Transfer, and FAQs Only. The sanitized summary carries the detailed outcome.
3. Please decide whether to (a) accept the coarse coding for the demo, or (b) have the queue owner associate additional codes outside this project.
4. Whether Virtual Agent wrap-up assignment for **contained** sessions is limited to the target queue's codes needs confirmation in a preview test after deployment.
