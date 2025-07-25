import React, { useState, useEffect, useMemo } from 'react';
import { attendanceApi, type User, type AttendanceReport, type UnprocessedAttendance } from '../../../../services/api';

// API에서 가져온 타입을 사용하므로 인터페이스 제거

interface AttendanceReportStats {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
}

// API에서 가져온 타입을 사용하므로 인터페이스 제거

const AttendanceReports: React.FC = () => {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [unprocessedAttendances, setUnprocessedAttendances] = useState<UnprocessedAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort states
  const [sortField, setSortField] = useState<string>('submitted_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [selectedUnprocessed, setSelectedUnprocessed] = useState<UnprocessedAttendance | null>(null);
  const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
  const [isCorrectConfirmModalOpen, setIsCorrectConfirmModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportType, setReportType] = useState<string>('absence');
  
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

  // Mock 데이터 제거 - 실제 API 사용

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 실제 API 호출
      const [reportsResponse, unprocessedResponse] = await Promise.all([
        attendanceApi.getReports({
          date: startDate,
          ...(typeFilter && { type: typeFilter }),
          ...(statusFilter && { status: statusFilter }),
          ...(gradeFilter && { grade: parseInt(gradeFilter) }),
          ...(classFilter && { class: parseInt(classFilter) })
        }),
        attendanceApi.getUnprocessedAttendances({
          date: startDate,
          ...(gradeFilter && { grade: parseInt(gradeFilter) }),
          ...(classFilter && { class: parseInt(classFilter) })
        })
      ]);
      
      if (reportsResponse.success) {
        setReports(reportsResponse.data || []);
      } else {
        setError(reportsResponse.message || '출결 신고 데이터를 불러오는데 실패했습니다.');
      }

      if (unprocessedResponse.success) {
        setUnprocessedAttendances(unprocessedResponse.data || []);
      }
      
    } catch (err) {
      setError('출결 신고 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate, typeFilter, statusFilter, gradeFilter, classFilter]);

  // Filtered and sorted data
  const filteredAndSortedReports = useMemo(() => {
    const filtered = reports.filter(report => {
      const student = report.student;
      if (!student) return false;
      
      const gradeMatch = !gradeFilter || (student.grade?.toString() || '') === gradeFilter;
      const classMatch = !classFilter || (student.class?.toString() || '') === classFilter;
      const typeMatch = !typeFilter || report.type === typeFilter;
      const statusMatch = !statusFilter || report.status === statusFilter;
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = !searchTerm || 
        student.name.toLowerCase().includes(searchLower) ||
        (student.student_id?.toLowerCase() || '').includes(searchLower) ||
        report.reason.toLowerCase().includes(searchLower);
      
      return gradeMatch && classMatch && typeMatch && statusMatch && nameMatch;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField as keyof AttendanceReport] as string | number;
        let bVal: string | number = b[sortField as keyof AttendanceReport] as string | number;
        
        if (sortField === 'student_name' && a.student && b.student) {
          aVal = a.student.name;
          bVal = b.student.name;
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    return filtered;
  }, [reports, typeFilter, statusFilter, gradeFilter, classFilter, searchTerm, sortField, sortDirection]);

  const stats = useMemo((): AttendanceReportStats => {
    const totalReports = filteredAndSortedReports.length;
    const pendingReports = filteredAndSortedReports.filter(r => r.status === 'pending').length;
    const approvedReports = filteredAndSortedReports.filter(r => r.status === 'approved').length;
    const rejectedReports = filteredAndSortedReports.filter(r => r.status === 'rejected').length;

    return {
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports
    };
  }, [filteredAndSortedReports]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getTypeBadge = (type: string) => {
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

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    };

    const labels = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거절됨'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handleProcessReport = async (reportId: number, action: 'approve' | 'reject') => {
    try {
      const response = await attendanceApi.processReport(reportId, { action });
      
      if (response.success) {
        // 성공 시 목록 새로고침
        await loadReports();
      } else {
        setError(response.message || '출결 신고 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('출결 신고 처리 중 오류가 발생했습니다.');
      console.error('Error processing report:', err);
    }
  };

  const handleCreateReport = async (student: User, type: string, reason: string) => {
    try {
      const response = await attendanceApi.createAdminReport({
        student_id: student.id,
        date: startDate,
        type: type as 'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave',
        reason
      });
      
      if (response.success) {
        // 성공 시 목록 새로고침
        await loadReports();
        setIsCreateReportModalOpen(false);
        setSelectedUnprocessed(null);
        setReportReason('');
        setReportType('absence');
      } else {
        setError(response.message || '출결 신고 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('출결 신고 생성 중 오류가 발생했습니다.');
      console.error('Error creating report:', err);
    }
  };

  const handleCorrectAttendance = async (student: User, newStatus: 'on_time' | 'late' | 'absent') => {
    try {
      const response = await attendanceApi.correctAttendance(student.id, {
        date: startDate,
        new_status: newStatus,
        reason: `관리자 정정: ${newStatus === 'on_time' ? '정시출석' : newStatus === 'late' ? '지각' : '결석'}으로 변경`
      });
      
      if (response.success) {
        // 성공 시 목록 새로고침
        await loadReports();
      } else {
        setError(response.message || '출결 정정에 실패했습니다.');
      }
    } catch (err) {
      setError('출결 정정 중 오류가 발생했습니다.');
      console.error('Error correcting attendance:', err);
    }
  };

  const handleExportReports = async () => {
    try {
      const filters = {
        startDate,
        endDate,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        grade: gradeFilter ? parseInt(gradeFilter) : undefined,
        class: classFilter ? parseInt(classFilter) : undefined
      };
      
      await attendanceApi.exportAttendanceReports(filters);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel 다운로드에 실패했습니다.');
    }
  };

  // Mobile Report Card Component
  const MobileReportCard = ({ report }: { report: AttendanceReport }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {report.student?.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {report.student?.grade}학년 {report.student?.class}반 | {report.student?.student_id}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getTypeBadge(report.type)}
            {getStatusBadge(report.status)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2 text-xs mb-3">
          <div>
            <span className="text-gray-500 dark:text-gray-400">신고 시간:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {new Date(report.submitted_at).toLocaleString('ko-KR')}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">사유:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {report.reason.length > 30 ? `${report.reason.substring(0, 30)}...` : report.reason}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">첨부파일:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {report.attachments && report.attachments.length > 0 ? (
                <span className="text-blue-600 dark:text-blue-400">{report.attachments.length}개</span>
              ) : (
                <span className="text-gray-400">없음</span>
              )}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          {report.status === 'pending' ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleProcessReport(report.id, 'approve')}
                className="flex-1 px-3 py-2 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => handleProcessReport(report.id, 'reject')}
                className="flex-1 px-3 py-2 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                거절
              </button>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
              {report.processor ? `${report.processor.name}님이 처리` : '처리 완료'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* 오늘의 미처리 출결 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
              미처리 출결 <br /> ({new Date(startDate).toLocaleDateString('ko-KR')} ~ {new Date(endDate).toLocaleDateString('ko-KR')})
            </h4>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              총 {unprocessedAttendances.length}건
            </div>
          </div>
        </div>
        
        {unprocessedAttendances.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            모든 학생의 출결이 처리되었습니다.
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {unprocessedAttendances.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{item.student.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.student.grade}학년 {item.student.class}반 | {item.student.student_id}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.status === 'absent' ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                          미출석
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                          지각
                        </span>
                      )}
                      {item.checkInTime && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.checkInTime}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedUnprocessed(item);
                        setReportType(item.status === 'absent' ? 'absence' : 'late');
                        setIsCreateReportModalOpen(true);
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-400 rounded-lg transition-all duration-300"
                    >
                      사유 처리
                    </button>
                    <button
                      onClick={() => {
                        // 정정 확인 모달 열기
                        setSelectedUnprocessed(item);
                        setIsCorrectConfirmModalOpen(true);
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 border border-green-300 hover:border-green-500 dark:border-green-600 dark:hover:border-green-400 rounded-lg transition-all duration-300"
                    >
                      정정
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalReports}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">총 신고</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingReports}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">처리 대기</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedReports}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">승인됨</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejectedReports}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">거절됨</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">시작 날짜</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">종료 날짜</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">신고 유형</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              <option value="absence">결석</option>
              <option value="late">지각</option>
              <option value="early_leave">조퇴</option>
              <option value="sick_leave">병결</option>
              <option value="official_leave">공결</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">처리 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              <option value="pending">대기중</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거절됨</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">학년</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">반</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(cls => (
                <option key={cls} value={cls}>{cls}반</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">검색</label>
            <input
              type="text"
              placeholder="이름, 학번, 사유..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>
        
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            선택된 기간: <span className="font-medium">
              {new Date(startDate).toLocaleDateString('ko-KR')} ~ {new Date(endDate).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportReports}
              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1"
            >
              Excel 다운로드
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setStatusFilter('');
                setGradeFilter('');
                setClassFilter('');
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs sm:text-sm self-start sm:self-auto"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Reports Table/Cards - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">출결 신고 목록</h4>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              총 {filteredAndSortedReports.length}건
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
            ) : filteredAndSortedReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                신고된 출결 사유가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedReports.map((report) => (
                  <MobileReportCard key={report.id} report={report} />
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
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('submitted_at')}
                  >
                    <div className="flex items-center gap-2">
                      신고 시간
                      {sortField === 'submitted_at' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center gap-2">
                      학생 정보
                      {sortField === 'student_name' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">유형</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">사유</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">첨부파일</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">상태</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      신고된 출결 사유가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(report.submitted_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4">
                        {report.student && (
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{report.student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {report.student.grade}학년 {report.student.class}반 | {report.student.student_id}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(report.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={report.reason}>
                          {report.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {report.attachments && report.attachments.length > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            {report.attachments.length}개
                          </span>
                        ) : (
                          <span className="text-gray-400">없음</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {report.status === 'pending' ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleProcessReport(report.id, 'approve')}
                              className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 border border-green-300 hover:border-green-500 dark:border-green-600 dark:hover:border-green-400 rounded-lg transition-all duration-300"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleProcessReport(report.id, 'reject')}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 hover:border-red-500 dark:border-red-600 dark:hover:border-red-400 rounded-lg transition-all duration-300"
                            >
                              거절
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {report.processor ? `${report.processor.name}님이 처리` : '처리 완료'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 사유 처리 모달 */}
      {isCreateReportModalOpen && selectedUnprocessed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              출결 사유 처리
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">학생 정보</div>
              <div className="font-medium text-gray-800 dark:text-gray-200">
                {selectedUnprocessed.student.name} ({selectedUnprocessed.student.grade}학년 {selectedUnprocessed.student.class}반)
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedUnprocessed.student.student_id}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                처리 유형
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="absence">결석</option>
                <option value="late">지각</option>
                <option value="sick_leave">병결</option>
                <option value="official_leave">공결</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                사유
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="출결 사유를 입력하세요..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsCreateReportModalOpen(false);
                  setSelectedUnprocessed(null);
                  setReportReason('');
                  setReportType('absence');
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (reportReason.trim()) {
                    handleCreateReport(selectedUnprocessed.student, reportType, reportReason);
                  }
                }}
                disabled={!reportReason.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정정 확인 모달 */}
      {isCorrectConfirmModalOpen && selectedUnprocessed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              출결 정정 확인
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">학생 정보</div>
              <div className="font-medium text-gray-800 dark:text-gray-200">
                {selectedUnprocessed.student.name} ({selectedUnprocessed.student.grade}학년 {selectedUnprocessed.student.class}반)
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedUnprocessed.student.student_id}
              </div>
            </div>

            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">현재 상태:</span>
                {selectedUnprocessed.status === 'absent' ? (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                    결석
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                    지각 ({selectedUnprocessed.checkInTime})
                  </span>
                )}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                정시 출석으로 정정하시겠습니까?
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>주의:</strong> 정정 후에는 되돌릴 수 없습니다.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsCorrectConfirmModalOpen(false);
                  setSelectedUnprocessed(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (selectedUnprocessed) {
                    handleCorrectAttendance(selectedUnprocessed.student, 'on_time');
                    setIsCorrectConfirmModalOpen(false);
                    setSelectedUnprocessed(null);
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                정정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;