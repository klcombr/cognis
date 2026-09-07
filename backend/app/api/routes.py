import json
import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import (
    Activity,
    ActivityType,
    Attempt,
    Concept,
    ConceptDependency,
    ErrorType,
    KnowledgeLevel,
    KnowledgeState,
    Session,
    Setting,
    Topic,
    User,
)
from app.api.schemas import (
    ActivityContent,
    ActivityResponse,
    AttemptCreate,
    AttemptResponse,
    ConceptCreate,
    ConceptGraphResponse,
    ConceptResponse,
    ConceptUpdate,
    ContinueItem,
    HomeResponse,
    KnowledgeStateResponse,
    PrerequisiteCreate,
    SessionCreate,
    SessionResponse,
    SettingsResponse,
    SettingsUpdate,
    TopicCreate,
    TopicDetailResponse,
    TopicResponse,
    UserCreate,
    UserResponse,
)
from app.services.ai import decompose_topic
from app.services.session_engine import (
    create_activity_for_session,
    get_or_create_knowledge_state,
    get_next_concept,
    process_attempt,
)

router = APIRouter()


# --- Users ---
@router.post("/users", response_model=UserResponse)
async def create_user(db: AsyncSession = Depends(get_db)):
    user = User()
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- Topics ---
@router.post("/users/{user_id}/topics", response_model=TopicResponse)
async def create_topic(user_id: int, data: TopicCreate, db: AsyncSession = Depends(get_db)):
    topic = Topic(user_id=user_id, name=data.name, description=data.description)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.get("/users/{user_id}/topics", response_model=list[TopicResponse])
