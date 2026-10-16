// mikedai_OSC_claim_ops request handler (runtime-agnostic so it can be unit-tested).
// One Edge Function backs the narrow Genesys Data Actions (each action targets a fixed URL path
// = one operation, so no "operation" switch is exposed to the AVA) and the website. UNOFFICIAL DEMO - fictional data only.
import * as core from "../_shared/mikedai_OSC_core.ts";
import { Deps } from "../_shared/mikedai_OSC_types.ts";

export interface HandlerEnv {
  sharedKey: string;                 // mikedai_OSC_DATAACTION_API_KEY (Genesys server-to-server)
  allowedOrigins: string[];          // approved Pages + local dev origins
  demoRevealCode: boolean;           // demo-only: lets the website show the simulated code
}

const json = (status: number, body: unknown, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });

export function corsHeaders(origin: string | null, env: HandlerEnv): Record<string, string> {
  const ok = !!origin && env.allowedOrigins.includes(origin);
  return ok
    ? { "access-control-allow-origin": origin!, "access-control-allow-headers": "content-type, authorization, apikey, x-mikedai-osc-key", "vary": "origin" }
    : { "vary": "origin" };
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length || !a) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// deno-lint-ignore no-explicit-any
type Body = Record<string, any>;

export async function handle(req: Request, deps: Deps, env: HandlerEnv): Promise<Response> {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin, env);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" }, cors);

  const fromGenesys = timingSafeEqual(req.headers.get("x-mikedai-osc-key") ?? "", env.sharedKey);
  const fromApprovedOrigin = !!origin && env.allowedOrigins.includes(origin);
  if (!fromGenesys && !fromApprovedOrigin) return json(401, { ok: false, error: "UNAUTHORIZED" }, cors);

  let b: Body;
  try { b = await req.json(); } catch { return json(400, { ok: false, error: "BAD_REQUEST" }, cors); }

  try {
    // Genesys Data Actions call /<operation>; the website sends {operation} to the function root.
    const last = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
    const op = last in GENESYS_OUTPUT_KEYS || last === "recognizeCaller" ? last : String(b.operation ?? "");
    const out = await core.withRetry(() => dispatch(op, b, deps, env, fromGenesys));
    return json(200, fromGenesys ? project(op, out) : out, cors);
  } catch {
    // Never echo internals or inputs.
    return json(200, { ok: false, error: "SERVICE_UNAVAILABLE", message: "This service is temporarily unavailable.", humanHelpRecommended: true }, cors);
  }
}

/**
 * Allow-listed response fields for each Genesys-facing operation. Anything else (internal IDs, amounts,
 * hashes) is dropped before it can reach Genesys. The Data Action output contracts are generated from this map.
 */
export const GENESYS_OUTPUT_KEYS: Record<string, string[]> = {
  generateSecurityCode: ["securityCode", "smsMessage"],
  recognizeCaller: ["recognized", "firstName"],
  verifyClaimIdentity: ["outcome", "sessionId", "maskedDestination", "deliverySimulated", "message", "humanHelpRecommended"],
  validateVerificationCode: ["outcome", "verificationToken", "expiresInSeconds", "message", "humanHelpRecommended"],
  getClaimSummary: ["ok", "error", "message", "status", "statusChangedOn", "whatIsHappening", "nextAction", "processingWindow", "ownerDeceased", "documents", "furtherActionNeeded", "paymentState", "mailedOn", "mailingAddressMasked", "guidance", "humanHelpRecommended"],
  startClaim: ["ok", "error", "claimId", "escalationRecommended", "submittedToOsc", "message"],
  sendNotice: ["ok", "error", "deliverySimulated", "message"],
  createServiceCase: ["ok", "caseId", "summary", "queueId"],
};

export function project(op: string, out: unknown): unknown {
  const keys = GENESYS_OUTPUT_KEYS[op];
  if (!keys || !out || typeof out !== "object") return out;
  const o = out as Record<string, unknown>;
  const r: Record<string, unknown> = {};
  for (const k of keys) if (o[k] !== undefined) r[k] = o[k];
  return r;
}

/**
 * Operations that accept or reveal a caller-chosen verification code. Only the Genesys key may use them:
 * an Origin header is spoofable by non-browser clients, so an origin-authenticated caller must never be able
 * to pick (or fetch) the code it then validates, which would bypass the one-time-code check.
 */
export const GENESYS_ONLY_OPS = new Set(["generateSecurityCode", "verifyClaimIdentity"]);

