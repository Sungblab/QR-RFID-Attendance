import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

interface MenuItem {
  path: string;
  label: string;
  isExternal?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중이거나 사용자 정보가 없으면 로딩 화면 표시
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'teacher':
        return '교사';
      case 'student':
        return '학생';
      default:
        return '사용자';
    }
  };

  const getMenuItems = (): MenuItem[] => {
    const basePath = user.role === 'student' ? `/dashboard/${user.role}` : `/dashboard/${user.role}/main`;
    const baseItems: MenuItem[] = [
      {
        path: basePath,
        label: '대시보드',
      },
    ];

    if (user.role === 'admin' || user.role === 'teacher') {
      baseItems.push({
        path: `/dashboard/${user.role}/users`,
        label: '사용자 관리',
      });
      baseItems.push({
        path: `/dashboard/${user.role}/attendance`,
        label: '아침 출결 관리',
      });
      baseItems.push({
        path: `/dashboard/${user.role}/reader`,
        label: '출결 리더기',
        isExternal: true
      });
    }

    if (user.role === 'student') {
      baseItems[0] = {
        path: `/dashboard/${user.role}`,
        label: '내 QR코드',
      };
      baseItems.push({
        path: `/dashboard/${user.role}/attendance`,
        label: '아침 출결 현황',
      });
      baseItems.push({
        path: `/dashboard/${user.role}/profile`,
        label: '내 정보',
      });
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  // 모바일 메뉴 아이템 (학생/관리자/교사)
  const getMobileMenuItems = () => {
    if (user.role === 'student') {
      return [
        {
          path: `/dashboard/student`,
          label: 'QR코드',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          )
        },
        {
          path: `/dashboard/student/attendance`,
          label: '출결현황',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        {
          path: `/dashboard/student/profile`,
          label: '내정보',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        {
          path: '#',
          label: '로그아웃',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          ),
          isLogout: true
        }
      ];
    } else if (user.role === 'admin' || user.role === 'teacher') {
      return [
        {
          path: `/dashboard/${user.role}/main`,
          label: '대시보드',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
        },
        {
          path: `/dashboard/${user.role}/users`,
          label: '사용자관리',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )
        },
        {
          path: `/dashboard/${user.role}/attendance`,
          label: '출결관리',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        {
          path: `/dashboard/${user.role}/reader`,
          label: '리더기',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" 
     strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 
     002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
          isExternal: true
        },
        {
          path: '#',
          label: '로그아웃',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          ),
          isLogout: true
        }
      ];
    }
    
    return [];
  };

  const mobileMenuItems = getMobileMenuItems();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen">
        {/* Sidebar - 모바일에서는 숨김 */}
        <aside className="hidden lg:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">디지털 출결 시스템</h2>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 py-6">
            <ul className="space-y-2 px-4">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    {item.isExternal ? (
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 group ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border-l-4 border-blue-500'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-100'
                        }`}
                      >
                        <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                        <svg className="ml-auto w-3 h-3 sm:w-4 sm:h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <Link
                        to={item.path}
                        className={`flex items-center px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 group ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border-l-4 border-blue-500'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-100'
                        }`}
                      >
                        <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-3 sm:space-y-4">
            {/* 사용자 프로필 */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs sm:text-sm">
                  {user.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(user.role)}</p>
              </div>
            </div>
            
            {/* 다크모드 토글 */}
            <div>
              <ThemeToggle />
            </div>
            
            {/* 로그아웃 버튼 */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-600 transition-colors group"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                로그아웃
              </span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* 모바일 헤더 - 모든 계정에서 표시 */}
          <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">디지털 출결 시스템</h1>
              </div>
              <div className="flex items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
              </div>
            </div>
          </div>
          
          <div className="p-3 sm:p-4 lg:p-8 pb-20 lg:pb-8">
            {children}
          </div>
        </main>
        
        {/* 모바일 하단 메뉴 - 모든 계정에서 표시 */}
        {mobileMenuItems.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div className={`flex items-center ${
              mobileMenuItems.length === 4 ? 'justify-around' : 'justify-around'
            } py-1 sm:py-2`}>
              {mobileMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (item.isLogout) {
                        logout();
                      } else if (item.isExternal) {
                        window.open(item.path, '_blank');
                      } else if (item.path !== '#') {
                        window.location.href = item.path;
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-1 sm:py-2 px-1 sm:px-2 rounded-lg transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : item.isLogout
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.icon}
                    <span className="text-xs mt-1 font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;