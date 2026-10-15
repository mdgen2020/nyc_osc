import { FormEvent, useState } from "react";
import { Api } from "../lib/api";

type Step = "attributes" | "send" | "code" | "locked" | "unavailable";

/** Secured verification: Claim ID + two attributes, then a six-digit code. Values stay in component state only. */
export function VerifyPanel({ api, onVerified, onNeedHuman }: { api: Api; onVerified: (token: string) => void; onNeedHuman?: () => void }) {
  const [step, setStep] = useState<Step>("attributes");
  const [sessionId, setSession] = useState<string | undefined>();
  const [msg, setMsg] = useState("");
  const [masked, setMasked] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setMsg("");
    const r = await api.call("beginVerification", { sessionId, claimId: f.get("claimId"), lastName: f.get("lastName"), zip: f.get("zip") });
    setBusy(false); setSession(r.sessionId);
    if (r.outcome === "attributes_ok") { setMasked(r.maskedDestination); setStep("send"); }
    else if (r.outcome === "locked") { setMsg(r.message); setStep("locked"); }
    else if (r.outcome === "unavailable" || r.error) { setMsg(r.message ?? "Verification is unavailable right now."); setStep("unavailable"); }
    else setMsg(r.message);
  }
  async function send() {
    setBusy(true); setMsg("");
    const r = await api.call("sendVerificationCode", { sessionId });
    setBusy(false);
    if (r.ok) { setDemoCode(r.demoCode ?? ""); setMsg(r.message); setStep("code"); }
    else { setMsg(r.message ?? "We could not send a code."); if (r.humanHelpRecommended) setStep("unavailable"); }
  }
  async function validate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true); setMsg("");
    const r = await api.call("validateVerificationCode", { sessionId, code });
    setBusy(false);
    if (r.outcome === "verified") onVerified(r.verificationToken);
    else if (r.outcome === "locked") { setMsg(r.message); setStep("locked"); }
    else setMsg(r.message ?? "That code did not match.");
  }

  return (
    <div className="panel" aria-live="polite">
      {msg && step !== "locked" && step !== "unavailable" && <p role="status" className={step === "attributes" || step === "code" ? "error" : ""}>{msg}</p>}
      {step === "attributes" && (
        <form onSubmit={begin} autoComplete="off">
          <h2>Verify with fictional details</h2>
          <p className="small">Use a fictional Claim ID (for example the ones in the demo script). Never enter real information.</p>
          <div className="field"><label htmlFor="claimId">Claim ID</label><input id="claimId" name="claimId" required placeholder="DEMO-100002" /></div>
          <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" required /></div>
          <div className="field"><label htmlFor="zip">ZIP code</label><input id="zip" name="zip" inputMode="numeric" required /></div>
          <button className="btn" disabled={busy}>Continue</button>
        </form>
      )}
      {step === "send" && (
        <div>
          <h2>Send a security code</h2>
          <p>We can send a six-digit code to the contact on file: <strong>{masked}</strong>.</p>
          <button className="btn" onClick={send} disabled={busy}>Send code</button>
        </div>
      )}
      {step === "code" && (
        <form onSubmit={validate} autoComplete="off">
          <h2>Enter your security code</h2>
          <p className="small">No real text or email is sent in this demo. A simulated inbox appears below.</p>
          {demoCode && <p className="demo-inbox" aria-label="Simulated inbox">Simulated message: your code is <strong>{demoCode}</strong></p>}
          <div className="field">
            <label htmlFor="code">Six-digit code</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
          </div>
          <button className="btn" disabled={busy}>Verify</button>{" "}
          <button type="button" className="btn secondary" onClick={send} disabled={busy}>Resend code</button>
        </form>
      )}
      {(step === "locked" || step === "unavailable") && (
        <div role="alert">
          <p>{msg || "We couldn't complete verification."}</p>
          <p>A team member can help you from here.</p>
          {onNeedHuman && <button className="btn" onClick={onNeedHuman}>Connect me with a person</button>}
        </div>
      )}
    </div>
  );
}
