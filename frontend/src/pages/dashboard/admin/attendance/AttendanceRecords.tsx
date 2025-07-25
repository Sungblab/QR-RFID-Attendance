import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { userApi, attendanceApi, type Student, type AttendanceRecord } from '../../../../services/api';
import { AttendanceDetailModal } from '../../../../components/modals';

interface StudentAttendance extends Student {
  todayStatus: 'present' | 'late' | 'absent' | 'partial';
  todayLateMinutes?: number;
  todayPresentPeriods: number;
  totalPeriods: number;
  weeklyAttendanceRate: number;
  monthlyAttendanceRate: number;
  attendanceRecords?: AttendanceRecord[];
}

interface AttendanceStats {
  totalStudents: number;
  presentStudents: number;
  lateStudents: number;
  absentStudents: number;
  attendanceRate: number;
}

const AttendanceRecords: React.FC = () => {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [unprocessedAttendanceData, setUnprocessedAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Filter states
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<"late" | "absent" | "on_time" | "">('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort states
  const [sortField, setSortField] = useState<string>('student_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
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

  const loadStudentsWithAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== 출결 기록 로딩 시작 ===');
      console.log('요청 파라미터:', { startDate, endDate, gradeFilter, classFilter, statusFilter });
      
      const [studentsResponse, dateRangeAttendanceResponse, historicalAttendanceResponse, unprocessedResponse] = await Promise.all([
        userApi.getStudents(),
        attendanceApi.getRecords({
          startDate,
          endDate,
          ...(gradeFilter && { grade: parseInt(gradeFilter) }),
          ...(classFilter && { class: parseInt(classFilter) }),
          ...(statusFilter && { status: statusFilter })
        }),
        attendanceApi.getRecords({
          ...(gradeFilter && { grade: parseInt(gradeFilter) }),
          ...(classFilter && { class: parseInt(classFilter) })
        }),
        attendanceApi.getUnprocessedAttendances({
          date: startDate,
          ...(gradeFilter && { grade: parseInt(gradeFilter) }),
          ...(classFilter && { class: parseInt(classFilter) })
        })
      ]);
      
      console.log('API 응답 수신:');
      console.log('- 학생 응답:', studentsResponse.success, studentsResponse.data?.length);
      console.log('- 기간별 출결 응답:', dateRangeAttendanceResponse.success, dateRangeAttendanceResponse.data?.length);
      console.log('- 전체 출결 응답:', historicalAttendanceResponse.success, historicalAttendanceResponse.data?.length);
      console.log('- 미처리 출결 응답:', unprocessedResponse.success, unprocessedResponse.data?.length);

      if (studentsResponse.success && studentsResponse.data) {
        const dateRangeAttendanceData = dateRangeAttendanceResponse.success ? dateRangeAttendanceResponse.data || [] : [];
        const historicalAttendanceData = historicalAttendanceResponse.success ? historicalAttendanceResponse.data || [] : [];
        const unprocessedAttendanceData = unprocessedResponse.success ? unprocessedResponse.data || [] : [];
        
        console.log('처리할 데이터:');
        console.log('- 기간별 출결 데이터:', dateRangeAttendanceData.length, '건');
        console.log('- 기간별 출결 샘플:', dateRangeAttendanceData.slice(0, 3).map(r => ({
          date: r.date, 
          status: r.status, 
          student: r.User?.name,
          student_id: r.User?.student_id
        })));
        
        const studentsWithAttendance: StudentAttendance[] = studentsResponse.data.map(student => {
          const studentRangeRecords = dateRangeAttendanceData.filter(record => 
            record.User?.id === student.id
          );
          
          console.log(`학생 ${student.name}(${student.student_id})의 기간별 기록:`, studentRangeRecords.length, '건');

          const studentHistoricalRecords = historicalAttendanceData.filter(record => 
            record.User?.id === student.id
          );

          // 미처리 출결에서 해당 학생 찾기
          const unprocessedStudent = unprocessedAttendanceData.find(u => u.student.id === student.id);

          // Calculate overall status for the date range
          let todayStatus: 'present' | 'late' | 'absent' | 'partial' = 'absent';
          let todayLateMinutes: number | undefined;
          let todayPresentPeriods = 0;
          const totalPeriods = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

          if (studentRangeRecords.length === 0) {
            // 출결 기록이 없는 경우
            if (unprocessedStudent) {
              todayStatus = 'absent'; // 미처리 = 미출석
            } else {
              todayStatus = 'absent'; // 승인된 결석은 absent로 처리됨
            }
            todayPresentPeriods = 0;
          } else {
            const presentCount = studentRangeRecords.filter(r => r.status === 'on_time').length;
            const lateCount = studentRangeRecords.filter(r => r.status === 'late').length;
            const absentCount = studentRangeRecords.filter(r => r.status === 'absent').length;
            const totalPresent = presentCount + lateCount;
            
            if (absentCount > 0) {
              // 승인된 결석이 있는 경우
              todayStatus = 'absent';
              todayPresentPeriods = absentCount; // 승인된 결석은 출석일수에 포함
            } else {
              todayPresentPeriods = totalPresent;
              
              if (totalPresent === 0) {
                todayStatus = 'absent';
              } else if (totalPresent === totalPeriods) {
                todayStatus = presentCount === totalPeriods ? 'present' : 'late';
              } else {
                todayStatus = 'partial';
              }
            }
            
            // Calculate average late minutes for late records
            const lateRecords = studentRangeRecords.filter(r => r.status === 'late');
            if (lateRecords.length > 0) {
              let totalLateMinutes = 0;
              lateRecords.forEach(record => {
                if (record.check_in_time) {
                  const checkIn = new Date(`2000-01-01 ${record.check_in_time}`);
                  const start = new Date(`2000-01-01 08:00:00`);
                  const diffMs = checkIn.getTime() - start.getTime();
                  if (diffMs > 0) {
                    totalLateMinutes += Math.floor(diffMs / (1000 * 60));
                  }
                }
              });
              todayLateMinutes = Math.round(totalLateMinutes / lateRecords.length);
            }
          }

          const currentDate = new Date(endDate);
          const oneWeekAgo = new Date(currentDate);
          oneWeekAgo.setDate(currentDate.getDate() - 7);
          const oneMonthAgo = new Date(currentDate);
          oneMonthAgo.setMonth(currentDate.getMonth() - 1);

          const weeklyRecords = studentHistoricalRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= oneWeekAgo && recordDate <= currentDate;
          });
          const weeklyPresentCount = weeklyRecords.filter(r => r.status === 'on_time' || r.status === 'late').length;
          const weeklyAttendanceRate = weeklyRecords.length > 0 ? Math.round((weeklyPresentCount / weeklyRecords.length) * 100) : 100;

          const monthlyRecords = studentHistoricalRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= oneMonthAgo && recordDate <= currentDate;
          });
          const monthlyPresentCount = monthlyRecords.filter(r => r.status === 'on_time' || r.status === 'late').length;
          const monthlyAttendanceRate = monthlyRecords.length > 0 ? Math.round((monthlyPresentCount / monthlyRecords.length) * 100) : 100;

          return {
            ...student,
            todayStatus,
            todayLateMinutes,
            todayPresentPeriods,
            totalPeriods,
            weeklyAttendanceRate,
            monthlyAttendanceRate,
            attendanceRecords: studentRangeRecords.map(record => ({
              id: record.id,
              date: record.date,
              checkInTime: record.check_in_time,
              status: record.status === 'on_time' ? 'present' : record.status as 'late' | 'absent',
              // classroom: record.classroom, // 교실 구분 제거
              user: record.User
            }))
          };
        });
        
        setStudents(studentsWithAttendance);
        setUnprocessedAttendanceData(unprocessedAttendanceData);
      } else {
        setError(studentsResponse.message || '학생 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error('Error loading students with attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, gradeFilter, classFilter, statusFilter]);

  useEffect(() => {
    loadStudentsWithAttendance();
  }, [loadStudentsWithAttendance]);

  // Filtered and sorted data
  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter(student => {
      const gradeMatch = !gradeFilter || student.grade.toString() === gradeFilter;
      const classMatch = !classFilter || student.class.toString() === classFilter;
      const statusMatch = !statusFilter || student.todayStatus === statusFilter;
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = !searchTerm || 
        student.name.toLowerCase().includes(searchLower) ||
        student.student_id.toLowerCase().includes(searchLower) ||
        `${student.grade}${student.class}${student.number}`.includes(searchTerm);
      
      return gradeMatch && classMatch && statusMatch && nameMatch;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField as keyof StudentAttendance] as string | number;
        let bVal: string | number = b[sortField as keyof StudentAttendance] as string | number;
        
        if (sortField === 'class') {
          aVal = `${a.grade}${a.class}`;
          bVal = `${b.grade}${b.class}`;
        }
        
        if (sortField === 'student_id') {
          aVal = parseInt(String(aVal)) || 0;
          bVal = parseInt(String(bVal)) || 0;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
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
  }, [students, gradeFilter, classFilter, statusFilter, searchTerm, sortField, sortDirection]);

  const stats = useMemo((): AttendanceStats => {
    const totalStudents = filteredAndSortedStudents.length;
    const presentStudents = filteredAndSortedStudents.filter(s => s.todayStatus === 'present').length;
    const lateStudents = filteredAndSortedStudents.filter(s => s.todayStatus === 'late').length;
    const absentStudents = filteredAndSortedStudents.filter(s => s.todayStatus === 'absent').length;
    const attendanceRate = totalStudents > 0 ? ((presentStudents + lateStudents) / totalStudents) * 100 : 0;

    return {
      totalStudents,
      presentStudents,
      lateStudents,
      absentStudents,
      attendanceRate
    };
  }, [filteredAndSortedStudents]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStudentDetailClick = (student: StudentAttendance) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const handleExportRecords = async () => {
    try {
      const filters = {
        startDate,
        endDate,
        grade: gradeFilter ? parseInt(gradeFilter) : undefined,
        class: classFilter ? parseInt(classFilter) : undefined,
        status: statusFilter || undefined
      };
      
      await attendanceApi.exportAttendanceRecords(filters);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel 다운로드에 실패했습니다.');
    }
  };

  const getStatusBadge = (student: StudentAttendance) => {
    const { todayStatus, todayLateMinutes, todayPresentPeriods } = student;
    
    // 미처리 출결에서 해당 학생 찾기
    const unprocessedStudent = unprocessedAttendanceData?.find(u => u.student.id === student.id);
    
    const badges = {
      present: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      late: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      absent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      approved_absent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      partial: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
    };

    const getLabel = () => {
      switch (todayStatus) {
        case 'present': return '출석';
        case 'late': return `지각 (${todayLateMinutes}분)`;
        case 'absent': 
          if (unprocessedStudent) {
            return '미출석'; // 미처리
          } else if (todayPresentPeriods > 0) {
            return '결석'; // 승인된 결석
          } else {
            return '미출석'; // 기록 없음
          }
        case 'partial': return '부분출석';
        default: return todayStatus;
      }
    };

    const getBadgeClass = () => {
      if (todayStatus === 'absent' && !unprocessedStudent && todayPresentPeriods > 0) {
        return badges.approved_absent; // 승인된 결석은 파란색
      }
      return badges[todayStatus as keyof typeof badges];
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass()}`}>
        {getLabel()}
      </span>
    );
  };

  // Mobile Card Component
  const MobileStudentCard = ({ student }: { student: StudentAttendance }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{student.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{student.student_id}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge(student)}
          <span className="text-xs text-gray-500 dark:text-gray-400">{student.grade}학년 {student.class}반</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">출석 일수:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {student.todayPresentPeriods}/{student.totalPeriods}일
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">주간 출석률:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{student.weeklyAttendanceRate}%</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => handleStudentDetailClick(student)}
          className="w-full px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          상세보기
        </button>
      </div>
    </div>
  );

  const getUniqueGrades = () => {
    const grades = [...new Set(students.map(s => s.grade))].sort();
    return grades;
  };

  const getUniqueClasses = () => {
    const classes = [...new Set(students.map(s => s.class))].sort();
    return classes;
  };

  return (
    <div className="space-y-6">
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalStudents}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">총 학생</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentStudents}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">출석</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lateStudents}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">지각</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentStudents}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">미출석</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">출석률</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">검색</label>
            <input
              type="text"
              placeholder="이름, 학번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">학년</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              {getUniqueGrades().map(grade => (
                <option key={grade} value={grade}>{grade}학년</option>
              ))}
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
              {getUniqueClasses().map(cls => (
                <option key={cls} value={cls}>{cls}반</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">출결상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "late" | "absent" | "on_time" | "")}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">전체</option>
              <option value="on_time">출석</option>
              <option value="late">지각</option>
              <option value="absent">미출석</option>
            </select>
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
              onClick={handleExportRecords}
              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1"
            >
              Excel 다운로드
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setGradeFilter('');
                setClassFilter('');
                setStatusFilter('');
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Students Table/Cards - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">학생 출결 현황</h4>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {new Date(startDate).toLocaleDateString('ko-KR')} ~ {new Date(endDate).toLocaleDateString('ko-KR')} - 총 {filteredAndSortedStudents.length}명
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
            ) : filteredAndSortedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm || gradeFilter || classFilter || statusFilter ? '검색 조건에 맞는 학생이 없습니다.' : '등록된 학생이 없습니다.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedStudents.map((student) => (
                  <MobileStudentCard key={student.id} student={student} />
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
                    onClick={() => handleSort('student_id')}
                  >
                    <div className="flex items-center gap-2">
                      학번
                      {sortField === 'student_id' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      이름
                      {sortField === 'name' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('class')}
                  >
                    <div className="flex items-center gap-2">
                      학년/반
                      {sortField === 'class' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">기간 출결</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">출석 일수</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">주간 출석률</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">월간 출석률</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">상세보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm || gradeFilter || classFilter || statusFilter ? '검색 조건에 맞는 학생이 없습니다.' : '등록된 학생이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{student.student_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.grade}학년 {student.class}반</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(student)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {student.todayPresentPeriods}/{student.totalPeriods}일
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${student.weeklyAttendanceRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{student.weeklyAttendanceRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${student.monthlyAttendanceRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{student.monthlyAttendanceRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleStudentDetailClick(student)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-400 rounded-lg transition-all duration-300"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Detail Modal */}
      {selectedStudent && (
        <AttendanceDetailModal
          isOpen={isDetailModalOpen}
          student={selectedStudent}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendanceRecords;
