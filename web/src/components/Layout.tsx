import { ReactNode } from "react";

export const OSC_URL = "https://www.osc.ny.gov/unclaimed-funds";

const NAV = [
  ["#/", "Home"], ["#/start", "Get help"], ["#/upload", "Upload documents"],
  ["#/accessibility", "Accessibility"], ["#/privacy", "Privacy"],
] as const;

export function Layout({ children, current }: { children: ReactNode; current: string }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="wrap">
          <p className="brand">Unclaimed Funds Claim Services</p>
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
          <p>Prototype for demonstration purposes. Not affiliated with the New York State Office of the State Comptroller.</p>
          <p><a href={OSC_URL} rel="noopener noreferrer">Official OSC Unclaimed Funds website</a></p>
        </div>
      </footer>
    </>
  );
}
