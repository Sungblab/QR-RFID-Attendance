import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SignupPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    termsOfService: false,
    privacyPolicy: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 아이디 입력 시 상태 초기화
    if (name === 'username') {
      setUsernameStatus('idle');
    }
    
    // 에러 클리어
    clearError();
  };

  const checkUsernameAvailability = async () => {
    if (!formData.username.trim()) return;
    
    setIsCheckingUsername(true);
    setUsernameStatus('checking');
    
    try {
      // 간단한 클라이언트 사이드 검증 (실제로는 API 호출이 필요)
      // 현재는 사용자명 길이와 형식만 확인
      if (formData.username.length < 3) {
        setUsernameStatus('taken');
        return;
      }
      
      // 임시로 모든 사용자명을 사용 가능으로 처리
      setUsernameStatus('available');
    } catch (error) {
      console.error('중복 확인 실패:', error);
      setUsernameStatus('idle');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleAgreementChange = (type: 'termsOfService' | 'privacyPolicy') => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (usernameStatus !== 'available') {
      alert('아이디 중복 확인을 완료해주세요.');
      return;
    }

    if (!agreements.termsOfService || !agreements.privacyPolicy) {
      alert('필수 약관에 동의해주세요.');
      return;
    }
    
    try {
      await register(formData.username, formData.password, formData.name, 'teacher');
      
      // 회원가입 성공 시 관리자 대시보드로 이동 (teacher는 admin 대시보드 사용)
      navigate('/dashboard/admin/main');
    } catch (error) {
      // 에러는 AuthContext에서 처리됨
      console.error('회원가입 실패:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 py-6 px-6 sm:py-8 sm:px-10 shadow-lg rounded-2xl">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              회원가입
            </h1>
          </div>
          
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                아이디
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`appearance-none block w-full sm:flex-1 px-3 py-2 border rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    usernameStatus === 'available' ? 'border-success dark:border-success' : 
                    usernameStatus === 'taken' ? 'border-danger dark:border-danger' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="아이디를 입력하세요"
                />
                <button
                  type="button"
                  onClick={checkUsernameAvailability}
                  disabled={!formData.username.trim() || isCheckingUsername}
                  className="px-4 py-2 text-xs sm:text-sm font-medium border border-primary-blue dark:border-primary-blue text-primary-blue dark:text-primary-blue rounded-full hover:bg-primary-light dark:hover:bg-primary-blue/10 focus:outline-none focus:ring-2 focus:ring-primary-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                >
                  {isCheckingUsername ? '확인중...' : '중복확인'}
                </button>
              </div>
              {usernameStatus === 'available' && (
                <p className="mt-1 text-xs sm:text-sm text-success dark:text-success">사용 가능한 아이디입니다.</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="mt-1 text-xs sm:text-sm text-danger dark:text-danger">이미 사용 중인 아이디입니다.</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="8자 이상 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>


            {/* 약관 동의 섹션 */}
            <div className="space-y-3 sm:space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                약관 동의 (필수)
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start">
                  <input
                    id="terms-of-service"
                    type="checkbox"
                    checked={agreements.termsOfService}
                    onChange={() => handleAgreementChange('termsOfService')}
                    className="h-3 w-3 sm:h-4 sm:w-4 text-primary-blue focus:ring-primary-blue border-gray-300 dark:border-gray-600 rounded mt-0.5 bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="terms-of-service" className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-1">
                    <span className="text-danger dark:text-red-400">*</span> 서비스 이용약관에 동의합니다
                    <div className="mt-1">
                      <Link 
                        to="/legal/terms"
                        target="_blank"
                        className="text-primary-blue dark:text-primary-blue hover:text-primary-navy dark:hover:text-blue-300 underline"
                      >
                        약관 보기
                      </Link>
                    </div>
                  </label>
                </div>

                <div className="flex items-start">
                  <input
                    id="privacy-policy"
                    type="checkbox"
                    checked={agreements.privacyPolicy}
                    onChange={() => handleAgreementChange('privacyPolicy')}
                    className="h-3 w-3 sm:h-4 sm:w-4 text-primary-blue focus:ring-primary-blue border-gray-300 dark:border-gray-600 rounded mt-0.5 bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="privacy-policy" className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-1">
                    <span className="text-danger dark:text-red-400">*</span> 개인정보 처리방침에 동의합니다
                    <div className="mt-1">
                      <Link 
                        to="/legal/privacy"
                        target="_blank"
                        className="text-primary-blue dark:text-primary-blue hover:text-primary-navy dark:hover:text-blue-300 underline"
                      >
                        약관 보기
                      </Link>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || usernameStatus !== 'available' || !agreements.termsOfService || !agreements.privacyPolicy}
                className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary-blue hover:bg-primary-navy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                계정 생성
              </button>
            </div>

            <div className="text-center">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                이미 계정이 있으신가요?{' '}
                <Link to="/auth/login" className="font-medium text-primary-blue dark:text-primary-blue hover:text-primary-navy dark:hover:text-blue-300 transition-colors">
                  로그인
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          © 2025 디지털 출결 시스템. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;