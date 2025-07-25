import React, { useState, useEffect } from 'react';
import { userApi, attendanceApi, type Student, type MorningAttendance } from '../../../services/api';

interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

interface RecentActivity {
  id: number;
  studentName: string;
  status: string;
  time: string;
  // classroom?: string; // 교실 구분 제거
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsResponse, todayAttendanceResponse] = await Promise.all([
        userApi.getStudents(),
        attendanceApi.getRecords({
          date: todayDate,
        }),
      ]);

      if (studentsResponse.success && studentsResponse.data) {
        const totalStudents = studentsResponse.data.length;
        const todayAttendanceData = todayAttendanceResponse.success ? todayAttendanceResponse.data?.data || [] : [];
        
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        const studentAttendanceMap = new Map();
        todayAttendanceData.forEach((record: MorningAttendance) => {
          if (record.User?.id) {
            studentAttendanceMap.set(record.User.id, record);
          }
        });

        studentsResponse.data.forEach((student: Student) => {
          const attendanceRecord = studentAttendanceMap.get(student.id);
          if (!attendanceRecord) {
            absentCount++;
          } else if (attendanceRecord.status === 'on_time') {
            presentCount++;
          } else if (attendanceRecord.status === 'late') {
            lateCount++;
          } else {
            absentCount++;
          }
        });

        const attendanceRate = totalStudents > 0 ? ((presentCount + lateCount) / totalStudents) * 100 : 0;

        setStats({
          totalStudents,
          presentToday: presentCount,
          absentToday: absentCount,
          lateToday: lateCount,
          attendanceRate,
        });

        const activities: RecentActivity[] = todayAttendanceData
          .filter((record: MorningAttendance) => record.User?.name)
          .sort((a: MorningAttendance, b: MorningAttendance) => {
            const timeA = new Date(`${a.date} ${a.check_in_time}`).getTime();
            const timeB = new Date(`${b.date} ${b.check_in_time}`).getTime();
            return timeB - timeA;
          })
          .slice(0, 10)
          .map((record: MorningAttendance) => ({
            id: record.id,
            studentName: record.User?.name || '알 수 없음',
            status: record.status === 'on_time' ? '출석' : record.status === 'late' ? '지각' : '결석',
            time: record.check_in_time || '',
            // classroom: record.classroom, // 교실 구분 제거
          }));

        setRecentActivity(activities);
      } else {
        setError(studentsResponse.message || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const badges = {
      '출석': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      '지각': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      '결석': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="transition-colors">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transition-colors">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        </div>
      </header>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl hover:scale-105">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">전체 학생</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl hover:scale-105">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">출석</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{stats.presentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl hover:scale-105">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">지각</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lateToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl hover:scale-105">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">결석</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl hover:scale-105">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">출석률</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md dark:hover:shadow-xl">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">최근 출결 활동</h2>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-400 rounded-lg transition-colors self-start sm:self-auto"
            >
              새로고침
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">오늘 출결 활동이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusBadge(activity.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{activity.studentName}</p>
                      {/* classroom 표시 제거 */}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;