async def list_topics(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Topic).where(Topic.user_id == user_id).order_by(Topic.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await db.delete(topic)
    await db.commit()
    return {"ok": True}


@router.get("/topics/{topic_id}", response_model=TopicDetailResponse)
async def get_topic(
    topic_id: int,
    user_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Topic)
        .options(selectinload(Topic.concepts))
        .where(Topic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    concepts = []
    for c in topic.concepts:
        ks_state = None
        ks_confidence = None
        if user_id:
            ks = await get_or_create_knowledge_state(db, user_id, c.id)
            ks_state = ks.state
            ks_confidence = ks.confidence
        concepts.append(
            ConceptResponse(
                id=c.id,
                name=c.name,
                description=c.description,
                difficulty=c.difficulty,
                knowledge_level=ks_state,
                confidence=ks_confidence,
            )
        )
    return TopicDetailResponse(
        id=topic.id,
        name=topic.name,
        description=topic.description,
        created_at=topic.created_at,
        concepts=concepts,
    )


@router.post("/topics/{topic_id}/decompose")
async def decompose_topic_endpoint(
    topic_id: int,
    force: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if force:
        concepts_result = await db.execute(
            select(Concept).where(Concept.topic_id == topic_id)
        )
        for existing in concepts_result.scalars().all():
            await db.delete(existing)
        await db.flush()

    concepts_data = await decompose_topic(topic.name, topic.description, db=db)

    created_concepts = []
    name_to_id = {}

    for c in concepts_data:
        concept = Concept(
            topic_id=topic_id,
            name=c["name"],
            description=c.get("description", ""),
            difficulty=c.get("difficulty", 0.5),
        )
        db.add(concept)
        await db.flush()
        name_to_id[c["name"]] = concept.id
        created_concepts.append(concept)

    for c in concepts_data:
        concept_id = name_to_id[c["name"]]
        for prereq_name in c.get("prerequisites", []):
            if prereq_name in name_to_id:
                dep = ConceptDependency(
                    concept_id=concept_id, prerequisite_id=name_to_id[prereq_name]
                )
                db.add(dep)

    await db.commit()
    return {"concepts_created": len(created_concepts)}


# --- Concepts ---
@router.get("/topics/{topic_id}/concepts", response_model=list[ConceptResponse])
async def list_concepts(topic_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Concept).where(Concept.topic_id == topic_id).order_by(Concept.difficulty)
    )
    return result.scalars().all()


@router.get("/topics/{topic_id}/graph", response_model=ConceptGraphResponse)
async def get_concept_graph(
    topic_id: int,
    user_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Concept)
        .options(selectinload(Concept.prerequisites))
        .where(Concept.topic_id == topic_id)
    )
    concepts = result.scalars().all()

    concept_responses = []
    for c in concepts:
        ks_state = None
        ks_confidence = None
        if user_id:
            ks = await get_or_create_knowledge_state(db, user_id, c.id)
            ks_state = ks.state
            ks_confidence = ks.confidence
        concept_responses.append(
            ConceptResponse(
                id=c.id,
                name=c.name,
                description=c.description,
                difficulty=c.difficulty,
                knowledge_level=ks_state,
                confidence=ks_confidence,
            )
        )

    deps_result = await db.execute(
        select(ConceptDependency).where(
            ConceptDependency.concept_id.in_([c.id for c in concepts])
        )
    )
    deps = [
        {"concept_id": d.concept_id, "prerequisite_id": d.prerequisite_id}
        for d in deps_result.scalars().all()
    ]

    return ConceptGraphResponse(concepts=concept_responses, dependencies=deps)


@router.post("/topics/{topic_id}/concepts", response_model=ConceptResponse)
async def create_concept(
    topic_id: int, data: ConceptCreate, db: AsyncSession = Depends(get_db)
):
    topic_result = await db.execute(select(Topic).where(Topic.id == topic_id))
    if not topic_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Topic not found")

    concept = Concept(
        topic_id=topic_id,
        name=data.name,
        description=data.description,
        difficulty=data.difficulty,
    )
    db.add(concept)
    await db.flush()
    for prereq_id in data.prerequisite_ids:
        db.add(ConceptDependency(concept_id=concept.id, prerequisite_id=prereq_id))
    await db.commit()
    await db.refresh(concept)
    return concept


@router.patch("/concepts/{concept_id}", response_model=ConceptResponse)
async def update_concept(
    concept_id: int, data: ConceptUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    if data.name is not None:
        concept.name = data.name
    if data.description is not None:
        concept.description = data.description
    await db.commit()
    await db.refresh(concept)
    return concept


@router.delete("/concepts/{concept_id}")
async def delete_concept(concept_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Concept).where(Concept.id == concept_id))
    concept = result.scalar_one_or_none()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    await db.delete(concept)
    await db.commit()
    return {"ok": True}


@router.post("/concepts/{concept_id}/prerequisites")
async def add_prerequisite(
    concept_id: int, data: PrerequisiteCreate, db: AsyncSession = Depends(get_db)
):
    if concept_id == data.prerequisite_id:
        raise HTTPException(status_code=400, detail="A concept cannot depend on itself")
    dep = ConceptDependency(concept_id=concept_id, prerequisite_id=data.prerequisite_id)
    db.add(dep)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Dependency already exists")
    return {"ok": True}


@router.delete("/concepts/{concept_id}/prerequisites/{prerequisite_id}")
async def remove_prerequisite(
    concept_id: int, prerequisite_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConceptDependency).where(
            ConceptDependency.concept_id == concept_id,
            ConceptDependency.prerequisite_id == prerequisite_id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    await db.delete(dep)
    await db.commit()
    return {"ok": True}


# --- Sessions ---
SESSION_LIMITS = {"short": 4, "medium": 7, "long": 12}


async def get_session_limit(db: AsyncSession) -> int:
    result = await db.execute(
        select(Setting).where(Setting.key == "session_length")
    )
    setting = result.scalar_one_or_none()
    return SESSION_LIMITS.get(setting.value if setting else "", SESSION_LIMITS["medium"])


async def count_session_activities(db: AsyncSession, session_id: int) -> int:
    result = await db.execute(
        select(Activity.id).where(Activity.session_id == session_id)
    )
    return len(result.scalars().all())


@router.post("/users/{user_id}/sessions", response_model=SessionResponse)
async def create_session(
    user_id: int, data: SessionCreate, db: AsyncSession = Depends(get_db)
):
    session = Session(user_id=user_id, topic_id=data.topic_id)
    db.add(session)
    await db.flush()

    concept = await get_next_concept(db, session, prefer_concept_id=data.concept_id)
    if concept:
        session.current_concept_id = concept.id
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{session_id}/next", response_model=ActivityResponse)
async def get_next_activity(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    limit = await get_session_limit(db)
    count = await count_session_activities(db, session.id)

    if count >= limit:
        return ActivityResponse(
            id=0,
            session_id=session.id,
            concept_id=session.current_concept_id or 0,
            activity_type=ActivityType.EXPLANATION,
            content="",
            order_index=0,
            created_at=datetime.now(timezone.utc),
            session_complete=True,
            activity_count=count,
        )

    concept = await get_next_concept(db, session)
    if not concept:
        raise HTTPException(status_code=404, detail="No concepts available")

    session.current_concept_id = concept.id
    await db.flush()

    activity = await create_activity_for_session(db, session, concept)
    await db.commit()
    await db.refresh(activity)
    return ActivityResponse(
        id=activity.id,
        session_id=activity.session_id,
        concept_id=activity.concept_id,
        activity_type=activity.activity_type,
        content=activity.content,
        order_index=activity.order_index,
        created_at=activity.created_at,
        session_complete=False,
        activity_count=count,
    )


@router.get("/sessions/{session_id}/summary")
async def get_session_summary(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Attempt, Activity)
        .join(Activity, Activity.id == Attempt.activity_id)
        .where(Activity.session_id == session_id)
    )
    rows = result.all()

    total = len(rows)
    correct = sum(1 for a, _ in rows if a.correct == 1)
    partial = sum(1 for a, _ in rows if a.correct == 2)
    wrong = total - correct - partial
    hints = sum(a.hints_used for a, _ in rows)
    avg_time = round(sum(a.response_time for a, _ in rows) / total, 1) if total else 0

    error_types: dict[str, int] = {}
    by_concept: dict[int, dict] = {}
    for a, act in rows:
        if a.error_type:
            error_types[a.error_type.value] = error_types.get(a.error_type.value, 0) + 1
        by_concept.setdefault(act.concept_id, {"correct": 0, "partial": 0, "wrong": 0})
        c = by_concept[act.concept_id]
        if a.correct == 1:
            c["correct"] += 1
        elif a.correct == 2:
            c["partial"] += 1
        else:
            c["wrong"] += 1

    concept_names = {}
    if by_concept:
        result = await db.execute(
            select(Concept).where(Concept.id.in_(list(by_concept.keys())))
        )
        concept_names = {c.id: c.name for c in result.scalars().all()}

    return {
        "total": total,
        "correct": correct,
        "partial": partial,
        "wrong": wrong,
        "accuracy": round((correct / total) * 100) if total else 0,
        "hints_used": hints,
        "avg_response_time": avg_time,
        "error_types": error_types,
        "by_concept": [
            {"concept_id": cid, "concept_name": concept_names.get(cid, "?"), **counts}
            for cid, counts in by_concept.items()
        ],
    }


# --- Attempts ---
@router.post("/attempts", response_model=AttemptResponse)
async def create_attempt(data: AttemptCreate, db: AsyncSession = Depends(get_db)):
    activity_result = await db.execute(
        select(Activity).where(Activity.id == data.activity_id)
    )
    activity = activity_result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    session_result = await db.execute(
        select(Session).where(Session.id == activity.session_id)
    )
    session = session_result.scalar_one_or_none()

    attempt = Attempt(
        activity_id=data.activity_id,
        answer=data.answer,
        response_time=data.response_time,
        hints_used=data.hints_used,
    )
    db.add(attempt)
    await db.flush()

    eval_result = await process_attempt(db, attempt, session)
    await db.commit()
    await db.refresh(attempt)

    return AttemptResponse(
        id=attempt.id,
        activity_id=attempt.activity_id,
        answer=attempt.answer,
        correct=attempt.correct,
        error_type=attempt.error_type,
        response_time=attempt.response_time,
        hints_used=attempt.hints_used,
        feedback=attempt.feedback,
        created_at=attempt.created_at,
    )


@router.get("/activities/{activity_id}/hint")
async def get_hint(activity_id: int, hint_index: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    content = json.loads(activity.content)
    hints = content.get("hints", [])
    if hint_index >= len(hints):
        return {"hint": None, "total_hints": len(hints)}
    return {"hint": hints[hint_index], "total_hints": len(hints), "index": hint_index}


# --- Knowledge State ---
@router.get("/users/{user_id}/knowledge")
async def get_knowledge_states(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(KnowledgeState)
        .options(selectinload(KnowledgeState.concept).selectinload(Concept.topic))
        .where(KnowledgeState.user_id == user_id)
    )
    states = result.scalars().all()
    return [
        {
            "concept_id": ks.concept_id,
            "concept_name": ks.concept.name,
            "topic_name": ks.concept.topic.name if ks.concept.topic else "",
            "topic_id": ks.concept.topic_id if ks.concept else None,
            "state": ks.state.value,
            "confidence": ks.confidence,
            "retention": ks.retention,
            "last_review": ks.last_review,
            "next_review": ks.next_review,
            "updated_at": ks.updated_at.isoformat() if ks.updated_at else None,
        }
        for ks in states
    ]


@router.get(
    "/users/{user_id}/knowledge/{concept_id}",
    response_model=KnowledgeStateResponse,
)
async def get_concept_knowledge(
    user_id: int, concept_id: int, db: AsyncSession = Depends(get_db)
):
    ks = await get_or_create_knowledge_state(db, user_id, concept_id)
    concept_result = await db.execute(
        select(Concept).where(Concept.id == concept_id)
    )
    concept = concept_result.scalar_one()
    return KnowledgeStateResponse(
        concept_id=ks.concept_id,
        concept_name=concept.name,
        state=ks.state,
        confidence=ks.confidence,
        retention=ks.retention,
        last_review=ks.last_review,
        next_review=ks.next_review,
    )


# --- Home ---
@router.get("/users/{user_id}/home", response_model=HomeResponse)
async def get_home(user_id: int, db: AsyncSession = Depends(get_db)):
    topics_result = await db.execute(
        select(Topic)
        .where(Topic.user_id == user_id)
        .order_by(Topic.created_at.desc())
        .limit(5)
    )
    topics = topics_result.scalars().all()

    ks_result = await db.execute(
        select(KnowledgeState)
        .options(selectinload(KnowledgeState.concept))
        .where(
            KnowledgeState.user_id == user_id,
            KnowledgeState.state.notin_([
                KnowledgeLevel.CONSOLIDATED,
                KnowledgeLevel.UNKNOWN,
            ]),
        )
    )
    states = ks_result.scalars().all()

    continue_items = []
    for ks in states:
        due = ks.next_review is None or ks.next_review <= datetime.now(timezone.utc)
        if ks.state in (KnowledgeLevel.EXPOSED,):
            status = "Needs reinforcement"
        elif due:
            status = "Review available"
        elif ks.state in (KnowledgeLevel.APPLIED, KnowledgeLevel.TRANSFERRED):
            status = "Deepening"
        else:
            status = "Developing"
        continue_items.append(
            ContinueItem(
                concept_name=ks.concept.name,
                topic_name=ks.concept.topic.name if hasattr(ks.concept, "topic") else "",
                status=status,
                knowledge_level=ks.state,
                next_review=ks.next_review,
            )
        )

    # Stats
    all_ks = await db.execute(
        select(KnowledgeState).where(KnowledgeState.user_id == user_id)
    )
    all_states = all_ks.scalars().all()
    total = len(all_states)
    mastered = sum(1 for s in all_states if s.state in (KnowledgeLevel.APPLIED, KnowledgeLevel.TRANSFERRED, KnowledgeLevel.CONSOLIDATED))
    learning = sum(1 for s in all_states if s.state in (KnowledgeLevel.EXPOSED, KnowledgeLevel.UNDERSTOOD))
    needs_review = sum(1 for s in all_states if s.next_review and s.next_review <= datetime.now(timezone.utc))

    # Recent activity (last 5 sessions with concept names)
    from app.models.models import Session as SessionModel, Activity as ActivityModel
    recent_sessions = await db.execute(
        select(SessionModel)
        .where(SessionModel.user_id == user_id)
        .order_by(SessionModel.updated_at.desc())
        .limit(5)
    )
    recent_activity = []
    for sess in recent_sessions.scalars().all():
        if sess.current_concept_id:
            c_result = await db.execute(select(Concept).where(Concept.id == sess.current_concept_id))
            c = c_result.scalar_one_or_none()
            if c:
                recent_activity.append({
                    "topic_name": c.topic.name if hasattr(c, 'topic') else "",
                    "concept_name": c.name,
                    "attempt_count": sess.attempt_count,
                    "updated_at": sess.updated_at.isoformat() if sess.updated_at else "",
                })

    return HomeResponse(
        recent_topics=topics,
        continue_items=continue_items,
        total_concepts=total,
        mastered=mastered,
        learning=learning,
        needs_review=needs_review,
        recent_activity=recent_activity,
    )


# --- Stats: per-topic accuracy ---
@router.get("/users/{user_id}/stats")
async def get_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    # All topics + attempts per topic via joins
    result = await db.execute(
        select(Topic, Concept, Activity, Attempt)
        .join(Concept, Concept.topic_id == Topic.id)
        .join(Activity, Activity.concept_id == Concept.id)
        .join(Attempt, Attempt.activity_id == Activity.id)
        .join(Session, Session.id == Activity.session_id)
        .where(Session.user_id == user_id)
    )
    rows = result.all()

    per_topic: dict[int, dict] = {}
    for topic, concept, activity, attempt in rows:
        if topic.id not in per_topic:
            per_topic[topic.id] = {"topic_name": topic.name, "correct": 0, "partial": 0, "wrong": 0, "total": 0}
        entry = per_topic[topic.id]
        entry["total"] += 1
        if attempt.correct == 1:
            entry["correct"] += 1
        elif attempt.correct == 2:
            entry["partial"] += 1
        else:
            entry["wrong"] += 1

    stats = []
    for t in per_topic.values():
        acc = round((t["correct"] / t["total"]) * 100) if t["total"] > 0 else 0
        stats.append({
            "topic_name": t["topic_name"],
            "correct": t["correct"],
            "partial": t["partial"],
            "wrong": t["wrong"],
            "total": t["total"],
            "accuracy": acc,
        })
    stats.sort(key=lambda s: s["total"], reverse=True)
    return {"topic_stats": stats}


# --- Review queue (spaced review) ---
@router.get("/users/{user_id}/review-queue")
async def get_review_queue(user_id: int, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(KnowledgeState)
        .options(selectinload(KnowledgeState.concept))
        .where(KnowledgeState.user_id == user_id)
    )
    states = result.scalars().all()

    items = []
    for ks in states:
        due = ks.next_review is None or ks.next_review <= now
        reviewed = ks.state in (KnowledgeLevel.UNKNOWN, KnowledgeLevel.EXPOSED)
        if not due and not reviewed:
            continue
        topic_id = ks.concept.topic_id if ks.concept else None
        items.append({
            "concept_id": ks.concept_id,
            "concept_name": ks.concept.name if ks.concept else "?",
            "topic_id": topic_id,
            "state": ks.state.value,
            "confidence": ks.confidence,
            "next_review": ks.next_review.isoformat() if ks.next_review else None,
            "due": due and not reviewed,
        })

    items.sort(key=lambda i: (i["due"], i["confidence"]))
    return {"items": items}


# --- Error analysis by type ---
@router.get("/users/{user_id}/error-analysis")
async def get_error_analysis(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attempt, Activity, Concept, Topic)
        .join(Activity, Activity.id == Attempt.activity_id)
        .join(Concept, Concept.id == Activity.concept_id)
        .join(Topic, Topic.id == Concept.topic_id)
        .join(Session, Session.id == Activity.session_id)
        .where(Session.user_id == user_id)
    )
    rows = result.all()

    per_concept: dict[int, dict] = {}
    for _, _, concept, topic in rows:
        per_concept.setdefault(concept.id, {
            "concept_id": concept.id,
            "concept_name": concept.name,
            "topic_name": topic.name,
            "total": 0,
            "correct": 0,
            "partial": 0,
            "wrong": 0,
            "error_types": {},
        })
    for attempt, _, concept, _ in rows:
        entry = per_concept[concept.id]
        entry["total"] += 1
        if attempt.correct == 1:
            entry["correct"] += 1
        elif attempt.correct == 2:
            entry["partial"] += 1
        else:
            entry["wrong"] += 1
            if attempt.error_type:
                key = attempt.error_type.value
                entry["error_types"][key] = entry["error_types"].get(key, 0) + 1

    concepts = list(per_concept.values())
    for c in concepts:
        if c["error_types"]:
            c["dominant_error"] = max(c["error_types"], key=c["error_types"].get)
        else:
            c["dominant_error"] = None
    return {"concepts": concepts}


# --- Export ---
@router.get("/users/{user_id}/export")
async def export_user_data(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Topic).options(
            selectinload(Topic.concepts).selectinload(Concept.prerequisites),
        ).where(Topic.user_id == user_id)
    )
    topics = result.scalars().all()

    result = await db.execute(
        select(KnowledgeState).where(KnowledgeState.user_id == user_id)
    )
    knowledge_states = result.scalars().all()

    result = await db.execute(
        select(Session, Activity, Attempt)
        .join(Activity, Activity.session_id == Session.id)
        .join(Attempt, Attempt.activity_id == Activity.id)
        .where(Session.user_id == user_id)
    )
    sessions_rows = result.all()
    sessions = {}
    for sess, act, att in sessions_rows:
        s = sessions.setdefault(sess.id, {
            "id": sess.id,
            "topic_id": sess.topic_id,
            "created_at": sess.created_at.isoformat() if sess.created_at else None,
            "activities": {},
        })
        a = s["activities"].setdefault(act.id, {
            "id": act.id,
            "concept_id": act.concept_id,
            "activity_type": act.activity_type.value,
            "created_at": act.created_at.isoformat() if act.created_at else None,
            "attempts": [],
        })
        a["attempts"].append({
            "id": att.id,
            "answer": att.answer,
            "correct": att.correct,
            "error_type": att.error_type.value if att.error_type else None,
            "response_time": att.response_time,
            "hints_used": att.hints_used,
            "feedback": att.feedback,
            "created_at": att.created_at.isoformat() if att.created_at else None,
        })

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "topics": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "concepts": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "description": c.description,
                        "difficulty": c.difficulty,
                        "prerequisite_ids": [p.id for p in c.prerequisites],
                    }
                    for c in t.concepts
                ],
            }
            for t in topics
        ],
        "knowledge_states": [
            {
                "concept_id": ks.concept_id,
                "state": ks.state.value,
                "confidence": ks.confidence,
                "retention": ks.retention,
                "last_review": ks.last_review.isoformat() if ks.last_review else None,
                "next_review": ks.next_review.isoformat() if ks.next_review else None,
                "updated_at": ks.updated_at.isoformat() if ks.updated_at else None,
            }
            for ks in knowledge_states
        ],
        "sessions": list(sessions.values()),
    }


