# Architecture

**Unofficial demonstration. Fictional data only.**

## Components

```mermaid
flowchart LR
  subgraph Entry
    V[Voice call] --> VF[mikedai_OSC_VoiceClaimFlow<br/>inboundCall]
    W[GitHub Pages website<br/>Web Messaging] --> DF[mikedai_OSC_DigitalClaimFlow<br/>inboundShortMessage]
  end
  VF -->|ANI hash lookup, convenience only| RC[(RecognizeCaller)]
  VF --> VB[mikedai_OSC_VoiceBotFlow]
  DF --> DB[mikedai_OSC_DigitalBotFlow]
  VB --> AVA[mikedai_OSC_ClaimAssistant<br/>AVA]
  DB --> AVA
  AVA -->|general questions| KS[MikeD_KB_Config<br/>Knowledge Setting]
  KS --> SP[Miked_SharePT SharePoint<br/>mikedai_OSC_GeneralKnowledge.md]
  AVA -->|8 narrow Data Actions| EF[Supabase Edge Function<br/>mikedai_OSC_claim_ops]
  EF --> PG[(Postgres schema<br/>mikedai_OSC_core, RLS on)]
  AVA -->|Escalation + sanitized summary| Q[support_miked queue<br/>dc15ad2c-7917-413f-9a00-4f52df4d4602]
  W -.->|local-demo mode: same core in the browser| CORE
  EF --- CORE[Shared core logic<br/>mikedai_OSC_core.ts]
```

Voice, digital and the website share one business-logic module (`supabase/functions/_shared/mikedai_OSC_core.ts`) behind a `Store` port. `InMemoryStore` powers tests and the website's local-demo mode; `PgStore` powers Supabase.

## Verification journey (the security spine)

```mermaid
sequenceDiagram
  participant C as Caller
  participant A as AVA
  participant G as generate_security_code
  participant V as verify_claim_identity
  participant T as validate_security_code
  participant S as get_claim_summary
  C->>A: Own claim? last name, ZIP or DOB, Claim ID
  A->>G: (no input)
  G-->>A: securityCode (undisclosed to the model)
  A->>V: attributes + securityCode (ToolOutput)
  V-->>A: code_sent, masked destination, sessionId (undisclosed)
  Note over V: Backend stores only an HMAC of the code and sends it to the contact on file
  C->>A: reads six digits
  A->>T: sessionId (ToolOutput) + digits
  T-->>A: verified + verificationToken (undisclosed)
  A->>S: verificationToken (ToolOutput)
  S-->>A: status, documents, payment (never an amount)
```

The type graph (`ToolOutput` mappings) makes it impossible for the model to call a claim tool without a token, or to send a code it did not generate. The code, session ID and token are `undisclosed`, so the model never sees them.

## Escalation

`create_service_case` (sanitized, allow-listed summary, verification state derived from the token) then the AVA **Escalation** event. The bot flow reads `handoff.case_id` and `handoff.summary`, sets participant data, and transfers to `Support_MikeD` (the queue whose ID is `dc15ad2c-7917-413f-9a00-4f52df4d4602`). Bot flows enable summarization and wrap-up assignment.

## Design decisions

| Decision | Why |
|---|---|
| 8 narrow Data Actions, each on a fixed URL path | AVA tools cannot pass constants and are limited to about 5 inputs, so a single `operation`-switch action cannot bind cleanly. Fixed paths give narrow, typed contracts and no operation switch exposed to the model |
| Deterministic steps consolidated server-side (verify = check + send, summary = status + documents + payment) | Fewer actions, fewer model decisions, fewer failure points |
| Claim-scoped lockout and resend counters | The AVA path does not carry a session on the first call, so session-only limits could be bypassed |
| Response allow-list per Genesys operation | Internal IDs, amounts and hashes cannot leak even if the store returns them |
| Quoted exact-case Postgres identifiers | Postgres lowercases unquoted names; the prefix must stay `mikedai_OSC_` |
| Schema `mikedai_OSC_core` not exposed through PostgREST, RLS on every table, no policies | Browsers cannot read protected tables; only the Edge Function (direct Postgres) can |

## Not built / known limits

See the final sections of [`security-and-privacy.md`](security-and-privacy.md) and [`test-plan.md`](test-plan.md).
