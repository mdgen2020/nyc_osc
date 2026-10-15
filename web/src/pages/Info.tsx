import { clearSession } from "../lib/session";

export function Accessibility() {
  return (
    <section>
      <h1>Accessibility statement</h1>
      <p>This demonstration is designed to meet WCAG 2.1 AA: keyboard operable, visible focus, sufficient color contrast, semantic headings and landmarks, labeled form fields, and responsive layouts from small phones to desktop.</p>
      <p>This is a demo and has not had a formal accessibility audit. If you find a barrier, tell the demo owner. For the official service, use the accessibility information on the real OSC website.</p>
    </section>
  );
}

export function Privacy() {
  return (
    <section>
      <h1>Privacy notice</h1>
      <ul>
        <li>This site is a demonstration. Use fictional information only.</li>
        <li>The entry form stores only your reason for visiting, whether you have a Claim ID, your language choice and your acknowledgment, in this browser tab's session storage.</li>
        <li>Claim IDs, verification answers, codes and tokens are never placed in web addresses or session storage.</li>
        <li>Fictional codes are simulated; no real text or email is sent. Uploaded files are not stored.</li>
      </ul>
      <button className="btn secondary" onClick={() => { clearSession(); location.hash = "#/"; }}>End demo and clear session</button>
    </section>
  );
}
