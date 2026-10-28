import React from 'react';
import { Home, BookOpen, History, Sparkles, PlayCircle } from 'lucide-react';

export const KittyBowSvg: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 64 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Left loop */}
    <path
      d="M28 24C20 10 6 8 4 20C2 32 16 38 28 26Z"
      fill="#EC6A9A"
      stroke="#43313A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M23 23C18 16 11 16 10 21C9 26 16 29 23 24Z"
      fill="#F8BBD0"
    />
    {/* Right loop */}
    <path
      d="M36 24C44 10 58 8 60 20C62 32 48 38 36 26Z"
      fill="#EC6A9A"
      stroke="#43313A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M41 23C46 16 53 16 54 21C55 26 48 29 41 24Z"
      fill="#F8BBD0"
    />
    {/* Bottom ribbons */}
    <path
      d="M29 28L20 43L27 40L31 31"
      fill="#EC6A9A"
      stroke="#43313A"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M35 28L44 43L37 40L33 31"
      fill="#EC6A9A"
      stroke="#43313A"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Center knot */}
    <ellipse
      cx="32"
      cy="25"
      rx="6.5"
      ry="7.5"
      fill="#EC6A9A"
      stroke="#43313A"
      strokeWidth="2.5"
    />
    <ellipse cx="30.5" cy="23" rx="2" ry="2.5" fill="#FFD6E7" />
  </svg>
);

export const KittyMascotSvg: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg
    viewBox="0 0 80 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Cat Face & Ears */}
    <path
      d="M16 28L12 10L29 18C33 17 36.5 16.5 40 16.5C43.5 16.5 47 17 51 18L68 10L64 28C68 33 70 39 70 45C70 57 57 65 40 65C23 65 10 57 10 45C10 39 12 33 16 28Z"
      fill="#FFFFFF"
      stroke="#43313A"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Blush */}
    <ellipse cx="21" cy="48" rx="4.5" ry="2.5" fill="#F8BBD0" />
    <ellipse cx="59" cy="48" rx="4.5" ry="2.5" fill="#F8BBD0" />
    {/* Eyes */}
    <ellipse cx="27" cy="43" rx="2.6" ry="3.6" fill="#43313A" />
    <ellipse cx="53" cy="43" rx="2.6" ry="3.6" fill="#43313A" />
    {/* Yellow oval nose */}
    <ellipse
      cx="40"
      cy="47"
      rx="3.8"
      ry="2.6"
      fill="#FFD54F"
      stroke="#43313A"
      strokeWidth="2"
    />
    {/* Whiskers Left */}
    <path d="M14 40L5 38" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M13 46L4 46" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M15 52L6 54" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    {/* Whiskers Right */}
    <path d="M66 40L75 38" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M67 46L76 46" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M65 52L74 54" stroke="#43313A" strokeWidth="2.4" strokeLinecap="round" />
    {/* Signature Pink Bow on Right Ear */}
    <g transform="translate(42, 4) rotate(12)">
      <path
        d="M13 12C8 4 1 3 0 9C-1 15 6 19 13 13Z"
        fill="#EC6A9A"
        stroke="#43313A"
        strokeWidth="2.2"
      />
      <path
        d="M19 12C24 4 31 3 32 9C33 15 26 19 19 13Z"
        fill="#EC6A9A"
        stroke="#43313A"
        strokeWidth="2.2"
      />
      <circle
        cx="16"
        cy="12.5"
        r="4"
        fill="#F48FB1"
        stroke="#43313A"
        strokeWidth="2.2"
      />
    </g>
  </svg>
);

export type MainNavTab = 'home' | 'exam' | 'history';

interface NavbarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  hasInProgressExam: boolean;
  onResumeExam?: () => void;
}

export const HeaderNavbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  hasInProgressExam,
  onResumeExam,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#F5D0DF] shadow-kitty-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo -> Always goes back to Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          title="Về Trang chủ Hello Kitty Quiz"
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFF5F8] to-[#F8BBD0]/60 border border-[#F8BBD0] shadow-sm group-hover:scale-105 transition-transform">
            <KittyMascotSvg className="w-10 h-10 animate-float-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-xl sm:text-2xl tracking-tight text-[#43313A]">
                Hello Kitty <span className="text-[#EC6A9A]">Quiz</span>
              </span>
              <span className="text-lg" aria-hidden="true">
                🎀
              </span>
            </div>
            <p className="text-xs text-[#7E6570] hidden sm:flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#EC6A9A]" />
              <span>Hệ thống luyện thi trắc nghiệm trực tuyến</span>
            </p>
          </div>
        </button>

        {/* Main 3-Area Navigation: Trang chủ | Đề kiểm tra | Lịch sử làm bài */}
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Điều hướng chính">
          {hasInProgressExam && onResumeExam && (
            <button
              type="button"
              onClick={onResumeExam}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Tiếp tục bài đang làm</span>
            </button>
          )}

          <div className="flex items-center bg-[#FFF5F8] p-1.5 rounded-2xl border border-[#F8BBD0]/70">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-[#EC6A9A] text-white shadow-sm'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('exam')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'exam'
                  ? 'bg-[#EC6A9A] text-white shadow-sm'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Đề kiểm tra</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#EC6A9A] text-white shadow-sm'
                  : 'text-[#43313A] hover:bg-[#F8BBD0]/30'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch sử làm bài</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
