// mikedai_OSC_ shared types. UNOFFICIAL DEMO - fictional data only.

export type StatusCode =
  | "processing" | "documents_required" | "documents_received" | "under_review"
  | "additional_info_required" | "verification_in_progress" | "manual_review"
  | "approved" | "check_preparing" | "check_mailed" | "check_not_received" | "closed";

export type PaymentState =
  | "none" | "approved" | "check_preparing" | "check_mailed" | "check_not_received"
  | "lost_check" | "incorrect_payee_or_address" | "expired_check" | "check_cannot_be_cashed";

export type DocCategory =
  | "signed_claim_form" | "proof_old_address" | "proof_ownership" | "name_change"
  | "estate_documentation" | "representative_authorization" | "other";

export interface Claim {
  id: string; claimRef: string; lastName: string; zip: string; dob: string | null;
  ownerDeceased: boolean; statusCode: StatusCode; statusChangedOn: string;
  nextAction: string; humanHelpRecommended: boolean;
}
export interface Contact { claimId: string; channel: "sms" | "email"; destination: string; masked: string }
export interface Session {
  id: string; claimId: string | null;
  state: "started" | "attributes_ok" | "code_sent" | "verified" | "failed" | "locked";
  attributeAttempts: number; codeAttempts: number; resendCount: number;
  lastResendAt: string | null; lockedUntil: string | null; expiresAt: string;
}
export interface CodeRow { id: string; sessionId: string; hash: string; expiresAt: string; consumedAt: string | null }
export interface TokenRow { hash: string; sessionId: string; claimId: string; expiresAt: string }
export interface RequestedDoc { category: DocCategory; state: "required" | "received" | "accepted" }
export interface Payment { claimId: string; state: PaymentState; mailedOn: string | null; addressMasked: string | null }

/** Persistence port. InMemoryStore (tests/local demo) and PgStore (Supabase) implement it. */
export interface Store {
  findClaimByRef(ref: string): Promise<Claim | null>;
  findClaimById(id: string): Promise<Claim | null>;
  findClaimsByAttributes(lastName: string, zip: string | null, dob: string | null): Promise<Claim[]>;
  findContact(claimId: string): Promise<Contact | null>;
  findRecognition(aniHash: string): Promise<{ firstName: string } | null>;
  createClaim(c: Omit<Claim, "id">, contact: Omit<Contact, "claimId">): Promise<Claim>;
  createSession(claimId: string | null, expiresAt: string): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  updateSession(id: string, patch: Partial<Session>): Promise<Session>;
  insertCode(sessionId: string, hash: string, expiresAt: string): Promise<void>;
  getActiveCode(sessionId: string): Promise<CodeRow | null>;
  consumeCode(id: string, at: string): Promise<void>;
  insertToken(t: TokenRow): Promise<void>;
  getToken(hash: string): Promise<TokenRow | null>;
  getRequestedDocs(claimId: string): Promise<RequestedDoc[]>;
  markDocReceived(claimId: string, category: DocCategory): Promise<void>;
  insertReceipt(r: { ref: string; claimId: string; category: string; fileType: string; sizeBytes: number }): Promise<void>;
  getPayment(claimId: string): Promise<Payment | null>;
  insertCase(c: { ref: string; claimId: string | null; reason: string; summary: string }): Promise<void>;
  insertDelivery(d: { claimId: string | null; kind: string; simulated: boolean }): Promise<void>;
  getCounter(keyHash: string): Promise<{ attempts: number; lockedUntil: string | null } | null>;
  putCounter(keyHash: string, attempts: number, lockedUntil: string | null): Promise<void>;
  audit(event: string, sessionId: string | null, outcome: string): Promise<void>;
}

/** Everything the core needs from its environment. */
export interface Deps {
  store: Store;
  now: () => Date;
  hmac: (value: string) => Promise<string>;       // keyed hash; secret never leaves the function env
  randomToken: () => string;                      // opaque, unguessable
  randomRef: (prefix: string) => string;
  /** Delivers the one-time code to the masked contact. Demo: simulated. Never logs the code. */
  deliverCode: (contact: Contact, code: string) => Promise<{ simulated: boolean }>;
  logger?: (line: string) => void;                // receives sanitized lines only
}

export const NEUTRAL_FAILURE =
  "We couldn't verify that information. Please check what you entered and try again.";

export interface Policy {
  maxAttributeAttempts: number;
  maxCodeAttempts: number;
  maxResends: number;
  resendThrottleSeconds: number;
  codeTtlSeconds: number;
  tokenTtlSeconds: number;
  sessionTtlSeconds: number;
  lockoutSeconds: number;
  maxUploadBytes: number;
  allowedFileTypes: readonly string[];
}

/** What a production service would use. The security tests pin these values so the lockout logic stays proven. */
export const PRODUCTION_POLICY: Policy = {
  maxAttributeAttempts: 3,
  maxCodeAttempts: 3,
  maxResends: 2,
  resendThrottleSeconds: 30,
  codeTtlSeconds: 600,
  tokenTtlSeconds: 900,
  sessionTtlSeconds: 900,
  lockoutSeconds: 900,
  maxUploadBytes: 10 * 1024 * 1024,
  allowedFileTypes: ["pdf", "png", "jpg", "tif"],
};

/**
 * Relaxed for live demos (author decision 2026-10-16): presenters repeat the same fictional claims many times, so the
 * limits are loose and any lock clears within a minute. Verification itself (details, then a texted code) is unchanged.
 * Note maxResends is the number of resends after the first send, so 50 allows 51 texts per claim between locks.
 */
export const DEMO_POLICY: Policy = {
  ...PRODUCTION_POLICY,
  maxAttributeAttempts: 20,
  maxCodeAttempts: 10,
  maxResends: 50,
  resendThrottleSeconds: 3,
  lockoutSeconds: 60,
};

/** The policy the service runs with. Mutable only so tests can pin PRODUCTION_POLICY. */
export const POLICY: Policy = { ...DEMO_POLICY };

/** Published by OSC (see knowledge-sources.md). No exact completion dates are ever computed. */
export const PROCESSING_WINDOWS = {
  confirmationEmail: "You should receive a confirmation email within 48 hours of submitting a claim.",
  noActionNeeded: "If no further action is needed, a claim should be processed within 30 days.",
  afterDocuments: "Once your additional information is received, allow up to 90 days for review.",
  paymentMailing: "After approval, the check is mailed within 30 days to the address on the claim form.",
  cashCheck: "You have 180 days to cash the check.",
} as const;
