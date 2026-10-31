const blockedRequestPatterns = [
  /\b(write|generate|show|give|create|debug)\b.{0,40}\b(code|script|program|source code)\b/i,
  /\b(python|javascript|typescript|java|c\+\+)\s+(code|script|program)\b/i,
  /\b(sexual|pornographic|explicit sexual)\b/i,
  /\b(vulgar|obscene|profane|insulting)\s+(response|content|language)\b/i
];

const crisisPatterns = [
  /\b(suicid|kill myself|end my life|self[- ]harm|hurt myself)\b/i,
  /\b(i do not want to live|i don't want to live|i cannot keep myself safe)\b/i
];

const medicationPatterns = [
  /\b(which|what|recommend|suggest|prescribe)\b.{0,60}\b(medicine|medication|drug|pills|dosage|dose)\b/i,
  /\b(should i take|how much .{0,20} take)\b.{0,60}\b(medicine|medication|drug|pills)\b/i
];

const inappropriatePatterns = [
  /\b(fuck|fucking|motherfucker|cunt|nigger|nigga)\b/i
];

export function inspectUserMessage(message) {
  if (crisisPatterns.some((pattern) => pattern.test(message))) {
    return {
      blocked: true,
      kind: "crisis",
      reply:
        "I'm sorry you're going through something so difficult. If you may be in immediate danger, contact your local emergency service or go to the nearest emergency department. If possible, reach out to someone you trust and ask them to stay with you. You deserve support, and I'm here to listen."
    };
  }

  if (medicationPatterns.some((pattern) => pattern.test(message))) {
    return {
      blocked: true,
      kind: "medication",
      reply:
        "I can't recommend medicines, dosages, or changes to medication. A qualified healthcare professional or pharmacist can advise you based on your circumstances. I can help you explore non-medication coping strategies or prepare questions for an appointment."
    };
  }

  if (blockedRequestPatterns.some((pattern) => pattern.test(message))) {
    return {
      blocked: true,
      kind: "restricted_request",
      reply:
        "I'm UNWIND, a mental-wellness companion. I can't provide that type of content, but I can help with stress, emotional well-being, mindfulness, or healthy coping strategies."
    };
  }

  if (inappropriatePatterns.some((pattern) => pattern.test(message))) {
    return {
      blocked: true,
      kind: "inappropriate_language",
      reply:
        "Let's keep our conversation respectful. I'm happy to help with what you're experiencing or discuss a mental-wellness topic."
    };
  }

  return { blocked: false, kind: "normal" };
}

export function guardGeneratedReply(reply) {
  const text = String(reply || "").trim();

  if (!text) {
    return "I'm sorry, I couldn't form a helpful response just now. Could you try asking in a different way?";
  }

  const codeLike =
    /```[\s\S]*```/.test(text) ||
    /^\s*(const|let|var|import|export|function|class|def)\s+[\w{*]/m.test(text);

  const sexualOrAbusive =
    /\b(fuck|fucking|motherfucker|cunt|nigger|nigga)\b/i.test(text) ||
    /\b(explicit sexual content|sexual acts in graphic detail)\b/i.test(text);

  const medicationAdvice =
    /\b(take|use|increase|decrease|combine)\b.{0,50}\b(dose|dosage|mg|medication|medicine|pills)\b/i.test(text);

  if (codeLike || sexualOrAbusive || medicationAdvice) {
    return "I can't provide that kind of response. I can still support you with mental-wellness information and healthy coping strategies.";
  }

  return text;
}