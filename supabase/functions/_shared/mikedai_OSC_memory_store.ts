// mikedai_OSC_ in-memory Store: tests and the website's local-demo mode. Fictional data only.
import { maskDestination } from "./mikedai_OSC_core.ts";
import { FIXTURE_ANIS, FIXTURE_CLAIMS, TEST_EDGE_CLAIMS } from "./mikedai_OSC_fixtures.ts";
import {
  Claim, CodeRow, Contact, DocCategory, Payment, RequestedDoc, Session, Store, TokenRow, Deps,
} from "./mikedai_OSC_types.ts";

let seq = 0;
const nid = () => `id-${++seq}`;

export class InMemoryStore implements Store {
  claims: Claim[] = []; contacts: Contact[] = []; sessions: Session[] = []; codes: CodeRow[] = [];
  tokens: TokenRow[] = []; docs = new Map<string, RequestedDoc[]>(); payments = new Map<string, Payment>();
  receipts: unknown[] = []; cases: unknown[] = []; deliveries: { claimId: string | null; kind: string; simulated: boolean }[] = [];
  auditLog: { event: string; sessionId: string | null; outcome: string }[] = [];
  recognition = new Map<string, { firstName: string }>();
  counters = new Map<string, { attempts: number; lockedUntil: string | null }>();
  statusDown = new Set<string>();
  /** Test hook: throw on the next N calls to simulate a timeout. */
  failNext = 0;

  constructor(opts: { aniHashes?: Record<string, { firstName: string }> } = {}) {
    for (const f of [...FIXTURE_CLAIMS, ...TEST_EDGE_CLAIMS]) {
      const c: Claim = { id: nid(), claimRef: f.claimRef, lastName: f.lastName, zip: f.zip, dob: f.dob, ownerDeceased: f.ownerDeceased, statusCode: f.status, statusChangedOn: f.statusChangedOn, nextAction: f.nextAction, humanHelpRecommended: f.humanHelp };
      this.claims.push(c);
      if (f.contact) this.contacts.push({ claimId: c.id, channel: f.contact.channel, destination: f.contact.destination, masked: maskDestination(f.contact.channel, f.contact.destination) });
      this.docs.set(c.id, f.docs.map((x) => ({ ...x })));
      this.payments.set(c.id, { claimId: c.id, state: f.payment, mailedOn: f.mailedOn, addressMasked: f.payment === "none" ? null : "•••• Fictional Lane" });
      if (f.statusServiceDown) this.statusDown.add(c.id);
    }
    for (const [h, v] of Object.entries(opts.aniHashes ?? {})) this.recognition.set(h, v);
  }
  private maybeFail() { if (this.failNext > 0) { this.failNext--; throw new Error("simulated timeout"); } }
  /** Registers fixture ANIs under their keyed hashes. */
  async seedFixtureAnis(hmac: Deps["hmac"]) { for (const [ani, v] of Object.entries(FIXTURE_ANIS)) this.recognition.set(await hmac(ani), v); }

  async findClaimByRef(ref: string) { this.maybeFail(); return this.claims.find((c) => c.claimRef === ref) ?? null; }
  async findClaimById(id: string) { this.maybeFail(); return this.statusDown.has(id) ? null : this.claims.find((c) => c.id === id) ?? null; }
  async findClaimsByAttributes(lastName: string, zip: string | null, dob: string | null) {
    return this.claims.filter((c) => c.lastName.toLowerCase() === lastName.trim().toLowerCase() || (!!zip && c.zip === zip) || (!!dob && c.dob === dob));
  }
  async findContact(claimId: string) { return this.contacts.find((c) => c.claimId === claimId) ?? null; }
  async findRecognition(h: string) { return this.recognition.get(h) ?? null; }
  async createClaim(c: Omit<Claim, "id">, contact: Omit<Contact, "claimId">) {
    const claim = { ...c, id: nid() }; this.claims.push(claim);
    this.contacts.push({ ...contact, claimId: claim.id }); this.docs.set(claim.id, []);
    return claim;
  }
  async createSession(claimId: string | null, expiresAt: string) {
    const s: Session = { id: nid(), claimId, state: "started", attributeAttempts: 0, codeAttempts: 0, resendCount: 0, lastResendAt: null, lockedUntil: null, expiresAt };
    this.sessions.push(s); return s;
  }
  async getSession(id: string) { return this.sessions.find((s) => s.id === id) ?? null; }
  async updateSession(id: string, patch: Partial<Session>) { const s = this.sessions.find((x) => x.id === id)!; Object.assign(s, patch); return s; }
  async insertCode(sessionId: string, hash: string, expiresAt: string) { this.codes.push({ id: nid(), sessionId, hash, expiresAt, consumedAt: null }); }
  async getActiveCode(sessionId: string) { return [...this.codes].reverse().find((c) => c.sessionId === sessionId && !c.consumedAt) ?? null; }
  async consumeCode(id: string, at: string) { this.codes.find((c) => c.id === id)!.consumedAt = at; }
  async insertToken(t: TokenRow) { this.tokens.push(t); }
  async getToken(hash: string) { return this.tokens.find((t) => t.hash === hash) ?? null; }
  async getRequestedDocs(claimId: string) { return this.docs.get(claimId) ?? []; }
  async markDocReceived(claimId: string, category: DocCategory) { for (const d of this.docs.get(claimId) ?? []) if (d.category === category) d.state = "received"; }
  async insertReceipt(r: unknown) { this.receipts.push(r); }
  async getPayment(claimId: string) { return this.payments.get(claimId) ?? null; }
  async insertCase(c: unknown) { this.cases.push(c); }
  async insertDelivery(d: { claimId: string | null; kind: string; simulated: boolean }) { this.deliveries.push(d); }
  async getCounter(k: string) { return this.counters.get(k) ?? null; }
  async putCounter(k: string, attempts: number, lockedUntil: string | null) { this.counters.set(k, { attempts, lockedUntil }); }
  async audit(event: string, sessionId: string | null, outcome: string) { this.auditLog.push({ event, sessionId, outcome }); }
}

/** Test/local-demo dependency bundle. `inbox` captures simulated deliveries for demo and assertions only. */
export async function makeDemoDeps(opts: { now?: () => Date; secret?: string } = {}) {
  const store = new InMemoryStore();
  const secret = opts.secret ?? "demo-only-not-a-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hmac = async (v: string) => {
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(v));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  await store.seedFixtureAnis(hmac);
  const inbox: { to: string; code: string }[] = [];
  let offsetMs = 0; // test/demo clock: advance() moves time forward without sleeping
  const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const deps: Deps = {
    store, hmac, now: opts.now ?? (() => new Date(Date.now() + offsetMs)),
    randomToken: rnd,
    randomRef: (p) => `${p}${String(Math.floor(100000 + Math.random() * 899999))}`,
    deliverCode: async (c, code) => { inbox.push({ to: c.masked, code }); return { simulated: true }; },
  };
  return { deps, store, inbox, advance: (ms: number) => { offsetMs += ms; } };
}
