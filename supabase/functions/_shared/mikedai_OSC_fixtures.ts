// mikedai_OSC_ fictional fixtures. Every name, address, phone, email and ID is invented.
// Phones use the reserved 555-01xx range; emails use the reserved example.test domain.
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

export const FIXTURE_CLAIMS: FixtureClaim[] = [
  { scenario: 1, scenarioName: "No documents required; processing", claimRef: "DEMO-100001", firstName: "Ada", lastName: "Brightwater", zip: "00001", dob: "1980-02-03", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-01", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: { channel: "email", destination: "ada.brightwater@example.test" } },
  { scenario: 2, scenarioName: "Proof of old address required (primary persona: Linus)", claimRef: "DEMO-100002", firstName: "Linus", lastName: "Quillfeather", zip: "00002", dob: "1975-07-09", ownerDeceased: false, status: "documents_required", statusChangedOn: "2026-10-03", nextAction: "Upload proof of your connection to the old address.", humanHelp: false, docs: [{ category: "proof_old_address", state: "required" }], payment: "none", mailedOn: null, contact: { channel: "sms", destination: "+12125550102" } },
  { scenario: 3, scenarioName: "Documents received; under review", claimRef: "DEMO-100003", firstName: "Marisol", lastName: "Fernwood", zip: "00003", dob: "1968-11-21", ownerDeceased: false, status: "under_review", statusChangedOn: "2026-09-20", nextAction: "No action is needed while the review continues.", humanHelp: false, docs: [{ category: "proof_ownership", state: "received" }], payment: "none", mailedOn: null, contact: { channel: "email", destination: "marisol.fernwood@example.test" } },
  { scenario: 4, scenarioName: "Additional information required", claimRef: "DEMO-100004", firstName: "Theo", lastName: "Larkspur", zip: "00004", dob: "1990-05-30", ownerDeceased: false, status: "additional_info_required", statusChangedOn: "2026-10-08", nextAction: "Submit the additional items that were requested.", humanHelp: false, docs: [{ category: "name_change", state: "required" }, { category: "signed_claim_form", state: "required" }], payment: "none", mailedOn: null, contact: { channel: "email", destination: "theo.larkspur@example.test" } },
  { scenario: 5, scenarioName: "Deceased owner / estate claim", claimRef: "DEMO-100005", firstName: "Orla", lastName: "Pennywhistle", zip: "00005", dob: "1950-01-15", ownerDeceased: true, status: "manual_review", statusChangedOn: "2026-09-12", nextAction: "A specialist will confirm the estate documents needed.", humanHelp: true, docs: [{ category: "estate_documentation", state: "required" }], payment: "none", mailedOn: null, contact: { channel: "email", destination: "orla.estate@example.test" } },
  { scenario: 6, scenarioName: "Approved; check being prepared", claimRef: "DEMO-100006", firstName: "Bram", lastName: "Oakhaven", zip: "00006", dob: "1985-09-09", ownerDeceased: false, status: "check_preparing", statusChangedOn: "2026-10-10", nextAction: "No action is needed. Watch the mail for the check.", humanHelp: false, docs: [], payment: "check_preparing", mailedOn: null, contact: { channel: "sms", destination: "+12125550106" } },
  { scenario: 7, scenarioName: "Check mailed", claimRef: "DEMO-100007", firstName: "Wren", lastName: "Stillwater", zip: "00007", dob: "1972-03-18", ownerDeceased: false, status: "check_mailed", statusChangedOn: "2026-10-05", nextAction: "Cash the check within 180 days of receiving it.", humanHelp: false, docs: [], payment: "check_mailed", mailedOn: "2026-10-05", contact: { channel: "email", destination: "wren.stillwater@example.test" } },
  { scenario: 8, scenarioName: "Check not received", claimRef: "DEMO-100008", firstName: "Juno", lastName: "Thistledown", zip: "00008", dob: "1963-12-02", ownerDeceased: false, status: "check_not_received", statusChangedOn: "2026-10-12", nextAction: "A specialist can review the check and next steps.", humanHelp: true, docs: [], payment: "check_not_received", mailedOn: "2026-08-20", contact: { channel: "email", destination: "juno.thistledown@example.test" } },
  // Scenario 9 (claim ID not found) uses DEMO-999999, which intentionally does not exist.
  { scenario: 10, scenarioName: "Verification failed (use wrong attributes)", claimRef: "DEMO-100010", firstName: "Pip", lastName: "Marigold", zip: "00010", dob: "1999-04-04", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-02", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: { channel: "email", destination: "pip.marigold@example.test" } },
  { scenario: 11, scenarioName: "Verification service unavailable (no contact on file)", claimRef: "DEMO-100011", firstName: "Quill", lastName: "Hollowell", zip: "00011", dob: "1988-08-08", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-02", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: null },
  { scenario: 12, scenarioName: "Status service unavailable", claimRef: "DEMO-100012", firstName: "Sage", lastName: "Willowmere", zip: "00012", dob: "1977-06-06", ownerDeceased: false, status: "processing", statusChangedOn: "2026-10-02", nextAction: "No action is needed right now.", humanHelp: false, docs: [], payment: "none", mailedOn: null, contact: { channel: "email", destination: "sage.willowmere@example.test" }, statusServiceDown: true },
];

/** Fictional ANIs for tests only (555-01xx). The author's real test number is never stored here. */
export const FIXTURE_ANIS: Record<string, { firstName: string }> = {
  "+12125550102": { firstName: "Linus" },
  "+12125550101": { firstName: "Ada" },
};
