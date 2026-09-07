export type KnowledgeLevel =
  | 'UNKNOWN'
  | 'EXPOSED'
  | 'UNDERSTOOD'
  | 'APPLIED'
  | 'TRANSFERRED'
  | 'CONSOLIDATED';

export interface Topic {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Concept {
  id: number;
  name: string;
  description: string;
  difficulty: number;
  knowledge_level?: string | null;
  confidence?: number | null;
}

export interface TopicDetail extends Topic {
  concepts: Concept[];
}

export interface ConceptGraph {
  concepts: Concept[];
  dependencies: { concept_id: number; prerequisite_id: number }[];
}

export interface Session {
  id: number;
  topic_id: number;
  current_concept_id: number | null;
  support_level: number;
  confidence: number;
  attempt_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Activity {
  id: number;
  session_id: number;
  concept_id: number;
  activity_type: string;
  content: string;
  order_index: number;
  created_at: string;
  session_complete?: boolean;
  activity_count?: number;
}

export interface ActivityContent {
  question: string;
  options?: string[] | null;
  hints: string[];
  explanation?: string | null;
  worked_example?: {
    problem: string;
    steps: { step: string; reasoning: string }[];
    result: string;
  } | null;
  concept_name?: string | null;
}

export interface Attempt {
  id: number;
  activity_id: number;
  answer: string;
  correct: number;
  error_type: string | null;
  response_time: number;
  hints_used: number;
  feedback: string;
  created_at: string;
}

export interface KnowledgeState {
  concept_id: number;
  concept_name: string;
  topic_name?: string;
  topic_id?: number | null;
  state: string;
  confidence: number;
  retention: number;
  last_review: string | null;
  next_review: string | null;
  updated_at?: string | null;
}

export interface ContinueItem {
  concept_name: string;
  topic_name: string;
  status: string;
  knowledge_level: string;
  next_review: string | null;
}

export interface HomeResponse {
  recent_topics: Topic[];
  continue_items: ContinueItem[];
  total_concepts: number;
  mastered: number;
  learning: number;
  needs_review: number;
  recent_activity: {
    topic_name: string;
    concept_name: string;
    attempt_count: number;
    updated_at: string;
  }[];
}

export interface TopicStat {
  topic_name: string;
  correct: number;
  partial: number;
  wrong: number;
  total: number;
  accuracy: number;
}

export interface HistoryItem {
  concept_name: string;
  topic_name: string;
  state: string;
  confidence: number;
  last_review: string | null;
  updated_at: string | null;
}

export interface ReviewQueueItem {
  concept_id: number;
  concept_name: string;
  topic_id: number;
  state: string;
  confidence: number;
  next_review: string | null;
  due: boolean;
}

export interface WeeklyGoal {
  goal: number;
  achieved: number;
  week_start: string;
}

export interface ErrorAnalysisConcept {
  concept_id: number;
  concept_name: string;
  topic_name: string;
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  error_types: Record<string, number>;
  dominant_error: string | null;
}

export interface ConfidencePoint {
  date: string;
  confidence: number;
}

export interface ConfidenceTimelineItem {
  concept_id: number;
  concept_name: string;
  points: [string, number][];
}

export interface SessionSummary {
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  accuracy: number;
  hints_used: number;
  avg_response_time: number;
  error_types: Record<string, number>;
  by_concept: {
    concept_id: number;
    concept_name: string;
    correct: number;
    partial: number;
    wrong: number;
  }[];
}

export interface Settings {
  ai_api_key: string;
  ai_base_url: string;
  ai_model: string;
  configured: boolean;
  language: string;
  difficulty_preference: string;
  session_length: string;
  explanation_style: string;
  name: string;
  enabled_techniques: string;
  weekly_goal: string;
}
export interface Donation {
  id: number;
  payment_link_id: string;
  amount: number;
  status: string;
  payment_url: string | null;
  qr_code: string | null;
  pix_copy_paste: string | null;
}
