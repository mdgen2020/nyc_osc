# Current OSC unclaimed funds process (public information)

Source: publicly available OSC guidance, summarized in `.ava-lifecycle/mikedai_OSC_ClaimAssistant/knowledge-sources.md` (access date 2026-10-14). This is **research-mode** content: OSC must review it before any production use. No OSC system was called or scraped.

## Seven stages

| # | Stage | Public process (summary) | Demo representation |
|---|---|---|---|
| 1 | Find property and submit a claim | Search the state's unclaimed funds list, then file a claim online or by mail | Website "Start a claim" page and `start_demo_claim`. **Nothing is submitted to OSC** (`submittedToOsc` is always false) |
| 2 | Receive or recover a Claim ID | A confirmation email with the Claim ID arrives within 48 hours | ID recovery by attributes only, and `send_claim_notice` to resend |
| 3 | Learn what else is needed | Some claims need documents (for example proof of connection to an old address, signed form, name-change or estate documents) | `get_claim_summary` returns the document list |
| 4 | Check status | An online status search, or the call center | The primary automation: verified, then `get_claim_summary` |
| 5 | Submit documents | Upload PDF, PNG, JPG or TIF files, each under 10 MB | Secure upload page; documents are never taken by voice or chat |
| 6 | Wait for review | About 30 days if no action is needed; up to 90 days after documents are received | Stated exactly as published, never promised |
| 7 | Approval and payment | A check is mailed within about 30 days of approval; 180 days to cash it; no direct deposit | Payment states, including check problems that escalate |

The call center cannot give dollar amounts. Phones: 1-800-221-9311 and (518) 270-2200, Monday to Friday, 8 to 5.

## Why status automation first

Status questions are high volume, repetitive, answerable from structured data, and sensitive enough to need real verification. Each automated status contact avoids a live-agent call, and the same verification and summary pattern extends to the other stages.

## Customer pain points the demo targets

- Not knowing whether anything is needed ("did you get my papers?")
- Losing the Claim ID
- Long, uncertain waits with no empathetic framing
- Check problems (not received, lost, expired) that need a person quickly
- Representatives (estates, minors, guardians) who need a specialist and must not be told claim details
