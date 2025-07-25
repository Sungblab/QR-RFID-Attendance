import React, { useState } from 'react';
import AttendanceRecords from './attendance/AttendanceRecords';
import AttendanceReports from './attendance/AttendanceReports';
import AttendanceSettings from './attendance/AttendanceSettings';
import HolidayManagement from './attendance/HolidayManagement';

type TabType = 'records' | 'reports' | 'settings' | 'holidays';

const AttendanceManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('records');

  return (
    <div className="transition-colors">

      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <nav className="flex border-b border-gray-200 dark:border-gray-700" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('records')}
            className={`${
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors mr-4`}
          >
            출결 기록
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors mr-4`}
          >
            출결 신고 관리
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors mr-4`}
          >
            시간 설정
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`${
              activeTab === 'holidays'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors`}
          >
            휴일 관리
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'records' && <AttendanceRecords />}
        {activeTab === 'reports' && <AttendanceReports />}
        {activeTab === 'settings' && <AttendanceSettings />}
        {activeTab === 'holidays' && <HolidayManagement />}
      </div>
    </div>
  );
};

export default AttendanceManagement;