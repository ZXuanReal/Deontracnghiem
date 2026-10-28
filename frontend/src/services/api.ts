import {
  Chapter,
  CustomQuota,
  ExamAttempt,
  GenerateExamResponse,
  HistorySummaryItem,
} from '../types/quiz';
import { getAnonymousSessionId } from '../utils/formatters';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Đã xảy ra lỗi kết nối với máy chủ.');
  }
  return data as T;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const res = await fetch(`${API_BASE}/chapters`);
  const data = await handleResponse<{ chapters: Chapter[] }>(res);
  return data.chapters;
}

export interface GenerateExamPayload {
  exam_mode: 'chapter' | 'comprehensive';
  chapter_id?: number;
  chapter_ids?: number[];
  filter_enabled: boolean;
  selected_types: string[];
  question_count: number | 'all';
  shuffle: boolean;
  use_custom_quota?: boolean;
  custom_quota?: CustomQuota | null;
  allow_partial?: boolean;
}

export async function generateExam(
  payload: GenerateExamPayload
): Promise<GenerateExamResponse> {
  const res = await fetch(`${API_BASE}/exams/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      anonymous_session_id: getAnonymousSessionId(),
    }),
  });
  return handleResponse<GenerateExamResponse>(res);
}

export async function fetchExamAttempt(attemptId: string): Promise<ExamAttempt> {
  const res = await fetch(`${API_BASE}/exams/${attemptId}`);
  const data = await handleResponse<{ attempt: ExamAttempt }>(res);
  return data.attempt;
}

export async function saveExamProgress(
  attemptId: string,
  answers: Array<{
    attempt_answer_id: number;
    selected_option_id: number | null;
    selected_label: 'A' | 'B' | 'C' | 'D' | null;
  }>,
  durationSeconds: number
): Promise<void> {
  await fetch(`${API_BASE}/exams/${attemptId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers,
      duration_seconds: durationSeconds,
    }),
  }).catch(() => {
    // Silent catch for background auto-save
  });
}

export async function submitExamAttempt(
  attemptId: string,
  answers: Array<{
    attempt_answer_id: number;
    question_id: number | null;
    selected_option_id: number | null;
    selected_label: 'A' | 'B' | 'C' | 'D' | null;
  }>,
  durationSeconds: number
): Promise<ExamAttempt> {
  const res = await fetch(`${API_BASE}/exams/${attemptId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers,
      duration_seconds: durationSeconds,
    }),
  });
  const data = await handleResponse<{ attempt: ExamAttempt }>(res);
  return data.attempt;
}

export async function fetchExamHistory(params?: {
  sort?: 'asc' | 'desc';
  mode?: 'chapter' | 'comprehensive' | 'all';
}): Promise<HistorySummaryItem[]> {
  const query = new URLSearchParams();
  query.set('session_id', getAnonymousSessionId());
  if (params?.sort) query.set('sort', params.sort);
  if (params?.mode && params.mode !== 'all') query.set('mode', params.mode);

  const res = await fetch(`${API_BASE}/history?${query.toString()}`);
  const data = await handleResponse<{ history: HistorySummaryItem[] }>(res);
  return data.history;
}

export async function fetchHistoryDetail(attemptId: string): Promise<ExamAttempt> {
  const res = await fetch(`${API_BASE}/history/${attemptId}`);
  const data = await handleResponse<{ attempt: ExamAttempt }>(res);
  return data.attempt;
}
