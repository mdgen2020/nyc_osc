#!/usr/bin/env python3
"""Generates the mikedai_OSC_ Data Action contract files (CONTRACT ONLY - nothing is created in the org).

Design: one narrow action per capability. Each action targets a FIXED URL PATH (= one backend operation), so no
"operation" switch is exposed to the AVA (AVA tools cannot pass constants and are limited to 5 inputs each).
Deterministic steps are consolidated server-side to keep the action count low:
  * VerifyClaimIdentity = attribute check + delivery of the generated code
  * GetClaimSummary     = status + required documents + payment
Output property lists mirror GENESYS_OUTPUT_KEYS in supabase/functions/mikedai_OSC_claim_ops/handler.ts
(a contract test enforces that they stay in sync).
"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "data-actions"
BASE = "https://ogfrsveuxbpyfseldkgx.supabase.co/functions/v1/mikedai_OSC_claim_ops"
INTEGRATION = "mikedai_OSC_SupabaseWebServices"

S = lambda d="": {"type": "string", **({"description": d} if d else {})}
B = lambda d="": {"type": "boolean", **({"description": d} if d else {})}
def E(vals, d=""): return {"type": "string", "enum": vals, **({"description": d} if d else {})}

STATUS = ["processing", "documents_required", "documents_received", "under_review", "additional_info_required",
          "verification_in_progress", "manual_review", "approved", "check_preparing", "check_mailed",
          "check_not_received", "closed"]
PAYMENT = ["none", "approved", "check_preparing", "check_mailed", "check_not_received", "lost_check",
           "incorrect_payee_or_address", "expired_check", "check_cannot_be_cashed"]
DOCS = ["signed_claim_form", "proof_old_address", "proof_ownership", "name_change", "estate_documentation",
        "representative_authorization", "other"]

ACTIONS = [
  dict(name="mikedai_OSC_SecurityCodeGenerator", op="generateSecurityCode",
       description="Returns one cryptographically random six-digit code (string, leading zeros kept). Takes no input. Replaces miked_SecurityCodeGenerator, which cannot guarantee ^[0-9]{6}$.",
       required_in=[], inputs={},
       required_out=["securityCode", "smsMessage"],
       outputs={"securityCode": {**S("Exactly six digits. Never read aloud, logged or summarized."), "pattern": "^[0-9]{6}$", "minLength": 6, "maxLength": 6},
                "smsMessage": {**S("Complete text-message body containing the code, for the existing Agentless SMS action. Hidden from the AVA model; never read aloud, logged or summarized."), "maxLength": 160}}),
  dict(name="mikedai_OSC_RecognizeCaller", op="recognizeCaller",
       description="Architect-only. Convenience recognition by hashed phone number (ANI). Not authentication; never reveals whether a claim exists.",
       required_in=["ani"], inputs={"ani": S("Caller ANI in E.164 form, or 'anonymous'.")},
       required_out=["recognized"],
       outputs={"recognized": B(), "firstName": S("Fictional first name for a one-time greeting. Not proof of identity.")}),
  dict(name="mikedai_OSC_VerifyClaimIdentity", op="verifyClaimIdentity",
       description="Checks any two matching attributes and, on a match, delivers the generated code to the masked contact on file. Neutral failure for not found and mismatch. Never returns the code.",
       required_in=["lastName", "securityCode"],
       inputs={"claimId": S("Claim ID as spoken or typed. Optional for Claim ID recovery."), "lastName": S(), "zip": S("ZIP code."),
               "dob": S("Date of birth YYYY-MM-DD."), "securityCode": {**S("Output of mikedai_OSC_SecurityCodeGenerator."), "pattern": "^[0-9]{6}$"},
               "sessionId": S("Optional; reuse to resend within one session.")},
       required_out=["outcome"],
       outputs={"outcome": E(["code_sent", "failed", "locked", "throttled", "unavailable"]), "sessionId": S(),
                "maskedDestination": S("Masked contact, e.g. a•••@g•••.com or •••-•••-57."), "deliverySimulated": B("Demo: no real SMS or email is sent."),
                "message": S(), "humanHelpRecommended": B()}),
  dict(name="mikedai_OSC_ValidateSecurityCode", op="validateVerificationCode",
       description="Validates the code the caller read back (single use, expiring, attempt-limited). Returns an opaque short-lived token.",
       required_in=["sessionId", "code"],
       inputs={"sessionId": S("From VerifyClaimIdentity."), "code": {**S("Six digits the caller provided."), "pattern": "^[0-9]{6}$"}},
       required_out=["outcome"],
       outputs={"outcome": E(["verified", "failed", "locked"]), "verificationToken": S("Opaque token. Never read aloud."),
                "expiresInSeconds": {"type": "integer"}, "message": S(), "humanHelpRecommended": B()}),
  dict(name="mikedai_OSC_GetClaimSummary", op="getClaimSummary",
       description="After verification: current status, required documents and payment state in one read. Never returns a claim amount.",
       required_in=["verificationToken"], inputs={"verificationToken": S("From ValidateSecurityCode.")},
       required_out=["ok"],
       outputs={"ok": B(), "error": S(), "message": S(), "status": E(STATUS), "statusChangedOn": S(), "whatIsHappening": S(),
                "nextAction": S(), "processingWindow": S(), "ownerDeceased": B(),
                "documents": {"type": "array", "items": {"type": "object", "required": ["category", "state"], "additionalProperties": False,
                    "properties": {"category": E(DOCS), "state": E(["required", "received", "accepted"])}}},
                "furtherActionNeeded": B(), "paymentState": E(PAYMENT), "mailedOn": S(), "mailingAddressMasked": S(),
                "guidance": S(), "humanHelpRecommended": B()}),
  dict(name="mikedai_OSC_StartFictionalClaim", op="startClaim",
       description="Demo only: records a fictional claim start. Nothing is submitted to OSC. Requires the demo acknowledgment.",
       required_in=["lastName", "zip", "relationship", "destination", "demoAcknowledged"],
       inputs={"lastName": S(), "zip": S(), "relationship": S("self, estate, minor_child, power_of_attorney, ..."),
               "destination": S("Fictional email or phone for verification."), "demoAcknowledged": B("Caller confirmed all details are fictional.")},
       required_out=["ok"],
       outputs={"ok": B(), "error": S(), "claimId": S("Fictional DEMO-###### Claim ID."), "escalationRecommended": B(),
                "submittedToOsc": B("Always false."), "message": S()}),
  dict(name="mikedai_OSC_SendClaimNotice", op="sendNotice",
       description="After verification: resend the claim notice or the secure upload page link. Demo: simulated, nothing real is sent.",
       required_in=["verificationToken", "kind"],
       inputs={"verificationToken": S(), "kind": E(["claim_notice", "upload_link"])},
       required_out=["ok"],
       outputs={"ok": B(), "error": S(), "deliverySimulated": B(), "message": S()}),
  dict(name="mikedai_OSC_CreateServiceCase", op="createServiceCase",
       description="Creates the sanitized service case and handoff summary for human escalation. Always targets the support_miked queue ID.",
       required_in=["reason", "inquiry", "verification"],
       inputs={"verificationToken": S("Optional; present only if the caller was verified."), "reason": S("Short reason, no personal data."),
               "inquiry": E(["self", "representative", "unknown"]), "verification": E(["verified", "unverified", "failed", "locked"]),
               "automationCompleted": S("What automation already did, no personal data.")},
       required_out=["ok"],
       outputs={"ok": B(), "caseId": S(), "summary": S("Sanitized allow-listed summary."), "queueId": S("dc15ad2c-7917-413f-9a00-4f52df4d4602")}),
]

ERR = {"title": "mikedai_OSC_ErrorOutput", "type": "object",
       "properties": {"status": {"type": "integer"}, "code": {"type": "string"}, "message": {"type": "string"}}, "additionalProperties": True}

def build(a):
    return {
      "_comment": "CONTRACT ONLY. Not created in the org. " + a["description"],
      "name": a["name"], "category": "mikedai_OSC_Data_Actions", "integrationName": INTEGRATION, "secure": False,
      "config": {
        "request": {
          "requestUrlTemplate": f"{BASE}/{a['op']}", "requestType": "POST",
          "headers": {"Content-Type": "application/json", "apikey": "${credentials.supabasePublishableKey}",
                      "Authorization": "Bearer ${credentials.supabasePublishableKey}",
                      "x-mikedai-osc-key": "${credentials.mikedaiOscKey}"},
          "requestTemplate": "${input.rawRequest}",
        },
        # The backend returns only allow-listed fields for this operation, so the raw result is the contract output.
        "response": {"translationMap": {}, "translationMapDefaults": {}, "successTemplate": "${rawResult}"},
      },
      "contract": {
        "input": {"inputSchema": {"title": a["name"] + "Input", "type": "object", "required": a["required_in"],
                                   "properties": a["inputs"], "additionalProperties": False}},
        "output": {"successSchema": {"title": a["name"] + "Output", "type": "object", "required": a["required_out"],
                                      "properties": a["outputs"], "additionalProperties": False},
                   "errorSchema": ERR},
      },
    }

if __name__ == "__main__":
    for old in ("mikedai_OSC_ClaimOperations.json",):
        p = OUT / old
        if p.exists():
            p.unlink()  # local draft of mine (not an org asset), superseded by the narrow actions
    for a in ACTIONS:
        (OUT / f"{a['name']}.json").write_text(json.dumps(build(a), indent=2) + "\n")
        print("wrote", a["name"])
