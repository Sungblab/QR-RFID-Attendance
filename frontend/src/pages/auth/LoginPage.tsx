import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    // 에러 클리어
    clearError();
    
    // 사용자명 입력 시 즉시 다음 단계로 이동
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    try {
      const user = await login(username, password);
      
      // 로그인 성공 시 역할에 따라 대시보드로 이동
      if (user.role === 'student') {
        navigate('/dashboard/student');
      } else {
        navigate('/dashboard/admin/main');
      }
    } catch (error) {
      // 에러는 AuthContext에서 처리됨
      console.error('로그인 실패:', error);
    }
  };

  const handleBackToUsername = () => {
    setStep('username');
    setPassword('');
    clearError();
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* 메인 로그인 섹션 - 전체 화면 */}
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* 왼쪽 섹션 - 사이트 소개 (모바일에서 숨김) */}
        <div className="hidden lg:flex flex-1 bg-primary-navy dark:bg-gray-800 items-center justify-center px-4 py-8 sm:px-8 lg:px-16">
          <div className="max-w-lg text-white text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 lg:mb-6">
              디지털 출결 시스템
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-blue-100 dark:text-gray-300 mb-6 lg:mb-8 leading-relaxed">
              QR코드 스캔과 실시간 모니터링으로 
              아침 등교 관리를 간편하게
            </p>
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-blue-300 dark:bg-blue-400 rounded-full mr-3 lg:mr-4"></div>
                <span className="text-sm sm:text-base text-blue-100 dark:text-gray-300">8시 기준 정시/지각 자동 구분</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-blue-300 dark:bg-blue-400 rounded-full mr-3 lg:mr-4"></div>
                <span className="text-sm sm:text-base text-blue-100 dark:text-gray-300">교실별 QR코드 스캔 출결</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-blue-300 dark:bg-blue-400 rounded-full mr-3 lg:mr-4"></div>
                <span className="text-sm sm:text-base text-blue-100 dark:text-gray-300">실시간 출결 현황 대시보드</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 섹션 - 로그인 폼 */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-16">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-gray-800 py-6 px-6 sm:py-8 sm:px-8 shadow-lg dark:shadow-gray-900/50 rounded-2xl">
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  디지털 출결 시스템
                </h2>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'username' ? (
                // 1단계: 아이디 입력
                <form className="space-y-4 sm:space-y-6" onSubmit={handleUsernameSubmit}>
                  <div>
                    <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      아이디
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                      placeholder="아이디를 입력하세요"
                      autoFocus
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading || !username.trim()}
                      className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary-blue hover:bg-primary-navy focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      다음
                    </button>
                  </div>

                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      계정이 없으신가요?{' '}
                      <Link to="/auth/signup" className="font-medium text-primary-blue hover:text-primary-navy dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        회원가입
                      </Link>
                    </span>
                  </div>
                </form>
              ) : (
                // 2단계: 비밀번호 입력
                <form className="space-y-4 sm:space-y-6" onSubmit={handlePasswordSubmit}>
                                    <div>
                    <div className="flex justify-center mb-2">
                      <button
                        type="button"
                        onClick={handleBackToUsername}
                        className="text-primary-blue hover:text-primary-navy dark:text-blue-400 dark:hover:text-blue-300 text-sm px-2 py-1 rounded-full hover:bg-primary-light dark:hover:bg-gray-700 transition-colors"
                      >
                        ← 아이디 변경
                      </button>
                    </div>
                    
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      비밀번호
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 sm:px-4 sm:py-3 pr-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                        placeholder="비밀번호를 입력하세요"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3 w-3 sm:h-4 sm:w-4 text-primary-blue focus:ring-primary-blue border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-primary-blue rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      로그인 상태 유지
                    </label>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading || !password.trim()}
                      className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary-blue hover:bg-primary-navy focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      로그인
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 추가 랜딩 섹션 - 스크롤시 보임 */}
      <div className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">
              왜 저희 시스템을 선택해야 할까요?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              아침 등교 시간 출결 관리를 디지털화하여 
              간편하고 정확한 등교 체크를 제공합니다.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-light dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary-blue dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3">
                간편한 QR 스캔
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                스마트폰으로 교실 QR코드를 스캔하여
                즉시 출석 체크가 완료됩니다.
              </p>
            </div>

            <div className="text-center p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-light dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary-blue dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3">
                스마트 시간 관리
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                8시를 기준으로 정시 등교와 지각을
                자동 판별하여 정확하게 기록합니다.
              </p>
            </div>

            <div className="text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-light dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary-blue dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3">
                실시간 대시보드
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                교사와 관리자가 전교생의 등교 현황을
                한눈에 파악할 수 있는 대시보드를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 기술 소개 섹션 */}
      <div className="py-12 sm:py-16 lg:py-20 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">
                QR코드 기반 아침 등교 체크
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                각 교실에 배치된 QR코드를 스캔하여 
                간편하게 아침 등교를 체크할 수 있습니다.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 dark:bg-green-400 rounded-full flex-shrink-0 mr-3 mt-0.5"></div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">교실별 QR코드</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">본인 교실의 QR코드를 스캔하여 출석 체크</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mr-3 mt-0.5"></div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">8시 기준</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">8시 이전 정시, 8시 이후 지각으로 자동 분류</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-6 sm:p-8 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-blue-100 dark:border-gray-600">
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-primary-blue dark:text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  간편한 아침 등교 관리
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  QR코드 스캔 한 번으로 끝나는<br/>
                  스마트한 출결 시스템
                </p>
                <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">즉시 사용 가능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-2">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">디지털 출결 시스템</h3>
              <p className="text-gray-300 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                교육 현장의 디지털 혁신을 선도하는 
                차세대 출결 관리 솔루션입니다.
              </p>
              <div className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                © 2025 디지털 출결 시스템. All rights reserved.
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">주요 기능</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
                <li>QR코드 스캔 출결</li>
                <li>아침 등교 관리</li>
                <li>정시/지각 자동 구분</li>
                <li>실시간 모니터링</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">약관 및 정책</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-300 dark:text-gray-400">
                <li>
                  <Link 
                    to="/legal/terms" 
                    className="hover:text-white dark:hover:text-gray-200 transition-colors"
                  >
                    서비스 이용약관
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/legal/privacy" 
                    className="hover:text-white dark:hover:text-gray-200 transition-colors"
                  >
                    개인정보 처리방침
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;