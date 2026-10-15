#!/usr/bin/env python3
"""Composes the four mikedai_OSC_ Archy YAML flows into ../archy/. LOCAL FILES ONLY: nothing is created or published.

The bot-flow SETTINGS blocks are copied from existing reference exports (read-only) so the structure matches what this
org's Archy version emits; everything else (variables, actions, tasks) is authored here. Summarization, wrap-up
assignment and transfer summaries are enabled on both bot flows. The summary setting is the EXISTING MikeD_Summary_Config
(id a09f07f6-aa6e-4415-99c5-b5e7dc83a8ad), reused unchanged at the author's direction (2026-10-14). It has maskPII all off,
so see docs/security-and-privacy.md for what that means.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT.parent / "docs" / "demo" / "architect-exports" / "archy-yaml"
OUT = ROOT / "archy"
OUT.mkdir(exist_ok=True)

QUEUE = "Support_MikeD"          # queue dc15ad2c-7917-413f-9a00-4f52df4d4602 (name verified read-only; case differs from 'support_miked')
SUMMARY_SETTING = "MikeD_Summary_Config"  # existing, reused unchanged
AVA = "mikedai_OSC_ClaimAssistant"
DA_CATEGORY = "mikedai_OSC_Data_Actions"  # the actions' own `category` (Archy matches on it), not the integration name


def top_blocks(text):
    """Split a flow YAML (after its first line) into {top_key: block_text} at 2-space indentation."""
    lines = text.splitlines()
    blocks, key, cur = {}, None, []
    for ln in lines[1:]:
        m = re.match(r"^  ([A-Za-z]+):", ln)
        if m:
            if key:
                blocks[key] = "\n".join(cur)
            key, cur = m.group(1), [ln]
        elif key:
            cur.append(ln)
    if key:
        blocks[key] = "\n".join(cur)
    return blocks


def virtual_agent_block():
    return (
        "  settingsVirtualAgent:\n"
        "    summarization:\n      lit: true\n"
        "    assignWrapupCodes:\n      lit: true\n"
        f"    conversationSummarySetting:\n      name: {SUMMARY_SETTING}\n"
    )


def settings(ref_file, keys):
    b = top_blocks((REF / ref_file).read_text())
    out = []
    for k in keys:
        out.append(virtual_agent_block().rstrip("\n") if k == "settingsVirtualAgent" else b[k])
    return "\n".join(out)


def transfer(tid, name="Transfer to ACD", digital=False):
    extra = "        directAgent:\n          noValue: true\n" if digital else ""
    return f"""- transferToAcd:
    name: {name}
    trackingId: {tid}
    targetQueue:
      lit:
        name: {QUEUE}
    preTransferCommunication:
      noValue: true
    failureTransferCommunication:
      noValue: true
    priority:
      lit: 0
    preferredAgents:
      noValue: true
    languageSkill:
      noValue: true
{extra.replace('        ', '    ') if extra else ''}    failureOutputs:
      errorType:
        noValue: true
      errorMessage:
        noValue: true"""


def indent(block, n):
    pad = " " * n
    return "\n".join((pad + l if l.strip() else l) for l in block.splitlines())


# ------------------------------------------------------------------ voice bot flow
voice_bot = f"""botFlow:
  name: mikedai_OSC_VoiceBotFlow
  description: "UNOFFICIAL DEMO - NY OSC Unclaimed Funds voice bot. Calls {AVA}; transfers to {QUEUE} only after the AVA escalates with a sanitized handoff case."
  division: Home
  startUpRef: "/botFlow/bots/bot[Default Bot_10]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
      speechToText:
        engine:
          name: Microsoft Azure
          defaultEngine: true
  variables:
    - stringVariable:
        name: Flow.FirstName
        initialValue:
          noValue: true
        isInput: true
        isOutput: false
    - stringVariable:
        name: Flow.CallerNumber
        initialValue:
          noValue: true
        isInput: true
        isOutput: false
    - stringVariable:
        name: Flow.HandoffCaseId
        initialValue:
          noValue: true
        isInput: false
        isOutput: false
    - stringVariable:
        name: Flow.HandoffSummary
        initialValue:
          noValue: true
        isInput: false
        isOutput: false
{settings('miked_mv_VAbotflow_v1.yaml', ['settingsActionDefaults','settingsErrorHandling','settingsPrompts','settingsBotFlow','settingsUserInput','settingsKnowledge','settingsVirtualAgent'])}
  bots:
    - bot:
        name: Default Bot
        refId: Default Bot_10
        trackingId: 10
        actions:
          - callAgenticVirtualAgent:
              name: Call Agentic Virtual Agent
              trackingId: 12
              agenticVirtualAgent:
                {AVA}:
                  ver_latestPublished:
                    inputs:
                      first_name:
                        exp: Flow.FirstName
                      caller_number:
                        exp: Flow.CallerNumber
                      interaction_channel:
                        lit: voice
                      conversation_id:
                        noValue: true
                      contact_reason:
                        noValue: true
                      has_claim_id:
                        noValue: true
                    outputs:
                      handoff.case_id:
                        var: Flow.HandoffCaseId
                      handoff.summary:
                        var: Flow.HandoffSummary
                      handoff.queue_id:
                        noValue: true
                    exitReason:
                      noValue: true
              outputs:
                failure:
                  actions:
                    - callTask:
                        name: Transfer after tool or AVA failure
                        trackingId: 17
                        targetTaskRef: "/botFlow/tasks/task[Transfer to queue_20]"
                timeout:
                  actions:
                    - callTask:
                        name: Transfer after timeout
                        trackingId: 18
                        targetTaskRef: "/botFlow/tasks/task[Transfer to queue_20]"
          - decision:
              name: Did the AVA hand off
              trackingId: 19
              condition:
                exp: IsNotSetOrEmpty(Flow.HandoffCaseId)
              outputs:
                yes:
                  actions:
                    - exitBotFlow:
                        name: Exit Bot Flow
                        trackingId: 11
                no:
                  actions:
                    - callTask:
                        name: Transfer to queue
                        trackingId: 21
                        targetTaskRef: "/botFlow/tasks/task[Transfer to queue_20]"
          # A transfer can fall through if it fails, so the main sequence must still end in a terminating action.
          - exitBotFlow:
              name: Exit Bot Flow (end of sequence)
              trackingId: 30
  tasks:
    - task:
        name: Transfer to queue
        refId: Transfer to queue_20
        trackingId: 20
        actions:
          - setParticipantData:
              name: Set handoff participant data
              trackingId: 22
              attributes:
                - attribute:
                    name:
                      lit: mikedai_OSC_HandoffCaseId
                    value:
                      exp: Flow.HandoffCaseId
                - attribute:
                    name:
                      lit: mikedai_OSC_HandoffSummary
                    value:
                      exp: Flow.HandoffSummary
{indent(transfer(13), 10)}
          - exitBotFlow:
              name: Exit Bot Flow (after transfer)
              trackingId: 31
