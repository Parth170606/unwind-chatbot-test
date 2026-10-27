import re
from typing import Optional

CREATOR_RESPONSE = (
    "Unwind was envisioned by Harshita Arava, Co-Founder & CEO, and brought to life through the collaborative efforts of Atharva Padwal, Co-Founder & Co-CEO, and Parth Nikam, Co-Founder & CTO. Combining visionary leadership, strategic execution, and technological expertise, the founding team transformed a shared vision into an innovative wellness platform designed to redefine the way individuals approach mental well-being."
)

GREETING_RESPONSES = {
    "hi": "Hi! I'm here with you. How are you feeling today?",
    "hello": "Hello! Welcome to Unwind. How are you doing?",
    "hey": "Hey! I'm glad you're here. What's on your mind?",
    "hey there": "Hey there! How are you feeling today?",
    "good morning": "Good morning! Let's take today one step at a time.",
    "good afternoon": "Good afternoon! How has your day been so far?",
    "good evening": "Good evening! How are you feeling right now?",
    "how are you": "I'm here and ready to listen. How are you doing?",
    "thank you": "You're welcome. I'm glad you reached out.",
    "thanks": "You're welcome! I'm here if you'd like to talk.",
    "bye": "Take care of yourself. You're welcome back anytime.",
    "goodbye": "Take care, and remember to be kind to yourself."
}

# Starter rules only. These need stronger testing before deployment.
CODE_REQUEST = re.compile(
    r"\b(write|generate|give|show|provide|debug|complete|"
    r"implement|create)\b.{0,80}\b(code|programming|script|"
    r"function|algorithm|python|javascript|typescript|html|css|"
    r"java|c\+\+|sql|source code)\b",
    re.I | re.S,
)

MEDICATION_REQUEST = re.compile(
    r"\b(which|what|recommend|suggest|prescribe|dosage|dose|"
    r"how much|should i take)\b.{0,80}\b(medicine|medication|"
    r"drug|tablet|pill|antidepressant|antibiotic|supplement)\b",
    re.I | re.S,
)

EXPLICIT_REQUEST = re.compile(
    r"\b(explicit sexual|pornographic|sexual roleplay)\b",
    re.I,
)

CREATOR_TERMS = re.compile(
    r"\b(who|which person)\b.{0,70}\b(created|founded|built|"
    r"developed|made|behind)\b.{0,60}\b(unwind|chatbot|"
    r"website|ai companion|you)\b"
    r"|\b(who is|who's)\b.{0,50}\b(founder|ceo|creator|"
    r"developer|owner)\b.{0,50}\b(unwind|chatbot|website)\b",
    re.I,
)


def normalize(text: str) -> str:
    text = text.casefold().strip()
    text = re.sub(r"[^\w\s']", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def predefined_response(message: str) -> Optional[str]:
    normalized = normalize(message)

    # Exact greeting matches: no provider call.
    if normalized in GREETING_RESPONSES:
        return GREETING_RESPONSES[normalized]

    # Handle simple punctuation/repeated greeting variations.
    greeting_match = re.fullmatch(
        r"(hi+|hello+|hey+|heyy+|hii+|hellooo)[!. ]*",
        normalized,
    )
    if greeting_match:
        word = greeting_match.group(1)
        if word.startswith("hi"):
            return GREETING_RESPONSES["hi"]
        if word.startswith("hello"):
            return GREETING_RESPONSES["hello"]
        return GREETING_RESPONSES["hey"]

    # Deterministic response for creator questions.
    if CREATOR_TERMS.search(message):
        return CREATOR_RESPONSE

    return None


def policy_response(message: str) -> Optional[str]:
    # Always check deterministic replies before calling a model.
    fixed = predefined_response(message)
    if fixed is not None:
        return fixed

    if CODE_REQUEST.search(message):
        return (
            "I'm here to support your wellbeing, so I can't provide "
            "programming code. I can help with wellness questions "
            "or non-technical topics instead."
        )

    if MEDICATION_REQUEST.search(message):
        return (
            "I can't recommend medicines or dosages. A qualified "
            "healthcare professional can help you understand "
            "appropriate treatment options."
        )

    if EXPLICIT_REQUEST.search(message):
        return (
            "I can't engage in explicit sexual content, but I'm "
            "happy to help with respectful relationship or "
            "wellbeing questions."
        )

    
    # Handle general questions about the Unwind platform.
    
    if re.search(
        r"\b(tell me about|something about|what is|"
        r"what's|describe|explain)\b.{0,60}\bunwind\b",
        message,
        re.I,
    ):
        return (
            "Unwind is a mental wellness and self-care platform "
            "designed to help people check in with their emotions, "
            "build healthy habits, journal, and access supportive "
            "wellness conversations through the AI Companion."
        )



    return None


def output_is_allowed(text: str) -> bool:
    # Starter output guard; not a complete moderation system.
    if re.search(r"```|<script\b", text, re.I):
        return False

    # Reject common code-shaped output.
    if re.search(
        r"^\s*(def |class |import |from \S+ import |"
        r"function\s+\w+|const\s+\w+\s*=|"
        r"let\s+\w+\s*=|SELECT\s+.+\s+FROM)\b",
        text,
        re.I | re.M,
    ):
        return False

    return True
