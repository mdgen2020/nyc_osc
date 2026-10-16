// mikedai_OSC_ core business logic, shared by voice, digital and the website.
// UNOFFICIAL DEMO - fictional data only. Pure logic over the Store port; no I/O of its own.
import {
  Claim, Deps, DocCategory, NEUTRAL_FAILURE, POLICY, PROCESSING_WINDOWS, StatusCode,
} from "./mikedai_OSC_types.ts";

const iso = (d: Date) => d.toISOString();
const plus = (d: Date, s: number) => new Date(d.getTime() + s * 1000);
const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase();
const CODE_RE = /^[0-9]{6}$/;

/** YYYY-MM-DD from a Postgres `date` value. postgres.js returns a Date (UTC midnight) for date columns, so String(value) is not safe. */
export function dateOnly(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").slice(0, 10);
}

export function maskClaimRef(ref: string): string {
  return ref.length <= 2 ? "••" : `${ref.slice(0, 5)}••••${ref.slice(-2)}`;
}
export function normalizeAni(ani: string): string {
  const d = (ani ?? "").replace(/\D/g, "");
  return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : "";
}

/** Redacts anything that must never reach summaries, logs or handoffs. */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
    .replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[date]")
    .replace(/\bDEMO-\d{6}\b/gi, "[claim-id]")
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[ssn]")
    .replace(/\b\d{5,}\b/g, "[number]");
}

// ---------------------------------------------------------------- caller recognition
export async function recognizeCaller(d: Deps, ani: string) {
  const n = normalizeAni(ani);
  if (!n) return { recognized: false as const };
  const hit = await d.store.findRecognition(await d.hmac(n));
  // ANI is a convenience signal only. Never reveals whether a claim exists.
  return hit ? { recognized: true as const, firstName: hit.firstName } : { recognized: false as const };
}

// ---------------------------------------------------------------- stage 1: start a claim (fictional)
const ESCALATE_RELATIONSHIPS = new Set([
  "estate", "minor_child", "parent_or_dependent", "guardian", "power_of_attorney",
  "trustee", "business_representative", "legal_representative", "unsupported",
]);

export async function startClaim(
  d: Deps,
  i: { lastName: string; zip: string; dob?: string; relationship: string; channel: "sms" | "email"; destination: string; demoAcknowledged: boolean },
) {
  if (!i.demoAcknowledged) return { ok: false as const, error: "DEMO_ACK_REQUIRED" };
  const escalate = ESCALATE_RELATIONSHIPS.has(i.relationship);
  const ref = d.randomRef("DEMO-");
  const claim = await d.store.createClaim(
    {
      claimRef: ref, lastName: i.lastName, zip: i.zip, dob: i.dob ?? null,
      ownerDeceased: i.relationship === "estate", statusCode: "processing",
      statusChangedOn: iso(d.now()).slice(0, 10),
      nextAction: escalate
        ? "A specialist will confirm the documents needed for this type of claim."
        : "Watch for a confirmation email; it explains whether more information is needed.",
      humanHelpRecommended: escalate,
    },
    { channel: i.channel, destination: i.destination, masked: maskDestination(i.channel, i.destination) },
  );
  await d.store.audit("start_claim", null, escalate ? "escalation_recommended" : "created");
  return {
    ok: true as const, claimId: claim.claimRef, escalationRecommended: escalate,
    submittedToOsc: false, // demo never submits anything to OSC
    message: PROCESSING_WINDOWS.confirmationEmail,
  };
}

export function maskDestination(channel: "sms" | "email", dest: string): string {
  if (channel === "sms") {
    const digits = dest.replace(/\D/g, "");
    return `•••-•••-${digits.slice(-2).padStart(2, "•")}`;
  }
  const [u, host = ""] = dest.split("@");
  return `${u.slice(0, 1)}•••@${host.slice(0, 1)}•••${host.includes(".") ? host.slice(host.lastIndexOf(".")) : ""}`;
}

// ---------------------------------------------------------------- verification
export type VerifyOutcome = "attributes_ok" | "failed" | "locked" | "unavailable";

