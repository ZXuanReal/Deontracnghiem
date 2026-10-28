import React, { useState, useEffect, useCallback } from 'react';
import { Chapter, ExamAttempt } from './types/quiz';
import { fetchChapters, fetchExamAttempt } from './services/api';
import {
  loadPersistedExamState,
  clearPersistedExamState,
} from './utils/formatters';
import { HeaderNavbar, KittyBowSvg, MainNavTab } from './components/KittyDecorations';
import { HomeView } from './components/HomeView';
import { ExamSetupView } from './components/ExamSetupView';
import { ActiveExamView } from './components/ActiveExamView';
import { ExamResultView } from './components/ExamResultView';
import { HistoryView } from './components/HistoryView';

type ExamStage = 'setup' | 'taking' | 'result';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [examStage, setExamStage] = useState<ExamStage>('setup');
  const [presetExamMode, setPresetExamMode] = useState<'chapter' | 'comprehensive'>('chapter');
  const [presetChapterId, setPresetChapterId] = useState<number | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [inProgressAttempt, setInProgressAttempt] = useState<ExamAttempt | null>(null);

  const loadChaptersData = useCallback(async () => {
    try {
      setLoadingChapters(true);
      setChapterError(null);
      const data = await fetchChapters();
      setChapters(data);
    } catch (err: any) {
      setChapterError(
        err.message || 'Không thể kết nối đến máy chủ để tải danh sách chương.'
      );
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  useEffect(() => {
    loadChaptersData();
  }, [loadChaptersData]);

  // Restore in-progress exam from localStorage if available
  useEffect(() => {
    const persisted = loadPersistedExamState();
    if (persisted?.attemptId) {
      fetchExamAttempt(persisted.attemptId)
        .then((attempt) => {
          if (attempt.status === 'in_progress') {
            setInProgressAttempt(attempt);
          } else {
            clearPersistedExamState();
          }
        })
        .catch(() => {
          clearPersistedExamState();
        });
    }
  }, []);

  const handleGoHome = () => {
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToExamSetup = (
    mode: 'chapter' | 'comprehensive' = 'chapter',
    chapterId?: number
  ) => {
    setPresetExamMode(mode);
    if (chapterId !== undefined) {
      setPresetChapterId(chapterId);
    }
    setActiveTab('exam');
    setExamStage('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExamStarted = (attempt: ExamAttempt) => {
    setCurrentAttempt(attempt);
    setInProgressAttempt(attempt);
    setActiveTab('exam');
    setExamStage('taking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExamSubmitted = (completedAttempt: ExamAttempt) => {
    setCurrentAttempt(completedAttempt);
    setInProgressAttempt(null);
    setActiveTab('exam');
    setExamStage('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewExam = () => {
    setActiveTab('exam');
    setExamStage('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeInProgress = () => {
    if (inProgressAttempt) {
      setCurrentAttempt(inProgressAttempt);
      setActiveTab('exam');
      setExamStage('taking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDiscardInProgress = () => {
    clearPersistedExamState();
    setInProgressAttempt(null);
    setCurrentAttempt(null);
    setActiveTab('exam');
    setExamStage('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Khi người dùng nhấn vào thanh điều hướng phía trên (Trang chủ | Đề kiểm tra | Lịch sử làm bài)
  const handleSelectTab = (tab: MainNavTab) => {
    setActiveTab(tab);
    if (tab === 'exam') {
      // Đưa về màn hình thiết lập / chọn đề kiểm tra (bài đang làm dở vẫn được lưu tạm an toàn)
      setExamStage('setup');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF5F8] text-[#43313A]">
      <HeaderNavbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        hasInProgressExam={
          Boolean(inProgressAttempt) &&
          !(activeTab === 'exam' && examStage === 'taking')
        }
        onResumeExam={handleResumeInProgress}
      />

      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            chapters={chapters}
            loadingChapters={loadingChapters}
            hasInProgressExam={Boolean(inProgressAttempt)}
            onResumeExam={handleResumeInProgress}
            onDiscardInProgressExam={handleDiscardInProgress}
            onNavigateToExam={handleNavigateToExamSetup}
            onNavigateToHistory={() => handleSelectTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            onGoToExamSetup={() => handleNavigateToExamSetup('chapter')}
            onGoHome={handleGoHome}
          />
        )}

        {activeTab === 'exam' && (
          <>
            {examStage === 'setup' && (
              <ExamSetupView
                chapters={chapters}
                loadingChapters={loadingChapters}
                chapterError={chapterError}
                onRetryChapters={loadChaptersData}
                onExamStarted={handleExamStarted}
                hasInProgressExam={Boolean(inProgressAttempt)}
                onResumeExam={handleResumeInProgress}
                initialMode={presetExamMode}
                initialChapterId={presetChapterId}
                onGoHome={handleGoHome}
              />
            )}

            {examStage === 'taking' && currentAttempt && (
              <ActiveExamView
                attempt={currentAttempt}
                onExamSubmitted={handleExamSubmitted}
                onExitToHome={handleGoHome}
                onExitToSetup={() => setExamStage('setup')}
              />
            )}

            {examStage === 'result' && currentAttempt && (
              <ExamResultView
                attempt={currentAttempt}
                isFromHistory={false}
                onStartNewExam={handleStartNewExam}
                onGoHome={handleGoHome}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-[#F5D0DF] bg-white/80 py-5 px-4 text-center text-xs text-[#7E6570]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-[#43313A]">
            <KittyBowSvg className="w-5 h-5" />
            <span>Hello Kitty Quiz 🎀 – Ôn thi trắc nghiệm hiệu quả mỗi ngày</span>
          </div>
          <p>
            Thiết kế tối ưu khả năng đọc câu hỏi • Lưu lịch sử & đáp án chi tiết 🌸
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
