#!/usr/bin/env python3
"""Builds design-artifact.json for mikedai_OSC_ClaimAssistant from the data-action contracts (single source of truth).
Local artifact only. Nothing is created in the Genesys org by this script."""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DA = ROOT / "data-actions"
def contract(n): return json.loads((DA / f"mikedai_OSC_{n}.json").read_text())

KB = {"id": "6b16df4b-37fb-4ac5-ba06-a9d2319724d3", "name": "MikeD_KB_Config"}  # reuse unchanged; confirmed by author 2026-10-14
SMS_ACTION_ID = "custom_-_cd38af67-d58b-4eb5-abc9-3f8c055ddf58"  # existing "Agentless SMS - MikeD"; reuse unchanged
_C1 = ROOT / "docs" / "discovery" / "mikedai_OSC_c1-state.json"  # ids of the data actions created in C1 (no secrets)
_C1_IDS = {k: v["id"] for k, v in json.loads(_C1.read_text()).get("actions", {}).items()} if _C1.exists() else {}
_SAGE_F = HERE / "sage-agent.json"  # written by build_ava.py after create/version/publish
_SAGE = json.loads(_SAGE_F.read_text()) if _SAGE_F.exists() else {}
def pending(n):
    name = f"mikedai_OSC_{n}"
    return {"id": _C1_IDS.get(name, f"PENDING_CREATE:{name}"), "name": name}  # real id once C1 has created it

# ---------------------------------------------------------------- types
def ctx(name, desc): return {"name": name, "type": "string", "userUtteranceSubstring": False, "description": desc}
def inp(name, desc, sub=False, typ="string", **kw): return {"name": name, "direction": "input", "type": typ, "userUtteranceSubstring": sub, "description": desc, **kw}
def out(name, props, **kw): return {"name": name, "type": "object", "direction": "output", "properties": props, **kw}
def p(name, typ, req=False, **kw): return {"name": name, "type": typ, "required": req, **kw}

REL = ["self", "estate", "minor_child", "parent_or_dependent", "guardian", "power_of_attorney", "trustee",
       "business_representative", "legal_representative", "unsupported"]

