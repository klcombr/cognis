import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Activity,
    ActivityType,
    Attempt,
    Concept,
    ErrorType,
    KnowledgeLevel,
    KnowledgeState,
    Session,
    Setting,
    Topic,
)
from app.services.ai import evaluate_answer, generate_activity, generate_transfer_problem


async def load_enabled_techniques(db: AsyncSession) -> set[str]:
    result = await db.execute(select(Setting).where(Setting.key == "enabled_techniques"))
    setting = result.scalar_one_or_none()
    if not setting or not setting.value:
        return {t.value for t in TECHNIQUE_FALLBACK}
    enabled = {s.strip().upper() for s in setting.value.split(",") if s.strip()}
    return enabled & {t.value for t in TECHNIQUE_FALLBACK}


async def get_or_create_knowledge_state(
    db: AsyncSession, user_id: int, concept_id: int
) -> KnowledgeState:
    result = await db.execute(
        select(KnowledgeState).where(
            KnowledgeState.user_id == user_id,
            KnowledgeState.concept_id == concept_id,
        )
    )
    ks = result.scalar_one_or_none()
    if not ks:
        ks = KnowledgeState(
            user_id=user_id,
            concept_id=concept_id,
            state=KnowledgeLevel.UNKNOWN,
            confidence=0.0,
            retention=1.0,
        )
        db.add(ks)
        await db.flush()
    return ks


async def get_next_concept(
    db: AsyncSession, session: Session, prefer_concept_id: int | None = None
) -> Concept | None:
    result = await db.execute(
        select(Concept)
        .options(selectinload(Concept.prerequisites))
        .where(Concept.topic_id == session.topic_id)
    )
    all_concepts = result.scalars().all()

    if prefer_concept_id is not None:
        for concept in all_concepts:
            if concept.id == prefer_concept_id:
                return concept

    result2 = await db.execute(
        select(KnowledgeState).where(KnowledgeState.user_id == session.user_id)
    )
    states = {ks.concept_id: ks for ks in result2.scalars().all()}

    for concept in all_concepts:
        ks = states.get(concept.id)
        if ks is None or ks.state in (KnowledgeLevel.UNKNOWN, KnowledgeLevel.EXPOSED):
            prereqs_met = True
            for prereq in concept.prerequisites:
                prereq_ks = states.get(prereq.id)
                if not prereq_ks or prereq_ks.state in (
                    KnowledgeLevel.UNKNOWN,
                    KnowledgeLevel.EXPOSED,
                ):
                    prereqs_met = False
                    break
            if prereqs_met:
                return concept

    for concept in all_concepts:
        ks = states.get(concept.id)
        if ks and ks.state in (KnowledgeLevel.UNDERSTOOD, KnowledgeLevel.APPLIED):
            return concept

    return all_concepts[0] if all_concepts else None


async def has_reteach_trigger(
    db: AsyncSession, session: Session, concept_id: int
) -> bool:
    result = await db.execute(
        select(Attempt)
        .join(Activity)
        .where(Activity.session_id == session.id, Activity.concept_id == concept_id)
        .order_by(Attempt.created_at.desc())
        .limit(2)
    )
    recent = result.scalars().all()
    if len(recent) < 2:
        return False
    return all(a.correct == 0 for a in recent)


def compute_difficulty(ks: KnowledgeState, session: Session) -> float:
    base = 0.5
    if ks.confidence > 0.8:
        base = min(1.0, base + 0.2)
    elif ks.confidence < 0.3:
        base = max(0.0, base - 0.2)
    if session.support_level < 0.3:
        base = min(1.0, base + 0.1)
    return base


TECHNIQUE_FALLBACK = [
    ActivityType.EXPLANATION,
    ActivityType.WORKED_EXAMPLE,
    ActivityType.RETRIEVAL,
    ActivityType.APPLICATION,
    ActivityType.VARIATION,
    ActivityType.TRANSFER,
    ActivityType.COMPRESSION,
]


def determine_next_activity_type(
    ks: KnowledgeState,
    last_error: ErrorType | None,
    accuracy: float,
    enabled: set[str] | None = None,
) -> ActivityType:
    enabled = enabled or {t.value for t in TECHNIQUE_FALLBACK}
    chosen = None
    if ks.state == KnowledgeLevel.UNKNOWN:
        chosen = ActivityType.EXPLANATION
    elif ks.state == KnowledgeLevel.EXPOSED:
        chosen = ActivityType.RETRIEVAL if accuracy > 0.7 else ActivityType.WORKED_EXAMPLE
    elif ks.state == KnowledgeLevel.UNDERSTOOD:
        chosen = ActivityType.APPLICATION if accuracy > 0.8 else ActivityType.RETRIEVAL
    elif ks.state == KnowledgeLevel.APPLIED:
        chosen = ActivityType.TRANSFER if accuracy > 0.85 else ActivityType.VARIATION
    elif ks.state == KnowledgeLevel.TRANSFERRED:
        chosen = ActivityType.COMPRESSION
    else:
        chosen = ActivityType.RETRIEVAL
    if chosen.value in enabled:
        return chosen
    for t in TECHNIQUE_FALLBACK:
        if t.value in enabled:
            return t
    return chosen


