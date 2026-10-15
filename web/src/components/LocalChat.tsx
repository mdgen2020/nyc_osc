import { FormEvent, useState } from "react";
import { Api } from "../lib/api";
import { EntryContext } from "../lib/session";
import { empathyFor, wantsHuman } from "../lib/empathy";
import { VerifyPanel } from "./VerifyPanel";

interface Msg { who: "assistant" | "you"; text: string }
type Rel = "self" | "other" | "estate";

const OPENERS: Record<EntryContext["reason"], string> = {
  check_claim: "I can help you check on a claim.",
  lost_claim_id: "I can help you recover a Claim ID after a quick verification.",
  submit_documents: "I can help you find out which documents are needed and where to send them.",
  check_question: "I can help with a question about a check.",
  start_claim: "I can explain how to search for property and start a fictional demo claim.",
  other: "I can help with an unclaimed-funds claim today.",
};

/** Built-in fallback for when Web Messenger is not configured. Uses the same shared core as voice and digital. */
export function LocalChat({ api, context }: { api: Api; context: EntryContext }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: "assistant", text: `Hello. ${OPENERS[context.reason]} Are you asking about your own claim, or a claim belonging to someone else?` },
  ]);
  const [rel, setRel] = useState<Rel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [human, setHuman] = useState<string | null>(null);
  const say = (...m: Msg[]) => setMsgs((x) => [...x, ...m]);

  function chooseRel(r: Rel) {
    setRel(r);
    const label = r === "self" ? "My own claim" : r === "estate" ? "A deceased family member's claim" : "Someone else's claim";
    say({ who: "you", text: label });
    if (r === "estate") say({ who: "assistant", text: "I'm sorry for your loss. I'll help make the estate-claim process as clear as possible. Estate claims need documentation and a specialist's review. I can still check what is on file once we verify, and I can connect you with a person." });
    else if (r === "other") say({ who: "assistant", text: "Thank you. Claims for someone else need proof of your authority, such as a court document or power of attorney. Let's verify the claim first, and a specialist can confirm the documents." });
    else say({ who: "assistant", text: "Thank you. First I need to verify the claim. Please enter the details below." });
  }

  async function escalate(reason: string) {
    const r = await api.call("createServiceCase", {
      verificationToken: token ?? undefined, reason,
      summary: { reason, inquiry: rel === "self" ? "self" : rel ? "representative" : "unknown", relationship: rel ?? undefined, verification: token ? "verified" : "unverified", transferReason: reason, recommendedNext: "Review and assist" },
    });
    setHuman(r.summary);
    say({ who: "assistant", text: "I'm connecting you with a team member and sharing a short summary so you won't need to repeat yourself. In this demo no live agent joins; the sanitized summary is shown below." });
  }

  async function run(op: string, fmt: (r: Record<string, any>) => string) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const r = await api.call(op, { verificationToken: token });
    if (r.error === "STATUS_UNAVAILABLE" || r.error === "SERVICE_UNAVAILABLE") {
      say({ who: "assistant", text: "I can't reach that information right now. I won't guess. Let me connect you with a team member." });
      await escalate("Status service unavailable");
      return;
    }
    say({ who: "assistant", text: fmt(r) });
    if (r.humanHelpRecommended) say({ who: "assistant", text: "Because of what is on this claim, I recommend speaking with a team member. Would you like me to connect you?" });
  }

  function onFree(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("msg") ?? "").trim();
    form.reset();
    if (!text) return;
    say({ who: "you", text });
    const emp = empathyFor(text);
    if (emp) say({ who: "assistant", text: emp });
    if (wantsHuman(text)) void escalate("Claimant requested an agent");
    else if (!emp) say({ who: "assistant", text: "I can help with claim status, required documents, or check questions. Which would you like?" });
  }

  const pretty = (s: string) => s.replace(/_/g, " ");

  return (
    <div className="chat">
      <div className="log" role="log" aria-live="polite" aria-label="Conversation">
        {msgs.map((m, i) => <p key={i} className={`msg ${m.who}`}><span className="who">{m.who === "you" ? "You" : "Assistant"}:</span> {m.text}</p>)}
      </div>

      {!rel && (
        <div className="choices" role="group" aria-label="Whose claim is this?">
          <button className="btn secondary" onClick={() => chooseRel("self")}>My own claim</button>
          <button className="btn secondary" onClick={() => chooseRel("other")}>Someone else's claim</button>
          <button className="btn secondary" onClick={() => chooseRel("estate")}>A deceased family member's claim</button>
        </div>
      )}

      {rel && !token && !human && <VerifyPanel api={api} onVerified={(t) => { setToken(t); say({ who: "assistant", text: "Thank you, you're verified. What would you like to do?" }); }} onNeedHuman={() => escalate("Verification not completed")} />}

      {token && !human && (
        <div className="choices" role="group" aria-label="What would you like to do?">
          <button className="btn secondary" onClick={() => run("getClaimStatus", (r) => `Status: ${pretty(r.status)} (last changed ${r.statusChangedOn}). ${r.whatIsHappening} Next step: ${r.nextAction} ${r.processingWindow}`)}>Check status</button>
          <button className="btn secondary" onClick={() => run("getRequiredDocuments", (r) => r.documents?.length ? `Documents: ${r.documents.map((d: { category: string; state: string }) => `${pretty(d.category)} (${d.state})`).join(", ")}. Upload on the secure page: PDF, PNG, JPG or TIF, under 10 MB.` : "No further documents are needed right now.")}>Required documents</button>
          <button className="btn secondary" onClick={() => run("getPaymentStatus", (r) => `Payment: ${pretty(r.paymentState)}. ${r.guidance}`)}>Payment and check</button>
          <button className="btn secondary" onClick={() => run("resendClaimNotice", (r) => r.message)}>Resend claim notice</button>
          <a className="btn secondary" href="#/upload">Open secure upload page</a>
          <button className="btn" onClick={() => escalate("Claimant requested an agent")}>Talk to a person</button>
        </div>
      )}

      {human && <div className="panel" role="region" aria-label="Transfer summary"><h2>Sanitized transfer summary</h2><pre>{human}</pre></div>}

      <form onSubmit={onFree} className="free">
        <label htmlFor="msg">Type a message</label>
        <input id="msg" name="msg" autoComplete="off" />
        <button className="btn secondary">Send</button>
      </form>
    </div>
  );
}
