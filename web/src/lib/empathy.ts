// Brief, sincere empathy lines for the local-demo chat (the AVA uses the same pattern: acknowledge, explain, ask).
// No personal feelings claimed; no cheer for grief, fraud, hardship or missing payments.
const RULES: [RegExp, string][] = [
  [/\b(passed away|died|death|deceased|late (?:husband|wife|mother|father)|my (?:mom|dad|mother|father) (?:died|passed))\b/i,
    "I'm sorry for your loss. I'll help make the estate-claim process as clear as possible."],
  [/\b(scam|fraud|stolen|identity theft|phishing|suspicious)\b/i,
    "I understand why that is worrying. Let's take this carefully, and a team member can review it with you."],
  [/\b(?:frustrat\w*|annoy\w*|fed up|ridiculous|waiting forever|three times|third time|again and again|nobody helps)/i,
    "I understand why that would be frustrating. Let me check what the claim currently needs."],
  [/\b(missing|never (?:got|received|came)|lost (?:my )?check|check (?:hasn't|has not|did not|didn't) (?:come|arrive))\b/i,
    "I understand how important this payment is. I can check the current status and explain the next step."],
  [/\b(urgent|asap|rent|eviction|bills|can't afford|cannot afford|desperate)\b/i,
    "I understand this is important. I can check the current status and explain the next step."],
  [/\b(?:confus\w*|don't understand|do not understand|overwhelm\w*|not good with (?:computers|technology))/i,
    "That process can be difficult to follow. Let's take it one step at a time."],
  [/\b(worried|anxious|nervous|scared)\b/i,
    "I understand. I'll explain what is happening and what comes next."],
];
export function empathyFor(text: string): string | null {
  for (const [re, line] of RULES) if (re.test(text)) return line;
  return null;
}
export const wantsHuman = (t: string) => /\b(agent|human|person|representative|someone|operator|speak to|talk to)\b/i.test(t);
