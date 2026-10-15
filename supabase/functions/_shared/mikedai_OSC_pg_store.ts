// mikedai_OSC_ Postgres Store for Supabase Edge Functions (direct connection via SUPABASE_DB_URL).
// The "mikedai_OSC_core" schema is NOT exposed through PostgREST. Not yet integration-tested against a
// live database: deployment requires the approved external preflight.
import postgres from "npm:postgres@3.4.5";
import { Claim, CodeRow, Contact, DocCategory, Payment, RequestedDoc, Session, Store, TokenRow } from "./mikedai_OSC_types.ts";

const S = "mikedai_OSC_core";
const T = (n: string) => `${S}.mikedai_OSC_${n}`;

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;
const claim = (r: Row): Claim => ({ id: r.id, claimRef: r.claim_ref, lastName: r.claimant_last_name, zip: r.claimant_zip, dob: r.claimant_dob ? String(r.claimant_dob).slice(0, 10) : null, ownerDeceased: r.owner_deceased, statusCode: r.status_code, statusChangedOn: String(r.status_changed_on).slice(0, 10), nextAction: r.next_action, humanHelpRecommended: r.human_help_recommended });
const session = (r: Row): Session => ({ id: r.id, claimId: r.claim_id, state: r.state, attributeAttempts: r.attribute_attempts, codeAttempts: r.code_attempts, resendCount: r.resend_count, lastResendAt: r.last_resend_at?.toISOString?.() ?? null, lockedUntil: r.locked_until?.toISOString?.() ?? null, expiresAt: r.expires_at.toISOString() });

