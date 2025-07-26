import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
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
      console.log('[AuthContext] 인증 초기화 시작');
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // localStorage 안전성 확인
        if (typeof Storage === 'undefined') {
          console.warn('[AuthContext] localStorage를 사용할 수 없습니다.');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');
        
        console.log('[AuthContext] 저장된 토큰 확인:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasStoredUser: !!storedUser,
          accessTokenLength: accessToken?.length,
          refreshTokenLength: refreshToken?.length
        });

        if (accessToken && refreshToken && storedUser) {
          try {
            // 저장된 사용자 정보로 먼저 설정 (JSON 파싱 오류 방지)
            let user;
            try {
              user = JSON.parse(storedUser);
            } catch (parseError) {
              console.warn('저장된 사용자 정보 파싱 실패:', parseError);
              throw new Error('사용자 정보 파싱 오류');
            }
            dispatch({ type: 'SET_USER', payload: user });
            console.log('[AuthContext] 저장된 사용자 정보로 초기 설정 완료:', user.username);
            
            // 백그라운드에서 토큰 검증
            console.log('[AuthContext] 토큰 검증 시작');
            const response = await authApi.getCurrentUser();
            if (response.success && response.data) {
              const { user: updatedUser } = response.data;
              // 최신 사용자 정보로 업데이트
              localStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch({ type: 'SET_USER', payload: updatedUser });
              console.log('[AuthContext] 토큰 검증 및 사용자 정보 업데이트 완료');
            } else {
              console.warn('[AuthContext] 토큰 검증 실패:', response);
              throw new Error('토큰 검증 실패');
            }
          } catch (verifyError: any) {
            console.error('토큰 검증 오류:', verifyError);
            
            // 토큰 만료 에러인 경우 갱신 시도
            if (verifyError.response?.status === 401 && verifyError.response?.data?.code === 'TOKEN_EXPIRED') {
              console.log('[AuthContext] 토큰 만료됨, 갱신 시도 중...');
              try {
                const response = await authApi.refreshToken(refreshToken);
                if (response.success && response.data) {
                  const { accessToken: newAccessToken } = response.data;
                  localStorage.setItem('accessToken', newAccessToken);
                  console.log('[AuthContext] 새 Access Token 저장 완료');
                  
                  // 새 토큰으로 사용자 정보 다시 가져오기
                  const userResponse = await authApi.getCurrentUser();
                  if (userResponse.success && userResponse.data) {
                    const { user: updatedUser } = userResponse.data;
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    dispatch({ type: 'SET_USER', payload: updatedUser });
                    console.log('[AuthContext] 토큰 갱신 및 로그인 상태 복원 완료');
                    return; // 성공적으로 갱신됨
                  }
                } else {
                  console.warn('[AuthContext] 토큰 갱신 응답 실패:', response);
                }
              } catch (refreshError) {
                console.error('[AuthContext] 토큰 갱신 실패:', refreshError);
              }
            }
            
            // 토큰 갱신 실패 시 로그아웃 (안전하게 처리)
            console.log('[AuthContext] 토큰 갱신 실패, 로그아웃 처리');
            try {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
            } catch (storageError) {
              console.warn('[AuthContext] localStorage 정리 중 오류:', storageError);
            }
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          console.log('[AuthContext] 저장된 토큰 또는 사용자 정보 없음, 로그아웃 상태 유지');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('[AuthContext] 인증 초기화 오류:', error);
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        console.log('[AuthContext] 인증 초기화 완료');
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

        console.log('[AuthContext] 로그인 성공, 토큰 저장 중:', {
          username: user.username,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length,
          refreshTokenLength: refreshToken?.length
        });

        // 토큰과 사용자 정보를 localStorage에 저장 (안전하게 처리)
        try {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          // 저장 확인
          const savedAccessToken = localStorage.getItem('accessToken');
          const savedRefreshToken = localStorage.getItem('refreshToken');
          const savedUser = localStorage.getItem('user');
          
          console.log('[AuthContext] localStorage 저장 확인:', {
            accessTokenSaved: !!savedAccessToken,
            refreshTokenSaved: !!savedRefreshToken,
            userSaved: !!savedUser,
            userDataLength: savedUser?.length
          });
        } catch (storageError) {
          console.warn('[AuthContext] localStorage 저장 중 오류:', storageError);
          // 저장에 실패해도 메모리상 로그인 상태는 유지
        }

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
    console.log('[AuthContext] 로그아웃 시작');
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('[AuthContext] 로그아웃 요청 실패:', error);
      // 로그아웃 요청이 실패해도 로컬 상태는 정리
    } finally {
      // 로컬 스토리지 정리 (안전하게 처리)
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // PWA 캐시도 정리
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => {
                if (cacheName.includes('api-cache')) {
                  console.log('[AuthContext] PWA API 캐시 정리:', cacheName);
                  return caches.delete(cacheName);
                }
              })
            );
          } catch (cacheError) {
            console.warn('[AuthContext] PWA 캐시 정리 실패:', cacheError);
          }
        }
        
        console.log('[AuthContext] localStorage 및 캐시 정리 완료');
      } catch (storageError) {
        console.warn('[AuthContext] localStorage 정리 중 오류:', storageError);
      }

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