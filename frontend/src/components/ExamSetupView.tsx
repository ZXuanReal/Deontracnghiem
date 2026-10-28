import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Layers,
  Shuffle,
  Filter,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Info,
  Check,
  RefreshCw,
  Home,
} from 'lucide-react';
import {
  Chapter,
  CustomQuota,
  ExamAttempt,
  GenerateExamResponse,
} from '../types/quiz';
import { QUESTION_LEVEL_CONFIG } from '../utils/formatters';
import { generateExam, GenerateExamPayload } from '../services/api';
import { KittyBowSvg } from './KittyDecorations';

interface ExamSetupViewProps {
  chapters: Chapter[];
  loadingChapters: boolean;
  chapterError: string | null;
  onRetryChapters: () => void;
  onExamStarted: (attempt: ExamAttempt) => void;
  hasInProgressExam: boolean;
  onResumeExam: () => void;
  initialMode?: 'chapter' | 'comprehensive';
  initialChapterId?: number | null;
  onGoHome?: () => void;
}

const QUESTION_COUNT_PRESETS: Array<{ value: number | 'all'; label: string }> = [
  { value: 10, label: '10 câu' },
  { value: 20, label: '20 câu' },
  { value: 30, label: '30 câu' },
  { value: 40, label: '40 câu (Mặc định)' },
  { value: 'all', label: 'Tất cả câu phù hợp' },
];