types = [
  ctx("ContextFirstName", "Caller first name from Architect for a one-time greeting only. Not proof of identity."),
  ctx("ContextInteractionChannel", "voice or digital; controls brevity."),
  ctx("ContextConversationId", "Genesys conversation identifier. Never read aloud."),
  ctx("ContextContactReason", "Reason chosen on the website entry form, for example claim_status or start_claim. A hint only."),
  ctx("ContextHasClaimId", "yes or no, from the website entry form. A hint only."),
  # AUTHOR-APPROVED DEMO EXCEPTION to "no phone number in AVA start context" (see docs/security-and-privacy.md).
  # Voice only. Used solely as the destination of send_verification_text. Empty on digital.
  ctx("ContextCallerNumber", "The number the caller is calling from, supplied by Architect on voice only. Used solely as the destination of send_verification_text. Never say, repeat, confirm, ask for or summarize it."),
  {"name": "InputData", "direction": "agentInput", "type": "object", "properties": [
    p("first_name", "ContextFirstName"), p("interaction_channel", "ContextInteractionChannel"),
    p("conversation_id", "ContextConversationId"), p("contact_reason", "ContextContactReason"), p("has_claim_id", "ContextHasClaimId"),
    p("caller_number", "ContextCallerNumber")]},
  # user-sourced inputs (one type per tool input, never shared: L12)
  inp("InputClaimId", "Claim ID exactly as the caller says it, such as DEMO then six digits.", True),
  inp("InputLastName", "Claimant last name as the caller says it.", True),
  inp("InputZipCode", "Five digit ZIP code on the claim.", True),
  inp("InputDateOfBirth", "Date of birth as ISO YYYY-MM-DD.", False),
  inp("InputSecurityCodeDigits", "The six digits the caller read from their code message, digits only.", True),
  inp("InputStartLastName", "Last name for the fictional claim being started.", True),
  inp("InputStartZip", "ZIP code for the fictional claim being started.", True),
  inp("InputRelationship", "Caller's relationship to the property owner.", False, enum=REL),
  inp("InputContactDestination", "Fictional email address or phone number for verification codes.", True),
  inp("InputDemoAcknowledged", "True only after the caller confirmed every detail is fictional.", False, typ="boolean"),
  inp("InputNoticeKind", "Which notice to resend.", False, enum=["claim_notice", "upload_link"]),
  inp("InputCaseReason", "Short reason for the transfer in plain words, with no names, numbers or contact details.", False),
  inp("InputInquiryType", "Whether the caller is asking about their own claim or someone else's.", False, enum=["self", "representative", "unknown"]),
  inp("InputVerificationState", "Verification result for this conversation.", False, enum=["verified", "unverified", "failed", "locked"]),
  inp("InputAutomationCompleted", "What automation already did, in plain words, with no personal data.", False),
  # outputs
  {"name": "SecurityCodeValue", "type": "string", "direction": "output", "undisclosed": True},
  {"name": "SecurityCodeMessageValue", "type": "string", "direction": "output", "undisclosed": True},
  out("SecurityCodeResult", [p("securityCode", "SecurityCodeValue", True), p("smsMessage", "SecurityCodeMessageValue", True)]),
  # Existing action "Agentless SMS - MikeD" declares an empty output schema (additionalProperties true): nothing to read back.
  out("SmsSendResult", []),
  {"name": "SessionIdValue", "type": "string", "direction": "output", "undisclosed": True},
  out("VerificationStartResult", [
    p("outcome", "string", True), p("sessionId", "SessionIdValue"), p("maskedDestination", "string"),
    p("deliverySimulated", "boolean"), p("message", "string"), p("humanHelpRecommended", "boolean")]),
  {"name": "VerificationTokenValue", "type": "string", "direction": "output", "undisclosed": True},
  out("VerificationResult", [
    p("outcome", "string", True), p("verificationToken", "VerificationTokenValue"), p("expiresInSeconds", "integer"),
    p("message", "string"), p("humanHelpRecommended", "boolean")]),
  out("ClaimDocument", [p("category", "string", True), p("state", "string", True)]),
  out("ClaimSummaryResult", [
    p("ok", "boolean", True), p("error", "string"), p("message", "string"), p("status", "string"), p("statusChangedOn", "string"),
    p("whatIsHappening", "string"), p("nextAction", "string"), p("processingWindow", "string"), p("ownerDeceased", "boolean"),
    {"name": "documents", "type": "array", "items": "ClaimDocument", "required": False},
    p("furtherActionNeeded", "boolean"), p("paymentState", "string"), p("mailedOn", "string"),
    p("mailingAddressMasked", "string"), p("guidance", "string"), p("humanHelpRecommended", "boolean")]),
  out("StartClaimResult", [p("ok", "boolean", True), p("error", "string"), p("claimId", "string"), p("escalationRecommended", "boolean"),
                           p("submittedToOsc", "boolean"), p("message", "string")]),
  out("NoticeResult", [p("ok", "boolean", True), p("error", "string"), p("deliverySimulated", "boolean"), p("message", "string")]),
  out("ServiceCaseResult", [p("ok", "boolean", True), p("caseId", "string"), p("summary", "string"), p("queueId", "string")]),
  {"name": "OutputData", "direction": "agentOutput", "type": "object", "properties": [
    {"name": "handoff.case_id", "type": "string", "required": False, "mapping": ["ServiceCaseResult", "caseId"]},
    {"name": "handoff.summary", "type": "string", "required": False, "mapping": ["ServiceCaseResult", "summary"],
     "description": "Sanitized transfer summary for the representative. Contains no codes, tokens, full Claim IDs or contact details."},
    {"name": "handoff.queue_id", "type": "string", "required": False, "mapping": ["ServiceCaseResult", "queueId"]}]},
  {"name": "Unauthorized", "type": "DataActionHttpError", "statusCodes": [401, 403],
   "defaultInstruction": "The claim service rejected the request. Do not share any claim details. Apologize briefly and offer a representative."},
  {"name": "ServiceUnavailable", "type": "DataActionHttpError", "statusCodes": [500, 503],
   "defaultInstruction": "The claim service is temporarily unavailable. Say so plainly without guessing any status, offer to try again once, then offer a representative."},
  {"name": "InvalidRequest", "type": "DataActionHttpError", "statusCodes": [400, 422],
   "defaultInstruction": "The details were incomplete or in the wrong format. Ask for the missing or corrected detail one at a time, then retry once."},
]
ERRS = [{"type": "Unauthorized", "instruction": None}, {"type": "ServiceUnavailable", "instruction": None}, {"type": "InvalidRequest", "instruction": None}]

