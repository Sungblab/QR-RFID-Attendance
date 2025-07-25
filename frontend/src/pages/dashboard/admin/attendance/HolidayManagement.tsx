import React, { useState, useEffect } from 'react';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'national' | 'school' | 'weekend';
  source: 'manual' | 'neis' | 'system';
  is_active: boolean;
  created_at: string;
  creator?: {
    id: number;
    name: string;
    role: string;
  };
}

interface NeisSchedule {
  date: string;
  name: string;
  isHoliday: boolean;
  type: 'national' | 'school' | 'weekend' | null;
  alreadyRegistered: boolean;
}

const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    type: 'school' as Holiday['type']
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [showNeisSchedule, setShowNeisSchedule] = useState(false);
  const [neisSchedules, setNeisSchedules] = useState<NeisSchedule[]>([]);
  const [neisYear, setNeisYear] = useState(() => new Date().getFullYear());
  const [neisMonth, setNeisMonth] = useState(() => new Date().getMonth() + 1);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'school' as Holiday['type']
  });

  // 휴일 목록 로드
  const loadHolidays = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays?year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHolidays(data.data || []);
      }
    } catch (error) {
      console.error('휴일 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [selectedYear, selectedMonth]);

  // NEIS 학사일정 조회
  const fetchNeisSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays/schedule?year=${neisYear}&month=${neisMonth}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('NEIS 학사일정 조회 실패');
      }

      const data = await response.json();
      setNeisSchedules(data.data || []);
      setShowNeisSchedule(true);
    } catch (error) {
      console.error('NEIS 조회 오류:', error);
      alert('NEIS 학사일정 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // NEIS 학사일정 동기화
  const syncNeisHolidays = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays/sync-neis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ year: neisYear, month: neisMonth })
        }
      );

      if (!response.ok) {
        throw new Error('NEIS 동기화 실패');
      }

      const data = await response.json();
      alert(`NEIS 동기화 완료!
가져온 항목: ${data.stats.fetched}개
생성된 휴일: ${data.stats.created}개
건너뛴 항목: ${data.stats.skipped}개
주말 추가: ${data.stats.weekends}개`);
      
      setShowNeisSchedule(false);
      loadHolidays();
    } catch (error) {
      console.error('NEIS 동기화 오류:', error);
      alert('NEIS 동기화에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 수동 휴일 등록
  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newHoliday)
        }
      );

      if (response.ok) {
        setNewHoliday({ date: '', name: '', type: 'school' });
        loadHolidays();
        alert('휴일이 등록되었습니다.');
      } else {
        const error = await response.json();
        alert(error.message || '휴일 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('휴일 등록 오류:', error);
      alert('휴일 등록에 실패했습니다.');
    }
  };

  // 휴일 수정 모달 열기
  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setEditForm({
      name: holiday.name,
      type: holiday.type
    });
    setShowEditModal(true);
  };

  // 휴일 수정
  const updateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays/${editingHoliday.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editForm)
        }
      );

      if (response.ok) {
        setShowEditModal(false);
        setEditingHoliday(null);
        loadHolidays();
        alert('휴일이 수정되었습니다.');
      } else {
        const error = await response.json();
        alert(error.message || '휴일 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('휴일 수정 오류:', error);
      alert('휴일 수정에 실패했습니다.');
    }
  };

  // 휴일 삭제
  const deleteHoliday = async (id: string) => {
    if (!confirm('정말로 이 휴일을 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/holidays/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        loadHolidays();
        alert('휴일이 삭제되었습니다.');
      } else {
        const error = await response.json();
        alert(error.message || '휴일 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('휴일 삭제 오류:', error);
      alert('휴일 삭제에 실패했습니다.');
    }
  };

  // 휴일 타입별 색상
  const getTypeColor = (type: Holiday['type']) => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'school':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'weekend':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // 소스별 색상
  const getSourceColor = (source: Holiday['source']) => {
    switch (source) {
      case 'neis':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'manual':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'system':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}

      {/* NEIS 동기화 섹션 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          NEIS 학사일정 동기화
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              연도
            </label>
            <input
              type="number"
              min="2024"
              max="2030"
              value={neisYear}
              onChange={(e) => setNeisYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              월
            </label>
            <select
              value={neisMonth}
              onChange={(e) => setNeisMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}월
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchNeisSchedule}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '조회중...' : '학사일정 조회'}
            </button>
          </div>
        </div>
      </div>

      {/* 수동 휴일 등록 섹션 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          휴일 등록
        </h3>
        <form onSubmit={addHoliday} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              날짜
            </label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              휴일명
            </label>
            <input
              type="text"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              placeholder="예: 체육대회"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              유형
            </label>
            <select
              value={newHoliday.type}
              onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as Holiday['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="school">학교 휴일</option>
              <option value="national">국가 공휴일</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              등록
            </button>
          </div>
        </form>
      </div>

      {/* 휴일 목록 조회 필터 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            등록된 휴일 목록
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() + i - 1;
                return (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                );
              })}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}월
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 휴일 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  휴일명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  출처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <tr 
                    key={holiday.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => openEditModal(holiday)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(holiday.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(holiday.type)}`}>
                        {holiday.type === 'national' ? '국가공휴일' : 
                         holiday.type === 'school' ? '학교휴일' : '주말'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(holiday.source)}`}>
                        {holiday.source === 'neis' ? 'NEIS' : 
                         holiday.source === 'manual' ? '수동등록' : '시스템'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHoliday(holiday.id);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    등록된 휴일이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEIS 학사일정 미리보기 모달 */}
      {showNeisSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                NEIS 학사일정 미리보기 - {neisYear}년 {neisMonth}월
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                아래 일정을 확인한 후 "휴일 자동 등록" 버튼을 클릭하여 DB에 저장하세요.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        일정명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        휴일여부
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        등록상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {neisSchedules.map((schedule, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(schedule.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {schedule.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {schedule.isHoliday ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              휴일
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                              정상수업
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {schedule.alreadyRegistered ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              등록됨
                            </span>
                          ) : schedule.isHoliday ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              미등록
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowNeisSchedule(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={syncNeisHolidays}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-download-cloud-line mr-2"></i>
                {loading ? '등록 중...' : '휴일 자동 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴일 수정 모달 */}
      {showEditModal && editingHoliday && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                휴일 수정
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {new Date(editingHoliday.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </p>
            </div>
            
            <form onSubmit={updateHoliday} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    휴일명
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    유형
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Holiday['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="school">학교 휴일</option>
                    <option value="national">국가 공휴일</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingHoliday(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;