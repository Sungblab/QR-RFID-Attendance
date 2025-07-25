import React, { useState } from 'react';
import QRRFIDReader from './reader/QRRFIDReader';
import RFIDManagement from './reader/RFIDManagement';

type TabType = 'reader' | 'management';

const AttendanceReader: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('reader');

  return (
    <div className="transition-colors p-6">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">출결 리더기</h1>
          <button
            onClick={() => window.location.href = `/dashboard/${localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).role : 'admin'}/main`}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors self-start sm:self-auto"
          >
            <span>대시보드로 돌아가기</span>
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <nav className="flex border-b border-gray-200 dark:border-gray-700" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('reader')}
            className={`${
              activeTab === 'reader'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors mr-8`}
          >
            QR/RFID 리더기
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`${
              activeTab === 'management'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors`}
          >
            RFID 관리
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'reader' && <QRRFIDReader />}
        {activeTab === 'management' && <RFIDManagement />}
      </div>
    </div>
  );
};

export default AttendanceReader;