"""

# ------------------------------------------------------------------ voice inbound call flow
voice_inbound = f"""inboundCall:
  name: mikedai_OSC_VoiceClaimFlow
  description: "UNOFFICIAL DEMO - NY OSC Unclaimed Funds voice entry. ANI recognition is a convenience only, then {AVA} via mikedai_OSC_VoiceBotFlow. Not wired to any DID by this file."
  division: Home
  startUpRef: "/inboundCall/tasks/task[Main_12]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
      textToSpeech:
        Genesys TTS Connector Eleven Labs:
          voice: Bella - Professional, Bright, Warm
  initialGreeting:
    tts: Welcome. This is an unofficial demonstration of unclaimed funds support. Please do not share real personal information.
  variables:
    - booleanVariable:
        name: Flow.AniRecognized
        initialValue:
          lit: false
        isOutput: false
    - stringVariable:
        name: Flow.FirstName
        initialValue:
          noValue: true
        isOutput: false
  settingsActionDefaults:
    playAudioOnSilence:
      allowedRepeatCount:
        lit: 5
      silenceDuration:
        lit:
          seconds: 1
      timeout:
        lit:
          seconds: 40
  settingsErrorHandling:
    errorHandling:
      queue:
        targetQueue:
          lit:
            name: {QUEUE}
    preHandlingAudio:
      tts: Sorry, something went wrong. I am connecting you with a representative.
  tasks:
    - task:
        name: Main
        refId: Main_12
        trackingId: 12
        actions:
          - callData:
              name: Recognize caller by ANI (convenience only)
              trackingId: 13
              timeout:
                lit:
                  seconds: 5
              category:
                {DA_CATEGORY}:
                  dataAction:
                    mikedai_OSC_RecognizeCaller:
                      inputs:
                        ani:
                          exp: Call.Ani
                      successOutputs:
                        recognized:
                          var: Flow.AniRecognized
                        firstName:
                          var: Flow.FirstName
                      failureOutputs:
                        errorCode:
                          noValue: true
                        status:
                          noValue: true
                        correlationId:
                          noValue: true
                        entityId:
                          noValue: true
                        entityName:
                          noValue: true
                        userMessage:
                          noValue: true
              outputs:
                failure:
                  actions:
                    - updateData:
                        name: No recognition; continue neutrally
                        trackingId: 14
                        statements:
                          - boolean:
                              variable: Flow.AniRecognized
                              value:
                                lit: false
                timeout:
                  actions:
                    - updateData:
                        name: No recognition on timeout; continue neutrally
                        trackingId: 15
                        statements:
                          - boolean:
                              variable: Flow.AniRecognized
                              value:
                                lit: false
          - callBotFlow:
              name: Call mikedai_OSC_VoiceBotFlow
              trackingId: 16
              botFlow:
                mikedai_OSC_VoiceBotFlow:
                  ver_latestPublished:
                    inputs:
                      Flow.FirstName:
                        exp: Flow.FirstName
                      Flow.CallerNumber:
                        exp: Replace(Call.Ani, "tel:", "")
                    outputs: {{}}
          - disconnect:
              name: Disconnect
              trackingId: 17
