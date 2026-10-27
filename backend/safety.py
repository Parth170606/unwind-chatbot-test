
import re
from typing import Optional


# Initial high-priority safety rules.
# These rules are a starting point, not a complete clinical safety system.

IMMEDIATE_DANGER_PATTERNS = [
    re.compile(
        r"\b("
        r"i(?:'m| am) going to kill myself|"
        r"i(?:'m| am) about to kill myself|"
        r"i(?:'m| am) going to end my life|"
        r"i(?:'m| am) about to end my life|"
        r"i want to kill myself right now|"
        r"i am going to hurt myself right now"
        r")\b",
        re.I,
    ),
]

SELF_HARM_PATTERNS = [
    re.compile(
        r"\b("
        r"suicid(?:e|al)|"
        r"kill myself|"
        r"end my life|"
        r"self[- ]harm|"
        r"hurt myself|"
        r"don't want to live|"
        r"do not want to live|"
        r"wish i were dead|"
        r"wish i was dead"
        r")\b",
        re.I,
    ),
]


def evaluate_safety(message: str) -> Optional[dict]:
    """
    Return a safety response when a high-priority rule matches.
    Return None when the message can continue through normal routing.

    This is a conservative starter layer. It should be expanded and
    tested before production deployment.
    """
    text = message.strip()

    if any(pattern.search(text) for pattern in IMMEDIATE_DANGER_PATTERNS):
        return {
            "reply": (
                "I'm really sorry you're facing this right now. Your safety "
                "matters, and I'm glad you told me. If you may act on these "
                "thoughts or are in immediate danger, please contact your "
                "local emergency service now or go to the nearest emergency "
                "department. If possible, move away from anything you could "
                "use to hurt yourself and reach out to someone you trust who "
                "can stay with you. Are you in immediate danger right now?"
            ),
            "safetyLevel": "immediate_risk",
            "provider": "safety",
        }

    if any(pattern.search(text) for pattern in SELF_HARM_PATTERNS):
        return {
            "reply": (
                "I'm sorry things feel so difficult right now. You don't have "
                "to handle this alone, and I'm here to listen. Are you "
                "thinking about hurting yourself or ending your life right "
                "now? If you might act on these thoughts, please contact your "
                "local emergency service or reach out to someone you trust "
                "who can stay with you."
            ),
            "safetyLevel": "self_harm_concern",
            "provider": "safety",
        }

    return None