/**
 * The value the Genesys agent holds (securityCode, undisclosed) is NOT the digits delivered to the caller:
 * the delivered code is derived from it server-side. A caller who types the delivered digits therefore never
 * sends a message identical to the hidden value, so platform redaction of the hidden value cannot alter it.
 */
export async function deliveredCode(d: Deps, hidden: string): Promise<string> {
  const h = await d.hmac(`otp:${hidden}`);
  let n = 0;
  for (const ch of h.replace(/[^0-9a-f]/gi, "").slice(0, 10)) n = (n * 16 + parseInt(ch, 16)) % 1_000_000;
  return String(n).padStart(6, "0");
}

export async function dispatch(op: string, b: Body, d: Deps, env: HandlerEnv, fromGenesys: boolean) {
  if (GENESYS_ONLY_OPS.has(op) && !fromGenesys) return { ok: false, error: "UNKNOWN_OPERATION", message: "Unsupported operation." };
  switch (op) {
    case "generateSecurityCode": {
      const securityCode = core.generateSecurityCode(); // hidden value, ^[0-9]{6}$, string, leading zeros kept
      return { ok: true, securityCode, smsMessage: core.verificationSmsText(await deliveredCode(d, securityCode)) };
    }
    case "recognizeCaller": return core.recognizeCaller(d, String(b.ani ?? ""));
    case "startClaim": {
      const destination = String(b.destination ?? "");
      const channel = b.channel ?? (destination.includes("@") ? "email" : "sms"); // Genesys path infers it
      return core.startClaim(d, { lastName: b.lastName, zip: b.zip, dob: b.dob, relationship: b.relationship, channel, destination, demoAcknowledged: b.demoAcknowledged === true });
    }
    case "verifyClaimIdentity": return core.verifyClaimIdentity(d, { sessionId: b.sessionId, claimId: b.claimId, lastName: b.lastName, zip: b.zip, dob: b.dob, securityCode: await deliveredCode(d, String(b.securityCode ?? "")) });
    case "getClaimSummary": return core.getClaimSummary(d, b.verificationToken);
    case "sendNotice": return core.sendNotice(d, { token: b.verificationToken, kind: b.kind === "upload_link" ? "upload_link" : "claim_notice" });
    case "beginVerification": return core.beginVerification(d, { sessionId: b.sessionId, claimId: b.claimId, lastName: b.lastName, zip: b.zip, dob: b.dob });
    case "sendVerificationCode": {
      // Genesys supplies the code from mikedai_OSC_SecurityCodeGenerator; the website path generates it server-side.
      // A caller-supplied code is honored only for the Genesys key; origin callers always get a server-generated one.
      const supplied = fromGenesys && b.securityCode ? await deliveredCode(d, String(b.securityCode)) : "";
      const securityCode = supplied || core.generateSecurityCode();
      const r = await core.sendVerificationCode(d, { sessionId: b.sessionId, securityCode });
      // The code is never returned to Genesys. Website demo reveal is explicit opt-in and off by default.
      return env.demoRevealCode && !fromGenesys && r.ok ? { ...r, demoCode: securityCode } : r;
    }
    case "validateVerificationCode": return core.validateVerificationCode(d, { sessionId: b.sessionId, code: String(b.code ?? "") });
    case "getClaimStatus": return core.getClaimStatus(d, b.verificationToken);
    case "getRequiredDocuments": return core.getRequiredDocuments(d, b.verificationToken);
    case "createUploadReceipt": return core.createUploadReceipt(d, { token: b.verificationToken, category: b.category, fileType: String(b.fileType ?? ""), sizeBytes: Number(b.sizeBytes) });
    case "resendClaimNotice": return core.resendClaimNotice(d, b.verificationToken);
    case "getPaymentStatus": return core.getPaymentStatus(d, b.verificationToken);
    case "createServiceCase": {
      // Website/legacy callers send a nested summary; Genesys sends flat, narrow inputs.
      const summary = b.summary ?? {
        reason: String(b.reason ?? ""), inquiry: ["self", "representative"].includes(b.inquiry) ? b.inquiry : "unknown",
        verification: ["verified", "failed", "locked"].includes(b.verification) ? b.verification : "unverified",
        automationCompleted: b.automationCompleted,
      };
      return core.createServiceCase(d, { token: b.verificationToken, reason: String(b.reason ?? summary.reason ?? ""), summary });
    }
    default: return { ok: false, error: "UNKNOWN_OPERATION", message: "Unsupported operation." };
  }
}
