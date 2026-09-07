import json
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Setting


async def get_ai_config(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(Setting))
    rows = {s.key: s.value for s in result.scalars().all()}
    return {
        "api_key": rows.get("ai_api_key", "") or settings.ai_api_key,
        "base_url": rows.get("ai_base_url", "") or settings.ai_base_url,
        "model": rows.get("ai_model", "") or settings.ai_model,
        "language": rows.get("language", "en"),
        "difficulty_preference": rows.get("difficulty_preference", "adaptive"),
        "session_length": rows.get("session_length", "medium"),
        "explanation_style": rows.get("explanation_style", "concise"),
        "name": rows.get("name", ""),
    }


LANG_NAMES = {
    "en": "English", "pt": "Portuguese", "es": "Spanish", "fr": "French",
    "de": "German", "it": "Italian", "ja": "Japanese", "ko": "Korean",
    "zh": "Chinese", "ru": "Russian", "ar": "Arabic", "hi": "Hindi",
}


def _lang_instruction(config: dict) -> str:
    lang = config.get("language", "en")
    lang_name = LANG_NAMES.get(lang, lang)
    return f"Respond in {lang_name}." if lang != "en" else ""


def _style_instruction(config: dict) -> str:
    style = config.get("explanation_style", "concise")
    if style == "detailed":
        return "Provide detailed explanations with context and examples."
    if style == "socratic":
        return "Guide with questions. Don't give answers directly — help the student discover them."
    return "Be concise. Short explanations, concrete examples, no filler."


def _difficulty_context(config: dict) -> str:
    pref = config.get("difficulty_preference", "adaptive")
    if pref == "easy":
        return "Start with simpler problems. Increase difficulty slowly."
    if pref == "challenging":
        return "Push toward harder problems. Don't oversimplify."
    return "Adapt difficulty based on the student's performance."


async def call_ai(prompt: str, system: str = "", temperature: float = 0.7, db: AsyncSession = None) -> str:
    if db:
        config = await get_ai_config(db)
    else:
        config = {
            "api_key": settings.ai_api_key,
            "base_url": settings.ai_base_url,
            "model": settings.ai_model,
        }

    headers = {"Authorization": f"Bearer {config['api_key']}"}
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{config['base_url']}/chat/completions",
            headers=headers,
            json={
                "model": config["model"],
                "messages": messages,
                "temperature": temperature,
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def decompose_topic(topic_name: str, description: str, db: AsyncSession = None) -> list[dict[str, Any]]:
    config = await get_ai_config(db) if db else {}
    lang = _lang_instruction(config)
    style = _style_instruction(config)

    system = f"""You are an expert curriculum designer. Decompose a topic into fundamental concepts.
Return a JSON array of objects with: name, description, difficulty (0.0-1.0), prerequisites (list of concept names).
Order concepts from foundational to advanced. Include only the minimal set needed to start learning.
{style}
{lang}
Return ONLY valid JSON, no markdown."""

    prompt = f"Topic: {topic_name}\nDescription: {description}\n\nDecompose this into fundamental concepts."
    raw = await call_ai(prompt, system, temperature=0.3, db=db)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)


async def evaluate_answer(
    question: str, answer: str, correct_answer: str, concept_name: str, db: AsyncSession = None
) -> dict[str, Any]:
    config = await get_ai_config(db) if db else {}
    lang = _lang_instruction(config)

    system = f"""You are an expert evaluator. Compare the student's answer to the correct answer.
Return a JSON object with:
- correct: 0 (wrong), 1 (correct), 2 (partially correct)
- error_type: one of CONCEPTUAL, PROCEDURAL, MISCONCEPTION, KNOWLEDGE_GAP, CARELESS, GUESS, or null
- feedback: concise explanation of what's right/wrong and how to improve
{lang}
Return ONLY valid JSON, no markdown."""

    prompt = f"""Concept: {concept_name}
Question: {question}
Correct answer: {correct_answer}
Student answer: {answer}

Evaluate the student's answer."""
    raw = await call_ai(prompt, system, temperature=0.2, db=db)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)


async def generate_activity(
    concept_name: str,
    concept_description: str,
    activity_type: str,
    difficulty: float,
    support_level: float,
    previous_errors: list[str] = None,
    db: AsyncSession = None,
) -> dict[str, Any]:
    config = await get_ai_config(db) if db else {}
    lang = _lang_instruction(config)
    style = _style_instruction(config)
    diff_ctx = _difficulty_context(config)

    system = f"""You are an expert educator. Generate a learning activity of type {activity_type}.
Difficulty: {difficulty} (0.0=easy, 1.0=hard)
Support level: {support_level} (1.0=full hints, 0.0=no support)
{diff_ctx}
{style}
{lang}
Return a JSON object with:
- question: the activity prompt
- options: array of answer choices (for multiple choice) or null
- hints: array of progressive hints (from subtle to explicit)
- explanation: brief explanation for after the answer
- worked_example: if type is WORKED_EXAMPLE, include {{problem, steps: [{{step, reasoning}}], result}}

Return ONLY valid JSON, no markdown."""

    prompt = f"""Concept: {concept_name}
Description: {concept_description}
Previous errors: {previous_errors or 'none'}
Generate a {activity_type} activity."""
    raw = await call_ai(prompt, system, temperature=0.7, db=db)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)


async def generate_transfer_problem(
    concept_name: str,
    concept_description: str,
    original_context: str,
    difficulty: float,
    db: AsyncSession = None,
) -> dict[str, Any]:
    config = await get_ai_config(db) if db else {}
    lang = _lang_instruction(config)
    style = _style_instruction(config)

    system = f"""You are an expert at creating transfer problems.
Generate a problem that looks different from typical exercises but tests the same underlying concept.
The student must recognize the principle in a new context.
{style}
{lang}
Return a JSON object with:
- question: the transfer problem
- options: array of answer choices or null
- hints: array of progressive hints
- explanation: how this relates to the original concept
- new_context: description of how this differs from the original context

Return ONLY valid JSON, no markdown."""

    prompt = f"""Concept: {concept_name}
Description: {concept_description}
Original context: {original_context}
Difficulty: {difficulty}
Generate a transfer problem."""
    raw = await call_ai(prompt, system, temperature=0.8, db=db)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw)
