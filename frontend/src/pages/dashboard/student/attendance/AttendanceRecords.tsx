import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { attendanceApi, type MorningAttendance, type AttendanceReport } from '../../../../services/api';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendanceRate: number;
}

const AttendanceRecords: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MorningAttendance[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'records' | 'reports'>('records');
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Report form states
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave'>('absence');
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.');
        return;
      }
      
      // 선택된 월의 시작일과 마지막일 계산
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 월의 마지막 날
      
      const response = await attendanceApi.getMyRecords({
        startDate,
        endDate
      });
      
      if (response.success && response.data) {
        setRecords(response.data);
      } else {
        setError(response.message || '출결 기록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('출결 기록을 불러오는데 실패했습니다.');
      console.error('Error loading attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.');
        return;
      }
      
      const response = await attendanceApi.getMyReports();
      
      if (response.success && response.data) {
        setReports(response.data);
      } else {
        setError(response.message || '출결 신고 기록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('출결 신고 기록을 불러오는데 실패했습니다.');
      console.error('Error loading attendance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitAttendanceReport = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.');
        return;
      }
      
      if (!reportReason.trim()) {
        setError('신고 사유를 입력해주세요.');
        return;
      }
      
      const response = await attendanceApi.submitReport({
        date: reportDate,
        type: reportType,
        reason: reportReason.trim()
      });
      
      if (response.success) {
        // 성공 시 폼 초기화 및 목록 새로고침
        setReportReason('');
        setReportDate(new Date().toISOString().split('T')[0]);
        setReportType('absence');
        await loadAttendanceReports();
        alert('출결 신고가 성공적으로 제출되었습니다.');
      } else {
        setError(response.message || '출결 신고 제출에 실패했습니다.');
      }
    } catch (err) {
      setError('출결 신고 제출 중 오류가 발생했습니다.');
      console.error('Error submitting attendance report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'records') {
      loadAttendanceRecords();
    } else {
      loadAttendanceReports();
    }
  }, [selectedMonth, activeTab]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const dateMatch = !dateFilter || record.date.includes(dateFilter);
      const statusMatch = !statusFilter || record.status === statusFilter;
      
      return dateMatch && statusMatch;
    });
  }, [records, dateFilter, statusFilter]);

  const stats = useMemo((): AttendanceStats => {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'on_time').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendanceRate
    };
  }, [records]);

  const getStatusBadge = (status: string) => {
    const badges = {
      on_time: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      late: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      absent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    };

    const labels = {
      on_time: '정시',
      late: '지각',
      absent: '결석'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };



  const getLateMinutes = (checkInTime: string) => {
    if (!checkInTime) return 0;
    const checkIn = new Date(`2000-01-01 ${checkInTime}`);
    const start = new Date(`2000-01-01 08:00:00`);
    const diffMs = checkIn.getTime() - start.getTime();
    return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
  };

  // Mobile Attendance Card Component
  const MobileAttendanceCard = ({ record }: { record: MorningAttendance }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {new Date(record.date).toLocaleDateString('ko-KR')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(record.date).toLocaleDateString('ko-KR', { weekday: 'long' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge(record.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">등교 시간:</span>
          <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
            {record.check_in_time || '-'}
          </div>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">지각 시간:</span>
          <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
            {record.status === 'late' && record.check_in_time ? (
              <span className="text-yellow-600 dark:text-yellow-400">
                +{getLateMinutes(record.check_in_time)}분
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </div>
      </div>

      {/* classroom 표시 제거 */}
    </div>
  );

  const getReportTypeBadge = (type: string) => {
    const badges = {
      absence: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      late: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      early_leave: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      sick_leave: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      official_leave: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
    };

    const labels = {
      absence: '결석',
      late: '지각',
      early_leave: '조퇴',
      sick_leave: '병결',
      official_leave: '공결'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[type as keyof typeof badges]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const getReportStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    };

    const labels = {
      pending: '처리 대기',
      approved: '승인됨',
      rejected: '거절됨'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'records'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            출결 현황
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            자진 출결 신고
          </button>
        </div>
      </div>

      {activeTab === 'records' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalDays}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">총 등교일</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentDays}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">정시 출석</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lateDays}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">지각</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentDays}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">결석</div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">출석률</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4">
        <div className="space-y-3 sm:space-y-4">
          {/* 첫 번째 줄: 조회 월 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-20">조회 월:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          
          {/* 두 번째 줄: 특정 날짜와 상태 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-20">특정 날짜:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-16">상태:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">전체</option>
                <option value="on_time">정시</option>
                <option value="late">지각</option>
                <option value="absent">결석</option>
              </select>
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          <div className="flex justify-center sm:justify-start">
            <button
              onClick={() => {
                setDateFilter('');
                setStatusFilter('');
              }}
              className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Records Table/Cards - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">아침 등교 기록</h4>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {new Date(selectedMonth).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} - 총 {filteredRecords.length}일
            </div>
          </div>
        </div>
        
        {isMobileView ? (
          // Mobile Card View
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {selectedMonth}에는 출결 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <MobileAttendanceCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Desktop Table View
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">날짜</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">요일</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">상태</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">등교 시간</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">지각 시간</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">교실</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {selectedMonth}에는 출결 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                        {new Date(record.date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                        {new Date(record.date).toLocaleDateString('ko-KR', { weekday: 'short' })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {record.check_in_time || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden md:table-cell">
                        {record.status === 'late' && record.check_in_time ? (
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                            +{getLateMinutes(record.check_in_time)}분
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                        {/* classroom 제거 */} -
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 월별 캘린더 형태 요약 (옵션) */}
      {!loading && filteredRecords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
          <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {new Date(selectedMonth).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 출결 요약
          </h4>
          
          <div className="grid grid-cols-7 gap-2 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="p-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
            
            {(() => {
              const year = parseInt(selectedMonth.split('-')[0]);
              const month = parseInt(selectedMonth.split('-')[1]);
              const firstDay = new Date(year, month - 1, 1).getDay();
              const daysInMonth = new Date(year, month, 0).getDate();
              const cells = [];
              
              // 월 시작 전 빈 칸
              for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`empty-${i}`} className="p-2"></div>);
              }
              
              // 날짜 칸들
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const record = records.find(r => r.date === dateStr);
                
                cells.push(
                  <div key={day} className="p-2 text-sm">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full mx-auto ${
                      record 
                        ? record.status === 'on_time' 
                          ? 'bg-green-500 text-white' 
                          : record.status === 'late'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}>
                      <span className="text-xs font-medium">
                        {day}
                      </span>
                    </div>
                  </div>
                );
              }
              
              return cells;
            })()}
          </div>
          
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">정시</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">지각</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">결석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">기록 없음</span>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'reports' && (
        <>
          {/* Report Submission Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">자진 출결 신고</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    신고 날짜
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    신고 유형
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as typeof reportType)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="absence">결석</option>
                    <option value="late">지각</option>
                    <option value="early_leave">조퇴</option>
                    <option value="sick_leave">병결</option>
                    <option value="official_leave">공결</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="출결 사유를 자세히 입력해주세요..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {reportReason.length}/500자
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-500 dark:text-blue-400 text-lg">ℹ️</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <div className="font-medium mb-1">신고 시 유의사항:</div>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>허위 신고 시 징계 대상이 될 수 있습니다.</li>
                      <li>신고 후 교사의 승인을 받아야 처리됩니다.</li>
                      <li>병결, 공결의 경우 관련 서류가 별도로 필요할 수 있습니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setReportReason('');
                    setReportDate(new Date().toISOString().split('T')[0]);
                    setReportType('absence');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  초기화
                </button>
                <button
                  onClick={submitAttendanceReport}
                  disabled={isSubmitting || !reportReason.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '제출 중...' : '신고 제출'}
                </button>
              </div>
            </div>
          </div>

          {/* My Reports List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">내 신고 목록</h4>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  아직 제출한 출결 신고가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {new Date(report.submitted_at).toLocaleDateString('ko-KR')} 신고
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            신고 날짜: {new Date(report.date || report.submitted_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getReportTypeBadge(report.type)}
                          {getReportStatusBadge(report.status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <span className="font-medium">사유:</span> {report.reason}
                      </div>
                      
                      {report.processor_response && (
                        <div className={`text-sm p-3 rounded-lg ${
                          report.status === 'approved' 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}>
                          <span className="font-medium">처리자 답변:</span> {report.processor_response}
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        제출 시간: {new Date(report.submitted_at).toLocaleString('ko-KR')}
                        {report.processed_at && (
                          <span className="ml-4">
                            처리 시간: {new Date(report.processed_at).toLocaleString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecords;