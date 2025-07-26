import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

interface AttendanceRecord {
  id: number;
  date: string;
  check_in_time: string;
  status: 'on_time' | 'late' | 'absent';
  // classroom: string; // 교실 구분 제거
}

const StudentQRCode: React.FC = () => {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // QR코드 생성 및 오늘 출결 현황 불러오기
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        generateQRCode(),
        loadTodayAttendance()
      ]);
      setIsLoading(false);
    };

    initializeData();
  }, []);

  // 학생용 QR코드 생성
  const generateQRCode = useCallback(async () => {
    try {
      if (!user) return;

      // 학생 정보를 포함한 QR 데이터 생성
      const qrData = JSON.stringify({
        student_id: user.student_id,
        name: user.name,
        grade: user.grade,
        class: user.class,
        number: user.number,
        timestamp: Date.now()
      });

      // QR코드 URL 생성 (Google Charts API 사용)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);

    } catch (error) {
      console.error('QR코드 생성 실패:', error);
    }
  }, [user]);

  // 오늘 출결 현황 불러오기
  const loadTodayAttendance = async () => {
    try {
      const response = await api.get('/attendance/records/my');
      if (response.data.success) {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = response.data.data.find((record: AttendanceRecord) => 
          record.date === today
        );
        setTodayAttendance(todayRecord);
      }
    } catch (error) {
      console.error('출결 현황 불러오기 실패:', error);
    }
  };

  // QR코드 새로고침
  const refreshQRCode = () => {
    generateQRCode();
  };


  // 현재 시간 포맷
  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 출결 상태에 따른 메시지
  const getAttendanceMessage = () => {
    if (!todayAttendance) {
      return {
        message: '아직 출결 체크하지 않았습니다',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700'
      };
    }

    switch (todayAttendance.status) {
      case 'on_time':
        return {
          message: `정시 출석 완료 (${todayAttendance.check_in_time})`,
          color: 'text-green-800 dark:text-green-200',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'late':
        return {
          message: `지각 처리됨 (${todayAttendance.check_in_time})`,
          color: 'text-yellow-800 dark:text-yellow-200',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      case 'absent':
        return {
          message: '결석 처리됨',
          color: 'text-red-800 dark:text-red-200',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      default:
        return {
          message: '출결 상태 확인 중...',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700'
        };
    }
  };

  const attendanceInfo = getAttendanceMessage();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-8">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mx-auto"></div>
            <div className="w-80 h-80 bg-gray-200 dark:bg-gray-600 rounded-lg mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* QR코드 (헤더 바로 아래) */}
      <div className="flex flex-col items-center space-y-3">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-inner">
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="학생 출결용 QR코드"
              className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 object-contain"
            />
          ) : (
            <div className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">QR코드 생성 중...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* 새로고침 버튼 */}
        <button
          onClick={refreshQRCode}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
        >
          새로고침
        </button>
      </div>

      {/* 현재 시간 */}
      <div className="text-center">
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
          현재 시간: {getCurrentTime()}
        </div>
      </div>

      {/* 출결 상태 */}
      <div className={`${attendanceInfo.bgColor} border ${attendanceInfo.borderColor} rounded-lg p-3 sm:p-4`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className={`text-base sm:text-lg font-semibold ${attendanceInfo.color}`}>
              오늘의 출결 상태
            </div>
            <p className={`text-xs sm:text-sm ${attendanceInfo.color} mt-1`}>
              {attendanceInfo.message}
            </p>
          </div>
        </div>
      </div>


      {/* 사용 안내 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
        <div className="text-center">
          <h3 className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            사용 방법
          </h3>
          <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>QR리더기에 QR코드를 인식시키세요</p>
            <p>출결 완료 후 상태가 자동 업데이트됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQRCode;