// Genesys Web Messenger launcher. Passes only approved, non-sensitive context.
import type { EntryContext } from "./session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = (...a: any[]) => void;
declare global { interface Window { Genesys?: G & { q?: unknown[] }; _genesysJs?: string } }

export interface MessengerConfig { deploymentId: string; environment: string }

export function messengerConfig(): MessengerConfig | null {
  const deploymentId = import.meta.env.VITE_GENESYS_DEPLOYMENT_ID as string | undefined;
  // `||` not `??`: CI passes an empty string when the repo variable is unset, and Genesys then refuses to load.
  const environment = (import.meta.env.VITE_GENESYS_ENVIRONMENT as string | undefined) || "prod";
  return deploymentId ? { deploymentId, environment } : null;
}

/** Only these keys ever leave the page. */
export function approvedContext(c: EntryContext) {
  return {
    mikedai_OSC_reason: c.reason,
    mikedai_OSC_hasClaimId: c.hasClaimId,
    mikedai_OSC_language: c.language,
    mikedai_OSC_source: "github-pages-demo",
  };
}

/** Returns true when Messenger was launched; false means "use the local-demo chat". */
export function launchMessenger(c: EntryContext, cfg = messengerConfig()): boolean {
  if (!cfg) return false;
  let loadedNow = false;
  if (!window.Genesys) {
    loadedNow = true;
    const g: G & { q?: unknown[]; t?: number; c?: unknown } = function (...a: unknown[]) { (g.q = g.q ?? []).push(a); } as never;
    window._genesysJs = "Genesys";
    window.Genesys = g;
    g.t = Date.now();
    g.c = { environment: cfg.environment, deploymentId: cfg.deploymentId };
    const s = document.createElement("script");
    s.async = true; s.charset = "utf-8";
    s.src = `https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js`;
    document.head.appendChild(s);
  }
  // Always call window.Genesys at call time: once the bootstrap loads it REPLACES the queue stub above, and commands sent
  // to a stale reference are silently dropped (this is why the chat window used to stay closed).
  const G: G = (...a: unknown[]) => window.Genesys!(...a);
  const open = () => {
    G("command", "Database.set", { messaging: { customAttributes: approvedContext(c) } });
    G("command", "Messenger.open");
  };
  // The Messenger plugin only exists once the deployment config has loaded, so on first load wait for Messenger.ready.
  if (loadedNow) G("subscribe", "Messenger.ready", () => open()); else open();
  return true;
}