export class PgStore implements Store {
  private sql: ReturnType<typeof postgres>;
  constructor(url: string) { this.sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 5, prepare: false }); }

  async findClaimByRef(ref: string) { const [r] = await this.sql`select * from ${this.sql(T("claims"))} where claim_ref = ${ref}`; return r ? claim(r) : null; }
  async findClaimById(id: string) { const [r] = await this.sql`select * from ${this.sql(T("claims"))} where id = ${id}`; return r ? claim(r) : null; }
  async findClaimsByAttributes(lastName: string, zip: string | null, dob: string | null) {
    const rs = await this.sql`select * from ${this.sql(T("claims"))} where lower(claimant_last_name) = lower(${lastName}) and (${zip}::text is null or claimant_zip = ${zip}) and (${dob}::date is null or claimant_dob = ${dob})`;
    return rs.map(claim);
  }
  async findContact(claimId: string): Promise<Contact | null> {
    const [r] = await this.sql`select * from ${this.sql(T("claimant_contacts"))} where claim_id = ${claimId} limit 1`;
    return r ? { claimId, channel: r.channel, destination: r.destination, masked: r.masked_destination } : null;
  }
  async findRecognition(h: string) { const [r] = await this.sql`select first_name from ${this.sql(T("caller_recognition"))} where ani_hash = ${h}`; return r ? { firstName: r.first_name } : null; }
  async createClaim(c: Omit<Claim, "id">, contact: Omit<Contact, "claimId">) {
    const [r] = await this.sql`insert into ${this.sql(T("claims"))} (claim_ref, claimant_last_name, claimant_zip, claimant_dob, owner_deceased, status_code, status_changed_on, next_action, human_help_recommended) values (${c.claimRef}, ${c.lastName}, ${c.zip}, ${c.dob}, ${c.ownerDeceased}, ${c.statusCode}, ${c.statusChangedOn}, ${c.nextAction}, ${c.humanHelpRecommended}) returning *`;
    await this.sql`insert into ${this.sql(T("claimant_contacts"))} (claim_id, channel, destination, masked_destination) values (${r.id}, ${contact.channel}, ${contact.destination}, ${contact.masked})`;
    return claim(r);
  }
  async createSession(claimId: string | null, expiresAt: string) { const [r] = await this.sql`insert into ${this.sql(T("verification_sessions"))} (claim_id, expires_at) values (${claimId}, ${expiresAt}) returning *`; return session(r); }
  async getSession(id: string) { const [r] = await this.sql`select * from ${this.sql(T("verification_sessions"))} where id = ${id}`; return r ? session(r) : null; }
  async updateSession(id: string, p: Partial<Session>) {
    const [r] = await this.sql`update ${this.sql(T("verification_sessions"))} set
      claim_id = coalesce(${p.claimId ?? null}, claim_id), state = coalesce(${p.state ?? null}, state),
      attribute_attempts = coalesce(${p.attributeAttempts ?? null}, attribute_attempts),
      code_attempts = coalesce(${p.codeAttempts ?? null}, code_attempts),
      resend_count = coalesce(${p.resendCount ?? null}, resend_count),
      last_resend_at = coalesce(${p.lastResendAt ?? null}, last_resend_at),
      locked_until = ${p.lockedUntil === undefined ? this.sql`locked_until` : p.lockedUntil}
      where id = ${id} returning *`;
    return session(r);
  }
  async insertCode(sessionId: string, hash: string, expiresAt: string) { await this.sql`insert into ${this.sql(T("verification_codes"))} (session_id, code_hash, expires_at) values (${sessionId}, ${hash}, ${expiresAt})`; }
  async getActiveCode(sessionId: string): Promise<CodeRow | null> {
    const [r] = await this.sql`select * from ${this.sql(T("verification_codes"))} where session_id = ${sessionId} and consumed_at is null order by created_at desc limit 1`;
    return r ? { id: r.id, sessionId, hash: r.code_hash, expiresAt: r.expires_at.toISOString(), consumedAt: null } : null;
  }
  async consumeCode(id: string, at: string) { await this.sql`update ${this.sql(T("verification_codes"))} set consumed_at = ${at} where id = ${id} and consumed_at is null`; }
  async insertToken(t: TokenRow) { await this.sql`insert into ${this.sql(T("verification_tokens"))} (token_hash, session_id, claim_id, expires_at) values (${t.hash}, ${t.sessionId}, ${t.claimId}, ${t.expiresAt})`; }
  async getToken(hash: string): Promise<TokenRow | null> {
    const [r] = await this.sql`select * from ${this.sql(T("verification_tokens"))} where token_hash = ${hash}`;
    return r ? { hash, sessionId: r.session_id, claimId: r.claim_id, expiresAt: r.expires_at.toISOString() } : null;
  }
  async getRequestedDocs(claimId: string): Promise<RequestedDoc[]> { const rs = await this.sql`select category, state from ${this.sql(T("requested_documents"))} where claim_id = ${claimId}`; return rs.map((r: Row) => ({ category: r.category, state: r.state })); }
  async markDocReceived(claimId: string, category: DocCategory) { await this.sql`update ${this.sql(T("requested_documents"))} set state = 'received' where claim_id = ${claimId} and category = ${category} and state = 'required'`; }
  async insertReceipt(r: { ref: string; claimId: string; category: string; fileType: string; sizeBytes: number }) { await this.sql`insert into ${this.sql(T("document_receipts"))} (receipt_ref, claim_id, category, file_type, file_size_bytes) values (${r.ref}, ${r.claimId}, ${r.category}, ${r.fileType}, ${r.sizeBytes})`; }
  async getPayment(claimId: string): Promise<Payment | null> {
    const [r] = await this.sql`select * from ${this.sql(T("payment_status"))} where claim_id = ${claimId}`;
    return r ? { claimId, state: r.payment_state, mailedOn: r.mailed_on ? String(r.mailed_on).slice(0, 10) : null, addressMasked: r.mailing_address_masked } : null;
  }
  async insertCase(c: { ref: string; claimId: string | null; reason: string; summary: string }) { await this.sql`insert into ${this.sql(T("service_cases"))} (case_ref, claim_id, reason, summary) values (${c.ref}, ${c.claimId}, ${c.reason}, ${c.summary})`; }
  async insertDelivery(d: { claimId: string | null; kind: string; simulated: boolean }) { await this.sql`insert into ${this.sql(T("notification_deliveries"))} (claim_id, kind, simulated) values (${d.claimId}, ${d.kind}, ${d.simulated})`; }
  async getCounter(k: string) {
    const [r] = await this.sql`select attempts, locked_until from ${this.sql(T("attempt_counters"))} where key_hash = ${k}`;
    return r ? { attempts: r.attempts, lockedUntil: r.locked_until?.toISOString?.() ?? null } : null;
  }
  async putCounter(k: string, attempts: number, lockedUntil: string | null) {
    await this.sql`insert into ${this.sql(T("attempt_counters"))} (key_hash, attempts, locked_until) values (${k}, ${attempts}, ${lockedUntil})
      on conflict (key_hash) do update set attempts = excluded.attempts, locked_until = excluded.locked_until, updated_at = now()`;
  }
  async audit(event: string, sessionId: string | null, outcome: string) { await this.sql`insert into ${this.sql(T("audit_events"))} (event, session_id, outcome) values (${event}, ${sessionId}, ${outcome})`; }
}
