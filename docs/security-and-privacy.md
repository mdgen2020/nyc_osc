# Security and privacy

**Unofficial demonstration. Fictional data only.** Phones use the reserved `555-01xx` range and emails the reserved `example.test` domain.

## Verification

- A **Claim ID alone is never sufficient**. Any two matching attributes among last name, ZIP and date of birth are required. A full SSN is never requested.
- Delivery goes to the **masked** contact on file; a six-digit code is generated server-side, **stored only as an HMAC-SHA256 hash**, single use, expires in 10 minutes, with attempt limits, lockout and resend throttling.
- A valid code yields a short-lived (15 minute) **opaque token**, stored hashed. The token gates every claim read.
- **Neutral failures:** not found and mismatch return identical output, and the lockout counter is keyed on the typed Claim ID whether or not it exists, so there is no enumeration.
- Lockout is **claim-scoped**, so starting a new session does not reset it. Resend throttle and limit are claim-scoped too.
- **ANI is a convenience signal, not authentication.** Only an HMAC of the number is stored. The assistant never says a claim exists because of the caller's number, and always asks whether the claim is the caller's own.

## What is never exposed

The OTP, session ID and token are `undisclosed` AVA types, so the model never sees them and cannot read them aloud. The OTP is never returned to Genesys, logged, summarized or put in a URL. DOB, ZIP, OTP, Claim ID, email, phone and token are never placed in URLs, AVA start context, logs, analytics, summaries or handoffs, **with one author-approved exception** (next section). The claim amount is never returned by any operation.

## Summaries and handoffs

Built from allow-listed fields, then redacted (emails, phones, dates, Claim IDs, SSNs, long numbers). The verification state is **derived from a valid token**: a handoff cannot claim "verified" without one (tested). Bot flows enable summarization and wrap-up assignment.

## Data layer

Schema `mikedai_OSC_core`, not exposed through PostgREST. **RLS enabled on all 14 tables with no policies**, and `anon`/`authenticated` privileges revoked. The browser cannot query protected tables. The Edge Function connects directly to Postgres. The migration is additive and idempotent: it has no `DROP`, `TRUNCATE` or destructive `DELETE`, and its only `ALTER` enables RLS on tables it just created (a test enforces this). The database stores no plaintext code, token or ANI.

## Edge Function

Requires either the Genesys shared key header (compared in constant time) or an allow-listed browser origin; otherwise 401. CORS only for approved origins. Errors never echo internals or inputs. Transient store failures are retried a bounded number of times without logging sensitive data. It refuses to start without the HMAC secret.

## Website

Unmistakable banner: "Demonstration Only: Not an Official New York State OSC Website. Do not enter real personal information." Link to the real site; no OSC logo, assets or code. The entry form collects only reason, has-Claim-ID, language and the demo acknowledgment. Session storage holds non-sensitive context only. CSP restricts sources. Uploads: PDF/PNG/JPG/TIF under 10 MB, receipt only, files are not stored.

## Secrets

Never committed, printed or sent through chat. Needed (only after approval, each for one named operation): `mikedai_OSC_HMAC_SECRET`, `mikedai_OSC_DATAACTION_API_KEY`, `mikedai_OSC_ALLOWED_ORIGINS` (Edge Function secrets); the Supabase publishable key and the shared key as Genesys integration credentials (entered by the author in the Admin UI). The service-role key, database password, personal access tokens and Genesys OAuth secrets are never placed in source or the browser.

## Known demo limitations and production-hardening recommendations

- **`PgStore` is not tested against a live database** (only the migration and RLS are, using an in-process Postgres). Integration-test it first.
- **No real email.** Email and website delivery are simulated. Voice uses real SMS through the existing `Agentless SMS - MikeD` action (designed and tested locally; not yet created or run in the org). That action returns no success output, so the AVA cannot confirm delivery; a failed send is only visible as a tool error.
- The shared function key is a single static secret. Use per-integration rotating credentials and add request signing.
- Rate limiting by IP/ANI at the edge, bot protection on the website, and structured security monitoring are not built.
- Research-mode knowledge must be reviewed by OSC before any real use; the mock statuses are not real data.
- No Playwright end-to-end browser tests; mobile and keyboard checks use jsdom, axe and a CSS check.

## Approved exception: caller number in the AVA start context (voice only)

**Decision (author, 2026-10-14):** to text the one-time code with the existing Agentless SMS action, Architect passes the number the caller is calling from to the AVA as the start-context value `caller_number`. This waives the "no phone number in AVA start context" rule **for this demonstration only**.

What this means in practice:
- **Voice only.** The digital bot flow passes `noValue`; there is no number on web messaging.
- **Sole use:** the destination of `send_verification_text`. No other tool receives it (a test enforces this). The AVA is instructed never to say, repeat, confirm, ask for or summarize it.
- **Not hidden from the model.** Start-context values are visible to the model (unlike the code, session and token, which are `undisclosed`), and may appear in Genesys conversation transcripts and analytics. This is the real cost of the exception.
- **The code stays hidden.** The server returns a ready-made text body next to the code; both are `undisclosed` outputs mapped tool to tool, so the model never composes or sees the digits. The text contains no link, claim data or contact detail.
- **No literal anywhere.** Flows use the expression `Replace(Call.Ani, "tel:", "")`. No real phone number is in the repository, flows or design (tests check the flows). Test scenarios use a fictional `555-01xx` value.
- **What it proves.** Delivery to the calling number shows the caller controls that phone, not that the claim is theirs. Two matching claim attributes are still required. Acceptable for a fictional-data demo; not a production design (production would deliver to the contact on file).
- **Retiring it:** remove `caller_number` from the AVA, flows and design, drop the `send_verification_text` tool, and delivery returns to simulated.