# ---------------------------------------------------------------- tools
def da(name, tool, desc, target, inputs, output, in_instr, out_instr):
    c = contract(target)
    return {"type": "DataAction", "name": tool, "description": desc, "target": pending(target),
            "inputInstructions": in_instr, "outputInstructions": [{"type": "Python", "when": "True", "then": out_instr}],
            "errors": ERRS, "inputs": inputs, "output": output,
            "schemas": {"inputs": c["contract"]["input"]["inputSchema"], "outputs": c["contract"]["output"]["successSchema"]}}
def U(target, typ, req=False): return {"targetName": target, "type": typ, "source": "User", "required": req}
def TO(target, typ, field): return {"targetName": target, "type": typ, "source": "ToolOutput", "required": True, "mapping": [typ, field]}

tools = [
  {"type": "KnowledgeSetting", "name": "search_osc_knowledge",
   "description": "Search approved demo knowledge about unclaimed funds claims, documents, timelines and payment for general questions.",
   "target": KB,
   "inputInstructions": ["Use for general how-to, document, timeline, fraud-safety and payment questions that do not need the caller's own claim.",
                         "If knowledge has no answer, say you do not have that detail and offer a representative."],
   "outputInstructions": [{"type": "Python", "when": "True", "then": "Answer in plain language in two or three short points. State timelines exactly as written in the knowledge. Never promise an approval, an amount or a payment date."}],
   "inputs": []},
  da("SecurityCodeGenerator", "generate_security_code", "Creates a fresh six digit security code and its text message. Call it right before verify_claim_identity, and again for every resend.",
     "SecurityCodeGenerator", [], "SecurityCodeResult", ["Call with no inputs. The code is hidden from you and must never be mentioned."],
     "Do nothing with the result except continue to verify_claim_identity. The code is not visible to you and must not be mentioned."),
  da("VerifyClaimIdentity", "verify_claim_identity", "Checks two matching attributes and records the code from generate_security_code for validation. On voice, send_verification_text then delivers it. Use before any claim details are shared.",
     "VerifyClaimIdentity",
     [U("claimId", "InputClaimId"), U("lastName", "InputLastName", True), U("zip", "InputZipCode"), U("dob", "InputDateOfBirth"),
      TO("securityCode", "SecurityCodeResult", "securityCode")],
     "VerificationStartResult",
     ["Collect the last name plus at least one of ZIP code or date of birth, and the Claim ID when the caller has it, asking for one item at a time.",
      "Send only the values the caller actually said. Leave a field empty instead of guessing.",
      "Write the Claim ID as DEMO, a hyphen, then six digits, for example DEMO-100002, and the date of birth as YYYY-MM-DD.",
      "A Claim ID alone is never enough to verify."],
     "If outcome is code_sent and interaction_channel is voice and caller_number is present, call send_verification_text next, before saying anything about the code. If outcome is code_sent on any other channel, say a code was sent to the contact ending as shown in maskedDestination; if deliverySimulated is true, add once that this is a demonstration and the code appears in the demonstration inbox; then ask the caller to say all six digits of the code together, without asking a yes or no question first. If outcome is failed, say you could not match those details, give one chance to correct them, and never say whether a claim exists. If outcome is throttled, ask the caller to wait a moment. If outcome is locked or unavailable, or humanHelpRecommended is true, offer a representative. Never repeat the code or any value from the tool message about the code."),
  # REUSED, UNCHANGED existing data action "Agentless SMS - MikeD". Inputs: PhoneNumber (required), MessageContent. Output schema is empty.
  {"type": "DataAction", "name": "send_verification_text",
   "description": "Texts the verification code to the number the caller is calling from, using the existing Agentless SMS action. Voice only; call right after verify_claim_identity returns code_sent.",
   "target": {"id": SMS_ACTION_ID, "name": "Agentless SMS - MikeD"},
   "inputInstructions": ["Call only after verify_claim_identity returned outcome code_sent, interaction_channel is voice, and caller_number is present in the start context.",
                         "Never ask the caller for a phone number, never accept or use a number the caller says, and never say, repeat or confirm the number. If caller_number is not present, do not call this tool: tell the caller you cannot text a code on this call and offer a representative."],
   "outputInstructions": [{"type": "Python", "when": "True", "then": "Say that a text message with a six digit code was just sent to the phone you are calling from, without saying the number or any digit, and mention once that it is a demonstration text. Then ask the caller to say all six digits of the code together, without asking a yes or no question first."}],
   "errors": ERRS,
   # Required flags must match the existing action: PhoneNumber required, MessageContent optional (publish fails otherwise).
   # The platform REQUIRES fallbackToUser=true on a required External input (create_version returns 422 otherwise). That means the
   # AVA could, in principle, ask a caller for a number. Compensating controls: explicit instructions, a guardrail, and the flow only
   # passes a valid calling number. Residual risk is documented in docs/security-and-privacy.md.
   "inputs": [{"targetName": "PhoneNumber", "type": "ContextCallerNumber", "source": "External", "required": True, "fallbackToUser": True},
              {"targetName": "MessageContent", "type": "SecurityCodeResult", "source": "ToolOutput", "required": False, "mapping": ["SecurityCodeResult", "smsMessage"]}],
   "output": "SmsSendResult",
   "schemas": {"inputs": {"title": "Agentless SMS Request", "type": "object", "required": ["PhoneNumber"], "properties": {"PhoneNumber": {"type": "string"}, "MessageContent": {"type": "string"}}, "additionalProperties": True},
               "outputs": {"type": "object", "properties": {}, "additionalProperties": True}}},
  da("ValidateSecurityCode", "validate_security_code", "Checks the six digit code the caller read back and unlocks claim details for this conversation.",
     "ValidateSecurityCode",
     [TO("sessionId", "VerificationStartResult", "sessionId"), U("code", "InputSecurityCodeDigits", True)],
     "VerificationResult",
     ["Pass exactly the six digits the caller said, with no spaces.", "If the caller gave fewer than six digits, confirm what you heard and ask only for the remaining digits."],
     "If outcome is verified, say thank you, you can now help with their claim, and ask what they would like to know. If outcome is failed, say that code did not work and offer one more try or a new code, without saying which digit was wrong. If outcome is locked or humanHelpRecommended is true, say you cannot continue verification and offer a representative. Never reveal the expected code."),
  da("GetClaimSummary", "get_claim_summary", "Returns the verified caller's claim status, documents still needed and payment state in one lookup.",
     "GetClaimSummary", [TO("verificationToken", "VerificationResult", "verificationToken")], "ClaimSummaryResult",
     ["Call once per question that needs the claim, and reuse the result for follow-up questions."],
     "If ok is false, say status is not available right now, do not guess, and offer to try again once or connect a representative. If ok is true, give at most three points: what is happening from whatIsHappening, what the caller needs to do from nextAction or the documents list, and the timing from processingWindow or guidance. Use the exact timing wording from the tool. Never state a dollar amount. If humanHelpRecommended or ownerDeceased is true, acknowledge briefly and offer a representative. When paymentState is check_not_received, lost_check, incorrect_payee_or_address, expired_check or check_cannot_be_cashed, acknowledge the problem first, then offer a representative."),
  da("StartFictionalClaim", "start_demo_claim", "Records a fictional demo claim start. Nothing is submitted to the real Office of the State Comptroller.",
     "StartFictionalClaim",
     [U("lastName", "InputStartLastName", True), U("zip", "InputStartZip", True), U("relationship", "InputRelationship", True),
      U("destination", "InputContactDestination", True), U("demoAcknowledged", "InputDemoAcknowledged", True)],
     "StartClaimResult",
     ["Ask the caller to confirm that every detail they give is fictional before calling.", "Do not collect a date of birth, Social Security number or any document."],
     "If error is DEMO_ACK_REQUIRED, ask for the acknowledgment again. If ok is true, say the demo claim was recorded, read the claimId one character at a time on voice, and say it was not sent to the real Office of the State Comptroller. If escalationRecommended is true, explain that a specialist confirms documents for this type of claim and offer a representative."),
  da("SendClaimNotice", "send_claim_notice", "Resends the claim notice or the secure upload page link to the verified caller's contact on file.",
     "SendClaimNotice", [TO("verificationToken", "VerificationResult", "verificationToken"), U("kind", "InputNoticeKind", True)], "NoticeResult",
     ["Use upload_link when the caller needs to submit documents, and claim_notice when they lost the notice."],
     "If ok is true, say it was prepared in the demonstration inbox, and that documents are never collected by phone or chat. If ok is false, offer one retry or a representative."),
  da("CreateServiceCase", "create_service_case", "Creates the sanitized handoff summary before a transfer to a representative. Call it right before the Escalation event.",
     "CreateServiceCase",
     [{"targetName": "verificationToken", "type": "VerificationResult", "source": "ToolOutput", "required": False, "mapping": ["VerificationResult", "verificationToken"]},
      U("reason", "InputCaseReason", True), U("inquiry", "InputInquiryType", True), U("verification", "InputVerificationState", True),
      U("automationCompleted", "InputAutomationCompleted")],
     "ServiceCaseResult",
     ["Write the reason and automationCompleted in plain words with no names, Claim IDs, ZIP codes, dates of birth, phone numbers, email addresses, codes or tokens.",
      "Set verification to unverified, failed or locked from what happened; the service itself confirms verified only when a valid token is present."],
     "Do not read the summary aloud. Continue to the Escalation event after the caller agrees to the transfer."),
]