# --- Confidence timeline (approximate curve from attempts) ---
@router.get("/users/{user_id}/confidence-timeline")
async def get_confidence_timeline(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attempt, Activity, Concept)
        .join(Activity, Activity.id == Attempt.activity_id)
        .join(Concept, Concept.id == Activity.concept_id)
        .join(Session, Session.id == Activity.session_id)
        .where(Session.user_id == user_id)
        .order_by(Attempt.created_at.asc())
    )
    rows = result.all()

    per_concept: dict[int, dict] = {}
    for attempt, _, concept in rows:
        c = per_concept.setdefault(concept.id, {
            "concept_id": concept.id,
            "concept_name": concept.name,
            "points": [],
        })
        conf = c["points"][-1][1] if c["points"] else 0.0
        step = 0.12 if attempt.correct == 1 else (0.04 if attempt.correct == 2 else -0.18)
        conf = max(0.0, min(1.0, conf + step))
        c["points"].append([attempt.created_at.strftime("%m-%d") if attempt.created_at else "", round(conf, 2)])

    out = list(per_concept.values())
    out.sort(key=lambda c: c["concept_name"])
    return {"concepts": out}


# --- Weekly goal ---
@router.get("/users/{user_id}/weekly-goal")
async def get_weekly_goal(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key == "weekly_goal"))
    setting = result.scalar_one_or_none()
    goal = int(setting.value) if setting and setting.value.isdigit() else 3

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(KnowledgeState).where(
            KnowledgeState.user_id == user_id,
            KnowledgeState.updated_at >= week_start,
            KnowledgeState.state.in_([
                KnowledgeLevel.APPLIED,
                KnowledgeLevel.TRANSFERRED,
                KnowledgeLevel.CONSOLIDATED,
            ]),
        )
    )
    mastered = len(result.scalars().all())

    return {
        "goal": goal,
        "achieved": mastered,
        "week_start": week_start.date().isoformat(),
    }


