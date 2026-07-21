"""Shared Gemini client for skin analysis and related AI calls."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai
from google.genai import types

ContentPart = str | tuple[bytes, str]


def get_gemini_api_key() -> str:
    key = (
        os.getenv("GEMINI_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
    )
    if not key:
        raise ValueError("GEMINI_API_KEY is not set")
    return key


def has_gemini_api_key() -> bool:
    try:
        get_gemini_api_key()
        return True
    except ValueError:
        return False


def get_gemini_client() -> genai.Client:
    return genai.Client(api_key=get_gemini_api_key())


def get_gemini_model(default: str = "gemini-flash-latest") -> str:
    return os.getenv("GEMINI_MODEL", default).strip() or default


def _extract_json(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Empty response from Gemini")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise
        return json.loads(match.group(0))


def _to_gemini_parts(parts: list[ContentPart]) -> list[Any]:
    out: list[Any] = []
    for part in parts:
        if isinstance(part, str):
            out.append(part)
        else:
            image_bytes, mime_type = part
            out.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type or "image/jpeg",
                )
            )
    return out


def _build_config(
    *, system: str, max_output_tokens: int, disable_thinking: bool = True
) -> types.GenerateContentConfig:
    kwargs: dict[str, Any] = {
        "system_instruction": system,
        "response_mime_type": "application/json",
        "max_output_tokens": max_output_tokens,
        "temperature": 0.2,
    }
    # Gemini 2.5 accepts thinking_budget=0 to disable thinking; Gemini 3
    # rejects it (400). Caller retries without it via disable_thinking=False.
    if disable_thinking:
        try:
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
        except Exception:
            pass
    return types.GenerateContentConfig(**kwargs)


def generate_json(
    *,
    system: str,
    user_text: str | None = None,
    images: list[tuple[bytes, str]] | None = None,
    parts: list[ContentPart] | None = None,
    max_output_tokens: int = 4096,
) -> dict[str, Any]:
    """
    Call Gemini and parse a JSON object response.

    Prefer `parts` for interleaved text/images. Otherwise uses user_text + images.
    """
    client = get_gemini_client()

    content_parts: list[ContentPart] = []
    if parts is not None:
        content_parts.extend(parts)
    else:
        if user_text:
            content_parts.append(user_text)
        for image in images or []:
            content_parts.append(image)

    if not content_parts:
        raise ValueError("No content provided to Gemini")

    model = get_gemini_model()
    parts = _to_gemini_parts(content_parts)
    try:
        response = client.models.generate_content(
            model=model,
            contents=parts,
            config=_build_config(system=system, max_output_tokens=max_output_tokens),
        )
    except Exception:
        # Retry without thinking_config for models that reject thinking_budget=0
        response = client.models.generate_content(
            model=model,
            contents=parts,
            config=_build_config(
                system=system,
                max_output_tokens=max_output_tokens,
                disable_thinking=False,
            ),
        )
    return _extract_json(response.text or "")
