import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

interface AttendanceSettings {
  startTime: string;
  lateTime: string;
  endTime: string;
}

const AttendanceSettings: React.FC = () => {
  const [settings, setSettings] = useState<AttendanceSettings>({
    startTime: '07:00',
    lateTime: '08:00',
    endTime: '09:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 현재 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/attendance/settings');
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          setSettings({
            startTime: data.start_time.substring(0, 5), // HH:MM:SS -> HH:MM
            lateTime: data.late_time.substring(0, 5),
            endTime: data.end_time ? data.end_time.substring(0, 5) : '09:00'
          });
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await api.put('/attendance/settings', {
        start_time: settings.startTime,
        late_time: settings.lateTime,
        end_time: settings.endTime
      });

      if (response.data.success) {
        alert('출결 시간 설정이 저장되었습니다.');
      } else {
        alert(response.data.message || '설정 저장에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('설정 저장 실패:', error);
      alert((error as unknown as { response?: { data?: { message?: string } } }).response?.data?.message || '설정 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      startTime: '07:00',
      lateTime: '08:00',
      endTime: '09:00'
    });
  };

  if (isLoadingData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
            <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-3 sm:mb-4"></div>
            <div className="space-y-3 sm:space-y-4">
              <div className="h-8 sm:h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <div className="h-8 sm:h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl sm:rounded-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            출결 시간 설정
          </h3>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            아침 출결의 시작 시간과 지각 처리 시간을 설정합니다.
          </p>
        </div>
        
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="startTime" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              출결 시작 시간
            </label>
            <div className="mt-1">
              <input
                type="time"
                id="startTime"
                value={settings.startTime}
                onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              학생들이 출결 체크를 시작할 수 있는 시간입니다.
            </p>
          </div>

          <div>
            <label htmlFor="lateTime" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              지각 처리 시작 시간
            </label>
            <div className="mt-1">
              <input
                type="time"
                id="lateTime"
                value={settings.lateTime}
                onChange={(e) => setSettings({ ...settings, lateTime: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              이 시간 이후의 출결 체크는 지각으로 처리됩니다.
            </p>
          </div>

          <div>
            <label htmlFor="endTime" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              출결 마감 시간
            </label>
            <div className="mt-1">
              <input
                type="time"
                id="endTime"
                value={settings.endTime}
                onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              이 시간 이후에는 출결 체크가 불가능합니다.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 sm:ml-3">
                <h3 className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200">
                  시간 설정 안내
                </h3>
                <div className="mt-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                    <li>출결 시작 시간부터 학생들이 RFID 카드나 QR코드로 출결 체크를 할 수 있습니다.</li>
                    <li>지각 처리 시작 시간 이후의 출결 체크는 자동으로 지각으로 기록됩니다.</li>
                    <li>출결 마감 시간 이후에는 출결 체크가 불가능합니다.</li>
                    <li>변경된 설정은 다음 날부터 적용됩니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-0 border-t border-gray-200 dark:border-gray-600 rounded-b-xl sm:rounded-b-lg">
          <button
            type="button"
            onClick={handleReset}
            className="bg-white dark:bg-gray-600 py-2 px-3 sm:px-4 border border-gray-300 dark:border-gray-500 rounded-lg shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mr-3"
          >
            기본값으로 재설정
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex justify-center py-2 px-3 sm:px-4 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSettings;