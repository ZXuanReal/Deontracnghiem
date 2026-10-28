export type QuestionType =
  | 'recognition'
  | 'understanding'
  | 'application'
  | 'advanced_application'
  | string;

export interface Chapter {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  total_questions: number;
  counts_by_type: {
    recognition: number;
    understanding: number;
    application: number;
    advanced_application: number;
    [key: string]: number;
  };
}

export interface ExamOption {
  id: number;
  label: 'A' | 'B' | 'C' | 'D';
  content: string;
  is_correct?: boolean;
}

export interface ExamQuestion {
  attempt_answer_id: number;
  question_id: number | null;
  sort_order: number;
  content: string;
  question_type: QuestionType;
  chapter_id: number;
  chapter_name: string;
  source_ref?: string;
  selected_option_id: number | null;
  selected_label: 'A' | 'B' | 'C' | 'D' | null;
  correct_label?: 'A' | 'B' | 'C' | 'D';
  is_correct?: boolean;
  explanation?: string;
  options: ExamOption[];
}

export interface CustomQuota {
  recognition: number;
  understanding: number;
  application: number;
  advanced_application: number;
  [key: string]: number;
}

export interface ExamSettings {
  exam_mode: 'chapter' | 'comprehensive';
  chapter_id?: number | null;
  chapter_ids?: number[] | null;
  filter_enabled: boolean;
  selected_types: string[];
  requested_question_count: number | 'all';
  actual_question_count: number;
  shuffle: boolean;
  use_custom_quota?: boolean;
  custom_quota?: CustomQuota | null;
}

export interface ExamAttempt {
  id: string;
  status?: 'in_progress' | 'completed';
  exam_mode: 'chapter' | 'comprehensive';
  chapter_id: number | null;
  title: string;
  total_questions: number;
  correct_count?: number;
  incorrect_count?: number;
  unanswered_count?: number;
  score?: number;
  accuracy_percent?: number;
  started_at: string;
  completed_at?: string | null;
  duration_seconds: number;
  settings: ExamSettings;
  questions: ExamQuestion[];
}

export interface ShortageDetail {
  type: string;
  label: string;
  requested: number;
  available: number;
}

export interface GenerateExamResponse {
  status: 'created' | 'shortage';
  attempt?: ExamAttempt;
  shortage_type?: 'count' | 'quota';
  message?: string;
  shortages?: ShortageDetail[];
  requested_total?: number;
  available_total?: number;
  actual_quota?: Record<string, number>;
}

export interface HistorySummaryItem {
  id: string;
  anonymous_session_id: string;
  exam_mode: 'chapter' | 'comprehensive';
  chapter_id: number | null;
  title: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  score: number;
  accuracy_percent: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  settings: ExamSettings;
}
