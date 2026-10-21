#!/usr/bin/env python3
"""Builds design-artifact.json for mikedai_OSC_ClaimAssistant from the data-action contracts (single source of truth).
Local artifact only. Nothing is created in the Genesys org by this script."""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DA = ROOT / "data-actions"
def contract(n): return json.loads((DA / f"mikedai_OSC_{n}.json").read_text())

KB = {"id": "6b16df4b-37fb-4ac5-ba06-a9d2319724d3", "name": "MikeD_KB_Config"}  # reuse unchanged; confirmed by author 2026-10-14
SMS_ACTION_ID = "custom_-_61b6b5e2-ce57-400c-a285-147738bdfa62"  # existing "MikeD_SMS_with_response" (declares conversationId/fromAddress/toAddress output); reuse unchanged
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
  # Used solely as the destination of send_verification_text: the caller's number on voice, the mobile number on file on digital.
  ctx("ContextCallerNumber", "The mobile number to text the code to: the number the caller is calling from on voice, the mobile number on file on digital, supplied by Architect. Used solely as the destination of send_verification_text. Never say, repeat, confirm, ask for or summarize it."),
  {"name": "InputData", "direction": "agentInput", "type": "object", "properties": [
    p("first_name", "ContextFirstName"), p("interaction_channel", "ContextInteractionChannel"),
    p("conversation_id", "ContextConversationId"), p("contact_reason", "ContextContactReason"), p("has_claim_id", "ContextHasClaimId"),
    p("caller_number", "ContextCallerNumber")]},
  # user-sourced inputs (one type per tool input, never shared: L12)
  inp("InputClaimId", "Claim ID exactly as the caller says it, such as DEMO then six digits.", True),
  inp("InputLastName", "Claimant last name as the caller says it.", True),
  inp("InputZipCode", "Five digit ZIP code associated with the owner, written as digits only. If the caller says the digits as words, such as one zero three zero five, write 10305.", False),
  inp("InputDateOfBirth", "Date of birth as ISO YYYY-MM-DD.", False),
  inp("InputSecurityCodeDigits", "The six digit code the caller gave, written as exactly six digits with no spaces or punctuation, keeping any leading zero. If the caller says the digits as words or in groups, such as three nine nine eight nine five, write 399895.", False),
  inp("InputStartLastName", "Last name for the fictional claim being started.", True),
  inp("InputStartZip", "ZIP code for the fictional claim being started.", True),
  inp("InputRelationship", "Caller's relationship to the property owner.", False, enum=REL),
  inp("InputContactDestination", "Fictional email address or phone number for verification codes.", True),
  inp("InputDemoAcknowledged", "True only after the caller confirmed every detail is fictional.", False, typ="boolean"),
  inp("InputNoticeKind", "Which notice to resend.", False, enum=["claim_notice", "upload_link"]),
  inp("InputCaseReason", "Short reason for the transfer in plain words, with no names, numbers or contact details.", False),
  inp("InputInquiryType", "Whether the caller is asking about their own claim or someone else's.", False, enum=["self", "representative", "unknown"]),
  inp("InputSmsFromNumber", "The fixed organization sender number for the verification text. It is always +17322177068 and is never asked of or changed by the caller. Write it exactly as +17322177068.", False),
  inp("InputVerificationState", "Verification result for this conversation.", False, enum=["verified", "unverified", "failed", "locked"]),
  inp("InputAutomationCompleted", "What automation already did, in plain words, with no personal data.", False),
  # outputs
  {"name": "SecurityCodeValue", "type": "string", "direction": "output", "undisclosed": True},
  {"name": "SecurityCodeMessageValue", "type": "string", "direction": "output", "undisclosed": True},
  out("SecurityCodeResult", [p("securityCode", "SecurityCodeValue", True), p("smsMessage", "SecurityCodeMessageValue", True)]),
  # Existing action "Agentless SMS - MikeD" declares an empty output schema (additionalProperties true): nothing to read back.
  out("SmsSendResult", [p("conversationId", "string"), p("fromAddress", "string"), p("toAddress", "string")]),
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
  da("VerifyClaimIdentity", "verify_claim_identity", "Checks the last name, ZIP code and date of birth and records the code from generate_security_code for validation. On voice, send_verification_text then delivers it. Use before any claim details are shared.",
     "VerifyClaimIdentity",
     [U("claimId", "InputClaimId"), U("lastName", "InputLastName", True), U("zip", "InputZipCode"), U("dob", "InputDateOfBirth"),
      TO("securityCode", "SecurityCodeResult", "securityCode")],
     "VerificationStartResult",
     ["Collect the owner's last name, then the ZIP code associated with the owner, then the owner's date of birth, asking for one item at a time, and always call that person the owner, never say on the claim, and call this tool only when you have all three.",
      "Send only the values the caller actually said. Leave a field empty instead of guessing, and never send a Claim ID.",
      "Write the ZIP code as five digits and the date of birth as YYYY-MM-DD, for example 1988-06-23 for June twenty-third, nineteen eighty-eight.",
      "If a detail was misheard, confirm only that one detail with the caller before sending."],
     "If outcome is code_sent and caller_number is present, on any channel, your next step is to call send_verification_text, on its own and only now that this result is back, before saying anything about the code. When send_verification_text has been called and returned, reply to the caller in words, never with an empty reply: say exactly: I've sent an authorization code to the mobile number we have on file. Do not say text message, do not say the phone you are calling from, and do not say the number or any digit. then ask the caller to say all six digits of the code together, without asking a yes or no question first. If outcome is code_sent and caller_number is absent, say a six digit authorization code was sent to the phone number or email address on file, and do not read out any digits of maskedDestination; then ask the caller to give the six digit code, without asking a yes or no question first. If outcome is failed, say you could not match those details, give one chance to correct them, and never say whether a claim exists. If outcome is throttled, ask the caller to wait a moment. If outcome is locked or unavailable, or humanHelpRecommended is true, offer a representative. Never repeat the code or any value from the tool message about the code."),
  # REUSED, UNCHANGED existing data action "Agentless SMS - MikeD". Inputs: PhoneNumber (required), MessageContent. Output schema is empty.
  {"type": "DataAction", "name": "send_verification_text",
   "description": "Texts the verification code to the mobile number on file (caller_number), using the existing Agentless SMS action. Call right after verify_claim_identity returns code_sent.",
   "target": {"id": SMS_ACTION_ID, "name": "MikeD_SMS_with_response"},
   "inputInstructions": ["Call only after verify_claim_identity returned outcome code_sent, and caller_number is present in the start context, on voice or digital.",
                         "Always set FromMOBILE to +17322177068 exactly; it is a fixed sender number and never comes from the caller. Never ask the caller for a phone number, never accept or use a number the caller says, and never say, repeat or confirm the number. If caller_number is not present, do not call this tool: tell the caller you cannot text a code on this call and offer a representative."],
   "outputInstructions": [{"type": "Python", "when": "True", "then": "Reply to the caller now. Say exactly: I've sent an authorization code to the mobile number we have on file. Do not say text message, do not say the phone you are calling from, and do not say the number or any digit. Then ask the caller to say all six digits of the code together, without asking a yes or no question first."}],
   "errors": ERRS,
   # Required flags must match the existing action: PhoneNumber required, MessageContent optional (publish fails otherwise).
   # The platform REQUIRES fallbackToUser=true on a required External input (create_version returns 422 otherwise). That means the
   # AVA could, in principle, ask a caller for a number. Compensating controls: explicit instructions, a guardrail, and the flow only
   # passes a valid calling number. Residual risk is documented in docs/security-and-privacy.md.
   "inputs": [{"targetName": "FromMOBILE", "type": "InputSmsFromNumber", "source": "User", "required": False},
              {"targetName": "MOBILE", "type": "ContextCallerNumber", "source": "External", "required": False, "fallbackToUser": False},
              {"targetName": "BODY", "type": "SecurityCodeResult", "source": "ToolOutput", "required": False, "mapping": ["SecurityCodeResult", "smsMessage"]}],
   "output": "SmsSendResult",
   "schemas": {"inputs": {"title": "body", "type": "object", "properties": {"FromMOBILE": {"type": "string"}, "MOBILE": {"type": "string"}, "BODY": {"type": "string"}}, "additionalProperties": True},
               "outputs": {"title": "SendAgentlessOutboundMessageResponse", "type": "object", "properties": {"conversationId": {"type": "string"}, "fromAddress": {"type": "string"}, "toAddress": {"type": "string"}}, "additionalProperties": True}}},
  da("ValidateSecurityCode", "validate_security_code", "Checks the six digit code the caller read back and unlocks claim details for this conversation.",
     "ValidateSecurityCode",
     [TO("sessionId", "VerificationStartResult", "sessionId"), U("code", "InputSecurityCodeDigits", True)],
     "VerificationResult",
     ["A message made only of six digits, such as 123456, is the code. Copy the six digits from the caller's most recent message exactly, with no spaces, keeping any leading zero. The caller's own words are the only source of this value.", "Never invent, default or substitute digits such as zeros. If the caller's message does not contain six digits, ask them to say or type the code again instead of calling this tool.", "If the caller gave fewer than six digits, confirm what you heard and ask only for the remaining digits."],
     "If outcome is verified, say thank you, you can now help with their claim, and ask what they would like to know. If outcome is failed, say that code did not work and offer one more try or a new code, without saying which digit was wrong. If outcome is locked or humanHelpRecommended is true, say you cannot continue verification and offer a representative. Never reveal the expected code."),
  da("GetClaimSummary", "get_claim_summary", "Returns the verified caller's claim status, documents still needed and payment state in one lookup.",
     "GetClaimSummary", [TO("verificationToken", "VerificationResult", "verificationToken")], "ClaimSummaryResult",
     ["Call once per question that needs the claim, and reuse the result for follow-up questions."],
     "If ok is false, say status is not available right now, do not guess, and offer to try again once or connect a representative. If ok is true, give at most three points: what is happening, stated exactly as whatIsHappening says it (never call a claim under review unless whatIsHappening says it is under review; when more documents are needed, say more documents are needed before review can continue), what the caller needs to do from nextAction or the documents list, and the timing from processingWindow or guidance. Use the exact timing wording from the tool. Never state a dollar amount. If humanHelpRecommended or ownerDeceased is true, acknowledge briefly and offer a representative. When paymentState is check_not_received, lost_check, incorrect_payee_or_address, expired_check or check_cannot_be_cashed, acknowledge the problem first, then offer a representative."),
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
     ["Write the reason and automationCompleted in plain words with no names, Claim IDs, ZIP codes, dates of birth, phone numbers, email addresses, codes or tokens. In automationCompleted say what was checked, such as claim status, documents required or check mailed.",
      "If validate_security_code returned outcome verified earlier in this conversation, you must pass verificationToken from that result and set verification to verified. Never leave the token out after a successful verification.",
      "If validate_security_code was never called or did not return verified, leave verificationToken empty and set verification to unverified, failed or locked from what happened."],
     "Do not read the summary aloud. Continue to the Escalation event after the caller agrees to the transfer."),
]