"""

# ------------------------------------------------------------------ digital bot flow
digital_bot = f"""digitalBot:
  name: mikedai_OSC_DigitalBotFlow
  description: "UNOFFICIAL DEMO - NY OSC Unclaimed Funds web messaging bot. Calls {AVA}; transfers to {QUEUE} only after the AVA escalates with a sanitized handoff case."
  division: Home
  startUpRef: "/digitalBot/bots/bot[Default Bot_10]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
  variables:
    - stringVariable:
        name: Flow.FirstName
        initialValue:
          noValue: true
        isInput: true
        isOutput: false
    - stringVariable:
        name: Flow.ContactReason
        initialValue:
          noValue: true
        isInput: true
        isOutput: false
    - stringVariable:
        name: Flow.HasClaimId
        initialValue:
          noValue: true
        isInput: true
        isOutput: false
    - stringVariable:
        name: Flow.HandoffCaseId
        initialValue:
          noValue: true
        isInput: false
        isOutput: false
    - stringVariable:
        name: Flow.HandoffSummary
        initialValue:
          noValue: true
        isInput: false
        isOutput: false
{settings('miked_dol_VAbotflow_ref.yaml', ['settingsErrorHandling','settingsBotFlow','settingsUserInput','settingsKnowledge','settingsVirtualAgent'])}
  bots:
    - bot:
        name: Default Bot
        refId: Default Bot_10
        trackingId: 10
        actions:
          - callAgenticVirtualAgent:
              name: Call Agentic Virtual Agent
              trackingId: 12
              agenticVirtualAgent:
                {AVA}:
                  ver_latestPublished:
                    inputs:
                      first_name:
                        exp: Flow.FirstName
                      caller_number:
                        noValue: true
                      interaction_channel:
                        lit: digital
                      conversation_id:
                        noValue: true
                      contact_reason:
                        exp: Flow.ContactReason
                      has_claim_id:
                        exp: Flow.HasClaimId
                    outputs:
                      handoff.case_id:
                        var: Flow.HandoffCaseId
                      handoff.summary:
                        var: Flow.HandoffSummary
                      handoff.queue_id:
                        noValue: true
                    exitReason:
                      noValue: true
              outputs:
                failure:
                  actions:
{indent(transfer(13, digital=True), 20)}
                timeout:
                  actions:
{indent(transfer(14, digital=True), 20)}
          - decision:
              name: Did the AVA hand off
              trackingId: 15
              condition:
                exp: IsNotSetOrEmpty(Flow.HandoffCaseId)
              outputs:
                yes:
                  actions:
                    - exitBotFlow:
                        name: Exit Bot Flow
                        trackingId: 11
                no:
                  actions:
                    - setParticipantData:
                        name: Set handoff participant data
                        trackingId: 16
                        attributes:
                          - attribute:
                              name:
                                lit: mikedai_OSC_HandoffCaseId
                              value:
                                exp: Flow.HandoffCaseId
                          - attribute:
                              name:
                                lit: mikedai_OSC_HandoffSummary
                              value:
                                exp: Flow.HandoffSummary
{indent(transfer(17, digital=True), 20)}
          - exitBotFlow:
              name: Exit Bot Flow (end of sequence)
              trackingId: 30
"""

# ------------------------------------------------------------------ digital inbound message flow
digital_inbound = f"""inboundShortMessage:
  name: mikedai_OSC_DigitalClaimFlow
  description: "UNOFFICIAL DEMO - NY OSC Unclaimed Funds Web Messaging entry. Calls mikedai_OSC_DigitalBotFlow. Not wired to any Messenger deployment by this file."
  division: Home
  startUpRef: "/inboundShortMessage/states/state[Initial State_10]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
  settingsErrorHandling:
    errorHandling:
      queue:
        targetQueue:
          lit:
            name: {QUEUE}
  states:
    - state:
        name: Initial State
        refId: Initial State_10
        trackingId: 10
        actions:
          - callDigitalBotFlow:
              name: Call mikedai_OSC_DigitalBotFlow
              trackingId: 11
              inputText:
                exp: Message.Message.body
              exitReason:
                noValue: true
              intent:
                noValue: true
              digitalBotFlow:
                mikedai_OSC_DigitalBotFlow:
                  ver_latestPublished:
                    inputs:
                      Flow.FirstName:
                        noValue: true
                      Flow.ContactReason:
                        noValue: true
                      Flow.HasClaimId:
                        noValue: true
              outputPath:
                name: default
          - disconnect:
              name: Disconnect
              trackingId: 12
"""

for name, text in {
    "mikedai_OSC_VoiceBotFlow.yaml": voice_bot,
    "mikedai_OSC_VoiceClaimFlow.yaml": voice_inbound,
    "mikedai_OSC_DigitalBotFlow.yaml": digital_bot,
    "mikedai_OSC_DigitalClaimFlow.yaml": digital_inbound,
}.items():
    (OUT / name).write_text(text)
    print("wrote", name, len(text.splitlines()), "lines")