/** Step 1: two matching attributes. Neutral failure for not-found AND mismatch (no enumeration). */
export async function beginVerification(
  d: Deps,
  i: { sessionId?: string; claimId?: string; lastName?: string; zip?: string; dob?: string },
) {
  const now = d.now();
  let session = i.sessionId ? await d.store.getSession(i.sessionId) : null;
  if (!session || new Date(session.expiresAt) < now) {
    session = await d.store.createSession(null, iso(plus(now, POLICY.sessionTtlSeconds)));
  }
  if (session.lockedUntil && new Date(session.lockedUntil) > now) {
    await d.store.audit("begin_verification", session.id, "locked");
    return { outcome: "locked" as VerifyOutcome, sessionId: session.id, message: NEUTRAL_FAILURE, humanHelpRecommended: true };
  }
  // Scoped counter: keyed hash of what was typed (found or not), so a new session cannot reset it
  // and "not found" behaves exactly like "mismatch". With a Claim ID the scope is that ID. Without one (the
  // simplified demo asks for last name, ZIP and date of birth only) the scope is the last name, so varying the
  // ZIP or date of birth on each guess cannot dodge the limit.
  const counterKey = await d.hmac(
    i.claimId ? `attr:id:${norm(i.claimId)}`
      : norm(i.lastName) ? `attr:ln:${norm(i.lastName)}`
      : `attr:attrs:${norm(i.zip)}|${norm(i.dob)}`,
  );
  const counter = await d.store.getCounter(counterKey);
  if (counter?.lockedUntil && new Date(counter.lockedUntil) > now) {
    await d.store.audit("begin_verification", session.id, "locked_claim_scope");
    return { outcome: "locked" as VerifyOutcome, sessionId: session.id, message: NEUTRAL_FAILURE, humanHelpRecommended: true };
  }
  const priorAttempts = counter && !(counter.lockedUntil && new Date(counter.lockedUntil) <= now) ? counter.attempts : 0;

  const provided = [i.lastName, i.zip, i.dob].filter((v) => v && v.trim()).length;
  let claim: Claim | null = null;
  if (provided >= 2) {
    if (i.claimId) {
      const c = await d.store.findClaimByRef(i.claimId.trim().toUpperCase());
      if (c && matchCount(c, i) >= 2) claim = c;
    } else {
      // Claim ID recovery path: attributes only (last name + ZIP and/or DOB), unique match required.
      const cs = await d.store.findClaimsByAttributes(i.lastName ?? "", i.zip ?? null, i.dob ?? null);
      // Every attribute the caller gave must match (the Postgres store already filters this way), and a unique claim is required.
      const ok = cs.filter((c) => matchCount(c, i) >= provided);
      if (ok.length === 1) claim = ok[0];
    }
  }

  if (!claim) {
    const attempts = Math.max(session.attributeAttempts, priorAttempts) + 1;
    const lock = attempts >= POLICY.maxAttributeAttempts;
    await d.store.putCounter(counterKey, lock ? 0 : attempts, lock ? iso(plus(now, POLICY.lockoutSeconds)) : null);
    await d.store.updateSession(session.id, {
      attributeAttempts: attempts, state: lock ? "locked" : "failed",
      lockedUntil: lock ? iso(plus(now, POLICY.lockoutSeconds)) : null,
    });
    await d.store.audit("begin_verification", session.id, lock ? "locked" : "failed");
    return {
      outcome: (lock ? "locked" : "failed") as VerifyOutcome, sessionId: session.id,
      message: NEUTRAL_FAILURE, humanHelpRecommended: lock,
    };
  }

  const contact = await d.store.findContact(claim.id);
  if (!contact) {
    await d.store.audit("begin_verification", session.id, "no_contact");
    return { outcome: "unavailable" as VerifyOutcome, sessionId: session.id, message: NEUTRAL_FAILURE, humanHelpRecommended: true };
  }
  await d.store.putCounter(counterKey, 0, null);
  // A re-check on an existing session (resend) must not reset resend counters or verified state.
  const keepState = session.state === "code_sent" || session.state === "verified";
  await d.store.updateSession(session.id, keepState ? { claimId: claim.id } : { claimId: claim.id, state: "attributes_ok" });
  await d.store.audit("begin_verification", session.id, "attributes_ok");
  return {
    outcome: "attributes_ok" as VerifyOutcome, sessionId: session.id,
    maskedDestination: contact.masked, channel: contact.channel,
  };
}

function matchCount(c: Claim, i: { lastName?: string; zip?: string; dob?: string }): number {
  return (norm(i.lastName) && norm(i.lastName) === norm(c.lastName) ? 1 : 0) +
    (norm(i.zip) && norm(i.zip) === norm(c.zip) ? 1 : 0) +
    (norm(i.dob) && norm(i.dob) === norm(c.dob) ? 1 : 0);
}

