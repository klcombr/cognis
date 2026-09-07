from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class KnowledgeLevel(str, PyEnum):
    UNKNOWN = "UNKNOWN"
    EXPOSED = "EXPOSED"
    UNDERSTOOD = "UNDERSTOOD"
    APPLIED = "APPLIED"
    TRANSFERRED = "TRANSFERRED"
    CONSOLIDATED = "CONSOLIDATED"


class ErrorType(str, PyEnum):
    CONCEPTUAL = "CONCEPTUAL"
    PROCEDURAL = "PROCEDURAL"
    MISCONCEPTION = "MISCONCEPTION"
    KNOWLEDGE_GAP = "KNOWLEDGE_GAP"
    CARELESS = "CARELESS"
    GUESS = "GUESS"


class ActivityType(str, PyEnum):
    EXPLANATION = "EXPLANATION"
    WORKED_EXAMPLE = "WORKED_EXAMPLE"
    RETRIEVAL = "RETRIEVAL"
    APPLICATION = "APPLICATION"
    TRANSFER = "TRANSFER"
    COMPRESSION = "COMPRESSION"
    VARIATION = "VARIATION"


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=utcnow)

    topics = relationship("Topic", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    knowledge_states = relationship("KnowledgeState", back_populates="user", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="topics")
    concepts = relationship("Concept", back_populates="topic", cascade="all, delete-orphan")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    difficulty = Column(Float, default=0.5)  # 0.0 to 1.0
    created_at = Column(DateTime, default=utcnow)

    topic = relationship("Topic", back_populates="concepts")
    prerequisites = relationship(
        "Concept",
        secondary="concept_dependencies",
        primaryjoin="Concept.id == ConceptDependency.concept_id",
        secondaryjoin="Concept.id == ConceptDependency.prerequisite_id",
        back_populates="dependents",
    )
    dependents = relationship(
        "Concept",
        secondary="concept_dependencies",
        primaryjoin="Concept.id == ConceptDependency.prerequisite_id",
        secondaryjoin="Concept.id == ConceptDependency.concept_id",
        back_populates="prerequisites",
    )
    knowledge_states = relationship("KnowledgeState", back_populates="concept", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="concept", cascade="all, delete-orphan")


class ConceptDependency(Base):
    __tablename__ = "concept_dependencies"
    __table_args__ = (UniqueConstraint("concept_id", "prerequisite_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    prerequisite_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    current_concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=True)
    support_level = Column(Float, default=1.0)  # 1.0=full support, 0.0=none
    confidence = Column(Float, default=0.5)
    attempt_count = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="sessions")
    topic = relationship("Topic")
    current_concept = relationship("Concept")
    activities = relationship("Activity", back_populates="session", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    activity_type = Column(Enum(ActivityType), nullable=False)
    content = Column(Text, nullable=False)  # JSON: question, options, hints, etc.
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)

    session = relationship("Session", back_populates="activities")
    concept = relationship("Concept", back_populates="activities")
    attempts = relationship("Attempt", back_populates="activity", cascade="all, delete-orphan")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    answer = Column(Text, nullable=False)
    correct = Column(Integer, default=0)  # 0=false, 1=true, 2=partial
    error_type = Column(Enum(ErrorType), nullable=True)
    response_time = Column(Float, default=0.0)  # seconds
    hints_used = Column(Integer, default=0)
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    activity = relationship("Activity", back_populates="attempts")


class KnowledgeState(Base):
    __tablename__ = "knowledge_states"
    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    state = Column(Enum(KnowledgeLevel), default=KnowledgeLevel.UNKNOWN)
    confidence = Column(Float, default=0.0)
    retention = Column(Float, default=1.0)
    last_review = Column(DateTime, nullable=True)
    next_review = Column(DateTime, nullable=True)
    interval_days = Column(Float, default=1.0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="knowledge_states")
    concept = relationship("Concept", back_populates="knowledge_states")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    correct = Column(Integer, default=0)
    response_time = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
