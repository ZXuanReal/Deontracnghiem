import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Sparkles,
  Home,
  ArrowLeft,
} from 'lucide-react';
import { ExamAttempt } from '../types/quiz';
import {
  formatScientificText,
  formatTimerClock,
  QUESTION_LEVEL_CONFIG,
  savePersistedExamState,
  loadPersistedExamState,
  clearPersistedExamState,
} from '../utils/formatters';
import { saveExamProgress, submitExamAttempt } from '../services/api';
import { KittyBowSvg } from './KittyDecorations';

interface ActiveExamViewProps {
  attempt: ExamAttempt;
  onExamSubmitted: (completedAttempt: ExamAttempt) => void;
  onExitToHome?: () => void;
  onExitToSetup?: () => void;
}

export const ActiveExamView: React.FC<ActiveExamViewProps> = ({
  attempt,
  onExamSubmitted,
  onExitToHome,
  onExitToSetup,
}) => {
  const questions = attempt.questions;
  const totalQuestions = questions.length;

  // Initialize state from localStorage if matching attempt.id, otherwise from attempt payload
  const initialPersisted = useMemo(() => {
    const saved = loadPersistedExamState();
    if (saved && saved.attemptId === attempt.id) {
      return saved;
    }
    return null;
  }, [attempt.id]);

  const [currentIndex, setCurrentIndex] = useState<number>(
    initialPersisted ? Math.min(initialPersisted.currentIndex, totalQuestions - 1) : 0
  );

  // Map of attempt_answer_id -> { selected_option_id, selected_label }
  const [answersMap, setAnswersMap] = useState<
    Record<
      number,
      { selected_option_id: number | null; selected_label: 'A' | 'B' | 'C' | 'D' | null }
    >
  >(() => {
    const base: Record<
      number,
      { selected_option_id: number | null; selected_label: 'A' | 'B' | 'C' | 'D' | null }
    > = {};
    for (const q of questions) {
      base[q.attempt_answer_id] = {
        selected_option_id: q.selected_option_id ?? null,
        selected_label: q.selected_label ?? null,
      };
    }
    if (initialPersisted && initialPersisted.answers) {
      return { ...base, ...initialPersisted.answers };
    }
    return base;
  });

  const [flaggedIds, setFlaggedIds] = useState<number[]>(
    initialPersisted?.flaggedIds ?? []
  );

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    initialPersisted?.elapsedSeconds ?? attempt.duration_seconds ?? 0
  );

  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist to localStorage on every state update
  useEffect(() => {
    savePersistedExamState({
      attemptId: attempt.id,
      currentIndex,
      answers: answersMap,
      flaggedIds,
      elapsedSeconds,
      updatedAt: Date.now(),
    });
  }, [attempt.id, currentIndex, answersMap, flaggedIds, elapsedSeconds]);

  const currentQuestion = questions[currentIndex];

  const answeredCount = useMemo(() => {
    return questions.filter(
      (q) => answersMap[q.attempt_answer_id]?.selected_label != null
    ).length;
  }, [questions, answersMap]);

  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSelectOption = useCallback(
    (optionId: number, label: 'A' | 'B' | 'C' | 'D') => {
      if (!currentQuestion || isSubmitting) return;
      const ansId = currentQuestion.attempt_answer_id;

      setAnswersMap((prev) => {
        const next = {
          ...prev,
          [ansId]: {
            selected_option_id: optionId,
            selected_label: label,
          },
        };

        // Sync asynchronously to backend
        const payloadList = Object.entries(next).map(([idStr, val]) => ({
          attempt_answer_id: Number(idStr),
          selected_option_id: val.selected_option_id,
          selected_label: val.selected_label,
        }));
        saveExamProgress(attempt.id, payloadList, elapsedSeconds);

        return next;
      });
    },
    [currentQuestion, isSubmitting, attempt.id, elapsedSeconds]
  );

  const toggleFlagCurrent = () => {
    if (!currentQuestion) return;
    const ansId = currentQuestion.attempt_answer_id;
    setFlaggedIds((prev) =>
      prev.includes(ansId) ? prev.filter((id) => id !== ansId) : [...prev, ansId]
    );
  };

  // Keyboard shortcuts (Left/Right arrows to navigate, A/B/C/D to pick option)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || isSubmitting) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight' && currentIndex < totalQuestions - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else {
        const upper = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(upper) && currentQuestion) {
          const opt = currentQuestion.options.find((o) => o.label === upper);
          if (opt) {
            handleSelectOption(opt.id, opt.label);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    totalQuestions,
    currentQuestion,
    showSubmitModal,
    isSubmitting,
    handleSelectOption,
  ]);

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const formattedAnswers = questions.map((q) => {
        const sel = answersMap[q.attempt_answer_id];
        return {
          attempt_answer_id: q.attempt_answer_id,
          question_id: q.question_id,
          selected_option_id: sel?.selected_option_id ?? null,
          selected_label: sel?.selected_label ?? null,
        };
      });

      const completed = await submitExamAttempt(
        attempt.id,
        formattedAnswers,
        elapsedSeconds
      );
      clearPersistedExamState();
      setShowSubmitModal(false);
      onExamSubmitted(completed);
    } catch (err: any) {
      setSubmitError(
        err.message || 'Không thể nộp bài lúc này. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) return null;

  const currentSelection = answersMap[currentQuestion.attempt_answer_id];
  const isCurrentFlagged = flaggedIds.includes(currentQuestion.attempt_answer_id);
  const levelConfig = QUESTION_LEVEL_CONFIG[currentQuestion.question_type] || {
    label: currentQuestion.question_type,
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
    iconEmoji: '🌸',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Quick Back Navigation Bar while in Exam */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onExitToHome && (
            <button
              type="button"
              onClick={onExitToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-[#FFF0F6] border border-[#F8BBD0] text-xs font-bold text-[#43313A] shadow-sm transition-all"
            >
              <Home className="w-3.5 h-3.5 text-[#EC6A9A]" />
              <span>Về Trang chủ</span>
            </button>
          )}
          {onExitToSetup && (
            <button
              type="button"
              onClick={onExitToSetup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-[#FFF0F6] border border-[#F8BBD0] text-xs font-bold text-[#43313A] shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#EC6A9A]" />
              <span>Chọn đề khác (Tạm lưu bài này)</span>
            </button>
          )}
        </div>
        <span className="text-xs text-[#7E6570]">
          💡 Đáp án bạn chọn được lưu tự động, có thể quay lại làm tiếp bất cứ lúc nào!
        </span>
      </div>

      {/* Top Luxury Exam Header Bar */}
      <div className="bg-white rounded-3xl border-2 border-[#F8BBD0] p-4 sm:p-5 shadow-kitty space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF0F6] border border-[#F8BBD0] flex items-center justify-center shrink-0">
              <KittyBowSvg className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                  {attempt.exam_mode === 'chapter'
                    ? '🎀 Luyện tập theo chương'
                    : '✨ Đề kiểm tra tổng hợp'}
                </span>
                <span className="text-xs text-[#7E6570] hidden sm:inline">
                  🐱 Cố lên nhé! Đọc kỹ từng câu hỏi nha 🌸
                </span>
              </div>
              <h1 className="font-display font-bold text-base sm:text-xl text-[#43313A] mt-0.5">
                {attempt.title}
              </h1>
            </div>
          </div>

          {/* Right metrics: Timer + Progress Count + Quick Submit */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0]">
              <Clock className="w-4 h-4 text-[#EC6A9A]" />
              <span className="font-mono font-bold text-sm sm:text-base text-[#43313A]">
                {formatTimerClock(elapsedSeconds)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] text-xs sm:text-sm font-bold text-[#43313A]">
              Câu <span className="text-[#EC6A9A]">{currentIndex + 1}</span> / {totalQuestions}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Nộp bài 🎀</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#7E6570]">
            <span className="font-medium">
              Tiến độ hoàn thành: <strong className="text-[#43313A]">{answeredCount}</strong>/{totalQuestions} câu đã chọn đáp án
            </span>
            <span className="font-bold text-[#EC6A9A]">{progressPercent}% 🌸</span>
          </div>
          <div className="w-full h-2.5 bg-[#FFF0F6] rounded-full overflow-hidden border border-[#F8BBD0]/60">
            <div
              className="h-full bg-gradient-to-r from-[#F48FB1] to-[#EC6A9A] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Workspace: Left = Active Question Card (8 cols), Right = Question Navigation Grid (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question & Options Area */}
        <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-[#F5D0DF] p-5 sm:p-8 shadow-kitty space-y-6">
          {/* Question Header Meta */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#FFF0F6] pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-[#EC6A9A] text-white font-display font-bold text-sm shadow-sm">
                Câu {currentIndex + 1}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${levelConfig.badgeClass}`}
              >
                <span>{levelConfig.iconEmoji}</span>
                <span>{levelConfig.label}</span>
              </span>
              {attempt.exam_mode === 'comprehensive' && (
                <span className="text-xs px-2.5 py-1 rounded-xl bg-[#FFF5F8] text-[#7E6570] border border-[#F5D0DF] truncate max-w-[240px]">
                  {currentQuestion.chapter_name}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFlagCurrent}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isCurrentFlagged
                  ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                  : 'bg-[#FFF5F8] text-[#7E6570] border-[#F5D0DF] hover:border-[#F8BBD0] hover:text-[#43313A]'
              }`}
            >
              <Flag
                className={`w-3.5 h-3.5 ${
                  isCurrentFlagged ? 'fill-amber-500 text-amber-600' : ''
                }`}
              />
              <span>{isCurrentFlagged ? 'Đã đánh dấu xem lại 🎀' : 'Đánh dấu xem lại'}</span>
            </button>
          </div>

          {/* Question Text */}
          <div className="py-1">
            <p className="text-base sm:text-lg font-semibold text-[#43313A] leading-relaxed">
              {formatScientificText(currentQuestion.content)}
            </p>
          </div>

          {/* 4 Options A, B, C, D */}
          <div className="space-y-3.5" role="radiogroup" aria-label={`Câu hỏi ${currentIndex + 1}`}>
            {currentQuestion.options.map((opt) => {
              const isSelected = currentSelection?.selected_label === opt.label;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(opt.id, opt.label)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 transition-all flex items-start gap-3.5 group ${
                    isSelected
                      ? 'bg-[#FFF0F6] border-[#EC6A9A] shadow-sm ring-2 ring-[#F8BBD0]/50'
                      : 'bg-white border-[#F5D0DF] hover:border-[#F8BBD0] hover:bg-[#FFF5F8]/60'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl font-display font-bold text-sm flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#EC6A9A] text-white shadow-sm'
                        : 'bg-[#FFF5F8] text-[#43313A] border border-[#F8BBD0] group-hover:bg-[#F8BBD0]/40'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span
                    className={`flex-1 text-sm sm:text-base leading-relaxed pt-1 ${
                      isSelected ? 'font-semibold text-[#43313A]' : 'text-[#43313A]'
                    }`}
                  >
                    {formatScientificText(opt.content)}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 text-[#EC6A9A] pt-1 flex items-center gap-1 text-xs font-bold">
                      <span>🎀</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Prev / Next Navigation Bar */}
          <div className="pt-4 border-t border-[#FFF0F6] flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-[#F8BBD0] bg-white hover:bg-[#FFF5F8] text-[#43313A] font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <span className="text-xs text-[#7E6570] hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#EC6A9A]" />
              <span>Mẹo: Dùng phím mũi tên Trái/Phải hoặc phím A, B, C, D</span>
            </span>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Hoàn thành & Nộp bài 🎀</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Quick Question Navigator */}
        <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-[#F5D0DF] p-5 shadow-kitty space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-[#FFF0F6] pb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#EC6A9A]" />
              <h2 className="font-display font-bold text-sm sm:text-base text-[#43313A]">
                Bảng điều hướng câu hỏi
              </h2>
            </div>
            <span className="text-base" aria-hidden="true">
              🐱🌸
            </span>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-[#7E6570]">
            <div className="flex items-center gap-1.5 bg-[#FFF5F8] p-2 rounded-xl border border-[#F5D0DF]">
              <span className="w-3 h-3 rounded-md bg-[#EC6A9A] inline-block shrink-0" />
              <span>Đã chọn ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FFF5F8] p-2 rounded-xl border border-[#F5D0DF]">
              <span className="w-3 h-3 rounded-md bg-white border border-[#F8BBD0] inline-block shrink-0" />
              <span>Chưa làm ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FFF5F8] p-2 rounded-xl border border-[#F5D0DF]">
              <span className="w-3 h-3 rounded-md bg-amber-300 inline-block shrink-0" />
              <span>Đánh dấu ({flaggedIds.length})</span>
            </div>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const sel = answersMap[q.attempt_answer_id];
              const isAnswered = sel?.selected_label != null;
              const isCurrent = idx === currentIndex;
              const isFlagged = flaggedIds.includes(q.attempt_answer_id);

              return (
                <button
                  key={q.attempt_answer_id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative h-10 rounded-xl font-display font-bold text-xs transition-all flex flex-col items-center justify-center border ${
                    isCurrent
                      ? 'ring-2 ring-[#EC6A9A] ring-offset-1 border-[#EC6A9A] bg-[#FFF0F6] text-[#EC6A9A]'
                      : isAnswered
                      ? 'bg-[#EC6A9A] text-white border-[#EC6A9A]'
                      : 'bg-[#FFF5F8] text-[#43313A] border-[#F8BBD0]/70 hover:border-[#EC6A9A]'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isAnswered && (
                    <span className="text-[9px] leading-none opacity-90">
                      {sel.selected_label}
                    </span>
                  )}
                  {isFlagged && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[10px]"
                      title="Đã đánh dấu xem lại"
                    >
                      🎀
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] hover:from-[#D84B7F] hover:to-[#C23B6E] text-white font-display font-bold text-sm shadow-kitty-sm transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Nộp bài & Xem điểm 🎀</span>
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border-2 border-[#F8BBD0] max-w-md w-full p-6 shadow-kitty-lg space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  unansweredCount > 0
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-pink-100 text-[#EC6A9A]'
                }`}
              >
                {unansweredCount > 0 ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#43313A]">
                  Xác nhận nộp bài kiểm tra 🎀
                </h3>
                <p className="text-xs text-[#7E6570]">
                  Thời gian làm bài: {formatTimerClock(elapsedSeconds)}
                </p>
              </div>
            </div>

            {unansweredCount > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 space-y-1">
                <p className="font-bold">
                  ⚠️ Bạn vẫn còn {unansweredCount} câu hỏi chưa trả lời!
                </p>
                <p className="text-xs text-amber-800">
                  Các câu bỏ trống sẽ được tính là chưa đúng khi chấm điểm. Bạn có chắc chắn muốn nộp bài ngay không?
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] text-xs sm:text-sm text-[#43313A]">
                🌸 Tuyệt vời! Bạn đã hoàn thành trả lời tất cả{' '}
                <strong>{totalQuestions}/{totalQuestions} câu hỏi</strong>. Nhấn xác nhận để chấm điểm nhé!
              </div>
            )}

            {flaggedIds.length > 0 && (
              <p className="text-xs text-[#7E6570]">
                🎀 Lưu ý: Bạn đang có <strong>{flaggedIds.length} câu</strong> được đánh dấu xem lại.
              </p>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#F8BBD0] text-xs sm:text-sm font-bold text-[#43313A] hover:bg-[#FFF5F8]"
              >
                Quay lại làm tiếp
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white text-xs sm:text-sm font-bold shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? 'Đang chấm điểm...' : 'Xác nhận nộp bài 🎀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
