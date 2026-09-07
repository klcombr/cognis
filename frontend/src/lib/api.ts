import type {
  Activity,
  Attempt,
  Concept,
  ConceptGraph,
  ConfidenceTimelineItem,
  Donation,
  ErrorAnalysisConcept,
  HistoryItem,
  HomeResponse,
  KnowledgeState,
  ReviewQueueItem,
  Session,
  SessionSummary,
  Settings,
  Topic,
  TopicDetail,
  TopicStat,
  WeeklyGoal,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  createUser: () => request<{ id: number }>('/users', { method: 'POST' }),

  getHome: (userId: number) =>
    request<HomeResponse>(`/users/${userId}/home`),

  getStats: (userId: number) =>
    request<{ topic_stats: TopicStat[] }>(`/users/${userId}/stats`),

  getReviewQueue: (userId: number) =>
    request<{ items: ReviewQueueItem[] }>(`/users/${userId}/review-queue`),

  getWeeklyGoal: (userId: number) =>
    request<WeeklyGoal>(`/users/${userId}/weekly-goal`),

  getErrorAnalysis: (userId: number) =>
    request<{ concepts: ErrorAnalysisConcept[] }>(`/users/${userId}/error-analysis`),

  getConfidenceTimeline: (userId: number) =>
    request<{ concepts: ConfidenceTimelineItem[] }>(`/users/${userId}/confidence-timeline`),

  exportData: async (userId: number): Promise<void> => {
    const res = await fetch(`${BASE}/users/${userId}/export`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognis-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getTopics: (userId: number) =>
    request<Topic[]>(`/users/${userId}/topics`),

  createTopic: (userId: number, name: string, description: string) =>
    request<Topic>(`/users/${userId}/topics`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  getTopic: (topicId: number, userId?: number) => {
    const params = userId ? `?user_id=${userId}` : '';
    return request<TopicDetail>(`/topics/${topicId}${params}`);
  },

  deleteTopic: (topicId: number) =>
    request<{ ok: boolean }>(`/topics/${topicId}`, { method: 'DELETE' }),

  decomposeTopic: (topicId: number, force = false) =>
    request<{ concepts_created: number }>(
      `/topics/${topicId}/decompose${force ? '?force=true' : ''}`,
      { method: 'POST' }
    ),

  getConceptGraph: (topicId: number, userId?: number) => {
    const params = userId ? `?user_id=${userId}` : '';
    return request<ConceptGraph>(`/topics/${topicId}/graph${params}`);
  },

  getTopicConcepts: (topicId: number, userId?: number) =>
    api.getConceptGraph(topicId, userId).then((g) => g.concepts),

  createConcept: (topicId: number, name: string, description: string, prerequisiteIds: number[] = []) =>
    request<Concept>(`/topics/${topicId}/concepts`, {
      method: 'POST',
      body: JSON.stringify({ name, description, prerequisite_ids: prerequisiteIds }),
    }),

  updateConcept: (conceptId: number, data: { name?: string; description?: string }) =>
    request<Concept>(`/concepts/${conceptId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteConcept: (conceptId: number) =>
    request<{ ok: boolean }>(`/concepts/${conceptId}`, { method: 'DELETE' }),

  addPrerequisite: (conceptId: number, prerequisiteId: number) =>
    request<{ ok: boolean }>(`/concepts/${conceptId}/prerequisites`, {
      method: 'POST',
      body: JSON.stringify({ prerequisite_id: prerequisiteId }),
    }),

  removePrerequisite: (conceptId: number, prerequisiteId: number) =>
    request<{ ok: boolean }>(`/concepts/${conceptId}/prerequisites/${prerequisiteId}`, { method: 'DELETE' }),

  createSession: (userId: number, topicId: number, conceptId?: number) =>
    request<Session>(`/users/${userId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ topic_id: topicId, concept_id: conceptId }),
    }),

  startSession: (userId: number, topicId: number, conceptId?: number) =>
    api.createSession(userId, topicId, conceptId),

  getNextActivity: (sessionId: number) =>
    request<Activity>(`/sessions/${sessionId}/next`, { method: 'POST' }),

  getSessionSummary: (sessionId: number) =>
    request<SessionSummary>(`/sessions/${sessionId}/summary`),

  submitAttempt: (activityId: number, answer: string, responseTime: number, hintsUsed: number) =>
    request<Attempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify({
        activity_id: activityId,
        answer,
        response_time: responseTime,
        hints_used: hintsUsed,
      }),
    }),

  getHint: (activityId: number, hintIndex: number) =>
    request<{ hint: string | null; total_hints: number; index: number }>(
      `/activities/${activityId}/hint?hint_index=${hintIndex}`
    ),

  getKnowledgeStates: (userId: number) =>
    request<KnowledgeState[]>(`/users/${userId}/knowledge`),

  getHistory: (userId: number) =>
    request<HistoryItem[]>(`/users/${userId}/history`),

  getSettings: () =>
    request<Settings>('/settings'),

  updateSettings: (data: {
    ai_api_key?: string;
    ai_base_url?: string;
    ai_model?: string;
    language?: string;
    difficulty_preference?: string;
    session_length?: string;
    explanation_style?: string;
    name?: string;
    enabled_techniques?: string;
    weekly_goal?: string;
  }) =>
    request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  createDonation: (amount: number, name?: string) =>
    request<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify({ amount, name: name || '' }),
    }),

  getDonation: (donationId: number) =>
    request<Donation>(`/donations/${donationId}`),
};
