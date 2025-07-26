import axios from 'axios';
import type { AxiosResponse } from 'axios';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - Access Token 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 시 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 토큰 만료 에러이고 재시도하지 않은 경우
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' // 토큰 갱신 요청 자체는 제외
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // 토큰 갱신 요청
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        if (response.data.success && response.data.data) {
          const { accessToken, user } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          
          // 사용자 정보도 업데이트
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }

          // 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        console.error('토큰 갱신 실패:', refreshError);
        
        // 토큰 갱신 실패 시 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // 현재 페이지가 인증이 필요하지 않은 페이지가 아닐 때만 리다이렉트
        // 또한 이미 로그인 페이지인 경우에도 리다이렉트하지 않음
        if (!window.location.pathname.startsWith('/auth/') && window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  status?: 'pending' | 'approved' | 'rejected';
  grade?: number;
  class?: number;
  number?: number;
  student_id?: string;
  rfid_card_id?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface Student {
  id: number;
  username: string;
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  rfid_card_id?: string;
  role: 'student';
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'teacher';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  password: string;
  rfid_card_id?: string;
}

export interface UpdateStudentRequest {
  name?: string;
  grade?: number;
  class?: number;
  number?: number;
  student_id?: string;
  rfid_card_id?: string | null;
}

export interface CreateAdminRequest {
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'teacher';
}

export interface UpdateAdminRequest {
  name?: string;
  username?: string;
  password?: string;
  role?: 'admin' | 'teacher';
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminChangePasswordRequest {
  newPassword: string;
}

export interface BulkImportResult {
  created: Student[];
  errors: Array<{
    row: number;
    data: unknown;
    error: string;
  }>;
}

// 아침 출결 관련 타입 정의
export interface MorningAttendance {
  id: number;
  date: string;
  check_in_time: string;
  status: 'on_time' | 'late' | 'absent';
  // classroom: string; // 교실 구분 제거
  User?: User;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  checkInTime: string;
  status: 'present' | 'late' | 'absent';
  // classroom?: string; // 교실 구분 제거
  user?: User;
  schedule?: {
    grade: number;
    class: number;
    start_time: string;
  };
}

export interface AttendanceReport {
  id: number;
  student_id: number;
  date: string;
  type: 'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  processed_at?: string;
  processed_by?: number;
  processor_response?: string;
  attachments?: string[];
  admin_created: boolean;
  notes?: string;
  student?: User;
  processor?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface UnprocessedAttendance {
  student: User;
  morningAttendance?: MorningAttendance;
  status: 'absent' | 'late';
  checkInTime?: string;
}

export interface AttendanceStats {
  on_time: number;
  late: number;
  absent: number;
  total: number;
}

export interface RFIDTagRequest {
  rfid_uid: string;
  reader_location: string;
  timestamp?: string;
}

export interface QRScanRequest {
  student_id: string;
  qr_token: string;
}

export interface AttendanceResponse {
  success: boolean;
  type: 'morning';
  status: 'on_time' | 'late';
  message: string;
  student: {
    name: string;
    grade: number;
    class: number;
    number: number;
  };
}

export interface QRCode {
  id: number;
  // classroom: string; // 교실 구분 제거
  qr_token: string;
  qr_url: string;
  is_active: boolean;
  created_at: string;
}

// 인증 API
export const authApi = {
  // 로그인
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await api.post('/auth/login', data);
    return response.data;
  },

  // 회원가입
  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/register', data);
    return response.data;
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.get('/auth/me');
    return response.data;
  },

  // 토큰 갱신
  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
    const response: AxiosResponse<ApiResponse<{ accessToken: string; refreshToken: string }>> = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // 로그아웃
  logout: async (refreshToken: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/logout', { refreshToken });
    return response.data;
  }
};

// 사용자 관리 API
export const userApi = {
  // 학생 목록 조회
  getStudents: async (params?: {
    grade?: number;
    class?: number;
    search?: string;
  }): Promise<ApiResponse<Student[]>> => {
    const response: AxiosResponse<ApiResponse<Student[]>> = await api.get('/users/students', { params });
    return response.data;
  },

  // 학생 생성
  createStudent: async (data: CreateStudentRequest): Promise<ApiResponse<Student>> => {
    const response: AxiosResponse<ApiResponse<Student>> = await api.post('/users/students', data);
    return response.data;
  },

  // 학생 정보 수정
  updateStudent: async (studentId: number, data: UpdateStudentRequest): Promise<ApiResponse<Student>> => {
    const response: AxiosResponse<ApiResponse<Student>> = await api.put(`/users/students/${studentId}`, data);
    return response.data;
  },

  // 학생 삭제
  deleteStudent: async (studentId: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/users/students/${studentId}`);
    return response.data;
  },

  // 관리자/교사 목록 조회
  getAdmins: async (): Promise<ApiResponse<Admin[]>> => {
    const response: AxiosResponse<ApiResponse<Admin[]>> = await api.get('/users/admins');
    return response.data;
  },

  // 관리자/교사 생성
  createAdmin: async (data: CreateAdminRequest): Promise<ApiResponse<Admin>> => {
    const response: AxiosResponse<ApiResponse<Admin>> = await api.post('/users/admins', data);
    return response.data;
  },

  // 관리자/교사 정보 수정
  updateAdmin: async (adminId: number, data: UpdateAdminRequest): Promise<ApiResponse<Admin>> => {
    const response: AxiosResponse<ApiResponse<Admin>> = await api.put(`/users/admins/${adminId}`, data);
    return response.data;
  },

  // 관리자/교사 삭제
  deleteAdmin: async (adminId: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/users/admins/${adminId}`);
    return response.data;
  },

  // 계정 승인
  approveAdmin: async (adminId: number): Promise<ApiResponse<Admin>> => {
    const response: AxiosResponse<ApiResponse<Admin>> = await api.put(`/users/admins/${adminId}/approve`);
    return response.data;
  },

  // 계정 거부
  rejectAdmin: async (adminId: number): Promise<ApiResponse<Admin>> => {
    const response: AxiosResponse<ApiResponse<Admin>> = await api.put(`/users/admins/${adminId}/reject`);
    return response.data;
  },

  // 학생 비밀번호 변경
  changeStudentPassword: async (studentId: number, data: ChangePasswordRequest): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put(`/users/students/${studentId}/change-password`, data);
    return response.data;
  },

  // 관리자 비밀번호 변경 (자신의 비밀번호)
  changeAdminPassword: async (adminId: number, data: ChangePasswordRequest): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put(`/users/admins/${adminId}/change-password`, data);
    return response.data;
  },
  // 관리자가 다른 사용자 비밀번호 변경
  adminChangeUserPassword: async (userId: number, userType: 'student' | 'admin', data: AdminChangePasswordRequest): Promise<ApiResponse> => {
    const endpoint = userType === 'student' ? 
      `/users/students/${userId}/change-password` : 
      `/users/admins/${userId}/change-password`;
    const response: AxiosResponse<ApiResponse> = await api.put(endpoint, data);
    return response.data;
  },

  // 학생 일괄 삭제
  bulkDeleteStudents: async (ids: number[]): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/users/students/bulk-delete', { ids });
    return response.data;
  },

  // 관리자 일괄 삭제
  bulkDeleteAdmins: async (ids: number[]): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/users/admins/bulk-delete', { ids });
    return response.data;
  },

  // Excel 템플릿 다운로드
  downloadTemplate: async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/students/template`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Template download failed');
      }

      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `학생등록_템플릿_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1]);
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      throw error;
    }
  },

  // Excel 파일로 학생 일괄 등록
  bulkImportStudents: async (file: File): Promise<ApiResponse<BulkImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<ApiResponse<BulkImportResult>> = await api.post('/users/students/bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 학생 목록 Excel 다운로드
  exportStudents: async (filters?: { grade?: number; class?: number }): Promise<void> => {
    const params = new URLSearchParams();
    if (filters?.grade) params.append('grade', filters.grade.toString());
    if (filters?.class) params.append('class', filters.class.toString());

    const url = `${API_BASE_URL}/users/students/export${params.toString() ? `?${params.toString()}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // 파일명 생성
      const filterStr = filters?.grade && filters?.class ? `_${filters.grade}학년_${filters.class}반` : 
                       filters?.grade ? `_${filters.grade}학년` : 
                       filters?.class ? `_${filters.class}반` : '';
      const filename = `학생목록${filterStr}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Students export failed:', error);
      throw error;
    }
  }
};

// 아침 출결 API
export const attendanceApi = {
  // RFID 태그 처리
  rfidTag: async (data: RFIDTagRequest): Promise<ApiResponse<AttendanceResponse>> => {
    const response: AxiosResponse<ApiResponse<AttendanceResponse>> = await api.post('/attendance/rfid-tag', data);
    return response.data;
  },

  // QR코드 스캔 처리
  qrScan: async (data: QRScanRequest): Promise<ApiResponse<AttendanceResponse>> => {
    const response: AxiosResponse<ApiResponse<AttendanceResponse>> = await api.post('/attendance/qr-scan', data);
    return response.data;
  },

  // 출결 현황 조회 (관리자용)
  getRecords: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    grade?: number;
    class?: number;
    status?: 'on_time' | 'late' | 'absent';
  }): Promise<ApiResponse<{
    data: MorningAttendance[];
    summary?: AttendanceStats;
    date?: string;
    dateRange?: { startDate: string; endDate: string } | { date: string };
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      data: MorningAttendance[];
      summary?: AttendanceStats;
      date?: string;
      dateRange?: { startDate: string; endDate: string } | { date: string };
    }>> = await api.get('/attendance/records', { params });
    return response.data;
  },

  // 출결 상태 수동 변경 (관리자용)
  updateRecord: async (recordId: number, data: {
    status: 'on_time' | 'late' | 'absent';
    check_in_time?: string;
  }): Promise<ApiResponse<MorningAttendance>> => {
    const response: AxiosResponse<ApiResponse<MorningAttendance>> = await api.put(`/attendance/records/${recordId}`, data);
    return response.data;
  },

  // 개인 출결 조회 (학생용)
  getMyRecords: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<MorningAttendance[]>> => {
    const response: AxiosResponse<ApiResponse<MorningAttendance[]>> = await api.get('/attendance/records/my', { params });
    return response.data;
  },

  // 출결 통계 조회
  getStats: async (params?: {
    year?: number;
    month?: number;
    grade?: number;
    class?: number;
  }): Promise<ApiResponse<{
    data: Array<{ status: string; count: number }>;
    period: { year: number; month: number };
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      data: Array<{ status: string; count: number }>;
      period: { year: number; month: number };
    }>> = await api.get('/attendance/stats', { params });
    return response.data;
  },

  // 출결 신고 목록 조회 (관리자용)
  getReports: async (params?: {
    date?: string;
    type?: string;
    status?: string;
    grade?: number;
    class?: number;
    student_id?: number;
  }): Promise<ApiResponse<AttendanceReport[]>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport[]>> = await api.get('/attendance/reports', { params });
    return response.data;
  },

  // 출결 신고 생성 (학생용)
  createReport: async (data: {
    date: string;
    type: 'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave';
    reason: string;
    attachments?: string[];
  }): Promise<ApiResponse<AttendanceReport>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport>> = await api.post('/attendance/reports', data);
    return response.data;
  },

  // 출결 신고 생성 (관리자용)
  createAdminReport: async (data: {
    student_id: number;
    date: string;
    type: 'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave';
    reason: string;
    notes?: string;
  }): Promise<ApiResponse<AttendanceReport>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport>> = await api.post('/attendance/reports/admin', data);
    return response.data;
  },

  // 출결 신고 처리 (승인/거절)
  processReport: async (reportId: number, data: {
    action: 'approve' | 'reject';
    notes?: string;
  }): Promise<ApiResponse<AttendanceReport>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport>> = await api.put(`/attendance/reports/${reportId}/process`, data);
    return response.data;
  },

  // 미처리 출결 목록 조회 (관리자용)
  getUnprocessedAttendances: async (params?: {
    date?: string;
    grade?: number;
    class?: number;
  }): Promise<ApiResponse<UnprocessedAttendance[]>> => {
    const response: AxiosResponse<ApiResponse<UnprocessedAttendance[]>> = await api.get('/attendance/unprocessed', { params });
    return response.data;
  },

  // 출결 정정 (관리자용)
  correctAttendance: async (studentId: number, data: {
    date?: string;
    new_status: 'on_time' | 'late' | 'absent';
    reason?: string;
  }): Promise<ApiResponse<{
    student_id: number;
    date: string;
    new_status: string;
    attendance_record: MorningAttendance | null;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      student_id: number;
      date: string;
      new_status: string;
      attendance_record: MorningAttendance | null;
    }>> = await api.put(`/attendance/correct/${studentId}`, data);
    return response.data;
  },

  // 내 출결 신고 목록 조회 (학생용)
  getMyReports: async (): Promise<ApiResponse<AttendanceReport[]>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport[]>> = await api.get('/attendance/reports/my');
    return response.data;
  },

  // 출결 신고 제출 (학생용)
  submitReport: async (data: {
    date: string;
    type: 'absence' | 'late' | 'early_leave' | 'sick_leave' | 'official_leave';
    reason: string;
    attachments?: string[];
  }): Promise<ApiResponse<AttendanceReport>> => {
    const response: AxiosResponse<ApiResponse<AttendanceReport>> = await api.post('/attendance/reports', data);
    return response.data;
  },

  // 출결기록 Excel 다운로드
  exportAttendanceRecords: async (filters?: {
    startDate?: string;
    endDate?: string;
    grade?: number;
    class?: number;
    status?: string;
  }): Promise<void> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.grade) params.append('grade', filters.grade.toString());
    if (filters?.class) params.append('class', filters.class.toString());
    if (filters?.status) params.append('status', filters.status);

    const url = `${API_BASE_URL}/attendance/records/export${params.toString() ? `?${params.toString()}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Attendance records export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // 파일명 생성
      const dateStr = filters?.startDate && filters?.endDate && filters.startDate !== filters.endDate 
        ? `_${filters.startDate}_${filters.endDate}` 
        : filters?.startDate 
        ? `_${filters.startDate}` 
        : `_${new Date().toISOString().slice(0, 10)}`;
      const filterStr = filters?.grade && filters?.class ? `_${filters.grade}학년_${filters.class}반` : 
                       filters?.grade ? `_${filters.grade}학년` : 
                       filters?.class ? `_${filters.class}반` : '';
      const filename = `출결기록${filterStr}${dateStr}.xlsx`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Attendance records export failed:', error);
      throw error;
    }
  },

  // 출결신고 목록 Excel 다운로드
  exportAttendanceReports: async (filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
    grade?: number;
    class?: number;
  }): Promise<void> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.grade) params.append('grade', filters.grade.toString());
    if (filters?.class) params.append('class', filters.class.toString());

    const url = `${API_BASE_URL}/attendance/reports/export${params.toString() ? `?${params.toString()}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Attendance reports export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // 파일명 생성
      const dateStr = filters?.startDate && filters?.endDate && filters.startDate !== filters.endDate 
        ? `_${filters.startDate}_${filters.endDate}` 
        : filters?.startDate 
        ? `_${filters.startDate}` 
        : `_${new Date().toISOString().slice(0, 10)}`;
      const filterStr = filters?.grade && filters?.class ? `_${filters.grade}학년_${filters.class}반` : 
                       filters?.grade ? `_${filters.grade}학년` : 
                       filters?.class ? `_${filters.class}반` : '';
      const filename = `출결신고${filterStr}${dateStr}.xlsx`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Attendance reports export failed:', error);
      throw error;
    }
  }
};

// QR코드 관리 API
export const qrApi = {
  // 활성 QR코드 조회
  getActiveQR: async (): Promise<ApiResponse<QRCode>> => {
    const response: AxiosResponse<ApiResponse<QRCode>> = await api.get('/qr/active');
    return response.data;
  },

  // QR코드 생성 (관리자용)
  generateQR: async (): Promise<ApiResponse<QRCode>> => {
    const response: AxiosResponse<ApiResponse<QRCode>> = await api.post('/qr/generate');
    return response.data;
  },

  // 모든 QR코드 목록 조회 (관리자용)
  getAllQRs: async (params?: { is_active?: boolean }): Promise<ApiResponse<QRCode[]>> => {
    const response: AxiosResponse<ApiResponse<QRCode[]>> = await api.get('/qr/all', { params });
    return response.data;
  },

  // QR코드 활성화/비활성화 (관리자용)
  toggleQR: async (qrId: number): Promise<ApiResponse<{ id: number; is_active: boolean; message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ id: number; is_active: boolean; message: string }>> = await api.put(`/qr/${qrId}/toggle`);
    return response.data;
  },

  // QR코드 삭제 (관리자용)
  deleteQR: async (qrId: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/qr/${qrId}`);
    return response.data;
  }
};

// RFID 관리 API
export const rfidApi = {
  // RFID 태그 확인 (폴링용)
  checkTag: async (readerLocation: string): Promise<{
    hasNewTag: boolean;
    uid?: string;
    timestamp?: string;
    reader_location?: string;
  }> => {
    const response: AxiosResponse<{
      hasNewTag: boolean;
      uid?: string;
      timestamp?: string;
      reader_location?: string;
    }> = await api.get('/rfid/check-tag', {
      headers: { 'X-Reader-Location': readerLocation }
    });
    return response.data;
  },

  // RFID 등록 학생 목록 조회
  getStudents: async (params?: {
    grade?: number;
    class?: number;
    has_rfid?: boolean;
  }): Promise<ApiResponse<{
    data: User[];
    statistics: {
      total_students: number;
      students_with_rfid: number;
      students_without_rfid: number;
      registration_rate: number;
    };
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      data: User[];
      statistics: {
        total_students: number;
        students_with_rfid: number;
        students_without_rfid: number;
        registration_rate: number;
      };
    }>> = await api.get('/rfid/students', { params });
    return response.data;
  },

  // 학생에게 RFID 카드 할당
  assignCard: async (data: {
    student_id: number;
    rfid_card_id: string;
  }): Promise<ApiResponse<{
    student: User;
    rfid_card_id: string;
    previous_card_id?: string;
    assigned_at: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      student: User;
      rfid_card_id: string;
      previous_card_id?: string;
      assigned_at: string;
    }>> = await api.post('/rfid/assign-card', data);
    return response.data;
  },

  // 학생의 RFID 카드 할당 해제
  unassignCard: async (data: {
    student_id: number;
  }): Promise<ApiResponse<{
    student: User;
    previous_card_id: string;
    unassigned_at: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      student: User;
      previous_card_id: string;
      unassigned_at: string;
    }>> = await api.post('/rfid/unassign-card', data);
    return response.data;
  },

  // RFID 카드 정보 조회
  getCardInfo: async (cardId: string): Promise<ApiResponse<{
    card_id: string;
    user: User;
    registered_at: string;
    is_active: boolean;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      card_id: string;
      user: User;
      registered_at: string;
      is_active: boolean;
    }>> = await api.get(`/rfid/card-info/${cardId}`);
    return response.data;
  },

  // RFID 카드에 학생 정보 쓰기 (Arduino 연동)
  writeCard: async (data: {
    student_id: string;
    student_name: string;
    card_id?: string;
  }): Promise<ApiResponse<{
    written_card_id: string;
    student_id: string;
    student_name: string;
    timestamp: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      written_card_id: string;
      student_id: string;
      student_name: string;
      timestamp: string;
    }>> = await api.post('/rfid/write-card', data);
    return response.data;
  },

  // 사용 가능한 시리얼 포트 목록 조회
  getPorts: async (): Promise<ApiResponse<Array<{
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    vendorId?: string;
    productId?: string;
  }>>> => {
    const response: AxiosResponse<ApiResponse<Array<{
      path: string;
      manufacturer?: string;
      serialNumber?: string;
      pnpId?: string;
      vendorId?: string;
      productId?: string;
    }>>> = await api.get('/rfid/ports');
    return response.data;
  },

  // Arduino 포트 연결
  connect: async (data: {
    port: string;
    baudRate?: number;
    pageId?: string;
    // classroom?: string; // 교실 구분 제거
  }): Promise<ApiResponse<{
    port: string;
    baudRate: number;
    // classroom: string; // 교실 구분 제거
    connected_at: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      port: string;
      baudRate: number;
      // classroom: string; // 교실 구분 제거
      connected_at: string;
    }>> = await api.post('/rfid/connect', data);
    return response.data;
  },

  // Arduino 연결 해제
  disconnect: async (): Promise<ApiResponse<void>> => {
    const response: AxiosResponse<ApiResponse<void>> = await api.post('/rfid/disconnect');
    return response.data;
  },

  // RFID 리더기 상태 조회
  getReaderStatus: async (): Promise<ApiResponse<{
    connected: boolean;
    port: string;
    baudRate?: number;
    // classroom?: string; // 교실 구분 제거
    last_ping: string | null;
    reader_info: {
      model: string;
      version: string;
    };
    mock_mode?: boolean;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      connected: boolean;
      port: string;
      baudRate?: number;
      // classroom?: string; // 교실 구분 제거
      last_ping: string | null;
      reader_info: {
        model: string;
        version: string;
      };
      mock_mode?: boolean;
    }>> = await api.get('/rfid/reader-status');
    return response.data;
  },

  // RFID 태그 로그 조회 (관리자용)
  getLogs: async (params?: {
    limit?: number;
    offset?: number;
    // classroom?: string; // 교실 구분 제거
    start_date?: string;
    end_date?: string;
  }): Promise<{
    logs: Array<{
      id: number;
      user_id: number;
      rfid_card_id: string;
      tag_time: string;
      // classroom: string; // 교실 구분 제거
      raw_data: string;
      user?: User;
    }>;
    total: number;
    hasMore: boolean;
  }> => {
    const response: AxiosResponse<{
      logs: Array<{
        id: number;
        user_id: number;
        rfid_card_id: string;
        tag_time: string;
        // classroom: string; // 교실 구분 제거
        raw_data: string;
        user?: User;
      }>;
      total: number;
      hasMore: boolean;
    }> = await api.get('/rfid/logs', { params });
    return response.data;
  },

};

