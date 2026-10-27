import os
import httpx


GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


class ProviderError(Exception):
    def __init__(self, message, *, quota_exhausted=False):
        super().__init__(message)
        self.quota_exhausted = quota_exhausted


def _is_quota_error(response: httpx.Response) -> bool:
    try:
        body = response.json()
        error_text = str(body.get("error", body)).lower()
    except ValueError:
        error_text = response.text.lower()

    markers = (
        "insufficient_quota",
        "quota_exceeded",
        "billing_hard_limit",
        "exceeded your quota",
    )
    return any(marker in error_text for marker in markers)


async def generate(
    *,
    endpoint: str,
    api_key: str,
    model: str,
    messages: list[dict],
    timeout_ms: int = 45000,
) -> str:
    if not endpoint or not model:
        raise ProviderError("Provider configuration is incomplete.")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500,
    }

    try:
        async with httpx.AsyncClient(
            timeout=max(timeout_ms, 1000) / 1000
        ) as client:
            response = await client.post(
                endpoint,
                headers=headers,
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise ProviderError("Provider timed out.") from exc
    except httpx.RequestError as exc:
        raise ProviderError("Provider could not be reached.") from exc

    if response.status_code == 429:
        raise ProviderError(
            "Provider rate limit or quota reached.",
            quota_exhausted=_is_quota_error(response),
        )

    if response.status_code >= 400:
        raise ProviderError(
            f"Provider returned HTTP {response.status_code}."
        )

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ProviderError("Invalid provider response format.") from exc

    if not isinstance(content, str) or not content.strip():
        raise ProviderError("Provider returned an empty response.")

    return content.strip()


def _groq_keys() -> list[str]:
    names = (
        "GROQ_CHAT_API_KEY",
        "GROQ_FALLBACK_API_KEY",
        "GROQ_CHAT_API_KEY_3",
    )
    return [
        value
        for name in names
        if (value := os.getenv(name, "").strip())
    ]



async def primary_response(messages: list[dict]) -> str:
    keys = _groq_keys()
    if not keys:
        raise ProviderError("No Groq API keys are configured.")

    model = os.getenv(
        "GROQ_CHAT_MODEL",
        "openai/gpt-oss-120b",
    )

    errors = []

    for key in keys:
        try:
            return await generate(
                endpoint=GROQ_ENDPOINT,
                api_key=key,
                model=model,
                messages=messages,
            )
        except ProviderError as exc:
            errors.append(exc)

            # Try the next key for rate limits and exhausted quotas.
            if "rate limit" in str(exc).lower() or exc.quota_exhausted:
                continue

            raise

    # Preserve quota information for the caller's fallback logic.
    raise ProviderError(
        "All configured Groq keys failed: "
        + "; ".join(str(error) for error in errors),
        quota_exhausted=(
            bool(errors)
            and all(error.quota_exhausted for error in errors)
        ),
    )


async def groq_fast_response(messages: list[dict]) -> str:
    keys = _groq_keys()
    if not keys:
        raise ProviderError("No Groq API keys are configured.")

    model = os.getenv(
        "GROQ_FAST_MODEL",
        "openai/gpt-oss-20b",
    )

    errors = []

    for key in keys:
        try:
            return await generate(
                endpoint=GROQ_ENDPOINT,
                api_key=key,
                model=model,
                messages=messages,
            )
        except ProviderError as exc:
            errors.append(exc)

            if "rate limit" in str(exc).lower() or exc.quota_exhausted:
                continue

            raise

    raise ProviderError(
        "All configured Groq fast-model keys failed: "
        + "; ".join(str(error) for error in errors),
        quota_exhausted=(
            bool(errors)
            and all(error.quota_exhausted for error in errors)
        ),
    )

async def custom_llm_response(messages: list[dict]) -> str:
    if os.getenv("CUSTOM_LLM_ENABLED", "false").lower() != "true":
        raise ProviderError("Custom LLM is disabled.")

    timeout_ms = int(
        os.getenv("CUSTOM_LLM_TIMEOUT_MS", "60000")
    )

    return await generate(
        endpoint=os.getenv("CUSTOM_LLM_CHAT_URL", ""),
        api_key=os.getenv("CUSTOM_LLM_API_KEY", ""),
        model=os.getenv("CUSTOM_LLM_MODEL", ""),
        messages=messages,
        timeout_ms=timeout_ms,
    )
