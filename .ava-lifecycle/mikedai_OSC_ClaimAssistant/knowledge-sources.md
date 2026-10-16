# Knowledge sources and lineage: mikedai_OSC_GeneralKnowledge.md

Mode: **Research** (public sources only). Corpus is synthesized from public pages, was **not verified against OSC internal documents**, and contains volatile facts (timeframes, phone numbers, page names). **OSC must review this content before any production use.** This is an unofficial demonstration.

Access date for all sources: **2026-10-14**. Pages were read once through a read-only page fetch. No OSC production system (including the claim-status search application at `https://ouf.osc.ny.gov/app/claim-status-search`) was called, scraped, or automated.

## Sources

| # | Page title (as fetched) | URL | Notes |
|---|---|---|---|
| S1 | Unclaimed Funds (home; "What Is Unclaimed Property?") | https://www.osc.ny.gov/unclaimed-funds | Definition, no fee, no time limit |
| S2 | How to Search & Claim Property | https://www.osc.ny.gov/unclaimed-funds/claimants/how-search-claim-property | Search steps, claim steps, eligibility, on-behalf-of, mail-in alternative |
| S3 | Claim Submitted—What's Next? | https://www.osc.ny.gov/unclaimed-funds/claimants/claim-submitted-whats-next | 48 hours, 30 days, 90 days, resend claim form, check timing, 180 days, interest/taxes |
| S4 | Required Documentation | https://www.osc.ny.gov/unclaimed-funds/claimants/required-documentation | Proof types, upload requirements, mailing address, 90-day review |
| S5 | Contact Us | https://www.osc.ny.gov/unclaimed-funds/claimants/contact-us | FAQ answers, Claim ID location, amount privacy, contact details |
| S6 | Claim Status Search (application) | https://ouf.osc.ny.gov/app/claim-status-search | **Not accessed.** Referenced only as the real status tool. Never called |
| S0 | OSC home page | https://www.osc.ny.gov/ | Visual and information-architecture reference only. Not scraped; no assets used |

Pages for deceased owners ("Claims for Deceased Owners and Estates"), "Taxes and Interest", "About Unclaimed Funds", and the FAQ were **not read**; cards only point to them by name and say a specialist can help.

## Claim-to-source map (one row per card)

| Card (question/task) | Facts used | Source locator |
|---|---|---|
| What are unclaimed funds / fee | Definition; no fee; no time limit | S1 "What Is Unclaimed Property?"; S2 intro ("free and secure service") |
| Search for unclaimed funds | Last/Business Name field; refine with first name, city, ZIP; variations; Property ID from letter; exact matches first; three-month delay; Share button | S2 "Search for Unclaimed Funds", "Search for Friends and Family", "If You Can't Locate Your Property" |
| File a claim online | Claim button; Continue to File a Claim; relationship dropdown, Owner (Self); own info only; SSN for U.S. citizens; mail alternative; e-signature; co-owners; value withheld until review | S2 Steps 1 to 5, "Claims for Properties with Multiple Owners", "Social Security Number" |
| Claim for someone else | Allowed relationships list; enter own information; documents to prove connection | S2 "Claims on Behalf of Someone Else", Step 3; S4 "Proof of Authorization"; S3 paragraph 2 (may take longer) |
| Deceased owner | Points to OSC "Claims for Deceased Owners and Estates"; extra documentation and longer time; void check for deceased payee; death certificate instructions | S3 paragraph 2; S5 "What should I do if a check or letter has the wrong information or is for a deceased person?"; S4 (death certificate note). Empathy sentence is assistant voice, not a source fact |
| After I submit | Confirmation email in 48 h; 30 days if no action; claim form and docs then up to 90 days; spam folder; contact if no email | S3 paragraphs 1 to 4 |
| Where is my Claim ID | Online email; mailed claim email/letter within 30 days; top of email, upper-right of letter; claim form upper-right; spam folder; contact form if lost | S5 "Where do I find my Claim ID?"; S4 Step 2 (form upper-right, email); remittance advice mention from S5 |
| New claim email/form | Claim status page, enter Claim ID, Search, Resend Claim Form | S3 "Request for New Email/Claim Form". Demo resend statement is demo behavior |
| Proof of old address | Acceptable-proof list; W-2/1099 tip; written explanation if none | S4 "Proof of Address"; S5 "How do I prove an old address?"; S4 "If You Can't Provide Proof" |
| Proof of ownership / name change | Both lists | S4 "Proof of Ownership", "Proof of Name Change" |
| Proof of authorization | Birth certificate/adoption order; proof of age; court/legal documents list; guardian notarized statement; death certificate pointer | S4 "Proof of Authorization (to Claim on Owner's Behalf)" |
| Business documents | Authorization, name change/merger, closed/dissolved lists | S4 "Proof for Organizations" |
| Submit documents online | Formats; under 10 MB; compression; no password; file-name rules; readable; signed form must be printed and signed (no e-signature); five files per submission; document type; verification checkbox; Upload Success; Upload Details | S4 "How to Submit Your Documentation Online" Steps 1 and 2 |
| Mail documents | Only if originals requested or technical difficulty; address | S4 "Mailing Address" |
| Check claim status | Online or by phone with Claim ID; call center limits | S3 "Check the Status of Your Claim"; S5 "What is the status of my claim?". Verification steps are demo behavior |
| Claim amount | Not shared until proof confirmed; amount in approval email (the "$20 minimum" fact was removed 2026-10-16 so the assistant never states a dollar figure) | S5 "How much is my claim?"; S3 "If Your Claim Is Approved" |
| Approval and payment | Email with details; check within 30 days to claim-form address; one check for multiple properties; perforated envelope; no direct deposit/prepaid cards; interest up to five years; taxes | S3 "If Your Claim Is Approved", "Taxes and Interest" |
| Missing/lost check | More than 30 days; lost uncashed; cannot cash; wrong name/address guidance | S3 "Missing or Incorrect Check"; S5 wrong-information answer. Reissue-handling statements are demo behavior (human escalation) |
| Cash check in 180 days | 180 days; file new claim | S3 "Cash Your Check Promptly" |
| Check without claim | Validation criteria; remittance advice; Contact Us | S5 "Why did I receive a check?" |
| Contact OSC | Phones, hours, mailing address, fax | S5 "Your Contact Information" |
| Why verify (demo) | Demo behavior, not an OSC fact | Project design (`docs/security-and-privacy.md`) |
| Is this official (demo) | Demo disclaimer, not an OSC fact | Project requirement |

## Known gaps and review items

- Phone numbers, hours, and the mailing address should be re-verified by OSC before production.
- Timeframes are general and published by OSC. The assistant must never compute an exact completion date.
- No card discusses legal or tax advice beyond saying the assistant cannot provide it.
- Deceased-owner and estate requirements are intentionally not detailed; they route to a specialist.