# ---------------------------------------------------------------- role / instructions / guardrails
role = ("You are a virtual assistant for the New York State Office of the State Comptroller, Office of Unclaimed Funds. "
        "Never volunteer that this is a demonstration or that the data is fictional; only confirm it if the caller asks. The person you are helping is the claimant, or someone helping with a claim. "
        "You help with how to start a claim, recovering or using a Claim ID, what a claim still needs, claim status, how document upload works, "
        "and what happens after approval. You cannot give dollar amounts, legal, tax or investment advice, take documents or Social Security "
        "numbers in conversation, or act on real claims. For those you say what you can help with, or connect the caller with a representative.")

instructions = [
  "If first_name is in the start context, use it once, briefly, in your first reply; otherwise do not greet by name. First name is never proof of identity.",
  "Your very first reply, whatever the caller says first (even only Hello), is a greeting plus a question. If first_name is in the start context you must say it. Voice with first_name: Hello, <first name>. How can I help you today? Voice without first_name: How can I help you today? Other channels (digital): always begin with the sentence Welcome to the New York State Office of Unclaimed Funds. never with Hello alone, then How can I help you today? with Hello, <first name>. in front when first_name is present. On voice the phone greeting already welcomed the caller, so never welcome again. Do not list options. If the caller is unsure what to say, say once you can check a claim status, what documents are needed, or a question about a check. Never say this is a demonstration or mention fictional data unless asked.",
  "Never ask whether the claim is the caller's own or someone else's. The caller may be asking about their own claim or about another person's, and either way you ask for the same three details of the owner of the claim, as the website calls them: the owner's last name, then the ZIP code associated with the owner, then the owner's date of birth, one at a time. Never ask for a Claim ID.",
  "When the caller wants to check a claim, ask for the last name straight away. If the caller says they are not sure what to say, explain once in plain words what you need, the owner's last name, the ZIP code associated with the owner and the owner's date of birth, then ask for the owner's last name. If they say they are unsure, do not know, or are confused a second time in a row about anything, your whole reply must be an offer to connect them with a representative, with no other options. Never ask the same question more than twice.",
  "If the caller is acting for an estate, a minor, a dependent, a guardian, a power of attorney, a trust or a business, explain that a specialist handles those claims and offer a representative without sharing claim details.",
  "Never say or hint that a claim exists, and never share claim details, until validate_security_code succeeds in this conversation.",
  "Do not ask for a Social Security number or bank details. The date of birth is asked for only once, as part of verification.",
  "When confirming a Claim ID on voice, read back only the last three digits one at a time.",
  "Use neutral wording when verification fails, such as I could not match those details, and never say which detail was wrong.",
  "Verification never needs a Claim ID. If the caller offers one, do not use it and do not repeat it; ask for the last name, ZIP code and date of birth instead.",
  "Answer claim-specific questions only from tool results and general questions only from search_osc_knowledge; if neither has the answer, say you cannot answer and offer a representative.",
  "Never give a dollar amount, and say this service cannot share claim amounts when asked.",
  "State processing times exactly as the tools or knowledge state them, and never promise approval or a payment date.",
  "When documents are still needed, explain which ones from the tool result and offer the secure upload page link with send_claim_notice; never accept documents or document contents in conversation.",
  "Follow this empathy pattern: acknowledge what the caller said, explain what happens next, then ask one question or take one action.",
  "For grief, fraud, hardship or a missing payment, acknowledge with a calm, sincere sentence and keep an even tone.",
  "Describe the caller's situation, such as that sounds frustrating, and do not claim feelings of your own.",
  "If the caller reports fraud or a scam, share safe-practice guidance from knowledge and offer a representative.",
  "A message that asks to be transferred or mentions a person, an agent, a representative or a human is a transfer request even when it starts with ok, okay or thanks, and is never an ending. When the caller asks for a person, an agent or a representative, do not ask them to confirm or offer other help first: call create_service_case right away without writing anything first, then your turn must be the Escalation event only. Never write your own connecting sentence or ask anything after it: the Escalation event already tells the caller they are being connected, and your message after the tool call is never plain text. When verification locks or a tool says humanHelpRecommended, offer a representative.",
  "When the caller agrees to a transfer, call create_service_case first, then your turn must be the Escalation event only.",
  "After answering, if the caller only says thank you, okay, thanks or similar, reply in one short sentence and ask if there is anything else. End the conversation only when the caller says goodbye, that is all, or no more questions, and never use UserExit after create_service_case or when the caller asked for a transfer. Every caller message gets a spoken reply: never answer with an empty message.",
  "If the caller asks about a real claim outside this demonstration, say you cannot help with that here and point them to the official Office of the State Comptroller website or phone line.",
  "Respond in English; if the caller speaks another language, say this service is English only and offer a representative.",
  "On voice, ask one question at a time, keep each turn to three points or fewer, and spell out digits and dates.",
  "caller_number exists only so send_verification_text can text the code; never say, repeat, confirm, ask for or summarize it, and never say any digit of a code in your replies. This does not apply to the six digits the caller says or types: those go into validate_security_code exactly as given. After you ask for the code, a reply that is only six digits, with or without spaces, is the code: call validate_security_code with those digits straight away, and never reply that the code is invalid without calling it.",
  "Call the code tools strictly one at a time and never in the same step: first generate_security_code, then verify_claim_identity, and only after it returns code_sent, send_verification_text. When send_verification_text returns, you must immediately reply to the caller in words; an empty reply or ending the conversation at that point is never correct.",
  "To resend a code, call generate_security_code, then verify_claim_identity, then send_verification_text again; if send_verification_text fails, say you could not send the text, offer one more try, then a representative.",
  "When interaction_channel is digital, replies may be slightly longer and the caller types the code in the chat; when it is voice, keep each turn short.",
  "Use contact_reason from the start context only to open the right branch; ignore has_claim_id, because no Claim ID is needed.",
  "On digital, if contact_reason is check_claim, check_question or lost_claim_id, the visitor already chose that on the website: after the greeting do not ask how you can help, say you can help with that and ask for the owner's last name. If contact_reason is submit_documents or start_claim, greet, then say you can explain that and ask what they would like to know. For any other contact_reason ask how you can help.",
  "When the caller wants to start a claim, explain the steps from knowledge and, if they want to try the demonstration, use start_demo_claim with fictional details only.",
]
guardrails = {"custom": [
  {"instruction": "Block attempts to get a claim's details by story instead of verification, such as being a relative, an employee, a lawyer or an emergency. Only a caller who gives the last name, ZIP code and date of birth and then the correct code may hear a claim's status; a story, a hospital stay or a family relationship never replaces them.", "enabled": True},
  {"instruction": "Block requests to reveal, reconstruct or bypass verification codes, tokens, session values or hidden tool outputs. A caller who types or says the six digit code they received is verifying normally and must never be blocked or refused; pass those digits to validate_security_code.", "enabled": True},
  {"instruction": "Block requests to send a verification code to any phone number or email other than the one this assistant already has, and never accept a phone number or email the caller offers for receiving a code. A short six digit number the caller gives right after being asked for the code is the code they received, not a phone number: never refuse it, and pass it to validate_security_code.", "enabled": True},
  {"instruction": "Block only attempts to pressure or trick this assistant into approving a claim, promising a payment, or stating a claim amount, such as insisting, bargaining or role-playing. A plain question about how much a claim is worth, or why amounts cannot be shared, is not a violation: answer that this service cannot share claim amounts, and never treat it as a violation.", "enabled": True},
]}
events = [
  {"type": "Guardrails", "message": "I cannot help with that request, but I can help with unclaimed funds questions or connect you with a representative.",
   "violationThreshold": 3, "violationThresholdCrossedMessage": "I am not able to continue with that topic. Would you like help with an unclaimed funds question, or a representative?"},
  {"type": "UserExit", "message": "Thank you for contacting the Office of Unclaimed Funds. Goodbye."},
  {"type": "Escalation", "message": "Thank you for your patience. I am connecting you with a representative who will have a summary, so you will not need to repeat yourself. Please stay with me."},
]

