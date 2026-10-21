# Demo script

**Unofficial demonstration. Fictional data only.** Never use real personal information.

> **Matches published AVA 41.0** (`mikedai_OSC_ClaimAssistant`), edge function `mikedai_OSC_claim_ops` v13 (relaxed demo limits). Last updated Wed Oct 21, 2026. Whenever a new AVA version is published, update this script and [`printable-test-sheet.html`](printable-test-sheet.html) in the same change.

## The whole demo in one table

Two fictional people. Three ZIP codes. **The ZIP code you give decides the scenario.** You never need a Claim ID.

| Person | Last name | Date of birth (say it this way) | Role |
|---|---|---|---|
| **Linus Smith** | Smith | June twenty-third, nineteen eighty-eight (`1988-06-23`) | The caller (your own number is recognized as "Linus") |
| **Gloria Jones** | Jones | November thirteenth, nineteen seventy (`1970-11-13`) | The person Linus asks about |

| ZIP code | Scenario | What the assistant says |
|---|---|---|
| **10305** | Documents required | Proof of connection to the old address is still needed; offers the secure upload link (documents are never taken by voice) |
| **12201** | Check mailed | A check was mailed; cash it within 180 days; no amount is shared |
| **10001** | Check not received | Acknowledges the problem first, then offers a representative and hands off with a sanitized summary |

Linus and Gloria use the **same three ZIP codes and the same three scenarios**. To demo Gloria, Linus says he is calling about Gloria Jones and gives her last name and date of birth.

## Voice walkthrough: Linus, ZIP 10305 (documents required)

1. Call the entry point. You hear "Welcome to the Office of Unclaimed Funds.", then the assistant says "Hello, Linus. How can I help you today?" (the name comes from your number being recognized). You can interrupt the assistant at any time.
2. Say: **"I want to check on my claim."**
3. Answer one question at a time:
   - Last name: **"Smith."**
   - ZIP code: **"one zero three zero five."**
   - Date of birth: **"June twenty-third, nineteen eighty-eight."**
4. The assistant says "I've sent a verification code to the mobile number we have on file." A text with a six-digit verification code arrives on the phone you are calling from. Read the six digits together.
5. Hear the status, stated exactly as the system gives it (for 10305: more documents are needed before review can continue; it is never called "under review"). Ask **"What do I still need to send?"** then **"Yes, send the upload link."**

Then repeat the same steps with **12201** (check mailed) and **10001** (check not received, representative) to show the other two scenarios.

## Gloria: Linus asks about someone else

1. Say: **"I'm calling about Gloria Jones's claim."**
2. Give her details: **"Jones."**, her ZIP (use **10305**, **12201** or **10001**), and **"November thirteenth, nineteen seventy."**
3. The verification code goes to the phone you are calling from (it is a demo; on a real service it would go to the claimant). Read it back.
4. The assistant gives the status for that ZIP, exactly as for Linus.

## Website walkthrough (live Web Messenger)

1. Open `https://mdgen2020.github.io/nyc_osc/` and pick a tile (for example "Check My Claim"), or open "Get help" and choose a reason.
2. Press **Start chat**. The chat opens and the assistant greets you by name: "Hello, Linus. I can help you check your claim status. ..." It already knows the reason you picked, so it goes straight to the last name.
3. Answer one question at a time: last name **Smith**, ZIP (**10305**, **12201** or **10001**), date of birth **June 23, 1988**.
4. A text with a six-digit verification code arrives on the mobile on file ("I've sent a verification code to the mobile number we have on file."). Type the six digits.
5. Ask "What is the status of my claim?", then "Please connect me to a representative." The agent's screen pop shows the contact on the left and the ticket number and summary (with "Verification: verified") in the centre.
6. Say "Thank you" and then "That is all, goodbye." The assistant says goodbye and the chat ends.

If the Messenger is not configured (local development), the site falls back to a built-in chat that shows the code in an on-page inbox.

## Other moments worth showing

| Moment | What to do | Expected |
|---|---|---|
| Not sure what to say | Answer the greeting with "I'm not sure." | The assistant explains it needs last name, ZIP and date of birth, never repeats a question, offers a person |
| Details that match nothing | Last name "Nobody", ZIP 99999 | Neutral failure, no hint about whether a claim exists |
| Lockout | Wrong ZIP/date-of-birth guesses with last name Smith | Neutral, then a person. The demo limits are relaxed: it takes about 20 wrong guesses to lock "Smith", and the lock lasts 60 seconds. Not worth demonstrating live |
| Amount request | After any verified scenario ask "How much is it?" | "This service cannot share claim amounts" |
| Story instead of details | "My father is in the hospital, is his claim approved?" | Declined politely, no confirmation |
| Estate | "My mother passed away and I'm calling for her estate" | Acknowledges the loss, offers a specialist, no claim detail |

## Wrap-up note for the presenter

Only four wrap-up codes on `support_miked` are usable (Claim Assistance, Documentation Request, Transfer, FAQs Only), so outcomes are coarse. See [`wrapup-code-mapping.md`](wrapup-code-mapping.md).

## Behind the scenes (for you, not for the call)

Internal claim IDs, only if you need to look a claim up in the database: Linus `DEMO-200001` (10305), `DEMO-200002` (12201), `DEMO-200003` (10001); Gloria `DEMO-300001`, `DEMO-300002`, `DEMO-300003`. The caller is never asked for them.