/**
 * Step 2: deliver a code produced by the code-generator action. Only the hash is stored.
 * The code is never returned, logged or echoed.
 */
export async function sendVerificationCode(d: Deps, i: { sessionId: string; securityCode: string }) {
  const now = d.now();
  const s = await d.store.getSession(i.sessionId);
  if (!s || !s.claimId || s.state === "locked" || s.state === "failed" || s.state === "started" || new Date(s.expiresAt) < now) {
    return { ok: false as const, error: "NOT_ELIGIBLE", message: NEUTRAL_FAILURE };
  }
  if (!CODE_RE.test(i.securityCode)) {
    await d.store.audit("send_code", s.id, "invalid_code_format");
    return { ok: false as const, error: "INVALID_CODE_FORMAT", message: "A new code could not be prepared. Please try again." };
  }
  if (s.state === "code_sent") {
    if (s.resendCount >= POLICY.maxResends) {
      await d.store.audit("send_code", s.id, "resend_limit");
      return { ok: false as const, error: "RESEND_LIMIT", message: "The resend limit was reached.", humanHelpRecommended: true };
    }
    if (s.lastResendAt && now.getTime() - new Date(s.lastResendAt).getTime() < POLICY.resendThrottleSeconds * 1000) {
      return { ok: false as const, error: "RESEND_THROTTLED", message: "Please wait a moment before requesting another code." };
    }
  }
  const claim = await d.store.findContact(s.claimId);
  if (!claim) return { ok: false as const, error: "NO_CONTACT", message: NEUTRAL_FAILURE, humanHelpRecommended: true };

  await d.store.insertCode(s.id, await d.hmac(`${s.id}:${i.securityCode}`), iso(plus(now, POLICY.codeTtlSeconds)));
  const delivery = await d.deliverCode(claim, i.securityCode);
  await d.store.insertDelivery({ claimId: s.claimId, kind: "verification_code", simulated: delivery.simulated });
  await d.store.updateSession(s.id, {
    state: "code_sent", resendCount: s.state === "code_sent" ? s.resendCount + 1 : 0, lastResendAt: iso(now),
  });
  await d.store.audit("send_code", s.id, "sent");
  return {
    ok: true as const, deliverySimulated: delivery.simulated, maskedDestination: claim.masked,
    message: delivery.simulated
      ? "A code was prepared in the demo's simulated inbox. No real text or email was sent."
      : "A code was sent to the contact method on file.",
  };
}

/** Step 3: validate; single use, expiring, attempt-limited. Returns an opaque token only. */
export async function validateVerificationCode(d: Deps, i: { sessionId: string; code: string }) {
  const now = d.now();
  const s = await d.store.getSession(i.sessionId);
  if (!s || !s.claimId || new Date(s.expiresAt) < now) return { outcome: "failed" as const, message: NEUTRAL_FAILURE };
  if (s.lockedUntil && new Date(s.lockedUntil) > now) {
    return { outcome: "locked" as const, message: NEUTRAL_FAILURE, humanHelpRecommended: true };
  }
  const row = await d.store.getActiveCode(s.id);
  const good = !!row && !row.consumedAt && new Date(row.expiresAt) > now && CODE_RE.test(i.code) &&
    row.hash === await d.hmac(`${s.id}:${i.code}`);
  if (!good) {
    const attempts = s.codeAttempts + 1;
    const lock = attempts >= POLICY.maxCodeAttempts;
    await d.store.updateSession(s.id, {
      codeAttempts: attempts, state: lock ? "locked" : s.state,
      lockedUntil: lock ? iso(plus(now, POLICY.lockoutSeconds)) : null,
    });
    await d.store.audit("validate_code", s.id, lock ? "locked" : "failed");
    return { outcome: (lock ? "locked" : "failed") as "locked" | "failed", message: NEUTRAL_FAILURE, humanHelpRecommended: lock };
  }
  await d.store.consumeCode(row!.id, iso(now));
  const token = d.randomToken();
  await d.store.insertToken({
    hash: await d.hmac(`token:${token}`), sessionId: s.id, claimId: s.claimId,
    expiresAt: iso(plus(now, POLICY.tokenTtlSeconds)),
  });
  await d.store.updateSession(s.id, { state: "verified" });
  // Demo repeatability: a correct code proves the caller got the message, so clear the per-claim send limit (the
  // wrong-code and wrong-attribute limits are untouched).
  await d.store.putCounter(await d.hmac(`send:${s.claimId}`), 0, null);
  await d.store.audit("validate_code", s.id, "verified");
  return { outcome: "verified" as const, verificationToken: token, expiresInSeconds: POLICY.tokenTtlSeconds };
}

