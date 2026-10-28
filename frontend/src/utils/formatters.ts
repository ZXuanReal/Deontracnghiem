const SESSION_STORAGE_KEY = 'hello_kitty_quiz_session_id';
const ACTIVE_EXAM_STORAGE_KEY = 'hello_kitty_quiz_active_exam_state';

export function getAnonymousSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId =
      'hk_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).substring(2, 10);
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export interface PersistedExamState {
  attemptId: string;
  currentIndex: number;
  answers: Record<number, { selected_option_id: number | null; selected_label: 'A' | 'B' | 'C' | 'D' | null }>;
  flaggedIds: number[];
  elapsedSeconds: number;
  updatedAt: number;
}

export function savePersistedExamState(state: PersistedExamState): void {
  try {
    localStorage.setItem(ACTIVE_EXAM_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save exam state to localStorage', e);
  }
}

export function loadPersistedExamState(): PersistedExamState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_EXAM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedExamState;
  } catch {
    return null;
  }
}

export function clearPersistedExamState(): void {
  try {
    localStorage.removeItem(ACTIVE_EXAM_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}g ${remMins}p ${secs}s`;
  }
  return `${mins} phút ${secs < 10 ? '0' : ''}${secs} giây`;
}

export function formatTimerClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const mStr = mins < 10 ? `0${mins}` : `${mins}`;
  const sStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mStr}:${sStr}`;
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Chuyển đổi ký hiệu LaTeX hóa học/dược lý sang hiển thị dễ đọc
export function formatScientificText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\$\\alpha_\{1\}\$/g, 'α₁')
    .replace(/\$\\alpha_\{2\}\$/g, 'α₂')
    .replace(/\$\\alpha\$/g, 'α')
    .replace(/\$\\beta_\{1\}\$/g, 'β₁')
    .replace(/\$\\beta_\{2\}\$/g, 'β₂')
    .replace(/\$\\beta_\{3\}\$/g, 'β₃')
    .replace(/\$\\beta\$/g, 'β')
    .replace(/\$Ca\^\{2\+\}\$/g, 'Ca²⁺')
    .replace(/\$Na\^\{\+\}\$/g, 'Na⁺')
    .replace(/\$K\^\{\+\}\$/g, 'K⁺')
    .replace(/\$Cl\^\{-\}\$/g, 'Cl⁻')
    .replace(/\$([^$]+)\$/g, '$1');
}

export const QUESTION_LEVEL_CONFIG: Record<
  string,
  { label: string; shortDesc: string; badgeClass: string; iconEmoji: string }
> = {
  recognition: {
    label: 'Nhận biết',
    shortDesc: 'Ghi nhớ khái niệm, định nghĩa, phân loại cơ bản',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
    iconEmoji: '🌸',
  },
  understanding: {
    label: 'Thông hiểu',
    shortDesc: 'Giải thích cơ chế, nguyên lý, mối liên hệ dược lý',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    iconEmoji: '🎀',
  },
  application: {
    label: 'Vận dụng',
    shortDesc: 'Áp dụng kiến thức vào tình huống lâm sàng cụ thể',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    iconEmoji: '⭐',
  },
  advanced_application: {
    label: 'Vận dụng cao',
    shortDesc: 'Phân tích chuyên sâu, xử trí tương tác phức tạp',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    iconEmoji: '👑',
  },
};

export function getLevelLabel(type: string): string {
  return QUESTION_LEVEL_CONFIG[type]?.label || type;
}
