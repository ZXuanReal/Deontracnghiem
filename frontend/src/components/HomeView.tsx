import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Layers,
  History,
  Sparkles,
  Play,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Award,
  Heart,
} from 'lucide-react';
import { Chapter, HistorySummaryItem } from '../types/quiz';
import { fetchExamHistory } from '../services/api';
import { QUESTION_LEVEL_CONFIG, formatDateTime } from '../utils/formatters';
import { KittyBowSvg, KittyMascotSvg } from './KittyDecorations';

interface HomeViewProps {
  chapters: Chapter[];
  loadingChapters: boolean;
  hasInProgressExam: boolean;
  onResumeExam: () => void;
  onDiscardInProgressExam: () => void;
  onNavigateToExam: (mode?: 'chapter' | 'comprehensive', chapterId?: number) => void;
  onNavigateToHistory: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  chapters,
  loadingChapters,
  hasInProgressExam,
  onResumeExam,
  onDiscardInProgressExam,
  onNavigateToExam,
  onNavigateToHistory,
}) => {
  const [recentHistory, setRecentHistory] = useState<HistorySummaryItem[]>([]);

  useEffect(() => {
    fetchExamHistory({ sort: 'desc' })
      .then((list) => setRecentHistory(list))
      .catch(() => {});
  }, []);

  const totalQuestionsInBank = chapters.reduce(
    (sum, ch) => sum + ch.total_questions,
    0
  );

  const highestScore =
    recentHistory.length > 0
      ? Math.max(...recentHistory.map((h) => Number(h.score || 0)))
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Kawaii Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF0F6] via-[#FCE4EC] to-[#F8BBD0]/70 border-2 border-[#F8BBD0] p-6 sm:p-10 shadow-kitty">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#F8BBD0] text-xs font-bold text-[#EC6A9A] shadow-sm">
              <span>🎀 Hello Kitty Pink Quiz</span>
              <span>•</span>
              <span>Ôn Thi Trắc Nghiệm Dược Lý</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#43313A] leading-tight">
              Học tập nhẹ nhàng, đạt điểm thật cao cùng{' '}
              <span className="text-[#EC6A9A]">Hello Kitty!</span> 🌸
            </h1>

            <p className="text-sm sm:text-base text-[#7E6570] leading-relaxed">
              Hệ thống luyện thi trắc nghiệm trực tuyến với ngân hàng câu hỏi chuẩn hóa theo 4 mức độ{' '}
              <strong className="text-[#43313A]">
                Nhận biết, Thông hiểu, Vận dụng & Vận dụng cao
              </strong>
              , chấm điểm tự động và giải thích chi tiết từng câu.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateToExam('chapter')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] hover:from-[#D84B7F] hover:to-[#C23B6E] text-white font-display font-bold text-sm sm:text-base shadow-kitty transition-all"
              >
                <BookOpen className="w-5 h-5" />
                <span>Luyện tập theo chương 🎀</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToExam('comprehensive')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#FFF5F8] text-[#43313A] border-2 border-[#EC6A9A] font-display font-bold text-sm sm:text-base shadow-sm transition-all"
              >
                <Layers className="w-5 h-5 text-[#EC6A9A]" />
                <span>Thi đề tổng hợp 40 câu ✨</span>
              </button>
            </div>
          </div>

          {/* Mascot & Quick Stats Card */}
          <div className="w-full max-w-xs bg-white/95 backdrop-blur rounded-3xl border-2 border-[#F8BBD0] p-6 shadow-kitty text-center space-y-4 shrink-0">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#FFF0F6] to-[#F8BBD0]/60 border-2 border-[#F8BBD0] flex items-center justify-center shadow-sm">
              <KittyMascotSvg className="w-20 h-20 animate-float-slow" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-[#43313A]">
                Thống kê ngân hàng đề 🐱
              </p>
              <p className="text-xs text-[#7E6570]">
                Sẵn sàng cho bạn luyện tập mọi lúc
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF]">
                <p className="font-display font-extrabold text-xl text-[#EC6A9A]">
                  {chapters.length}
                </p>
                <p className="text-[11px] font-semibold text-[#7E6570]">
                  Chương bài học
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF]">
                <p className="font-display font-extrabold text-xl text-[#EC6A9A]">
                  {totalQuestionsInBank}
                </p>
                <p className="text-[11px] font-semibold text-[#7E6570]">
                  Câu trắc nghiệm
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF]">
                <p className="font-display font-extrabold text-xl text-[#43313A]">
                  {recentHistory.length}
                </p>
                <p className="text-[11px] font-semibold text-[#7E6570]">
                  Lần đã làm bài
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF]">
                <p className="font-display font-extrabold text-xl text-emerald-600">
                  {highestScore !== null ? highestScore.toFixed(1) : '—'}
                </p>
                <p className="text-[11px] font-semibold text-[#7E6570]">
                  Điểm cao nhất
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active In-Progress Exam Banner (if any) */}
      {hasInProgressExam && (
        <section className="rounded-3xl bg-white border-2 border-[#EC6A9A] p-5 sm:p-6 shadow-kitty flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F6] text-[#EC6A9A] flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-[#43313A]">
                Bạn đang có một bài kiểm tra chưa nộp! 🎀
              </h2>
              <p className="text-xs sm:text-sm text-[#7E6570]">
                Hệ thống đã lưu lại toàn bộ các câu trả lời bạn đã chọn. Bạn muốn làm tiếp hay tạo đề mới?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onDiscardInProgressExam}
              className="px-4 py-2.5 rounded-xl border border-[#F8BBD0] text-xs font-bold text-[#7E6570] hover:text-[#43313A] hover:bg-[#FFF5F8]"
            >
              Tạo đề mới
            </button>
            <button
              type="button"
              onClick={onResumeExam}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white text-xs sm:text-sm font-bold shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Tiếp tục làm bài</span>
            </button>
          </div>
        </section>
      )}

      {/* 3 Quick Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateToExam('chapter')}
          className="cursor-pointer group bg-white rounded-3xl border-2 border-[#F5D0DF] hover:border-[#EC6A9A] p-6 shadow-kitty-sm transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F6] text-[#EC6A9A] flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <KittyBowSvg className="w-6 h-6 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#43313A]">
            1. Luyện tập theo chương
          </h3>
          <p className="text-xs sm:text-sm text-[#7E6570] leading-relaxed">
            Chọn từng chương bài học cụ thể, bật/tắt chế độ lọc câu hỏi Nhận biết & Thông hiểu, hoặc ôn trọn bộ 40 câu của chương.
          </p>
          <div className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-[#EC6A9A] group-hover:translate-x-1 transition-transform">
            <span>Vào chọn chương ngay</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => onNavigateToExam('comprehensive')}
          className="cursor-pointer group bg-white rounded-3xl border-2 border-[#F5D0DF] hover:border-[#EC6A9A] p-6 shadow-kitty-sm transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F6] text-[#EC6A9A] flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <KittyBowSvg className="w-6 h-6 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#43313A]">
            2. Làm đề tổng hợp
          </h3>
          <p className="text-xs sm:text-sm text-[#7E6570] leading-relaxed">
            Bốc câu hỏi ngẫu nhiên cân bằng từ tất cả các chương hoặc cấu hình cơ cấu 15 Nhận biết, 10 Thông hiểu, 10 Vận dụng, 5 Vận dụng cao.
          </p>
          <div className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-[#EC6A9A] group-hover:translate-x-1 transition-transform">
            <span>Tạo đề tổng hợp ngay</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={onNavigateToHistory}
          className="cursor-pointer group bg-white rounded-3xl border-2 border-[#F5D0DF] hover:border-[#EC6A9A] p-6 shadow-kitty-sm transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F6] text-[#EC6A9A] flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <KittyBowSvg className="w-6 h-6 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#43313A]">
            3. Xem lại lịch sử & giải thích
          </h3>
          <p className="text-xs sm:text-sm text-[#7E6570] leading-relaxed">
            Xem lại điểm số, tỷ lệ chính xác, lọc câu đúng/sai/bỏ trống và đọc lời giải thích chi tiết của từng lần làm bài trước đó.
          </p>
          <div className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-[#EC6A9A] group-hover:translate-x-1 transition-transform">
            <span>Mở lịch sử làm bài</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Quick Chapter List on Home Page */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-[#43313A] flex items-center gap-2">
              <span>Danh sách chương trong ngân hàng câu hỏi</span>
              <span className="text-base">🌸</span>
            </h2>
            <p className="text-xs text-[#7E6570]">
              Nhấn vào một chương bất kỳ để bắt đầu thiết lập và luyện tập ngay
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToExam('chapter')}
            className="text-xs font-bold text-[#EC6A9A] hover:underline flex items-center gap-1"
          >
            <span>Tùy chỉnh bộ lọc chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingChapters ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-32 rounded-3xl bg-white/70 border border-[#F5D0DF] animate-pulse p-5"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="bg-white rounded-3xl border-2 border-[#F5D0DF] hover:border-[#F8BBD0] p-5 shadow-kitty-sm flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                      {ch.total_questions} câu hỏi
                    </span>
                    <span className="text-xs text-[#7E6570]">4 mức độ nhận thức</span>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#43313A]">
                    {ch.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(
                      [
                        'recognition',
                        'understanding',
                        'application',
                        'advanced_application',
                      ] as const
                    ).map((lvl) => (
                      <span
                        key={lvl}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-[#FFF5F8] text-[#7E6570] border border-[#F5D0DF]"
                      >
                        {QUESTION_LEVEL_CONFIG[lvl].iconEmoji}{' '}
                        {QUESTION_LEVEL_CONFIG[lvl].label}:{' '}
                        <strong className="text-[#43313A]">
                          {ch.counts_by_type[lvl] || 0}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end border-t border-[#FFF0F6] pt-3">
                  <button
                    type="button"
                    onClick={() => onNavigateToExam('chapter', ch.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Chọn chương này 🎀</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
