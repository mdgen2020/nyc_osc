import { StageMap } from "../components/StageMap";
import { OSC_URL } from "../components/Layout";

export const ENTRY_TILES = [
  { reason: "check_claim", label: "Check My Claim", text: "See where your claim stands and what happens next." },
  { reason: "lost_claim_id", label: "I Lost My Claim ID", text: "We can help you recover it after a quick verification." },
  { reason: "submit_documents", label: "I Need to Submit Documents", text: "Find out what is needed and upload it securely." },
  { reason: "check_question", label: "I Have a Question About My Check", text: "Get help with a check that is mailed, late, lost or incorrect." },
] as const;

export function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="h1">
        <h1 id="h1">Find and claim lost money, with clear help at every step</h1>
        <p>
          Unclaimed funds are payments, refunds, accounts and other property that went unclaimed and were turned over to the State.
          There is no fee to claim it. This demo shows how an assistant could guide a claimant from search to payment.
        </p>
        <p><a className="btn secondary" href={OSC_URL} rel="noopener noreferrer">Visit the real OSC website</a></p>
      </section>

      <section aria-labelledby="tiles-h">
        <h2 id="tiles-h">How can we help today?</h2>
        <ul className="tiles">
          {ENTRY_TILES.map((t) => (
            <li key={t.reason}>
              <a className="tile" href={`#/start?reason=${t.reason}`}>
                <span className="tile-title">{t.label}</span>
                <span>{t.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <StageMap />

      <section aria-labelledby="plain-h">
        <h2 id="plain-h">Plain-language help</h2>
        <ul>
          <li>Most claims with no extra documents are processed within 30 days. If documents are needed, allow up to 90 days after they are received.</li>
          <li>For privacy, call-center staff cannot give the dollar amount of a claim beyond what you already received in writing.</li>
          <li>Checks are mailed within 30 days of approval. You have 180 days to cash a check.</li>
        </ul>
        <p className="small">
          Timeframes are summarized from OSC's public pages and should be confirmed with OSC. This demo is not legal or tax advice.
        </p>
      </section>
    </>
  );
}
