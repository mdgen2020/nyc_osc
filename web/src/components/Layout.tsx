import { ReactNode } from "react";

export const OSC_URL = "https://www.osc.ny.gov/unclaimed-funds";

export function DemoBanner() {
  return (
    <div className="demo-banner" role="region" aria-label="Demonstration notice">
      <strong>Demonstration Only — Not an Official New York State OSC Website.</strong> Do not enter real personal information.{" "}
      <a href={OSC_URL} rel="noopener noreferrer">Go to the real OSC Unclaimed Funds site</a>
    </div>
  );
}

const NAV = [
  ["#/", "Home"], ["#/start", "Get help"], ["#/upload", "Upload documents"],
  ["#/accessibility", "Accessibility"], ["#/privacy", "Privacy"],
] as const;

export function Layout({ children, current }: { children: ReactNode; current: string }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <DemoBanner />
      <header className="site-header">
        <div className="wrap">
          <p className="brand">Unclaimed Funds Claim Services <span className="tag">Demo</span></p>
          <nav aria-label="Primary">
            <ul>
              {NAV.map(([href, label]) => (
                <li key={href}><a href={href} aria-current={current === href ? "page" : undefined}>{label}</a></li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="wrap">{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <p>
            This is an unofficial demonstration built for a Genesys Cloud showcase. It is not operated by, affiliated with,
            or endorsed by the New York State Office of the State Comptroller. All people, claims, phone numbers and emails are fictional.
          </p>
          <p><a href={OSC_URL} rel="noopener noreferrer">Official OSC Unclaimed Funds website</a></p>
        </div>
      </footer>
    </>
  );
}