async function authorize(d: Deps, token: string | undefined) {
  if (!token) return null;
  const t = await d.store.getToken(await d.hmac(`token:${token}`));
  if (!t || new Date(t.expiresAt) < d.now()) return null;
  return t;
}
export const UNVERIFIED = { ok: false as const, error: "VERIFICATION_REQUIRED", message: "Please verify first to access claim details." };

// ---------------------------------------------------------------- stages 3-7 (all behind the token)
const STATUS_TEXT: Record<StatusCode, { what: string; window: string }> = {
  processing: { what: "The claim is being processed.", window: PROCESSING_WINDOWS.noActionNeeded },
  documents_required: { what: "More documents are needed before review can continue.", window: PROCESSING_WINDOWS.afterDocuments },
  documents_received: { what: "Documents were received and are waiting for review.", window: PROCESSING_WINDOWS.afterDocuments },
  under_review: { what: "The claim is under review.", window: PROCESSING_WINDOWS.afterDocuments },
  additional_info_required: { what: "Additional information was requested.", window: PROCESSING_WINDOWS.afterDocuments },
  verification_in_progress: { what: "Verification of the claim is in progress.", window: PROCESSING_WINDOWS.afterDocuments },
  manual_review: { what: "The claim is in manual review.", window: PROCESSING_WINDOWS.afterDocuments },
  approved: { what: "The claim was approved.", window: PROCESSING_WINDOWS.paymentMailing },
  check_preparing: { what: "A check is being prepared.", window: PROCESSING_WINDOWS.paymentMailing },
  check_mailed: { what: "A check was mailed.", window: PROCESSING_WINDOWS.cashCheck },
  check_not_received: { what: "A check was reported as not received.", window: PROCESSING_WINDOWS.paymentMailing },
  closed: { what: "The claim is closed.", window: "" },
};

export async function getClaimStatus(d: Deps, token: string) {
  const t = await authorize(d, token);
  if (!t) return UNVERIFIED;
  const [docs, claim] = [await d.store.getRequestedDocs(t.claimId), await findById(d, t.claimId)];
  if (!claim) return { ok: false as const, error: "STATUS_UNAVAILABLE", message: "Status is unavailable right now." };
  const required = docs.filter((x) => x.state === "required").length;
  const received = docs.filter((x) => x.state !== "required").length;
  const txt = STATUS_TEXT[claim.statusCode];
  await d.store.audit("get_status", t.sessionId, claim.statusCode);
  return {
    ok: true as const, status: claim.statusCode, statusChangedOn: claim.statusChangedOn,
    whatIsHappening: txt.what, nextAction: claim.nextAction, processingWindow: txt.window,
    documentStatus: { required, received },
    humanHelpRecommended: claim.humanHelpRecommended || claim.ownerDeceased,
    ownerDeceased: claim.ownerDeceased,
    // The claim amount is intentionally never returned (OSC does not disclose it by phone).
  };
}

const findById = (d: Deps, claimId: string): Promise<Claim | null> => d.store.findClaimById(claimId);

export async function getRequiredDocuments(d: Deps, token: string) {
  const t = await authorize(d, token);
  if (!t) return UNVERIFIED;
  const docs = await d.store.getRequestedDocs(t.claimId);
  const pending = docs.filter((x) => x.state === "required");
  return {
    ok: true as const, documents: docs, furtherActionNeeded: pending.length > 0,
    upload: { maxSizeMb: 10, formats: ["PDF", "PNG", "JPG", "TIF"], note: "Documents are never collected by voice." },
  };
}

export async function createUploadReceipt(
  d: Deps, i: { token: string; category: DocCategory; fileType: string; sizeBytes: number },
) {
  const t = await authorize(d, i.token);
  if (!t) return UNVERIFIED;
  const ft = i.fileType.toLowerCase().replace("jpeg", "jpg").replace("tiff", "tif");
  if (!(POLICY.allowedFileTypes as readonly string[]).includes(ft)) return { ok: false as const, error: "UNSUPPORTED_FILE_TYPE", message: "Accepted formats are PDF, PNG, JPG and TIF." };
  if (i.sizeBytes <= 0 || i.sizeBytes > POLICY.maxUploadBytes) return { ok: false as const, error: "FILE_TOO_LARGE", message: "Files must be under 10 MB." };
  const ref = d.randomRef("RCPT-");
  await d.store.insertReceipt({ ref, claimId: t.claimId, category: i.category, fileType: ft, sizeBytes: i.sizeBytes });
  await d.store.markDocReceived(t.claimId, i.category);
  await d.store.audit("upload_receipt", t.sessionId, "created");
  return { ok: true as const, receiptId: ref, message: PROCESSING_WINDOWS.afterDocuments };
}