export const ExamSetupView: React.FC<ExamSetupViewProps> = ({
  chapters,
  loadingChapters,
  chapterError,
  onRetryChapters,
  onExamStarted,
  hasInProgressExam,
  onResumeExam,
  initialMode = 'chapter',
  initialChapterId = null,
  onGoHome,
}) => {
  // Mode: 'chapter' (Luyện tập theo chương) | 'comprehensive' (Làm đề tổng hợp)
  const [examMode, setExamMode] = useState<'chapter' | 'comprehensive'>(initialMode);

  // Selected chapter for Chapter Mode
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    initialChapterId ?? chapters[0]?.id ?? null
  );

  React.useEffect(() => {
    setExamMode(initialMode);
  }, [initialMode]);

  React.useEffect(() => {
    if (initialChapterId != null) {
      setSelectedChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  // Selected chapters for Comprehensive Mode (empty = all active chapters)
  const [selectedCompChapterIds, setSelectedCompChapterIds] = useState<number[]>([]);

  // Level filter settings
  // Mặc định tắt chế độ lọc để đề mặc định đủ 40 câu của chương, người dùng có thể bật công tắc lọc Nhận biết / Thông hiểu bất kỳ lúc nào
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'recognition',
    'understanding',
  ]);

  // Question count (Mặc định 40 câu theo yêu cầu 4.4)
  const [questionCount, setQuestionCount] = useState<number | 'all'>(40);
  const [customCountInput, setCustomCountInput] = useState<string>('40');
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);

  // Shuffle questions (Mặc định bật theo yêu cầu 4.4 & 5.1)
  const [shuffle, setShuffle] = useState<boolean>(true);

  // Comprehensive custom quota (5.2: Ví dụ 15 Nhận biết, 10 Thông hiểu, 10 Vận dụng, 5 Vận dụng cao)
  const [useCustomQuota, setUseCustomQuota] = useState<boolean>(false);
  const [customQuota, setCustomQuota] = useState<CustomQuota>({
    recognition: 15,
    understanding: 10,
    application: 10,
    advanced_application: 5,
  });

  // Loading & Error & Shortage Modal state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shortageModal, setShortageModal] = useState<{
    response: GenerateExamResponse;
    pendingPayload: GenerateExamPayload;
  } | null>(null);

  // Sync selectedChapterId when chapters load
  React.useEffect(() => {
    if (chapters.length > 0 && selectedChapterId === null) {
      setSelectedChapterId(chapters[0].id);
    }
    if (chapters.length > 0 && selectedCompChapterIds.length === 0) {
      setSelectedCompChapterIds(chapters.map((c) => c.id));
    }
  }, [chapters, selectedChapterId, selectedCompChapterIds.length]);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId) || chapters[0] || null,
    [chapters, selectedChapterId]
  );

  // Calculate available questions based on current selection
  const availabilityStats = useMemo(() => {
    const sourceChapters =
      examMode === 'chapter'
        ? activeChapter
          ? [activeChapter]
          : []
        : chapters.filter(
            (c) =>
              selectedCompChapterIds.length === 0 ||
              selectedCompChapterIds.includes(c.id)
          );

    const byType: Record<string, number> = {
      recognition: 0,
      understanding: 0,
      application: 0,
      advanced_application: 0,
    };

    let totalAll = 0;
    for (const ch of sourceChapters) {
      totalAll += ch.total_questions;
      byType.recognition += ch.counts_by_type.recognition || 0;
      byType.understanding += ch.counts_by_type.understanding || 0;
      byType.application += ch.counts_by_type.application || 0;
      byType.advanced_application += ch.counts_by_type.advanced_application || 0;
    }

    let matchingCount = totalAll;
    if (filterEnabled) {
      matchingCount = selectedTypes.reduce((acc, t) => acc + (byType[t] || 0), 0);
    }

    return {
      totalAll,
      byType,
      matchingCount,
      sourceChapterCount: sourceChapters.length,
    };
  }, [examMode, activeChapter, chapters, selectedCompChapterIds, filterEnabled, selectedTypes]);

  const toggleLevelType = (typeKey: string) => {
    setErrorMsg(null);
    setSelectedTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((t) => t !== typeKey) : [...prev, typeKey]
    );
  };

  const toggleCompChapter = (chId: number) => {
    setErrorMsg(null);
    setSelectedCompChapterIds((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const handleStartExam = async (overrideChapterId?: number, allowPartial = false) => {
    setErrorMsg(null);

    const targetChapterId = overrideChapterId ?? selectedChapterId ?? chapters[0]?.id;
    if (examMode === 'chapter' && !targetChapterId) {
      setErrorMsg('Vui lòng chọn một chương bài học để bắt đầu.');
      return;
    }

    if (
      examMode === 'comprehensive' &&
      selectedCompChapterIds.length === 0
    ) {
      setErrorMsg('Vui lòng chọn ít nhất một chương nguồn cho đề tổng hợp.');
      return;
    }

    if (filterEnabled && selectedTypes.length === 0) {
      setErrorMsg(
        'Bạn đang BẬT chế độ lọc mức độ nhưng chưa chọn mức độ nào. Hãy chọn ít nhất 1 mức độ (ví dụ: Nhận biết hoặc Thông hiểu) hoặc TẮT chế độ lọc mức độ.'
      );
      return;
    }

    let resolvedCount: number | 'all' = questionCount;
    if (isCustomCount) {
      const parsed = parseInt(customCountInput, 10);
      if (isNaN(parsed) || parsed < 1) {
        setErrorMsg('Số lượng câu hỏi tùy chỉnh phải lớn hơn 0.');
        return;
      }
      resolvedCount = parsed;
    }

    const payload: GenerateExamPayload = {
      exam_mode: examMode,
      chapter_id: examMode === 'chapter' ? Number(targetChapterId) : undefined,
      chapter_ids:
        examMode === 'comprehensive' ? selectedCompChapterIds : undefined,
      filter_enabled: filterEnabled,
      selected_types: filterEnabled ? selectedTypes : [],
      question_count: resolvedCount,
      shuffle,
      use_custom_quota: examMode === 'comprehensive' ? useCustomQuota : false,
      custom_quota:
        examMode === 'comprehensive' && useCustomQuota ? customQuota : null,
      allow_partial: allowPartial,
    };

    try {
      setSubmitting(true);
      const res = await generateExam(payload);

      if (res.status === 'shortage') {
        setShortageModal({ response: res, pendingPayload: payload });
        return;
      }

      if (res.status === 'created' && res.attempt) {
        setShortageModal(null);
        onExamStarted(res.attempt);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể khởi tạo đề thi.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCustomQuota =
    (customQuota.recognition || 0) +
    (customQuota.understanding || 0) +
    (customQuota.application || 0) +
    (customQuota.advanced_application || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFF0F6] via-[#FCE4EC] to-[#F8BBD0]/60 border border-[#F8BBD0] p-6 sm:p-8 shadow-kitty">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-[#FFF5F8] border border-[#EC6A9A] text-xs font-bold text-[#EC6A9A] shadow-sm transition-all"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Về Trang chủ</span>
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-[#F8BBD0] text-xs font-semibold text-[#EC6A9A]">
                <span>🎀 Khu vực Đề kiểm tra</span>
                <span>•</span>
                <span>Ngân hàng câu hỏi chuẩn hóa</span>
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#43313A] leading-tight">
              Thiết lập đề kiểm tra theo ý muốn của bạn! 🌸
            </h1>
            <p className="text-sm sm:text-base text-[#7E6570] leading-relaxed">
              Chọn <strong className="text-[#43313A]">Luyện tập theo chương</strong> để nắm chắc từng chuyên đề hoặc thử sức với{' '}
              <strong className="text-[#43313A]">Đề kiểm tra tổng hợp 40 câu</strong> từ toàn bộ ngân hàng câu hỏi.
            </p>
          </div>

          {hasInProgressExam && (
            <div className="bg-white/95 backdrop-blur rounded-2xl p-4 border-2 border-[#EC6A9A] shadow-sm flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-[#EC6A9A]">
                <Sparkles className="w-4 h-4" />
                <span>BẠN ĐANG CÓ LƯỢT THI CHƯA NỘP</span>
              </div>
              <p className="text-xs text-[#7E6570]">
                Các câu trả lời của bạn đã được tự động lưu an toàn.
              </p>
              <button
                type="button"
                onClick={onResumeExam}
                className="w-full py-2 px-4 rounded-xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tiếp tục làm bài ngay</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Two Prominent Mode Cards: A. Luyện tập theo chương & B. Làm đề tổng hợp */}
      <section aria-label="Chọn chế độ kiểm tra">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card A: Chapter Practice */}
          <button
            type="button"
            onClick={() => {
              setExamMode('chapter');
              setErrorMsg(null);
            }}
            className={`group relative text-left p-5 sm:p-6 rounded-3xl border-2 transition-all ${
              examMode === 'chapter'
                ? 'bg-white border-[#EC6A9A] shadow-kitty ring-4 ring-[#F8BBD0]/40'
                : 'bg-white/80 border-[#F5D0DF] hover:border-[#F8BBD0] hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    examMode === 'chapter'
                      ? 'bg-[#EC6A9A] text-white'
                      : 'bg-[#FFF5F8] text-[#EC6A9A] border border-[#F8BBD0]'
                  }`}
                >
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#EC6A9A]">
                      Chế độ A
                    </span>
                    {examMode === 'chapter' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                        <Check className="w-3 h-3" /> Đang chọn
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#43313A] mt-0.5">
                    Luyện tập theo chương 📖
                  </h2>
                </div>
              </div>
              <KittyBowSvg className="w-7 h-7 shrink-0 opacity-90 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#7E6570] leading-relaxed">
              Ôn tập chuyên sâu từng chương bài học, tùy ý bật/tắt bộ lọc câu hỏi{' '}
              <strong className="text-[#43313A]">Nhận biết</strong> &{' '}
              <strong className="text-[#43313A]">Thông hiểu</strong> hoặc luyện toàn bộ 40 câu của chương.
            </p>
          </button>

          {/* Card B: Comprehensive Exam */}
          <button
            type="button"
            onClick={() => {
              setExamMode('comprehensive');
              setErrorMsg(null);
            }}
            className={`group relative text-left p-5 sm:p-6 rounded-3xl border-2 transition-all ${
              examMode === 'comprehensive'
                ? 'bg-white border-[#EC6A9A] shadow-kitty ring-4 ring-[#F8BBD0]/40'
                : 'bg-white/80 border-[#F5D0DF] hover:border-[#F8BBD0] hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    examMode === 'comprehensive'
                      ? 'bg-[#EC6A9A] text-white'
                      : 'bg-[#FFF5F8] text-[#EC6A9A] border border-[#F8BBD0]'
                  }`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#EC6A9A]">
                      Chế độ B
                    </span>
                    {examMode === 'comprehensive' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                        <Check className="w-3 h-3" /> Đang chọn
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#43313A] mt-0.5">
                    Làm đề tổng hợp ✨
                  </h2>
                </div>
              </div>
              <KittyBowSvg className="w-7 h-7 shrink-0 opacity-90 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#7E6570] leading-relaxed">
              Tạo đề thi ngẫu nhiên cân bằng từ nhiều chương bài học, hỗ trợ cấu hình cơ cấu phân bổ mức độ (15 Nhận biết, 10 Thông hiểu, 10 Vận dụng, 5 Vận dụng cao).
            </p>
          </button>
        </div>
      </section>

      {/* Error or Empty Bank State */}
      {chapterError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Lỗi kết nối dữ liệu</h3>
              <p className="text-xs mt-0.5">{chapterError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryChapters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Main Content Grid: Left = Chapters / Source Selection, Right = Filter & Exam Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column (7 cols): Chapter Cards or Comprehensive Source Chapters */}
        <div className="lg:col-span-7 space-y-4">
          {examMode === 'chapter' ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#43313A] flex items-center gap-2">
                    <span>Danh sách chương bài học</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F8BBD0]/50 text-[#43313A]">
                      {chapters.length} chương
                    </span>
                  </h3>
                  <p className="text-xs text-[#7E6570] mt-0.5">
                    Chọn một chương bên dưới và nhấn &ldquo;Bắt đầu luyện tập&rdquo;
                  </p>
                </div>
              </div>

              {loadingChapters ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-36 rounded-3xl bg-white/70 border border-[#F5D0DF] animate-pulse p-6"
                    />
                  ))}
                </div>
              ) : chapters.length === 0 ? (
                <div className="rounded-3xl bg-white border border-[#F5D0DF] p-8 text-center space-y-3">
                  <p className="text-base font-bold text-[#43313A]">
                    Ngân hàng câu hỏi hiện chưa có dữ liệu chương bài học
                  </p>
                  <p className="text-xs text-[#7E6570] max-w-md mx-auto">
                    Vui lòng chạy lệnh <code className="px-1.5 py-0.5 bg-pink-50 rounded">npm run seed</code> trong thư mục backend để nạp câu hỏi từ file <code className="px-1.5 py-0.5 bg-pink-50 rounded">nganhangcauhoi.txt</code>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chapters.map((chapter) => {
                    const isSelected = activeChapter?.id === chapter.id;
                    return (
                      <div
                        key={chapter.id}
                        onClick={() => {
                          setSelectedChapterId(chapter.id);
                          setErrorMsg(null);
                        }}
                        className={`cursor-pointer rounded-3xl p-5 sm:p-6 border-2 transition-all ${
                          isSelected
                            ? 'bg-white border-[#EC6A9A] shadow-kitty'
                            : 'bg-white/90 border-[#F5D0DF] hover:border-[#F8BBD0] hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF0F6] text-[#EC6A9A] border border-[#F8BBD0]">
                                {chapter.total_questions} câu hỏi
                              </span>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#EC6A9A]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Đang chọn
                                </span>
                              )}
                            </div>
                            <h4 className="font-display text-base sm:text-lg font-bold text-[#43313A]">
                              {chapter.name}
                            </h4>
                            {chapter.description && (
                              <p className="text-xs text-[#7E6570] line-clamp-2">
                                {chapter.description}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={submitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChapterId(chapter.id);
                              handleStartExam(chapter.id, false);
                            }}
                            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-60"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Bắt đầu luyện tập</span>
                          </button>
                        </div>

                        {/* Level breakdown badges */}
                        <div className="mt-4 pt-3 border-t border-[#FFF0F6] flex flex-wrap items-center gap-2">
                          {(
                            [
                              'recognition',
                              'understanding',
                              'application',
                              'advanced_application',
                            ] as const
                          ).map((lvl) => {
                            const count = chapter.counts_by_type[lvl] || 0;
                            const cfg = QUESTION_LEVEL_CONFIG[lvl];
                            return (
                              <span
                                key={lvl}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-[#FFF5F8] text-[#7E6570] border border-[#F5D0DF]"
                              >
                                <span>{cfg.iconEmoji}</span>
                                <span>{cfg.label}:</span>
                                <strong className="text-[#43313A]">{count}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Comprehensive Mode: Select Source Chapters & Quota Overview */
            <div className="bg-white rounded-3xl border-2 border-[#F5D0DF] p-5 sm:p-6 shadow-kitty-sm space-y-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#43313A] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#EC6A9A]" />
                    <span>Nguồn câu hỏi đề tổng hợp</span>
                  </h3>
                  <p className="text-xs text-[#7E6570] mt-0.5">
                    Mặc định lấy ngẫu nhiên cân bằng từ tất cả các chương đang hoạt động
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCompChapterIds(chapters.map((c) => c.id))}
                    className="text-xs font-semibold text-[#EC6A9A] hover:underline px-2 py-1"
                  >
                    Chọn tất cả
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {chapters.map((ch) => {
                  const checked = selectedCompChapterIds.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        checked
                          ? 'bg-[#FFF5F8] border-[#EC6A9A]'
                          : 'bg-white border-[#F5D0DF] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCompChapter(ch.id)}
                          className="w-4 h-4 accent-[#EC6A9A] rounded"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#43313A]">{ch.name}</p>
                          <p className="text-[11px] text-[#7E6570]">
                            Nhận biết: {ch.counts_by_type.recognition} • Thông hiểu:{' '}
                            {ch.counts_by_type.understanding} • Vận dụng:{' '}
                            {ch.counts_by_type.application} • Vận dụng cao:{' '}
                            {ch.counts_by_type.advanced_application}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-[#F8BBD0] text-[#EC6A9A]">
                        {ch.total_questions} câu
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Optional Custom Quota Configuration (Section 5.2) */}
              <div className="pt-4 border-t border-[#F5D0DF] space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#43313A] flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-[#EC6A9A]" />
                      <span>Thiết lập cơ cấu mức độ câu hỏi</span>
                    </p>
                    <p className="text-xs text-[#7E6570]">
                      Ví dụ chuẩn: 15 Nhận biết • 10 Thông hiểu • 10 Vận dụng • 5 Vận dụng cao (40 câu)
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useCustomQuota}
                    onClick={() => setUseCustomQuota((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      useCustomQuota ? 'bg-[#EC6A9A]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        useCustomQuota ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {useCustomQuota && (
                  <div className="p-4 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          'recognition',
                          'understanding',
                          'application',
                          'advanced_application',
                        ] as const
                      ).map((lvl) => {
                        const cfg = QUESTION_LEVEL_CONFIG[lvl];
                        const maxAvail = availabilityStats.byType[lvl] || 0;
                        return (
                          <div
                            key={lvl}
                            className="bg-white p-3 rounded-xl border border-[#F5D0DF] space-y-1"
                          >
                            <label className="block text-xs font-bold text-[#43313A]">
                              {cfg.iconEmoji} {cfg.label}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={200}
                              value={customQuota[lvl]}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value || '0', 10));
                                setCustomQuota((prev) => ({ ...prev, [lvl]: val }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#F8BBD0] text-sm font-bold text-[#43313A] focus:outline-none focus:border-[#EC6A9A]"
                            />
                            <p className="text-[11px] text-[#7E6570]">
                              Kho có: <strong>{maxAvail}</strong> câu
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#43313A] pt-1">
                      <span>
                        Tổng số câu theo cơ cấu:{' '}
                        <strong className="text-[#EC6A9A] text-sm">{totalCustomQuota} câu</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomQuota({
                            recognition: 15,
                            understanding: 10,
                            application: 10,
                            advanced_application: 5,
                          })
                        }
                        className="text-[#EC6A9A] font-semibold hover:underline"
                      >
                        Đặt lại mẫu 40 câu (15-10-10-5)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Exam Configuration Panel (Level Filter, Count, Shuffle, Start Button) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border-2 border-[#F8BBD0] p-5 sm:p-6 shadow-kitty space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-[#FFF0F6] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFF0F6] text-[#EC6A9A] flex items-center justify-center">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-[#43313A]">
                  Cấu hình đề luyện tập
                </h3>
                <p className="text-xs text-[#7E6570]">
                  {examMode === 'chapter'
                    ? activeChapter?.name || 'Chọn chương để luyện tập'
                    : `Đề tổng hợp (${availabilityStats.sourceChapterCount} chương)`}
                </p>
              </div>
            </div>
            <span className="text-xl" aria-hidden="true">
              🎀
            </span>
          </div>

          {/* 1. Level Filter Toggle & Selection (Section 4.2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-[#43313A] flex items-center gap-1.5">
                  <span>Chế độ lọc mức độ câu hỏi</span>
                </label>
                <p className="text-xs text-[#7E6570]">
                  {filterEnabled
                    ? 'Đang BẬT: Chỉ lấy câu hỏi thuộc mức độ được tích chọn'
                    : 'Đang TẮT: Lấy tất cả câu hỏi hợp lệ ở mọi mức độ'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={filterEnabled}
                aria-label="Bật hoặc tắt chế độ lọc mức độ câu hỏi"
                onClick={() => {
                  setFilterEnabled((prev) => !prev);
                  setErrorMsg(null);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  filterEnabled ? 'bg-[#EC6A9A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    filterEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {filterEnabled ? (
              <div className="p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#43313A]">
                    Chọn mức độ muốn luyện:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTypes(['recognition', 'understanding'])}
                      className="text-[#EC6A9A] font-semibold hover:underline"
                    >
                      Nhận biết & Thông hiểu
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTypes([
                          'recognition',
                          'understanding',
                          'application',
                          'advanced_application',
                        ])
                      }
                      className="text-[#7E6570] hover:text-[#43313A] hover:underline"
                    >
                      Tất cả
                    </button>
                  </div>
                </div>

                {/* Primary 2 Levels (Nhận biết & Thông hiểu) prominently displayed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['recognition', 'understanding'] as const).map((lvl) => {
                    const checked = selectedTypes.includes(lvl);
                    const cfg = QUESTION_LEVEL_CONFIG[lvl];
                    const count = availabilityStats.byType[lvl] || 0;
                    return (
                      <label
                        key={lvl}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? 'bg-white border-[#EC6A9A] shadow-sm'
                            : 'bg-white/60 border-[#F5D0DF] opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLevelType(lvl)}
                          className="mt-0.5 w-4 h-4 accent-[#EC6A9A] rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[#43313A]">
                              {cfg.iconEmoji} {cfg.label}
                            </span>
                            <span className="text-[11px] font-bold text-[#EC6A9A]">
                              {count} câu
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7E6570] leading-tight mt-0.5">
                            {cfg.shortDesc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Additional levels in bank (Vận dụng & Vận dụng cao) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {(['application', 'advanced_application'] as const).map((lvl) => {
                    const checked = selectedTypes.includes(lvl);
                    const cfg = QUESTION_LEVEL_CONFIG[lvl];
                    const count = availabilityStats.byType[lvl] || 0;
                    return (
                      <label
                        key={lvl}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? 'bg-white border-[#EC6A9A] shadow-sm'
                            : 'bg-white/60 border-[#F5D0DF] opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLevelType(lvl)}
                          className="mt-0.5 w-4 h-4 accent-[#EC6A9A] rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-[#43313A]">
                              {cfg.iconEmoji} {cfg.label}
                            </span>
                            <span className="text-[11px] font-bold text-[#EC6A9A]">
                              {count} câu
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedTypes.length === 0 && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Bạn đã bỏ chọn tất cả mức độ. Hãy chọn ít nhất 1 mức độ hoặc tắt công tắc lọc ở trên.
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF] flex items-center gap-2.5 text-xs text-[#7E6570]">
                <Info className="w-4 h-4 text-[#EC6A9A] shrink-0" />
                <span>
                  Bộ lọc mức độ đang <strong className="text-[#43313A]">TẮT</strong>: Hệ thống lấy tất cả{' '}
                  <strong className="text-[#EC6A9A]">{availabilityStats.totalAll} câu hỏi</strong> hợp lệ của nguồn đang chọn.
                </span>
              </div>
            )}
          </div>

          {/* 2. Question Count Selection (Section 4.3 & 4.4: Mặc định 40 câu) */}
          {!(examMode === 'comprehensive' && useCustomQuota) && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#43313A]">
                  Số lượng câu hỏi muốn làm
                </label>
                <span className="text-xs text-[#7E6570]">
                  Phù hợp hiện có:{' '}
                  <strong className="text-[#EC6A9A]">
                    {availabilityStats.matchingCount} câu
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUESTION_COUNT_PRESETS.map((preset) => {
                  const active = !isCustomCount && questionCount === preset.value;
                  return (
                    <button
                      key={String(preset.value)}
                      type="button"
                      onClick={() => {
                        setIsCustomCount(false);
                        setQuestionCount(preset.value);
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-[#EC6A9A] text-white border-[#EC6A9A] shadow-sm'
                          : 'bg-[#FFF5F8] text-[#43313A] border-[#F5D0DF] hover:border-[#F8BBD0]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                {examMode === 'comprehensive' && (
                  <button
                    type="button"
                    onClick={() => setIsCustomCount(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      isCustomCount
                        ? 'bg-[#EC6A9A] text-white border-[#EC6A9A] shadow-sm'
                        : 'bg-[#FFF5F8] text-[#43313A] border-[#F5D0DF] hover:border-[#F8BBD0]'
                    }`}
                  >
                    Tùy chỉnh...
                  </button>
                )}
              </div>

              {isCustomCount && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customCountInput}
                    onChange={(e) => setCustomCountInput(e.target.value)}
                    placeholder="Nhập số câu..."
                    className="w-32 px-3 py-1.5 rounded-xl border border-[#F8BBD0] text-sm font-bold text-[#43313A] focus:outline-none focus:border-[#EC6A9A]"
                  />
                  <span className="text-xs text-[#7E6570]">câu hỏi</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Shuffle Toggle (Section 4.4) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F5D0DF]">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-[#EC6A9A]" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#43313A]">
                  Xáo trộn thứ tự câu hỏi
                </p>
                <p className="text-[11px] text-[#7E6570]">
                  {shuffle
                    ? 'Đang bật: Mỗi lượt làm bài có thứ tự câu hỏi ngẫu nhiên mới'
                    : 'Đang tắt: Hiển thị theo thứ tự gốc trong ngân hàng'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={shuffle}
              aria-label="Xáo trộn thứ tự câu hỏi"
              onClick={() => setShuffle((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                shuffle ? 'bg-[#EC6A9A]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  shuffle ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Validation / Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Start Exam CTA */}
          <button
            type="button"
            disabled={submitting || chapters.length === 0}
            onClick={() => handleStartExam(undefined, false)}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#EC6A9A] to-[#D84B7F] hover:from-[#D84B7F] hover:to-[#C23B6E] text-white font-display font-bold text-base shadow-kitty transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {submitting
                ? 'Đang khởi tạo đề thi...'
                : examMode === 'chapter'
                ? 'Bắt đầu làm bài theo chương 🎀'
                : 'Tạo đề kiểm tra tổng hợp 🎀'}
            </span>
          </button>
        </div>
      </div>

      {/* Shortage Confirmation Modal (Sections 4.3, 5.2, 5.3) */}
      {shortageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border-2 border-[#F8BBD0] max-w-md w-full p-6 shadow-kitty-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#43313A]">
                  Thông báo số lượng câu hỏi hiện có
                </h3>
                <p className="text-xs text-[#7E6570]">
                  Không tự tạo câu giả hoặc lấy câu ngoài phạm vi
                </p>
              </div>
            </div>

            <p className="text-sm text-[#43313A] leading-relaxed">
              {shortageModal.response.message}
            </p>

            {shortageModal.response.shortages &&
              shortageModal.response.shortages.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#FFF5F8] border border-[#F8BBD0] space-y-2">
                  <p className="text-xs font-bold text-[#43313A]">
                    Chi tiết mức độ bị thiếu so với yêu cầu:
                  </p>
                  <ul className="space-y-1 text-xs text-[#7E6570]">
                    {shortageModal.response.shortages.map((s) => (
                      <li key={s.type} className="flex items-center justify-between">
                        <span>• Mức độ {s.label}:</span>
                        <span>
                          Yêu cầu <strong>{s.requested}</strong> / Hiện có{' '}
                          <strong className="text-[#EC6A9A]">{s.available} câu</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="p-3 rounded-2xl bg-pink-50/80 border border-pink-200 text-xs text-[#43313A]">
              Số câu thực tế hợp lệ có thể làm ngay:{' '}
              <strong className="text-[#EC6A9A] text-sm">
                {shortageModal.response.available_total} câu hỏi
              </strong>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShortageModal(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#F8BBD0] text-xs font-bold text-[#43313A] hover:bg-[#FFF5F8]"
              >
                Điều chỉnh lại cấu hình
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleStartExam(
                    shortageModal.pendingPayload.chapter_id,
                    true
                  )
                }
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#EC6A9A] hover:bg-[#D84B7F] text-white text-xs font-bold shadow-sm"
              >
                Tiếp tục với {shortageModal.response.available_total} câu hiện có
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
