import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';

// 테마 타입 정의
type Theme = 'light' | 'dark';

// 테마 상태 타입 정의
interface ThemeState {
  theme: Theme;
  isSystemPreference: boolean;
}

// 액션 타입 정의
type ThemeAction =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_SYSTEM_PREFERENCE'; payload: boolean };

// 초기 상태
const initialState: ThemeState = {
  theme: 'light',
  isSystemPreference: true,
};

// 리듀서 함수
const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
        isSystemPreference: false,
      };
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
        isSystemPreference: false,
      };
    case 'SET_SYSTEM_PREFERENCE':
      return {
        ...state,
        isSystemPreference: action.payload,
      };
    default:
      return state;
  }
};

// 컨텍스트 타입 정의
interface ThemeContextType extends ThemeState {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resetToSystemPreference: () => void;
}

// 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 로컬 스토리지 키
const THEME_STORAGE_KEY = 'app-theme';
const THEME_PREFERENCE_KEY = 'app-theme-preference';

// Provider 컴포넌트
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // 시스템 다크모드 감지
  const getSystemTheme = (): Theme => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  // 테마 적용 함수
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      
      // CSS 변수 업데이트 (다크모드용)
      root.style.setProperty('--gray-50', '#0f172a');
      root.style.setProperty('--gray-200', '#334155');
      root.style.setProperty('--gray-500', '#94a3b8');
      root.style.setProperty('--gray-800', '#f1f5f9');
      root.style.setProperty('--white', '#1e293b');
      
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--text-muted', '#94a3b8');
      
      // 다크모드에서도 주요 색상은 유지하되 약간 조정
      root.style.setProperty('--primary-navy', '#2563eb');
      root.style.setProperty('--primary-blue', '#60a5fa');
      root.style.setProperty('--primary-light', '#1e3a8a');
    } else {
      root.classList.remove('dark');
      
      // 라이트모드 기본값으로 복원
      root.style.setProperty('--gray-50', '#f8fafc');
      root.style.setProperty('--gray-200', '#e2e8f0');
      root.style.setProperty('--gray-500', '#64748b');
      root.style.setProperty('--gray-800', '#1e293b');
      root.style.setProperty('--white', '#ffffff');
      
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#64748b');
      root.style.setProperty('--text-muted', '#94a3b8');
      
      root.style.setProperty('--primary-navy', '#1e40af');
      root.style.setProperty('--primary-blue', '#3b82f6');
      root.style.setProperty('--primary-light', '#dbeafe');
    }
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const savedPreference = localStorage.getItem(THEME_PREFERENCE_KEY);
    
    if (savedTheme && savedPreference === 'manual') {
      // 사용자가 수동으로 설정한 테마가 있는 경우
      dispatch({ type: 'SET_THEME', payload: savedTheme });
      applyTheme(savedTheme);
    } else {
      // 시스템 설정을 따르는 경우
      const systemTheme = getSystemTheme();
      dispatch({ type: 'SET_THEME', payload: systemTheme });
      dispatch({ type: 'SET_SYSTEM_PREFERENCE', payload: true });
      applyTheme(systemTheme);
    }

    // 시스템 테마 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const isSystemPref = localStorage.getItem(THEME_PREFERENCE_KEY) !== 'manual';
      if (isSystemPref) {
        const newTheme = e.matches ? 'dark' : 'light';
        dispatch({ type: 'SET_THEME', payload: newTheme });
        dispatch({ type: 'SET_SYSTEM_PREFERENCE', payload: true });
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // 테마 변경 시 적용
  useEffect(() => {
    applyTheme(state.theme);
    
    // 로컬 스토리지에 저장
    if (!state.isSystemPreference) {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      localStorage.setItem(THEME_PREFERENCE_KEY, 'manual');
    }
  }, [state.theme, state.isSystemPreference]);

  // 테마 설정 함수
  const setTheme = (theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  // 테마 토글 함수
  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // 시스템 설정으로 돌아가기
  const resetToSystemPreference = () => {
    const systemTheme = getSystemTheme();
    dispatch({ type: 'SET_THEME', payload: systemTheme });
    dispatch({ type: 'SET_SYSTEM_PREFERENCE', payload: true });
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_PREFERENCE_KEY);
  };

  const contextValue: ThemeContextType = {
    ...state,
    setTheme,
    toggleTheme,
    resetToSystemPreference,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 커스텀 훅
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme는 ThemeProvider 내에서 사용되어야 합니다.');
  }
  return context;
};