# ---------------------------------------------------------------- role / instructions / guardrails
role = ("You are a demonstration virtual assistant for the New York State Office of the State Comptroller, Office of Unclaimed Funds. "
        "It is unofficial and uses fictional data only. The person you are helping is the claimant, or someone helping with a claim. "
        "You help with how to start a claim, recovering or using a Claim ID, what a claim still needs, claim status, how document upload works, "
        "and what happens after approval. You cannot give dollar amounts, legal, tax or investment advice, take documents or Social Security "
        "numbers in conversation, or act on real claims. For those you say what you can help with, or connect the caller with a representative.")

instructions = [
  "If first_name is in the start context, greet the caller by first name once; otherwise use a neutral welcome and ask how you can help. First name is never proof of identity.",
  "In your first reply, say once that this is an unofficial demonstration that uses fictional information only.",
  "Early in the conversation, ask whether the caller is asking about their own claim or someone else's, before sharing any claim detail.",
  "If the caller is acting for an estate, a minor, a dependent, a guardian, a power of attorney, a trust or a business, explain that a specialist handles those claims and offer a representative without sharing claim details.",
  "Never say or hint that a claim exists, and never share claim details, until validate_security_code succeeds in this conversation.",
  "Do not ask for a Social Security number, bank details or a full date of birth beyond what verification needs.",
  "When confirming a Claim ID on voice, read back only the last three digits one at a time.",
  "Use neutral wording when verification fails, such as I could not match those details, and never say which detail was wrong.",
  "When the caller has no Claim ID, verify with attributes only; after verification, tell them the Claim ID is in the notice sent to their contact and offer to resend it with send_claim_notice.",
  "Answer claim-specific questions only from tool results and general questions only from search_osc_knowledge; if neither has the answer, say you cannot answer and offer a representative.",
  "Never give a dollar amount, and say this service cannot share claim amounts when asked.",
  "State processing times exactly as the tools or knowledge state them, and never promise approval or a payment date.",
  "When documents are still needed, explain which ones from the tool result and offer the secure upload page link with send_claim_notice; never accept documents or document contents in conversation.",
  "Follow this empathy pattern: acknowledge what the caller said, explain what happens next, then ask one question or take one action.",
  "For grief, fraud, hardship or a missing payment, acknowledge with a calm, sincere sentence and keep an even tone.",
  "Describe the caller's situation, such as that sounds frustrating, and do not claim feelings of your own.",
  "If the caller reports fraud or a scam, share safe-practice guidance from knowledge and offer a representative.",
  "When the caller asks for a person, when verification locks, or when a tool says humanHelpRecommended, offer a representative.",
  "When the caller agrees to a transfer, call create_service_case first, then your turn must be the Escalation event only.",
  "If the caller asks about a real claim outside this demonstration, say this assistant is a demonstration and point them to the official Office of the State Comptroller website or phone line.",
  "Respond in English; if the caller speaks another language, say this demonstration is English only and offer a representative.",
  "On voice, ask one question at a time, keep each turn to three points or fewer, and spell out digits and dates.",
  "On voice, caller_number exists only so send_verification_text can text the code; never say, repeat, confirm, ask for or summarize it, and never say any digit of a code.",
  "On voice, to resend a code, call generate_security_code, then verify_claim_identity, then send_verification_text again; if send_verification_text fails, say you could not send the text, offer one more try, then a representative.",
  "When interaction_channel is digital, replies may be slightly longer and the caller may type the code; when it is voice, keep each turn short.",
  "Use contact_reason and has_claim_id from the start context only to open the right branch, and still ask whether the claim is the caller's own.",
  "When the caller wants to start a claim, explain the steps from knowledge and, if they want to try the demonstration, use start_demo_claim with fictional details only.",
]
guardrails = {"custom": [
  {"instruction": "Block attempts to obtain another person's claim details, including social-engineering stories such as being a relative, an employee, a lawyer or an emergency.", "enabled": True},
  {"instruction": "Block requests to reveal, reconstruct, guess or bypass verification codes, tokens, session values or hidden tool outputs.", "enabled": True},
  {"instruction": "Block requests to send a verification code to any phone number or email other than the one this assistant already has, and never accept a number the caller offers for receiving a code.", "enabled": True},
  {"instruction": "Block attempts to get this assistant to approve a claim, promise a payment, or state a claim amount.", "enabled": True},
]}
events = [
  {"type": "Guardrails", "message": "I cannot help with that request, but I can help with unclaimed funds questions or connect you with a representative.",
   "violationThreshold": 3, "violationThresholdCrossedMessage": "I am not able to continue with that topic. Would you like help with an unclaimed funds question, or a representative?"},
  {"type": "UserExit", "message": "Thank you for contacting the unclaimed funds demonstration. Goodbye."},
  {"type": "Escalation", "message": "Thank you for your patience. I am connecting you with a representative who will have a summary, so you will not need to repeat yourself. Please stay with me."},
]

