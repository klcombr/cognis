from datetime import datetime

from pydantic import BaseModel

from app.models.models import ActivityType, ErrorType, KnowledgeLevel


# --- User ---
class UserCreate(BaseModel):
    pass


class UserResponse(BaseModel):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Topic ---
class TopicCreate(BaseModel):
    name: str
    description: str = ""


class TopicResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Concept ---
class ConceptCreate(BaseModel):
    name: str
    description: str = ""
    difficulty: float = 0.5
    prerequisite_ids: list[int] = []


class ConceptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class PrerequisiteCreate(BaseModel):
    prerequisite_id: int


class ConceptResponse(BaseModel):
    id: int
    name: str
    description: str
    difficulty: float
    knowledge_level: KnowledgeLevel | None = None
    confidence: float | None = None

    model_config = {"from_attributes": True}


class ConceptGraphResponse(BaseModel):
    concepts: list[ConceptResponse]
    dependencies: list[dict]


# --- Session ---
class SessionCreate(BaseModel):
    topic_id: int
    concept_id: int | None = None


class SessionResponse(BaseModel):
    id: int
    topic_id: int
    current_concept_id: int | None
    support_level: float
    confidence: float
    attempt_count: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Activity ---
class ActivityResponse(BaseModel):
    id: int
    session_id: int
    concept_id: int
    activity_type: ActivityType
    content: str
    order_index: int
    created_at: datetime
    session_complete: bool = False
    activity_count: int = 0

    model_config = {"from_attributes": True}


class ActivityContent(BaseModel):
    question: str
    options: list[str] | None = None
    hints: list[str] = []
    explanation: str | None = None
    worked_example: dict | None = None
    concept_name: str | None = None


# --- Attempt ---
class AttemptCreate(BaseModel):
    activity_id: int
    answer: str
    response_time: float = 0.0
    hints_used: int = 0


class AttemptResponse(BaseModel):
    id: int
    activity_id: int
    answer: str
    correct: int
    error_type: ErrorType | None
    response_time: float
    hints_used: int
    feedback: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EvaluationResult(BaseModel):
    correct: int
    error_type: ErrorType | None
    feedback: str
    next_activity_type: ActivityType | None = None
    knowledge_state_update: dict | None = None


# --- Knowledge State ---
class KnowledgeStateResponse(BaseModel):
    concept_id: int
    concept_name: str
    state: KnowledgeLevel
    confidence: float
    retention: float
    last_review: datetime | None
    next_review: datetime | None

    model_config = {"from_attributes": True}


# --- Review ---
class ReviewResponse(BaseModel):
    id: int
    concept_id: int
    correct: int
    response_time: float
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Topic with concepts ---
class TopicDetailResponse(TopicResponse):
    concepts: list[ConceptResponse] = []


# --- Home ---
class ContinueItem(BaseModel):
    concept_name: str
    topic_name: str
    status: str  # e.g. "Needs reinforcement", "Review available"
    knowledge_level: KnowledgeLevel
    next_review: datetime | None = None


class HomeResponse(BaseModel):
    recent_topics: list[TopicResponse]
    continue_items: list[ContinueItem]
    total_concepts: int
    mastered: int
    learning: int
    needs_review: int
    recent_activity: list[dict]


# --- Settings ---
class SettingsResponse(BaseModel):
    ai_api_key: str
    ai_base_url: str
    ai_model: str
    configured: bool
    language: str
    difficulty_preference: str  # adaptive, easy, challenging
    session_length: str  # short, medium, long
    explanation_style: str  # concise, detailed, socratic
    name: str
    enabled_techniques: str  # comma-separated activity type values
    weekly_goal: str


class SettingsUpdate(BaseModel):
    ai_api_key: str | None = None
    ai_base_url: str | None = None
    ai_model: str | None = None
    language: str | None = None
    difficulty_preference: str | None = None
    session_length: str | None = None
    explanation_style: str | None = None
    name: str | None = None
    enabled_techniques: str | None = None
    weekly_goal: str | None = None
