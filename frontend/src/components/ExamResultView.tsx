import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  RotateCcw,
  Eye,
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Home,
} from 'lucide-react';
import { ExamAttempt } from '../types/quiz';
import {
  formatDateTime,
  formatDuration,
  formatScientificText,
  QUESTION_LEVEL_CONFIG,
} from '../utils/formatters';
import { KittyMascotSvg } from './KittyDecorations';

interface ExamResultViewProps {
  attempt: ExamAttempt;
  isFromHistory?: boolean;
  onStartNewExam: () => void;
  onBackToHistory?: () => void;
  onGoHome?: () => void;
}

type ReviewFilter = 'all' | 'correct' | 'incorrect' | 'unanswered';

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  attempt,
  isFromHistory = false,
  onStartNewExam,
  onBackToHistory,
  onGoHome,
}) => {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [showReview, setShowReview] = useState<boolean>(true);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  const score = Number(attempt.score ?? 0);
  const accuracy = Number(attempt.accuracy_percent ?? 0);
  const total = attempt.total_questions || attempt.questions.length;
  const correctCount = attempt.correct_count ?? 0;
  const incorrectCount = attempt.incorrect_count ?? 0;
  const unansweredCount = attempt.unanswered_count ?? 0;

  // Trigger celebratory confetti when viewing fresh exam result
  useEffect(() => {
    if (!isFromHistory && accuracy >= 50) {
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#EC6A9A', '#F8BBD0', '#FFD54F', '#81C784'],
        });
      } catch {
        // ignore if canvas-confetti fails in headless environments
      }
    }
  }, [isFromHistory, accuracy]);

  const getCelebrationFeedback = () => {
    if (accuracy >= 85) {
      return {
        emojis: '🎉 🎀 🐱 👑 🌸 ✨',
        title: 'Xuất sắc quá đi! Hello Kitty tự hào về bạn lắm!',
        subtitle: 'Kiến thức của bạn cực kỳ vững vàng luôn đó nha!',
      };
    }
    if (accuracy >= 65) {
      return {
        emojis: '🎀 🐱 🌸 🍓 ✨',
        title: 'Làm tốt lắm! Bạn đã nắm khá vững bài học rồi!',
        subtitle: 'Xem lại một vài câu sai bên dưới để đạt điểm tuyệt đối lần sau nhé!',
      };
    }
    return {
      emojis: '🐱 🎀 🌸 💪 🍀',
      title: 'Hoàn thành lượt luyện tập! Cố gắng thêm chút nữa nhé!',
      subtitle: 'Đừng nản lòng nha, hãy đọc kỹ phần giải thích chi tiết bên dưới để nhớ bài lâu hơn!',
    };
  };

  const feedback = getCelebrationFeedback();

  const filteredQuestions = attempt.questions.filter((q) => {
    const isUnanswered = !q.selected_label;
    if (filter === 'correct') return !isUnanswered && q.is_correct === true;
    if (filter === 'incorrect') return !isUnanswered && q.is_correct === false;
    if (filter === 'unanswered') return isUnanswered;
    return true;
  });

  const handleScrollToReview = () => {
    setShowReview(true);
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Navigation when viewing from History */}
      {isFromHistory && onBackToHistory && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#F8BBD0] text-xs sm:text-sm font-bold text-[#43313A] hover:bg-[#FFF5F8] shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-[#EC6A9A]" />
            <span>Quay lại danh sách lịch sử</span>
          </button>

          <button
            type="button"
            onClick={onStartNewExam}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#EC6A9A] text-white text-xs sm:text-sm font-bold hover:bg-[#D84B7F] shadow-sm transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm đề mới</span>
          </button>
        </div>
      )}

      {/* Result Summary Hero Card */}
      <section className="bg-white rounded-3xl border-2 border-[#F8BBD0] p-6 sm:p-8 shadow-kitty space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#FFF0F6] pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FFF0F6] to-[#F8BBD0]/60 border-2 border-[#F8BBD0] flex items-center justify-center shrink-0 shadow-sm">
              <KittyMascotSvg className="w-16 h-16" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xl sm:text-2xl tracking-widest">
                {feedback.emojis}
              </div>
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                {attempt.exam_mode === 'chapter'
                  ? 'Kết quả luyện tập theo chương'
                  : 'Kết quả đề kiểm tra tổng hợp'}
              </span>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-[#43313A]">
                {attempt.title}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#EC6A9A]">
                {feedback.title}
              </p>
              <p className="text-xs text-[#7E6570]">{feedback.subtitle}</p>
            </div>
          </div>

          {/* Prominent Score Circle / Box */}
          <div className="shrink-0 bg-gradient-to-br from-[#FFF5F8] to-[#FCE4EC] border-2 border-[#EC6A9A] rounded-3xl px-7 py-5 text-center shadow-sm min-w-[180px]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7E6570]">
              Điểm số (Thang 10)
            </p>
            <div className="font-display font-extrabold text-4xl sm:text-5xl text-[#EC6A9A] my-1">
              {score.toFixed(2)}
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-xs font-bold text-[#43313A] border border-[#F8BBD0]">
              <span>Chính xác: {accuracy.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid (Section 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF] text-center">
            <p className="text-xs text-[#7E6570] font-medium">Tổng số câu</p>
            <p className="font-display font-bold text-xl text-[#43313A] mt-1">
              {total} câu
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center">
            <p className="text-xs text-emerald-800 font-medium flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Số câu đúng</span>
            </p>
            <p className="font-display font-bold text-xl text-emerald-700 mt-1">
              {correctCount} câu
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-center">
            <p className="text-xs text-rose-800 font-medium flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Số câu sai</span>
            </p>
            <p className="font-display font-bold text-xl text-rose-700 mt-1">
              {incorrectCount} câu
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-center">
            <p className="text-xs text-amber-800 font-medium flex items-center justify-center gap-1">
              <MinusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Chưa trả lời</span>
            </p>
            <p className="font-display font-bold text-xl text-amber-700 mt-1">
              {unansweredCount} câu
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF] text-center">
            <p className="text-xs text-[#7E6570] font-medium flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#EC6A9A]" />
              <span>Thời gian làm</span>
            </p>
            <p className="font-display font-bold text-sm sm:text-base text-[#43313A] mt-1.5">
              {formatDuration(attempt.duration_seconds)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF] text-center">
            <p className="text-xs text-[#7E6570] font-medium">Hoàn thành lúc</p>
            <p className="font-display font-bold text-xs sm:text-sm text-[#43313A] mt-1.5">
              {formatDateTime(attempt.completed_at || attempt.started_at)}
            </p>
          </div>
        </div>

        {/* Two Main Action Buttons (Section 7) + Về Trang chủ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-[#F8BBD0] bg-white hover:bg-[#FFF5F8] text-[#43313A] font-display font-bold text-sm transition-all"
            >
              <Home className="w-4 h-4 text-[#EC6A9A]" />
              <span>Về Trang chủ</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleScrollToReview}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-[#EC6A9A] bg-[#FFF0F6] hover:bg-[#F8BBD0]/50 text-[#43313A] font-display font-bold text-sm transition-all"
          >
            <Eye className="w-4 h-4 text-[#EC6A9A]" />
            <span>Xem lại đáp án chi tiết ({total} câu)</span>
          </button>

          <button
            type="button"
            onClick={onStartNewExam}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] hover:from-[#D84B7F] hover:to-[#C23B6E] text-white font-display font-bold text-sm shadow-kitty-sm transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm đề mới 🎀</span>
          </button>
        </div>
      </section>

      {/* Detailed Answer Review Section (Section 8.2) */}
      {showReview && (
        <section ref={reviewSectionRef} className="space-y-5">
          {/* Header & Filter Bar */}
          <div className="bg-white rounded-3xl border-2 border-[#F5D0DF] p-4 sm:p-5 shadow-kitty-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-lg text-[#43313A] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#EC6A9A]" />
                <span>Chi tiết đáp án & Giải thích từng câu</span>
              </h2>
              <p className="text-xs text-[#7E6570] mt-0.5">
                Dữ liệu câu hỏi và phương án được lưu nguyên bản tại thời điểm làm bài
              </p>
            </div>

            {/* 4 Filter Tabs: Tất cả, Chỉ câu đúng, Chỉ câu sai, Chỉ câu chưa trả lời */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filter === 'all'
                    ? 'bg-[#EC6A9A] text-white border-[#EC6A9A]'
                    : 'bg-[#FFF5F8] text-[#43313A] border-[#F5D0DF] hover:border-[#F8BBD0]'
                }`}
              >
                Tất cả câu hỏi ({total})
              </button>

              <button
                type="button"
                onClick={() => setFilter('correct')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filter === 'correct'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                ✓ Chỉ câu đúng ({correctCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter('incorrect')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filter === 'incorrect'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                ✗ Chỉ câu sai ({incorrectCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter('unanswered')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filter === 'unanswered'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                ○ Chưa trả lời ({unansweredCount})
              </button>
            </div>
          </div>

          {/* Filtered Questions List */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#F5D0DF] p-8 text-center text-sm text-[#7E6570]">
              Không có câu hỏi nào thuộc bộ lọc này 🌸
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q) => {
                const isUnanswered = !q.selected_label;
                const isCorrect = !isUnanswered && q.is_correct === true;
                const lvlCfg = QUESTION_LEVEL_CONFIG[q.question_type] || {
                  label: q.question_type,
                  badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
                  iconEmoji: '🌸',
                };

                return (
                  <div
                    key={q.attempt_answer_id}
                    className={`bg-white rounded-3xl border-2 p-5 sm:p-6 shadow-kitty-sm space-y-4 ${
                      isCorrect
                        ? 'border-emerald-200'
                        : isUnanswered
                        ? 'border-amber-200'
                        : 'border-rose-200'
                    }`}
                  >
                    {/* Top Meta & Status Pill (Accessible with Icon + Text, not just color) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FFF0F6] pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-[#FFF0F6] text-[#EC6A9A] font-display font-bold text-xs border border-[#F8BBD0]">
                          Câu {q.sort_order}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${lvlCfg.badgeClass}`}
                        >
                          <span>{lvlCfg.iconEmoji}</span>
                          <span>{lvlCfg.label}</span>
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-xl bg-[#FFF5F8] text-[#7E6570] border border-[#F5D0DF]">
                          {q.chapter_name}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đúng (Bạn chọn {q.selected_label})</span>
                        </span>
                      ) : isUnanswered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          <MinusCircle className="w-4 h-4 text-amber-600" />
                          <span>Chưa trả lời • Đáp án đúng: {q.correct_label}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>
                            Sai (Bạn chọn {q.selected_label} • Đáp án đúng: {q.correct_label})
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Question Content */}
                    <p className="text-sm sm:text-base font-bold text-[#43313A] leading-relaxed">
                      {formatScientificText(q.content)}
                    </p>

                    {/* 4 Options with Explicit Correct / Wrong / Selected Highlights */}
                    <div className="space-y-2.5">
                      {q.options.map((opt) => {
                        const isOptCorrect =
                          opt.label === q.correct_label || opt.is_correct === true;
                        const isOptSelected = opt.label === q.selected_label;

                        let cardClasses = 'bg-[#FFF5F8]/50 border-[#F5D0DF] text-[#43313A]';
                        let badgeLetterClasses = 'bg-white text-[#43313A] border border-[#F8BBD0]';

                        if (isOptCorrect) {
                          cardClasses = 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium';
                          badgeLetterClasses = 'bg-emerald-600 text-white';
                        } else if (isOptSelected && !isOptCorrect) {
                          cardClasses = 'bg-rose-50/90 border-rose-400 text-rose-950 font-medium';
                          badgeLetterClasses = 'bg-rose-600 text-white';
                        }

                        return (
                          <div
                            key={opt.id || opt.label}
                            className={`p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${cardClasses}`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`w-7 h-7 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${badgeLetterClasses}`}
                              >
                                {opt.label}
                              </span>
                              <span className="text-xs sm:text-sm leading-relaxed">
                                {formatScientificText(opt.content)}
                              </span>
                            </div>

                            {/* Explicit Accessible Label Badge */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {isOptCorrect && isOptSelected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Bạn đã chọn • Đáp án đúng</span>
                                </span>
                              )}
                              {isOptCorrect && !isOptSelected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đáp án đúng</span>
                                </span>
                              )}
                              {!isOptCorrect && isOptSelected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Đáp án bạn chọn (Sai)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {(q.explanation || q.source_ref) && (
                      <div className="p-4 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] space-y-1.5">
                        {q.explanation && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-[#43313A]">
                            <HelpCircle className="w-4 h-4 text-[#EC6A9A] shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-[#EC6A9A]">Giải thích đáp án: </strong>
                              <span>{formatScientificText(q.explanation)}</span>
                            </div>
                          </div>
                        )}
                        {q.source_ref && (
                          <p className="text-[11px] text-[#7E6570] pl-6 italic">
                            📚 Nguồn tài liệu: {q.source_ref}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