// 휴일 관리 API
export const holidayApi = {
  // 휴일 목록 조회
  getHolidays: async (params?: {
    year?: number;
    month?: number;
    type?: 'national' | 'school' | 'weekend';
    is_active?: boolean;
  }): Promise<ApiResponse<Holiday[]>> => {
    const response: AxiosResponse<ApiResponse<Holiday[]>> = await api.get('/holidays', { params });
    return response.data;
  },

  // 휴일 등록
  createHoliday: async (data: {
    date: string;
    name: string;
    type: 'national' | 'school';
  }): Promise<ApiResponse<Holiday>> => {
    const response: AxiosResponse<ApiResponse<Holiday>> = await api.post('/holidays', data);
    return response.data;
  },

  // 휴일 수정
  updateHoliday: async (holidayId: number, data: {
    name?: string;
    type?: 'national' | 'school';
    is_active?: boolean;
  }): Promise<ApiResponse<Holiday>> => {
    const response: AxiosResponse<ApiResponse<Holiday>> = await api.put(`/holidays/${holidayId}`, data);
    return response.data;
  },

  // 휴일 삭제
  deleteHoliday: async (holidayId: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/holidays/${holidayId}`);
    return response.data;
  },

  // 특정 날짜 휴일 여부 확인
  checkHoliday: async (date: string): Promise<{
    success: boolean;
    is_holiday: boolean;
    holiday?: {
      name: string;
      type: 'national' | 'school' | 'weekend';
      source: 'manual' | 'neis' | 'system';
    };
  }> => {
    const response: AxiosResponse<{
      success: boolean;
      is_holiday: boolean;
      holiday?: {
        name: string;
        type: 'national' | 'school' | 'weekend';
        source: 'manual' | 'neis' | 'system';
      };
    }> = await api.get(`/holidays/check/${date}`);
    return response.data;
  }
};

// Holiday 인터페이스 추가
export interface Holiday {
  id: number | string;
  date: string;
  name: string;
  type: 'national' | 'school' | 'weekend';
  source: 'manual' | 'neis' | 'system';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  creator?: {
    id: number;
    name: string;
    role: string;
  };
}

export default api;