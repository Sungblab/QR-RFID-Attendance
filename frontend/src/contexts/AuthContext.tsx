import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../services/api';

// 인증 상태 타입 정의
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 액션 타입 정의
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_USER'; payload: User };

// 초기 상태
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // 초기 로딩 상태를 true로 설정
  error: null,
};

// 리듀서 함수
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};

// 컨텍스트 타입 정의
interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string, name: string, role: 'admin' | 'teacher' | 'student') => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 컴포넌트 마운트 시 토큰 확인
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');

        if (accessToken && refreshToken && storedUser) {
          try {
            // 저장된 사용자 정보로 먼저 설정
            const user = JSON.parse(storedUser);
            dispatch({ type: 'SET_USER', payload: user });
            
            // 백그라운드에서 토큰 검증
            const response = await authApi.getCurrentUser();
            if (response.success && response.data) {
              const { user: updatedUser } = response.data;
              // 최신 사용자 정보로 업데이트
              localStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch({ type: 'SET_USER', payload: updatedUser });
            } else {
              throw new Error('토큰 검증 실패');
            }
          } catch (verifyError) {
            console.error('토큰 검증 오류:', verifyError);
            // 토큰이 유효하지 않으면 제거
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        console.error('인증 초기화 오류:', error);
        // 토큰이 유효하지 않으면 제거
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // 로그인 함수
  const login = async (username: string, password: string): Promise<User> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await authApi.login({ username, password });

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // 토큰과 사용자 정보를 localStorage에 저장
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        return user;
      } else {
        throw new Error(response.message || '로그인에 실패했습니다.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '로그인에 실패했습니다.';
      dispatch({ type: 'LOGIN_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // 회원가입 함수
  const register = async (
    username: string,
    password: string,
    name: string,
    role: 'admin' | 'teacher' | 'student'
  ): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authApi.register({ username, password, name, role });

      if (response.success) {
        // 회원가입 성공 후 자동 로그인
        await login(username, password);
      } else {
        throw new Error(response.message || '회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '회원가입에 실패했습니다.';
      dispatch({ type: 'LOGIN_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 로그아웃 함수
  const logout = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
      // 로그아웃 요청이 실패해도 로컬 상태는 정리
    } finally {
      // 로컬 스토리지 정리
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      dispatch({ type: 'LOGOUT' });
    }
  };

  // 에러 클리어 함수
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 커스텀 훅
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다.');
  }
  return context;
};