# --- History ---
@router.get("/users/{user_id}/history")
async def get_history(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(KnowledgeState)
        .options(selectinload(KnowledgeState.concept).selectinload(Concept.topic))
        .where(KnowledgeState.user_id == user_id)
        .order_by(KnowledgeState.updated_at.desc())
    )
    states = result.scalars().all()
    return [
        {
            "concept_name": ks.concept.name,
            "topic_name": ks.concept.topic.name if ks.concept.topic else "",
            "state": ks.state.value,
            "confidence": ks.confidence,
            "last_review": ks.last_review,
            "updated_at": ks.updated_at.isoformat() if ks.updated_at else None,
        }
        for ks in states
    ]


# --- Settings ---
SETTING_DEFAULTS = {
    "language": "en",
    "difficulty_preference": "adaptive",
    "session_length": "medium",
    "explanation_style": "concise",
    "name": "",
    "weekly_goal": "3",
    "enabled_techniques": "EXPLANATION,WORKED_EXAMPLE,RETRIEVAL,APPLICATION,TRANSFER,VARIATION,COMPRESSION",
}


def _settings_response(rows: dict[str, str]) -> SettingsResponse:
    api_key = rows.get("ai_api_key", "")
    return SettingsResponse(
        ai_api_key=api_key[:4] + "****" + api_key[-4:] if len(api_key) > 8 else ("****" if api_key else ""),
        ai_base_url=rows.get("ai_base_url", ""),
        ai_model=rows.get("ai_model", ""),
        configured=bool(api_key),
        language=rows.get("language", SETTING_DEFAULTS["language"]),
        difficulty_preference=rows.get("difficulty_preference", SETTING_DEFAULTS["difficulty_preference"]),
        session_length=rows.get("session_length", SETTING_DEFAULTS["session_length"]),
        explanation_style=rows.get("explanation_style", SETTING_DEFAULTS["explanation_style"]),
        name=rows.get("name", SETTING_DEFAULTS["name"]),
        enabled_techniques=rows.get("enabled_techniques", SETTING_DEFAULTS["enabled_techniques"]),
        weekly_goal=rows.get("weekly_goal", SETTING_DEFAULTS["weekly_goal"]),
    )


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting))
    rows = {s.key: s.value for s in result.scalars().all()}
    return _settings_response(rows)


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    fields = ["ai_api_key", "ai_base_url", "ai_model", "language", "difficulty_preference", "session_length", "explanation_style", "name", "enabled_techniques", "weekly_goal"]
    for field in fields:
        value = getattr(data, field, None)
        if value is not None:
            result = await db.execute(select(Setting).where(Setting.key == field))
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = value
            else:
                db.add(Setting(key=field, value=value))

    await db.commit()

    result = await db.execute(select(Setting))
    rows = {s.key: s.value for s in result.scalars().all()}
    return _settings_response(rows)