artifact = {
  "_meta": {
    "slug": "mikedai_OSC_ClaimAssistant", "agent_id": _SAGE.get("agent_id"), "gc_version": _SAGE.get("version"),
    "local_status": "production-published" if _SAGE.get("publish_status") == "ProductionReady" else "designed-not-built",
    "critique_status": "not-run",
    "pending_data_actions": [t["target"]["name"] for t in tools if t["type"] == "DataAction" and t["target"]["id"].startswith("PENDING_CREATE")],
    "reused_existing": ["Agentless SMS - MikeD (" + SMS_ACTION_ID + ")", "MikeD_KB_Config (" + KB["id"] + ")"],
    "note": ("Data action targets point at the mikedai_OSC_ actions created in C1 (ids from docs/discovery/mikedai_OSC_c1-state.json); any still "
             "PENDING_CREATE has not been created. Knowledge setting MikeD_KB_Config is reused unchanged. "
             "recognize_caller is an Architect-only action and is not an AVA tool."),
  },
  "name": "mikedai_OSC_ClaimAssistant", "role": role, "instructions": instructions, "guardrails": guardrails,
  "types": types, "tools": tools, "events": events, "settings": {"comfortStatement": {"enabled": True}},
}
(HERE / "design-artifact.json").write_text(json.dumps(artifact, indent=2) + "\n")
print("tools:", [t["name"] for t in tools], "| instructions:", len(instructions), "| role chars:", len(role))
