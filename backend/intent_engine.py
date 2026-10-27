
import json
import random
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

DATA_DIR = (
    Path(__file__).resolve().parent
    / "src"
    / "data"
    / "chatbot"
)


def normalize(text: str) -> str:
    text = text.casefold().replace("’", "'")
    text = re.sub(r"[^\w\s']", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_intents(filename: str) -> list[dict]:
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"Chatbot data file not found: {path}"
        )

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    intents = data.get("intents", [])
    if not isinstance(intents, list):
        raise ValueError(f"Invalid intents structure in {filename}")

    return intents


# Load the two datasets once when the module is imported.
PRIMARY_INTENTS = load_intents("intents.json")
KNOWLEDGE_BASE = load_intents("KB.json")


def find_predefined_intent(
    message: str,
    *,
    include_knowledge_base: bool = True,
) -> Optional[dict]:
    normalized_message = normalize(message)

    if not normalized_message:
        return None

    datasets = [("intents.json", PRIMARY_INTENTS)]

    if include_knowledge_base:
        datasets.append(("KB.json", KNOWLEDGE_BASE))

    candidates = []

    # First preference: exact pattern matches.
    for source, intents in datasets:
        for intent in intents:
            responses = intent.get("responses", [])
            if not isinstance(responses, list) or not responses:
                continue

            for pattern in intent.get("patterns", []):
                if not isinstance(pattern, str) or not pattern.strip():
                    continue

                normalized_pattern = normalize(pattern)
                if not normalized_pattern:
                    continue

                if normalized_message == normalized_pattern:
                    candidates.append({
                        "tag": intent.get("tag", "unknown"),
                        "matched_pattern": pattern,
                        "match_score": 1.0,
                        "source": source,
                        "response": random.choice(responses),
                    })

    if candidates:
        # Prefer the most specific matching pattern.
        return max(
            candidates,
            key=lambda item: len(item["matched_pattern"]),
        )

    # Second preference: a complete multiword pattern inside the message.
    # Avoid matching generic one-word patterns inside longer messages.
    for source, intents in datasets:
        for intent in intents:
            responses = intent.get("responses", [])
            if not isinstance(responses, list) or not responses:
                continue

            for pattern in intent.get("patterns", []):
                if not isinstance(pattern, str) or not pattern.strip():
                    continue

                normalized_pattern = normalize(pattern)

                if len(normalized_pattern.split()) < 3:
                    continue

                if (
                    len(normalized_pattern) >= 12
                    and normalized_pattern in normalized_message
                ):
                    candidates.append({
                        "tag": intent.get("tag", "unknown"),
                        "matched_pattern": pattern,
                        "match_score": 0.95,
                        "source": source,
                        "response": random.choice(responses),
                    })

    if candidates:
        return max(
            candidates,
            key=lambda item: len(item["matched_pattern"]),
        )

    # Conservative fuzzy matching for near-exact short messages only.
    # Do not fuzzy-match long emotional disclosures: that can misclassify
    # a user's meaning and must never replace crisis-safety evaluation.
    if len(normalized_message) <= 80:
        best = None
        best_score = 0.0

        for source, intents in datasets:
            for intent in intents:
                responses = intent.get("responses", [])
                if not isinstance(responses, list) or not responses:
                    continue

                for pattern in intent.get("patterns", []):
                    if not isinstance(pattern, str) or not pattern.strip():
                        continue

                    normalized_pattern = normalize(pattern)

                    if len(normalized_pattern) < 4:
                        continue

                    score = SequenceMatcher(
                        None,
                        normalized_message,
                        normalized_pattern,
                    ).ratio()

                    if score > best_score:
                        best_score = score
                        best = {
                            "tag": intent.get("tag", "unknown"),
                            "matched_pattern": pattern,
                            "match_score": round(score, 3),
                            "source": source,
                            "response": random.choice(responses),
                        }

        if best and best_score >= 0.90:
            return best

    return None
