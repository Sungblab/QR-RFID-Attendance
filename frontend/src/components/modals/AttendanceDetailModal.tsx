import React, { useState, useMemo, useEffect } from 'react';
import { attendanceApi, type MorningAttendance } from '../../services/api';

interface Student {
  id: number;
  name: string;
  student_id: string;
  grade: number;
  class: number;
  number: number;
}

interface AttendanceDetailModalProps {
  isOpen: boolean;
  student: Student;
  onClose: () => void;
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({ isOpen, student, onClose }) => {
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [attendanceRecords, setAttendanceRecords] = useState<MorningAttendance[]>([]);
  const [unprocessedAttendances, setUnprocessedAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 실제 출결 데이터 로드
  useEffect(() => {
    if (!isOpen || !student.id) return;

    const loadAttendanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 관리자가 특정 학생의 아침 출결 데이터 조회
        const [recordsResponse, unprocessedResponse] = await Promise.all([
          attendanceApi.getRecords({
            startDate,
            endDate,
            grade: student.grade,
            class: student.class
          }),
          attendanceApi.getUnprocessedAttendances({
            date: startDate,
            grade: student.grade,
            class: student.class
          })
        ]);

        if (recordsResponse.success && recordsResponse.data) {
          // 해당 학생의 데이터만 필터링
          const dataArray = recordsResponse.data.data || recordsResponse.data || [];
          const studentRecords = dataArray.filter((record: any) => 
            record.User?.id === student.id
          );
          setAttendanceRecords(studentRecords);
        } else {
          setError('출결 데이터를 불러오는데 실패했습니다.');
        }

        if (unprocessedResponse.success && unprocessedResponse.data) {
          setUnprocessedAttendances(unprocessedResponse.data);
        }
      } catch (err) {
        console.error('Error loading attendance data:', err);
        setError('출결 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, [isOpen, student.id, student.grade, student.class, startDate, endDate]);

  // 필터링된 기록 (기간별)
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return recordDate >= start && recordDate <= end;
    });
  }, [attendanceRecords, startDate, endDate]);

  // 통계 계산 (최근 30일)
  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRecords = attendanceRecords.filter(record => 
      new Date(record.date) >= thirtyDaysAgo
    );
    
    const totalDays = recentRecords.length;
    const onTimeDays = recentRecords.filter(r => r.status === 'on_time').length;
    const lateDays = recentRecords.filter(r => r.status === 'late').length;
    const absentDays = recentRecords.filter(r => r.status === 'absent').length;
    const attendanceRate = totalDays > 0 ? ((onTimeDays + lateDays) / totalDays) * 100 : 0;

    return {
      totalDays,
      onTimeDays,
      lateDays,
      absentDays,
      attendanceRate
    };
  }, [attendanceRecords]);

  const getStatusBadge = (record: MorningAttendance) => {
    const { status, date } = record;
    
    // 해당 날짜에 미처리 출결인지 확인
    const isUnprocessed = unprocessedAttendances.some(u => 
      u.student.id === student.id && 
      new Date(date).toDateString() === new Date(startDate).toDateString()
    );
    
    const badges = {
      on_time: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      late: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      absent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      approved_absent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
    };

    const getLabel = () => {
      switch (status) {
        case 'on_time': return '정시 등교';
        case 'late': return '지각';
        case 'absent': 
          return isUnprocessed ? '미출석' : '결석';
        default: return status;
      }
    };

    const getBadgeClass = () => {
      if (status === 'absent' && !isUnprocessed) {
        return badges.approved_absent; // 승인된 결석은 파란색
      }
      return badges[status as keyof typeof badges];
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass()}`}>
        {getLabel()}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {student.name} 아침 출결 상세 기록
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {student.student_id} | {student.grade}학년 {student.class}반 {student.number}번
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Date Range Filter */}
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  시작 날짜
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  종료 날짜
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Statistics (Recent 30 Days) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              최근 30일 출결 현황
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.totalDays}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">총 등교일</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.onTimeDays}</div>
                <div className="text-xs text-green-600 dark:text-green-400">정시 등교</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.lateDays}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">지각</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.absentDays}</div>
                <div className="text-xs text-red-600 dark:text-red-400">결석</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.attendanceRate.toFixed(1)}%</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">출석률</div>
              </div>
            </div>
          </div>

          {/* Selected Period Records */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {new Date(startDate).toLocaleDateString('ko-KR')} ~ {new Date(endDate).toLocaleDateString('ko-KR')} 출결 기록
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 dark:text-red-400 mb-2">⚠️ {error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  새로고침
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                {filteredRecords.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    선택한 기간에 출결 기록이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="bg-white dark:bg-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-500">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {new Date(record.date).toLocaleDateString('ko-KR')} - 아침 등교
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {record.check_in_time ? `체크인: ${record.check_in_time}` : '체크인 기록 없음'}
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(record)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;