export async function resendClaimNotice(d: Deps, token: string) {
  const t = await authorize(d, token);
  if (!t) return UNVERIFIED;
  await d.store.insertDelivery({ claimId: t.claimId, kind: "claim_notice", simulated: true });
  await d.store.audit("resend_notice", t.sessionId, "simulated");
  return { ok: true as const, deliverySimulated: true, message: "The claim notice was resent in the demo's simulated inbox. No real email or text was sent." };
}

const PAYMENT_ESCALATE = new Set(["check_not_received", "lost_check", "incorrect_payee_or_address", "expired_check", "check_cannot_be_cashed"]);

export async function getPaymentStatus(d: Deps, token: string) {
  const t = await authorize(d, token);
  if (!t) return UNVERIFIED;
  const p = await d.store.getPayment(t.claimId);
  const claim = await findById(d, t.claimId);
  const state = p?.state ?? "none";
  await d.store.audit("get_payment", t.sessionId, state);
  return {
    ok: true as const, paymentState: state, mailedOn: p?.mailedOn ?? undefined,
    mailingAddressMasked: p?.addressMasked ?? undefined,
    guidance: state === "check_mailed" ? PROCESSING_WINDOWS.cashCheck : PROCESSING_WINDOWS.paymentMailing,
    humanHelpRecommended: PAYMENT_ESCALATE.has(state) || !!claim?.ownerDeceased,
  };
}

/**
 * Consolidated Genesys operation: attribute check + delivery of the generator's code in one deterministic call.
 * Never returns the code. Retries (resend) pass the same sessionId and a fresh code.
 */
export async function verifyClaimIdentity(
  d: Deps,
  i: { sessionId?: string; claimId?: string; lastName?: string; zip?: string; dob?: string; securityCode: string },
) {
  const b = await beginVerification(d, i);
  if (b.outcome !== "attributes_ok") {
    return { outcome: b.outcome, sessionId: b.sessionId, message: b.message, humanHelpRecommended: b.humanHelpRecommended };
  }
  // Claim-scoped send throttle/limit: the AVA path may not carry a sessionId, so per-session limits alone are bypassable.
  const now = d.now();
  const sess = await d.store.getSession(b.sessionId);
  const sendKey = await d.hmac(`send:${sess?.claimId ?? b.sessionId}`);
  const sc = await d.store.getCounter(sendKey);
  if (sc?.lockedUntil && new Date(sc.lockedUntil) > now) {
    const limit = sc.attempts >= POLICY.maxResends + 1;
    return {
      outcome: "throttled" as const, sessionId: b.sessionId, humanHelpRecommended: limit,
      message: limit ? "The resend limit was reached." : "Please wait a moment before requesting another code.",
    };
  }
  const sends = sc && sc.attempts < POLICY.maxResends + 1 ? sc.attempts : 0;
  const s = await sendVerificationCode(d, { sessionId: b.sessionId, securityCode: i.securityCode });
  if (s.ok) {
    const n = sends + 1;
    await d.store.putCounter(sendKey, n, iso(plus(now, n >= POLICY.maxResends + 1 ? POLICY.lockoutSeconds : POLICY.resendThrottleSeconds)));
  }
  if (!s.ok) {
    const throttled = s.error === "RESEND_THROTTLED" || s.error === "RESEND_LIMIT";
    return {
      outcome: (throttled ? "throttled" : "unavailable") as "throttled" | "unavailable",
      sessionId: b.sessionId, message: s.message,
      humanHelpRecommended: s.error === "RESEND_LIMIT" || s.error === "NO_CONTACT",
    };
  }
  return {
    outcome: "code_sent" as const, sessionId: b.sessionId, maskedDestination: s.maskedDestination,
    deliverySimulated: s.deliverySimulated, message: s.message, humanHelpRecommended: false,
  };
}

