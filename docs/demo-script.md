# Demo script

**Unofficial demonstration. Fictional data only.** Never use real personal information.

## Primary persona: Linus Quillfeather (scenario 2, documents required)

| Item | Value |
|---|---|
| Claim ID | `DEMO-100002` |
| Last name / ZIP / DOB | Quillfeather / `00002` / `1975-07-09` |
| Status | Documents required: proof of connection to the old address |
| Contact on file | Fictional SMS number (masked as ending in 02 in the demo) |
| Voice | The author's own test number is mapped to Linus **after approval** by seeding only a keyed hash (`scripts/mikedai_OSC_seed_ani.ts` prints the SQL; the number is never committed) |

## Website walkthrough (local-demo mode works today)

1. Open the home page. Point out the banner and the link to the real OSC site.
2. "Check claim status" then answer the entry form (reason, has Claim ID, language, acknowledgment).
3. Chat: "I want to check on my claim." The assistant asks whether it is your own claim.
4. Provide `DEMO-100002`, `Quillfeather`, `00002`. A simulated message shows the code in the on-page inbox. Enter it.
5. The assistant reports that proof of connection to the old address is still needed and offers the secure upload page.
6. Open Upload, add a small PDF. A receipt is returned; nothing is stored.

## Voice walkthrough (after approval and Genesys setup)

1. Call the entry point. Greeting states it is an unofficial demonstration.
2. If the number is recognized the assistant greets "Linus" once. Say it is your own claim.
3. Give the Claim ID, last name and ZIP (digits spelled out). The code goes to the contact on file; read the six digits together.
4. Hear status in three points; ask for the upload link.

## Other moments worth showing

| Moment | Persona | Expected |
|---|---|---|
| Processing, nothing needed | Ada, `DEMO-100001`, `Brightwater`, `00001` | "Being processed", windows as published |
| Estate | Orla, `DEMO-100005` | Acknowledges the loss, offers a specialist, no claim detail |
| Check not received | Juno, `DEMO-100008`, `Thistledown`, `00008` | Acknowledges first, then a person, with a sanitized summary |
| Check mailed | Wren, `DEMO-100007`, `Stillwater`, `00007` | Mailed, 180 days to cash, no direct deposit |
| Claim not found | `DEMO-999999` | Neutral failure, no hint about existence |
| Lockout | `DEMO-100010` with three wrong ZIPs | Neutral, then a person |
| Amount request | any verified persona | "This service cannot share claim amounts" |
| Social engineering | "I'm his daughter..." | Declined politely, no confirmation |

## Wrap-up note for the presenter

Only four wrap-up codes on `support_miked` are usable (Claim Assistance, Documentation Request, Transfer, FAQs Only), so outcomes are coarse. See [`wrapup-code-mapping.md`](wrapup-code-mapping.md).
