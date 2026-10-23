// mikedai_OSC_ fictional fixtures. Every name, address, phone, email and ID is invented.
// Phones use the reserved 555-01xx range; emails use the reserved example.test domain.
//
// SIMPLIFIED DEMO MODEL (2026-10-15): two people, three ZIP codes. The ZIP code the caller gives selects the scenario.
//   Linus Smith  - date of birth June 23, 1988  (the caller)
//   Gloria Jones - date of birth November 13, 1970 (the person Linus asks about)
//   10305 = documents required (proof of old address)   12201 = check mailed   10001 = check not received
import { DocCategory, PaymentState, StatusCode } from "./mikedai_OSC_types.ts";

export interface FixtureClaim {
  scenario: number; scenarioName: string;
  claimRef: string; firstName: string; lastName: string; zip: string; dob: string;
  ownerDeceased: boolean; status: StatusCode; statusChangedOn: string; nextAction: string;
  humanHelp: boolean; docs: { category: DocCategory; state: "required" | "received" | "accepted" }[];
  payment: PaymentState; mailedOn: string | null;
  contact: { channel: "sms" | "email"; destination: string } | null;
  statusServiceDown?: boolean;
}

export const DEMO_ZIPS = { documents: "10305", mailed: "12201", notReceived: "10001" } as const;
export const LINUS = { firstName: "Linus", lastName: "Smith", dob: "1988-06-23", contact: { channel: "sms", destination: "+12125550102" } as const };
export const GLORIA = { firstName: "Gloria", lastName: "Jones", dob: "1970-11-13", contact: { channel: "email", destination: "gloria.jones@example.test" } as const };

type Person = typeof LINUS | typeof GLORIA;
const scenarios = (p: Person, base: number, refBase: number): FixtureClaim[] => [
  {
    scenario: base, scenarioName: "10305: documents required (proof of old address)", claimRef: `DEMO-${refBase + 1}`,
    firstName: p.firstName, lastName: p.lastName, zip: DEMO_ZIPS.documents, dob: p.dob, ownerDeceased: false,
    status: "documents_required", statusChangedOn: "2026-10-03", nextAction: "Upload proof of your connection to the old address.",
    humanHelp: false, docs: [{ category: "proof_old_address", state: "required" }], payment: "none", mailedOn: null, contact: p.contact,
  },
  {
    scenario: base + 1, scenarioName: "12201: check mailed", claimRef: `DEMO-${refBase + 2}`,
    firstName: p.firstName, lastName: p.lastName, zip: DEMO_ZIPS.mailed, dob: p.dob, ownerDeceased: false,
    status: "check_mailed", statusChangedOn: "2026-10-21", nextAction: "Cash the check within 180 days of receiving it.",
    humanHelp: false, docs: [], payment: "check_mailed", mailedOn: "2026-10-21", contact: p.contact,
  },
  {
    scenario: base + 2, scenarioName: "10001: check not received (representative)", claimRef: `DEMO-${refBase + 3}`,
    firstName: p.firstName, lastName: p.lastName, zip: DEMO_ZIPS.notReceived, dob: p.dob, ownerDeceased: false,
    status: "check_not_received", statusChangedOn: "2026-10-12", nextAction: "A specialist can review the check and next steps.",
    humanHelp: true, docs: [], payment: "check_not_received", mailedOn: "2026-08-20", contact: p.contact,
  },
];

/** The demo claims. Claim IDs are DEMO-200001..3 (Linus) and DEMO-300001..3 (Gloria); callers never need them. */
export const FIXTURE_CLAIMS: FixtureClaim[] = [...scenarios(LINUS, 1, 200000), ...scenarios(GLORIA, 4, 300000)];

/**
 * Edge cases that only the automated tests use. They are not part of the demo, are not in the seed script,
 * and are never mentioned to the AVA or in the demo script.
 */
export const TEST_EDGE_CLAIMS: FixtureClaim[] = [
  { scenario: 11, scenarioName: "Verification service unavailable (no contact on file)", claimRef: "DEMO-900011", firstName: "Edge", lastName: "Nocontact", zip: "99911", dob: "1980-01-01", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-02", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: null },
  { scenario: 12, scenarioName: "Status service unavailable", claimRef: "DEMO-900012", firstName: "Edge", lastName: "Statusdown", zip: "99912", dob: "1980-01-02", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-02", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: { channel: "email", destination: "edge.statusdown@example.test" }, statusServiceDown: true },
  { scenario: 13, scenarioName: "Deceased owner / estate (tests only)", claimRef: "DEMO-900013", firstName: "Edge", lastName: "Estate", zip: "99913", dob: "1950-01-01", ownerDeceased: true, status: "manual_review", statusChangedOn: "2026-09-12", nextAction: "A specialist will confirm the estate documents needed.", humanHelp: true, docs: [{ category: "estate_documentation", state: "required" }], payment: "none", mailedOn: null, contact: { channel: "email", destination: "edge.estate@example.test" } },
  { scenario: 14, scenarioName: "Documents received; under review (tests only)", claimRef: "DEMO-900014", firstName: "Edge", lastName: "Review", zip: "99914", dob: "1980-01-03", ownerDeceased: false, status: "under_review", statusChangedOn: "2026-09-20", nextAction: "No action is needed while the review continues.", humanHelp: false, docs: [{ category: "proof_ownership", state: "received" }], payment: "none", mailedOn: null, contact: { channel: "email", destination: "edge.review@example.test" } },
  { scenario: 15, scenarioName: "Check being prepared (tests only)", claimRef: "DEMO-900015", firstName: "Edge", lastName: "Preparing", zip: "99915", dob: "1980-01-04", ownerDeceased: false, status: "check_preparing", statusChangedOn: "2026-10-10", nextAction: "No action is needed. Watch the mail for the check.", humanHelp: false, docs: [], payment: "check_preparing", mailedOn: null, contact: { channel: "email", destination: "edge.preparing@example.test" } },
];

/** Fictional ANI for tests only (555-01xx). The author's real test number is never stored here. */
export const FIXTURE_ANIS: Record<string, { firstName: string }> = {
  "+12125550102": { firstName: "Linus" },
};