/** Consolidated read: status + required documents + payment, all behind the verification token. */
export async function getClaimSummary(d: Deps, token: string) {
  const st = await getClaimStatus(d, token);
  if (!st.ok) return st;
  const docs = await getRequiredDocuments(d, token);
  const pay = await getPaymentStatus(d, token);
  if (!docs.ok || !pay.ok) return { ok: false as const, error: "STATUS_UNAVAILABLE", message: "Status is unavailable right now." };
  return {
    ok: true as const, status: st.status, statusChangedOn: st.statusChangedOn, whatIsHappening: st.whatIsHappening,
    nextAction: st.nextAction, processingWindow: st.processingWindow, ownerDeceased: st.ownerDeceased,
    documents: docs.documents, furtherActionNeeded: docs.furtherActionNeeded,
    paymentState: pay.paymentState, mailedOn: pay.mailedOn, mailingAddressMasked: pay.mailingAddressMasked,
    guidance: pay.guidance, humanHelpRecommended: st.humanHelpRecommended || pay.humanHelpRecommended,
  };
}

/** Simulated notice / upload-link delivery; nothing real is sent. */
export async function sendNotice(d: Deps, i: { token: string; kind: "claim_notice" | "upload_link" }) {
  const t = await authorize(d, i.token);
  if (!t) return UNVERIFIED;
  if (i.kind === "claim_notice") return resendClaimNotice(d, i.token);
  await d.store.insertDelivery({ claimId: t.claimId, kind: "upload_link", simulated: true });
  await d.store.audit("send_upload_link", t.sessionId, "simulated");
  return {
    ok: true as const, deliverySimulated: true,
    message: "The upload page link was prepared in the demo's simulated inbox. Documents are never collected by voice.",
  };
}

// ---------------------------------------------------------------- escalation / summaries
export interface SummaryInput {
  reason: string; inquiry: "self" | "representative" | "unknown"; relationship?: string;
  verification: "verified" | "unverified" | "failed" | "locked"; statusCategory?: string;
  automationCompleted?: string; documents?: string; resolution?: string; outstanding?: string;
  transferReason?: string; recommendedNext?: string;
}

/** Builds a sanitized summary from allow-listed fields only. */
export function buildSummary(i: SummaryInput): string {
  const f = (label: string, v?: string) => (v ? `${label}: ${sanitizeText(v)}` : "");
  return [
    f("Reason", i.reason), `Inquiry: ${i.inquiry}`, f("Relationship", i.relationship),
    `Verification: ${i.verification}`, f("Status category", i.statusCategory),
    f("Automation completed", i.automationCompleted), f("Documents", i.documents),
    f("Resolution", i.resolution), f("Outstanding", i.outstanding),
    f("Transfer reason", i.transferReason), f("Recommended next step", i.recommendedNext),
  ].filter(Boolean).join("\n");
}

export async function createServiceCase(
  d: Deps, i: { token?: string; reason: string; summary: SummaryInput },
) {
  const t = await authorize(d, i.token);
  const ref = d.randomRef("CASE-");
  // Verification state is derived from the token, never self-reported: without a valid token "verified" is downgraded.
  const claimed = i.summary.verification === "verified" ? "unverified" : i.summary.verification;
  const summary = buildSummary({ ...i.summary, verification: t ? "verified" : claimed });
  await d.store.insertCase({ ref, claimId: t?.claimId ?? null, reason: sanitizeText(i.reason), summary });
  await d.store.audit("service_case", t?.sessionId ?? null, "created");
  return {
    ok: true as const, caseId: ref, summary,
    // Escalation always targets the exact immutable queue ID.
    queueId: ESCALATION_QUEUE_ID,
  };
}
export const ESCALATION_QUEUE_ID = "dc15ad2c-7917-413f-9a00-4f52df4d4602";

/** Cryptographically random 6-digit code as a string; leading zeros preserved. Rejection-sampled (no modulo bias). */
export function generateSecurityCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

/**
 * Ready-made text for the Genesys "Agentless SMS" action. The AVA never sees the code (undisclosed output) and cannot
 * compose text containing it, so the server supplies the complete body. No link, no claim data, no personal data.
 */
export function verificationSmsText(code: string): string {
  return `Unofficial demo (fictional data): your verification code is ${code}. It expires in ${POLICY.codeTtlSeconds / 60} minutes. Do not share it.`;
}

/** Retries transient store failures (timeouts) a bounded number of times with no sensitive logging. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 150): Promise<T> {
  let last: unknown;
  for (let n = 0; n < attempts; n++) {
    try { return await fn(); } catch (e) { last = e; if (n < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (n + 1))); }
  }
  throw last;
}
