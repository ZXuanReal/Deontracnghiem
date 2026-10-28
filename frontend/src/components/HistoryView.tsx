import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Eye,
  BookOpen,
  Layers,
  ArrowUpDown,
  Play,
  RefreshCw,
  Home,
} from 'lucide-react';
import { ExamAttempt, HistorySummaryItem } from '../types/quiz';
import { fetchExamHistory, fetchHistoryDetail } from '../services/api';
import { formatDateTime, formatDuration } from '../utils/formatters';
import { ExamResultView } from './ExamResultView';
import { KittyMascotSvg } from './KittyDecorations';

interface HistoryViewProps {
  onGoToExamSetup: () => void;
  onGoHome?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onGoToExamSetup,
  onGoHome,
}) => {
  const [historyList, setHistoryList] = useState<HistorySummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [modeFilter, setModeFilter] = useState<'all' | 'chapter' | 'comprehensive'>('all');

  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<ExamAttempt | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchExamHistory({
        sort: sortOrder,
        mode: modeFilter,
      });
      setHistoryList(list);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách lịch sử làm bài.');
    } finally {
      setLoading(false);
    }
  }, [sortOrder, modeFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleViewDetail = async (attemptId: string) => {
    try {
      setLoadingDetailId(attemptId);
      setError(null);
      const detail = await fetchHistoryDetail(attemptId);
      setSelectedAttemptDetail(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết lần làm bài này.');
    } finally {
      setLoadingDetailId(null);
    }
  };

  // If viewing detail of a specific attempt
  if (selectedAttemptDetail) {
    return (
      <ExamResultView
        attempt={selectedAttemptDetail}
        isFromHistory={true}
        onStartNewExam={onGoToExamSetup}
        onBackToHistory={() => setSelectedAttemptDetail(null)}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl border-2 border-[#F8BBD0] p-5 sm:p-6 shadow-kitty flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0F6] border border-[#F8BBD0] text-[#EC6A9A] flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF5F8] hover:bg-[#F8BBD0]/40 border border-[#F8BBD0] text-xs font-bold text-[#EC6A9A] transition-all"
                >
                  <Home className="w-3 h-3" />
                  <span>Về Trang chủ</span>
                </button>
              )}
              <h1 className="font-display font-bold text-xl sm:text-2xl text-[#43313A] flex items-center gap-2">
                <span>Lịch sử làm bài</span>
                <span className="text-base" aria-hidden="true">
                  🎀
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#7E6570]">
              Theo dõi tiến bộ qua từng lượt luyện tập và xem lại chi tiết câu đúng, câu sai
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Filter */}
          <div className="flex items-center bg-[#FFF5F8] p-1 rounded-xl border border-[#F5D0DF] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modeFilter === 'all'
                  ? 'bg-[#EC6A9A] text-white'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('chapter')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modeFilter === 'chapter'
                  ? 'bg-[#EC6A9A] text-white'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              Theo chương
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('comprehensive')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modeFilter === 'comprehensive'
                  ? 'bg-[#EC6A9A] text-white'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              Đề tổng hợp
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF5F8] border border-[#F8BBD0] text-xs font-bold text-[#43313A] hover:bg-[#F8BBD0]/30 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#EC6A9A]" />
            <span>{sortOrder === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-3xl bg-white/70 border border-[#F5D0DF] animate-pulse p-6"
            />
          ))}
        </div>
      ) : historyList.length === 0 ? (
        /* Empty History State (Section 8.1) */
        <div className="bg-white rounded-3xl border-2 border-[#F8BBD0] p-10 text-center space-y-4 shadow-kitty">
          <div className="w-20 h-20 rounded-3xl bg-[#FFF0F6] border border-[#F8BBD0] flex items-center justify-center mx-auto">
            <KittyMascotSvg className="w-16 h-16" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display font-bold text-lg sm:text-xl text-[#43313A]">
              Bạn chưa có lần làm bài nào trong lịch sử 🌸
            </h2>
            <p className="text-xs sm:text-sm text-[#7E6570]">
              Hãy bắt đầu luyện tập một chương bài học hoặc tạo đề kiểm tra tổng hợp để hệ thống lưu lại kết quả và thống kê tiến độ cho bạn nhé!
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToExamSetup}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] hover:from-[#D84B7F] hover:to-[#C23B6E] text-white font-display font-bold text-sm shadow-kitty-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Bắt đầu làm bài 🎀</span>
            </button>
          </div>
        </div>
      ) : (
        /* History Cards List */
        <div className="space-y-4">
          {historyList.map((item) => {
            const isLookingUp = loadingDetailId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border-2 border-[#F5D0DF] hover:border-[#F8BBD0] p-5 sm:p-6 shadow-kitty-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left Info: Mode, Title, Completed Time */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                      {item.exam_mode === 'chapter' ? (
                        <>
                          <BookOpen className="w-3 h-3" />
                          <span>Luyện tập theo chương</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3 h-3" />
                          <span>Đề kiểm tra tổng hợp</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs text-[#7E6570]">
                      <Calendar className="w-3.5 h-3.5 text-[#EC6A9A]" />
                      <span>{formatDateTime(item.completed_at)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs text-[#7E6570]">
                      <Clock className="w-3.5 h-3.5 text-[#EC6A9A]" />
                      <span>{formatDuration(item.duration_seconds)}</span>
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-base sm:text-lg text-[#43313A]">
                    {item.title}
                  </h3>

                  {/* Counts Pills: Total, Correct, Incorrect, Unanswered */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-xl bg-[#FFF5F8] border border-[#F5D0DF] text-xs font-semibold text-[#43313A]">
                      Tổng: <strong>{item.total_questions} câu</strong>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đúng: {item.correct_count}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sai: {item.incorrect_count}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                      <MinusCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Bỏ trống: {item.unanswered_count}</span>
                    </span>
                  </div>
                </div>

                {/* Right Info: Score + Accuracy + View Detail CTA */}
                <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#FFF0F6]">
                  <div className="text-left lg:text-right">
                    <div className="flex items-baseline lg:justify-end gap-1.5">
                      <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#EC6A9A]">
                        {Number(item.score).toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-[#7E6570]">/ 10 điểm</span>
                    </div>
                    <p className="text-xs font-semibold text-[#43313A]">
                      Chính xác: {Number(item.accuracy_percent).toFixed(2)}%
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isLookingUp}
                    onClick={() => handleViewDetail(item.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FFF0F6] hover:bg-[#EC6A9A] text-[#43313A] hover:text-white border border-[#F8BBD0] hover:border-[#EC6A9A] font-bold text-xs sm:text-sm transition-all shrink-0 disabled:opacity-60"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{isLookingUp ? 'Đang tải...' : 'Xem chi tiết'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