def update_knowledge_level(
    ks: KnowledgeState, correct: int, activity_type: ActivityType
):
    now = datetime.now(timezone.utc)
    if correct == 1:
        transitions = {
            KnowledgeLevel.UNKNOWN: KnowledgeLevel.EXPOSED,
            KnowledgeLevel.EXPOSED: KnowledgeLevel.UNDERSTOOD,
            KnowledgeLevel.UNDERSTOOD: KnowledgeLevel.APPLIED,
            KnowledgeLevel.APPLIED: KnowledgeLevel.TRANSFERRED,
            KnowledgeLevel.TRANSFERRED: KnowledgeLevel.CONSOLIDATED,
        }
        new_state = transitions.get(ks.state, ks.state)
        if activity_type == ActivityType.RETRIEVAL and ks.state == KnowledgeLevel.EXPOSED:
            new_state = KnowledgeLevel.UNDERSTOOD
        ks.state = new_state
        ks.confidence = min(1.0, ks.confidence + 0.15)
        ks.interval_days = min(365, ks.interval_days * 2.0)
    elif correct == 0:
        if ks.state != KnowledgeLevel.UNKNOWN:
            ks.state = KnowledgeLevel.EXPOSED
        ks.confidence = max(0.0, ks.confidence - 0.2)
        ks.interval_days = max(0.5, ks.interval_days * 0.5)
    else:
        ks.confidence = min(1.0, ks.confidence + 0.05)

    ks.last_review = now
    ks.next_review = now + timedelta(days=ks.interval_days)


async def create_activity_for_session(
    db: AsyncSession, session: Session, concept: Concept
) -> Activity:
    ks = await get_or_create_knowledge_state(db, session.user_id, concept.id)

    result = await db.execute(
        select(Attempt)
        .join(Activity)
        .where(Activity.session_id == session.id, Activity.concept_id == concept.id)
        .order_by(Attempt.created_at.desc())
        .limit(5)
    )
    recent_attempts = result.scalars().all()
    previous_errors = [
        a.error_type.value for a in recent_attempts if a.error_type
    ]

    correct_count = sum(1 for a in recent_attempts if a.correct == 1)
    accuracy = correct_count / len(recent_attempts) if recent_attempts else 0.0

    enabled = await load_enabled_techniques(db)
    activity_type = determine_next_activity_type(ks, None, accuracy, enabled)
    if await has_reteach_trigger(db, session, concept.id):
        activity_type = ActivityType.EXPLANATION
    difficulty = compute_difficulty(ks, session)

    if activity_type == ActivityType.TRANSFER:
        content = await generate_transfer_problem(
            concept.name, concept.description, concept.description, difficulty, db=db
        )
    else:
        content = await generate_activity(
            concept.name,
            concept.description,
            activity_type.value,
            difficulty,
            session.support_level,
            previous_errors,
            db=db,
        )

    activity = Activity(
        session_id=session.id,
        concept_id=concept.id,
        activity_type=activity_type,
        content=json.dumps(content),
        order_index=session.attempt_count if hasattr(session, "attempt_count") else 0,
    )
    db.add(activity)
    await db.flush()
    return activity


async def process_attempt(db: AsyncSession, attempt: Attempt, session: Session) -> dict:
    activity_result = await db.execute(
        select(Activity).where(Activity.id == attempt.activity_id)
    )
    activity = activity_result.scalar_one()

    concept_result = await db.execute(
        select(Concept).where(Concept.id == activity.concept_id)
    )
    concept = concept_result.scalar_one()

    activity_content = json.loads(activity.content)
    correct_answer = activity_content.get("correct_answer", "")
    question = activity_content.get("question", "")

    evaluation = await evaluate_answer(
        question, attempt.answer, correct_answer, concept.name, db=db
    )

    attempt.correct = evaluation.get("correct", 0)
    try:
        attempt.error_type = ErrorType(evaluation.get("error_type"))
    except (ValueError, TypeError):
        attempt.error_type = None
    attempt.feedback = evaluation.get("feedback", "")

    ks = await get_or_create_knowledge_state(db, session.user_id, concept.id)
    update_knowledge_level(ks, attempt.correct, activity.activity_type)

    session.attempt_count += 1
    if attempt.correct == 1:
        session.support_level = max(0.0, session.support_level - 0.1)
    elif attempt.correct == 0:
        session.support_level = min(1.0, session.support_level + 0.15)

    await db.flush()

    return {
        "correct": attempt.correct,
        "error_type": attempt.error_type.value if attempt.error_type else None,
        "feedback": attempt.feedback,
        "knowledge_state": {
            "state": ks.state.value,
            "confidence": ks.confidence,
            "interval_days": ks.interval_days,
        },
    }