artifact = {
  "_meta": {
    "slug": "mikedai_OSC_ClaimAssistant", "agent_id": _SAGE.get("agent_id"), "gc_version": _SAGE.get("version"),
    "local_status": "production-published" if _SAGE.get("publish_status") == "ProductionReady" else "designed-not-built",
    "critique_status": "not-run",
    "pending_data_actions": [t["target"]["name"] for t in tools if t["type"] == "DataAction" and t["target"]["id"].startswith("PENDING_CREATE")],
    "reused_existing": ["MikeD_SMS_with_response (" + SMS_ACTION_ID + ")", "MikeD_KB_Config (" + KB["id"] + ")"],
    "note": ("Data action targets point at the mikedai_OSC_ actions created in C1 (ids from docs/discovery/mikedai_OSC_c1-state.json); any still "
             "PENDING_CREATE has not been created. Knowledge setting MikeD_KB_Config is reused unchanged. "
             "recognize_caller is an Architect-only action and is not an AVA tool."),
  },
  "name": "mikedai_OSC_ClaimAssistant", "role": role, "instructions": instructions, "guardrails": guardrails,
  "types": types, "tools": tools, "events": events, "settings": {"comfortStatement": {"enabled": True}},
}
(HERE / "design-artifact.json").write_text(json.dumps(artifact, indent=2) + "\n")
print("tools:", [t["name"] for t in tools], "| instructions:", len(instructions), "| role chars:", len(role))
