import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'teacher' | 'student')[];
  allowedRoles?: ('admin' | 'teacher' | 'student')[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [], 
  allowedRoles = [],
  requireAuth = true 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중일 때 스피너 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증이 필요한 페이지인데 로그인하지 않은 경우
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 인증이 필요하지 않은 페이지인데 이미 로그인한 경우 (로그인/회원가입 페이지)
  if (!requireAuth && isAuthenticated && location.pathname.startsWith('/auth/')) {
    return <Navigate to="/dashboard" replace />;
  }

  // 역할 기반 접근 제어
  const rolesToCheck = allowedRoles.length > 0 ? allowedRoles : roles;
  if (requireAuth && isAuthenticated && rolesToCheck.length > 0) {
    if (!user || !rolesToCheck.includes(user.role)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                접근 권한이 없습니다
              </h2>
              <p className="text-gray-600 mb-4">
                이 페이지에 접근할 권한이 없습니다.
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-navy transition-colors"
              >
                이전 페이지로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;