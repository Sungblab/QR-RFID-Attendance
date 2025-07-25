import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      aria-label={`테마 변경: 현재 ${theme === 'light' ? '라이트' : '다크'} 모드`}
    >
      {/* 단일 아이콘 - 현재 모드에 따라 표시 */}
      {theme === 'light' ? (
        <svg
          className="w-4 h-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}

      {/* 텍스트 */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {theme === 'light' ? '다크' : '라이트'} 모드
      </span>
    </button>
  );
};

// 간단한 버전 (아이콘 없이 텍스트만)
export const ThemeToggleSimple: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {theme === 'light' ? '다크' : '라이트'} 모드
    </button>
  );
};

// 스위치 스타일 토글
export const ThemeToggleSwitch: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
      }`}
      aria-label={`테마 변경: 현재 ${theme === 'light' ? '라이트' : '다크'} 모드`}
    >
      <span className="sr-only">테마 변경</span>
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};