export const STAGES = [
  ["Find property and submit a claim", "Search for your name, then file a claim and choose your relationship to the owner."],
  ["Receive or recover your Claim ID", "Your Claim ID is in your confirmation email, mailed letter, or claim form. We can help you recover it."],
  ["See whether more information is needed", "After a short check, you can learn which documents, if any, your claim needs."],
  ["Check your claim status", "See the current status, the latest change date and your next step."],
  ["Submit required documents", "Upload PDF, PNG, JPG or TIF files under 10 MB on a secure page."],
  ["Wait for review", "Respond to any follow-up requests while the claim is reviewed."],
  ["Approval and payment", "Learn about approval and check mailing, or get help with a check problem."],
] as const;

export function StageMap() {
  return (
    <section aria-labelledby="stages-h">
      <h2 id="stages-h">The claim journey in seven stages</h2>
      <ol className="stages">
        {STAGES.map(([title, text], i) => (
          <li key={title}>
            <span className="num" aria-hidden="true">{i + 1}</span>
            <div><h3>{title}</h3><p>{text}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
