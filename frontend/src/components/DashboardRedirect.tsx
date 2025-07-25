import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중일 때는 스피너 표시
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

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // /dashboard 정확히 일치할 때만 리다이렉트 수행 (하위 경로는 절대 실행하지 않음)
  if (location.pathname !== '/dashboard') {
    return null;
  }

  // 사용자 역할에 따라 적절한 대시보드로 리다이렉트
  switch (user.role) {
    case 'admin':
    case 'teacher':
      return <Navigate to="admin/main" replace />;
    case 'student':
      return <Navigate to="student" replace />;
    default:
      return <Navigate to="/auth/login" replace />;
  }
};

export default DashboardRedirect;