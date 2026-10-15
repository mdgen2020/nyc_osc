// Non-sensitive entry context only. Never store Claim ID, DOB, ZIP, codes, or tokens here.
export interface EntryContext {
  reason: "check_claim" | "lost_claim_id" | "submit_documents" | "check_question" | "start_claim" | "other";
  hasClaimId: "yes" | "no" | "unsure";
  language: "en-US" | "interpreter";
  demoAcknowledged: true;
}
const KEY = "mikedai_OSC_entry";
const REASONS = ["check_claim", "lost_claim_id", "submit_documents", "check_question", "start_claim", "other"];

export const saveEntry = (c: EntryContext) => sessionStorage.setItem(KEY, JSON.stringify(c));
export function loadEntry(): EntryContext | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return v && REASONS.includes(v.reason) && v.demoAcknowledged === true ? (v as EntryContext) : null;
  } catch { return null; }
}
export const clearSession = () => { sessionStorage.removeItem(KEY); };
