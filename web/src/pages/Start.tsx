import { FormEvent, useState } from "react";
import { EntryContext, saveEntry } from "../lib/session";
import { launchMessenger } from "../lib/messenger";
import { ENTRY_TILES } from "./Home";
import { LocalChat } from "../components/LocalChat";
import { Api } from "../lib/api";

const REASONS: [EntryContext["reason"], string][] = [
  ...ENTRY_TILES.map((t) => [t.reason, t.label] as [EntryContext["reason"], string]),
  ["start_claim", "I want to start a claim"], ["other", "Something else"],
];

export function Start({ api, initialReason }: { api: Api; initialReason?: string }) {
  const [reason, setReason] = useState<EntryContext["reason"]>(
    (REASONS.find(([r]) => r === initialReason)?.[0]) ?? "check_claim");
  const [hasClaimId, setHas] = useState<EntryContext["hasClaimId"]>("unsure");
  const [language, setLang] = useState<EntryContext["language"]>("en-US");
  const [error, setError] = useState("");
  const [ctx, setCtx] = useState<EntryContext | null>(null);
  const [messengerLaunched, setLaunched] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const c: EntryContext = { reason, hasClaimId, language, demoAcknowledged: true };
    saveEntry(c);            // non-sensitive context only
    setCtx(c);
    setLaunched(launchMessenger(c));
  }

  if (ctx) {
    return messengerLaunched ? (
      <section aria-live="polite">
        <h1>Your chat is open</h1>
        <p>Use the chat window to continue. You will be asked for a fictional Claim ID and verification details inside the secure conversation, not on this page.</p>
      </section>
    ) : (
      <section>
        <h1>Chat with us</h1>
        <LocalChat api={api} context={ctx} />
      </section>
    );
  }

  return (
    <section>
      <h1>Tell us why you are here</h1>
      <p>This short form does not ask for a Claim ID or any verification details. Those are collected later, inside the secure conversation.</p>
      <form onSubmit={submit} noValidate aria-describedby={error ? "form-error" : undefined}>
        {error && <p id="form-error" role="alert" className="error">{error}</p>}
        <div className="field">
          <label htmlFor="reason">Reason for your visit</label>
          <select id="reason" value={reason} onChange={(e) => setReason(e.target.value as EntryContext["reason"])}>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <fieldset className="field">
          <legend>Do you have a Claim ID?</legend>
          {([["yes", "Yes"], ["no", "No"], ["unsure", "I'm not sure"]] as const).map(([v, l]) => (
            <label key={v} className="inline"><input type="radio" name="has" value={v} checked={hasClaimId === v} onChange={() => setHas(v)} /> {l}</label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="lang">Preferred language</label>
          <select id="lang" value={language} onChange={(e) => setLang(e.target.value as EntryContext["language"])}>
            <option value="en-US">English</option>
            <option value="interpreter">Other / I need an interpreter</option>
          </select>
        </div>
        <p><button className="btn" type="submit">Start chat</button></p>
      </form>
    </section>
  );
}
