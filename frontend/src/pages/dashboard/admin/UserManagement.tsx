import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { userApi, type Student, type CreateStudentRequest, type CreateAdminRequest, type BulkImportResult } from '../../../services/api';
import {
  EditStudentModal,
  EditAdminModal,
  DeleteConfirmModal,
  AddModal,
  ChangePasswordModal
} from '../../../components/modals';

interface Admin {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'teacher';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

type TabType = 'students' | 'admins' | 'profile';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Filter states
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  
  // Pagination states
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const [currentAdminPage, setCurrentAdminPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const itemsPerPageOptions = [15, 30, 50, 100];
  
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
  
  // Set default sort on tab change
  useEffect(() => {
    if (activeTab === 'students') {
      setSortField('student_id');
      setSortDirection('asc');
    } else if (activeTab === 'admins') {
      setSortField('name');
      setSortDirection('asc');
    }
  }, [activeTab]);
  
  // Modal states
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  
  // Teacher profile states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Excel 관련 상태
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<BulkImportResult | null>(null);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Only admins can see admin management tab
  const canManageAdmins = user?.role === 'admin';

  // 데이터 로드
  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getStudents();
      if (response.success) {
        setStudents(response.data || []);
      } else {
        setError(response.message || '학생 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('학생 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getAdmins();
      if (response.success) {
        setAdmins(response.data || []);
      } else {
        setError(response.message || '관리자 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted data
  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        student.name.toLowerCase().includes(searchLower) ||
        student.student_id.toLowerCase().includes(searchLower) ||
        `${student.grade}${student.class}${student.number}`.includes(searchTerm)
      );
      
      const matchesGrade = !gradeFilter || student.grade.toString() === gradeFilter;
      const matchesClass = !classFilter || student.class.toString() === classFilter;
      
      return matchesSearch && matchesGrade && matchesClass;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField as keyof Student] as string | number;
        let bVal: string | number = b[sortField as keyof Student] as string | number;
        
        if (sortField === 'class') {
          aVal = `${a.grade}${a.class}`;
          bVal = `${b.grade}${b.class}`;
        }
        
        // 학번은 숫자로 정렬
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
  }, [students, searchTerm, gradeFilter, classFilter, sortField, sortDirection]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentStudentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedStudents.slice(startIndex, endIndex);
  }, [filteredAndSortedStudents, currentStudentPage, itemsPerPage]);

  const totalStudentPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);

  const filteredAndSortedAdmins = useMemo(() => {
    const filtered = admins.filter(admin => {
      const searchLower = searchTerm.toLowerCase();
      return (
        admin.name.toLowerCase().includes(searchLower) ||
        admin.username.toLowerCase().includes(searchLower) ||
        admin.role.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField as keyof Admin] as string | number;
        let bVal: string | number = b[sortField as keyof Admin] as string | number;
        
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
  }, [admins, searchTerm, sortField, sortDirection]);

  // Paginated admins
  const paginatedAdmins = useMemo(() => {
    const startIndex = (currentAdminPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedAdmins.slice(startIndex, endIndex);
  }, [filteredAndSortedAdmins, currentAdminPage, itemsPerPage]);

  const totalAdminPages = Math.ceil(filteredAndSortedAdmins.length / itemsPerPage);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Modal handlers
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsEditAdminModalOpen(true);
  };

  const handleDeleteAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const handleChangeStudentPassword = (student: Student) => {
    setSelectedStudent(student);
    setIsChangePasswordModalOpen(true);
  };

  const handleChangeAdminPassword = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsChangePasswordModalOpen(true);
  };

  // API handlers
  const handleUpdateStudent = async (id: number, data: Partial<Student>) => {
    try {
      const response = await userApi.updateStudent(id, data);
      if (response.success) {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
        setIsEditStudentModalOpen(false);
        setSelectedStudent(null);
      } else {
        setError(response.message || '학생 정보 수정에 실패했습니다.');
      }
    } catch (err) {
      setError('학생 정보 수정에 실패했습니다.');
      console.error('Error updating student:', err);
    }
  };

  const handleDeleteStudentConfirm = async () => {
    if (!selectedStudent) return;
    
    try {
      const response = await userApi.deleteStudent(selectedStudent.id);
      if (response.success) {
        setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
        setIsDeleteModalOpen(false);
        setSelectedStudent(null);
      } else {
        setError(response.message || '학생 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('학생 삭제에 실패했습니다.');
      console.error('Error deleting student:', err);
    }
  };

  const handleUpdateAdmin = async (id: number, data: Partial<Admin>) => {
    try {
      const response = await userApi.updateAdmin(id, data);
      if (response.success) {
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
        setIsEditAdminModalOpen(false);
        setSelectedAdmin(null);
      } else {
        setError(response.message || '관리자 정보 수정에 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 정보 수정에 실패했습니다.');
      console.error('Error updating admin:', err);
    }
  };

  const handleDeleteAdminConfirm = async () => {
    if (!selectedAdmin) return;
    
    try {
      const response = await userApi.deleteAdmin(selectedAdmin.id);
      if (response.success) {
        setAdmins(prev => prev.filter(a => a.id !== selectedAdmin.id));
        setIsDeleteModalOpen(false);
        setSelectedAdmin(null);
      } else {
        setError(response.message || '관리자 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 삭제에 실패했습니다.');
      console.error('Error deleting admin:', err);
    }
  };

  const handleChangePasswordConfirm = async (password: string) => {
    try {
      let response;
      if (selectedStudent) {
        response = await userApi.changeStudentPassword(selectedStudent.id, { newPassword: password });
      } else if (selectedAdmin) {
        response = await userApi.changeAdminPassword(selectedAdmin.id, { newPassword: password });
      } else {
        return;
      }

      if (response.success) {
        setIsChangePasswordModalOpen(false);
        setSelectedStudent(null);
        setSelectedAdmin(null);
      } else {
        setError(response.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      setError('비밀번호 변경에 실패했습니다.');
      console.error('Error changing password:', err);
    }
  };

  const handleCreateStudent = async (data: CreateStudentRequest) => {
    try {
      const response = await userApi.createStudent(data);
      if (response.success && response.data) {
        setStudents(prev => [...prev, response.data!]);
        setIsAddModalOpen(false);
      } else {
        setError(response.message || '학생 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('학생 생성에 실패했습니다.');
      console.error('Error creating student:', err);
    }
  };

  const handleCreateAdmin = async (data: CreateAdminRequest) => {
    try {
      const response = await userApi.createAdmin(data);
      if (response.success && response.data) {
        setAdmins(prev => [...prev, response.data!]);
        setIsAddModalOpen(false);
      } else {
        setError(response.message || '관리자 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 생성에 실패했습니다.');
      console.error('Error creating admin:', err);
    }
  };

  // 관리자 승인 핸들러
  const handleApproveAdmin = async (admin: Admin) => {
    try {
      const response = await userApi.approveAdmin(admin.id);
      if (response.success && response.data) {
        setAdmins(prev => prev.map(a => a.id === admin.id ? response.data! : a));
      } else {
        setError(response.message || '관리자 승인에 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 승인에 실패했습니다.');
      console.error('Error approving admin:', err);
    }
  };

  // 관리자 거부 핸들러
  const handleRejectAdmin = async (admin: Admin) => {
    try {
      const response = await userApi.rejectAdmin(admin.id);
      if (response.success && response.data) {
        setAdmins(prev => prev.map(a => a.id === admin.id ? response.data! : a));
      } else {
        setError(response.message || '관리자 거부에 실패했습니다.');
      }
    } catch (err) {
      setError('관리자 거부에 실패했습니다.');
      console.error('Error rejecting admin:', err);
    }
  };

  // Teacher password change handlers
  const handleTeacherPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      if (!user?.id) {
        setError('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      const response = await userApi.changeAdminPassword(user.id, {
        newPassword: passwordData.newPassword
      });

      if (response.success) {
        setSuccessMessage('비밀번호가 성공적으로 변경되었습니다.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setIsChangingPassword(false);
      } else {
        setError(response.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.';
      setError(errorMessage);
      console.error('Error changing teacher password:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  // Excel 관련 핸들러
  const handleDownloadTemplate = async () => {
    try {
      await userApi.downloadTemplate();
    } catch (error) {
      setError('템플릿 다운로드에 실패했습니다.');
      console.error('Template download error:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 형식 검증
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Excel 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      const response = await userApi.bulkImportStudents(file);
      
      if (response.success) {
        setUploadResults(response.data!);
        setShowUploadResults(true);
        
        // 성공적으로 등록된 학생이 있으면 목록 새로고침
        if (response.data!.created.length > 0) {
          loadStudents();
        }
      } else {
        setError(response.message || 'Excel 파일 업로드에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Excel 파일 업로드 중 오류가 발생했습니다.');
      console.error('Bulk import error:', error);
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  const handleExportStudents = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      // 현재 필터 적용하여 내보내기
      const filters: { grade?: number; class?: number } = {};
      if (gradeFilter) filters.grade = parseInt(gradeFilter);
      if (classFilter) filters.class = parseInt(classFilter);
      
      await userApi.exportStudents(filters);
    } catch (error: any) {
      setError(error.message || '학생 목록 내보내기에 실패했습니다.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const closeUploadResults = () => {
    setShowUploadResults(false);
    setUploadResults(null);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    } else if (activeTab === 'admins' && canManageAdmins) {
      loadAdmins();
    }
  }, [activeTab, canManageAdmins]);

  // Reset search, filters, and pagination when tab changes
  useEffect(() => {
    setSearchTerm('');
    setGradeFilter('');
    setClassFilter('');
    setCurrentStudentPage(1);
    setCurrentAdminPage(1);
    // Don't reset sort field and direction as they are set by the default sort effect above
  }, [activeTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentStudentPage(1);
  }, [searchTerm, gradeFilter, classFilter]);

  useEffect(() => {
    setCurrentAdminPage(1);
  }, [searchTerm]);

  // Reset pagination when items per page changes
  useEffect(() => {
    setCurrentStudentPage(1);
    setCurrentAdminPage(1);
  }, [itemsPerPage]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  // Mobile Student Card Component
  const MobileStudentCard = ({ student }: { student: Student }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{student.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{student.student_id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {student.grade}학년 {student.class}반 {student.number}번
            </span>
            {student.rfid_card_id ? (
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                RFID 등록됨
              </span>
            ) : (
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full">
                RFID 미등록
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            관리 메뉴
            <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
              <button 
                onClick={() => {
                  handleEditStudent(student);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-t-lg"
              >
                수정
              </button>
              <button 
                onClick={() => {
                  handleChangeStudentPassword(student);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600 dark:text-green-400"
              >
                비밀번호 변경
              </button>
              <button 
                onClick={() => {
                  handleDeleteStudent(student);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 rounded-b-lg"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mobile Admin Card Component
  const MobileAdminCard = ({ admin }: { admin: Admin }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{admin.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{admin.username}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              admin.role === 'admin' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            }`}>
              {admin.role === 'admin' ? '관리자' : '교사'}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              admin.status === 'approved' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : admin.status === 'pending'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}>
              {admin.status === 'approved' ? '승인됨' : admin.status === 'pending' ? '대기중' : '거부됨'}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          등록일: {new Date(admin.createdAt).toLocaleDateString('ko-KR')}
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            관리 메뉴
            <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
              {admin.status === 'pending' && (
                <>
                  <button 
                    onClick={() => {
                      handleApproveAdmin(admin);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600 dark:text-green-400 rounded-t-lg"
                  >
                    승인
                  </button>
                  <button 
                    onClick={() => {
                      handleRejectAdmin(admin);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                  >
                    거부
                  </button>
                </>
              )}
              <button 
                onClick={() => {
                  handleEditAdmin(admin);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
              >
                수정
              </button>
              <button 
                onClick={() => {
                  handleChangeAdminPassword(admin);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600 dark:text-green-400"
              >
                비밀번호 변경
              </button>
              <button 
                onClick={() => {
                  handleDeleteAdmin(admin);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 rounded-b-lg"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentManagement = () => (
    <div className="space-y-6">
      {/* Header with Add Button and Excel Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button 
            onClick={() => {
              setSelectedStudent(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl transition-all duration-300 font-medium text-sm sm:text-base"
          >
            + 학생 추가
          </button>
          
          {/* Excel Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadTemplate}
              className="px-3 sm:px-4 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl transition-all duration-300 font-medium text-xs sm:text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">템플릿 다운로드</span>
              <span className="sm:hidden">템플릿</span>
            </button>
            
            <label className="px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all duration-300 font-medium text-xs sm:text-sm flex items-center gap-2 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden sm:inline">
                {isUploading ? '업로드 중...' : 'Excel 업로드'}
              </span>
              <span className="sm:hidden">
                {isUploading ? '업로드 중...' : '업로드'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            
            <button 
              onClick={handleExportStudents}
              disabled={isExporting}
              className="px-3 sm:px-4 py-2 sm:py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-2xl transition-all duration-300 font-medium text-xs sm:text-sm flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-4-4-4 4M4 12l4 4 4-4" />
              </svg>
              <span className="hidden sm:inline">
                {isExporting ? '내보내는 중...' : '목록 다운로드'}
              </span>
              <span className="sm:hidden">
                {isExporting ? '내보내는 중...' : '다운로드'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <div className="relative w-full sm:flex-1">
            <input
              type="text"
              placeholder="이름, 학번, 학년/반으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 text-sm sm:text-base"
            />
            <svg className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">페이지당</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-xs sm:text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}명</option>
                ))}
              </select>
            </div>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              총 {filteredAndSortedStudents.length}명 ({currentStudentPage}/{totalStudentPages} 페이지)
            </span>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 text-sm"
            >
              <option value="">전체 학년</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 text-sm"
            >
              <option value="">전체 반</option>
              <option value="1">1반</option>
              <option value="2">2반</option>
              <option value="3">3반</option>
              <option value="4">4반</option>
              <option value="5">5반</option>
              <option value="6">6반</option>
              <option value="7">7반</option>
              <option value="8">8반</option>
              <option value="9">9반</option>
              <option value="10">10반</option>
            </select>
          </div>
          {(gradeFilter || classFilter) && (
            <button
              onClick={() => {
                setGradeFilter('');
                setClassFilter('');
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
        </div>
      )}

      {/* Students Table/Cards - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:shadow-xl">
        {isMobileView ? (
          // Mobile Card View
          <div className="p-4">
            {!loading && paginatedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm || gradeFilter || classFilter ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {paginatedStudents.map((student) => (
                  <MobileStudentCard key={student.id} student={student} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Desktop Table View
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                      학년/반/번호
                      {sortField === 'class' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">RFID 카드</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {!loading && paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm || gradeFilter || classFilter ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{student.student_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.grade}학년 {student.class}반 {student.number}번</td>
                      <td className="px-6 py-4 text-sm">
                        {student.rfid_card_id ? (
                          <span className="inline-flex px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                            등록됨
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full">
                            미등록
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => handleEditStudent(student)}
                            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            수정
                          </button>
                          <button 
                            onClick={() => handleChangeStudentPassword(student)}
                            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            비밀번호
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student)}
                            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Pagination */}
      {totalStudentPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentStudentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentStudentPage === 1}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentStudentPage(page)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  currentStudentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentStudentPage(prev => Math.min(prev + 1, totalStudentPages))}
            disabled={currentStudentPage === totalStudentPages}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );

  const renderAdminManagement = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <button 
          onClick={() => {
            setSelectedAdmin(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl transition-all duration-300 font-medium text-sm sm:text-base self-start sm:self-auto"
        >
          + 관리자 추가
        </button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
        <div className="relative w-full sm:flex-1">
          <input
            type="text"
            placeholder="이름, 아이디, 역할로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 text-sm sm:text-base"
          />
          <svg className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">페이지당</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="text-xs sm:text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}명</option>
              ))}
            </select>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            총 {filteredAndSortedAdmins.length}명 ({currentAdminPage}/{totalAdminPages} 페이지)
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</span>
        </div>
      )}

      {/* Admins Table/Cards - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:shadow-xl">
        {isMobileView ? (
          // Mobile Card View
          <div className="p-4">
            {!loading && paginatedAdmins.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 관리자가 없습니다.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {paginatedAdmins.map((admin) => (
                  <MobileAdminCard key={admin.id} admin={admin} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Desktop Table View
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
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
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-2">
                      아이디
                      {sortField === 'username' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      역할
                      {sortField === 'role' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      상태
                      {sortField === 'status' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      등록일
                      {sortField === 'createdAt' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {!loading && paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? '검색 결과가 없습니다.' : '등록된 관리자가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{admin.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{admin.username}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          admin.role === 'admin' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}>
                          {admin.role === 'admin' ? '관리자' : '교사'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          admin.status === 'approved' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : admin.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        }`}>
                          {admin.status === 'approved' ? '승인됨' : admin.status === 'pending' ? '대기중' : '거부됨'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(admin.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-1 flex-wrap gap-1">
                          {admin.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApproveAdmin(admin)}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 hover:scale-105"
                              >
                                승인
                              </button>
                              <button 
                                onClick={() => handleRejectAdmin(admin)}
                                className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300 hover:scale-105"
                              >
                                거부
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleEditAdmin(admin)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg transition-all duration-300 hover:scale-105"
                          >
                            수정
                          </button>
                          <button 
                            onClick={() => handleChangeAdminPassword(admin)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 border border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 rounded-lg transition-all duration-300 hover:scale-105"
                          >
                            비밀번호
                          </button>
                          <button 
                            onClick={() => handleDeleteAdmin(admin)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500 rounded-lg transition-all duration-300 hover:scale-105"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Pagination */}
      {totalAdminPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentAdminPage(prev => Math.max(prev - 1, 1))}
            disabled={currentAdminPage === 1}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentAdminPage(page)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  currentAdminPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentAdminPage(prev => Math.min(prev + 1, totalAdminPages))}
            disabled={currentAdminPage === totalAdminPages}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );

  const renderTeacherProfile = () => (
    <div className="space-y-4 sm:space-y-6">

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
          <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">기본 정보</h4>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                이름
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200">
                {user?.name || '-'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                아이디
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200">
                {user?.username || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                역할
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                <span className="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                  {user?.role === 'admin' ? '관리자' : '교사'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                계정 상태
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                <span className="inline-flex px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                  활성
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">비밀번호 변경</h4>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 font-medium text-sm"
              >
                비밀번호 변경
              </button>
            )}
          </div>
        </div>
        
        {isChangingPassword ? (
          <form onSubmit={handleTeacherPasswordSubmit} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                현재 비밀번호 *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showCurrentPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                새 비밀번호 *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showNewPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                새 비밀번호 확인 *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl transition-all duration-300"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 sm:p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              보안을 위해 정기적으로 비밀번호를 변경하는 것을 권장합니다.
            </p>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="transition-colors">

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'students'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            학생 관리
          </button>
          {canManageAdmins && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'admins'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              관리자 관리
            </button>
          )}
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
              activeTab === 'profile'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            내 정보
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && renderStudentManagement()}
      {activeTab === 'admins' && canManageAdmins && renderAdminManagement()}
      {activeTab === 'profile' && renderTeacherProfile()}
      
      {/* Modals */}
      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        student={selectedStudent}
        onClose={() => {
          setIsEditStudentModalOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleUpdateStudent}
      />
      <EditAdminModal
        isOpen={isEditAdminModalOpen}
        admin={selectedAdmin}
        onClose={() => {
          setIsEditAdminModalOpen(false);
          setSelectedAdmin(null);
        }}
        onSubmit={handleUpdateAdmin}
      />
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        student={selectedStudent}
        admin={selectedAdmin}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStudent(null);
          setSelectedAdmin(null);
        }}
        onConfirm={selectedStudent ? handleDeleteStudentConfirm : handleDeleteAdminConfirm}
      />
      <AddModal
        isOpen={isAddModalOpen}
        type={activeTab === 'students' ? 'student' : 'admin'}
        onClose={() => setIsAddModalOpen(false)}
        onSubmitStudent={handleCreateStudent}
        onSubmitAdmin={handleCreateAdmin}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        student={selectedStudent}
        admin={selectedAdmin}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setSelectedStudent(null);
          setSelectedAdmin(null);
        }}
        onSubmit={handleChangePasswordConfirm}
        error={error}
      />

      {/* Excel 업로드 결과 모달 */}
      {showUploadResults && uploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Excel 업로드 결과
              </h3>
              <button
                onClick={closeUploadResults}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* 성공 요약 */}
              <div className="mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-lg font-medium text-green-800 dark:text-green-200">
                        {uploadResults.created.length}명의 학생이 성공적으로 등록되었습니다
                      </h4>
                      {uploadResults.errors.length > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          {uploadResults.errors.length}개의 오류가 발생했습니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 성공한 학생들 */}
              {uploadResults.created.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    등록된 학생 ({uploadResults.created.length}명)
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {uploadResults.created.map((student, index) => (
                        <div key={student.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-900 dark:text-gray-100">
                            {index + 1}. {student.name} ({student.student_id})
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {student.grade}학년 {student.class}반 {student.number}번
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 오류 목록 */}
              {uploadResults.errors.length > 0 && (
                <div>
                  <h5 className="text-md font-medium text-red-600 dark:text-red-400 mb-3">
                    오류 목록 ({uploadResults.errors.length}개)
                  </h5>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-3">
                      {uploadResults.errors.map((error, index) => (
                        <div key={index} className="border-b border-red-200 dark:border-red-700 last:border-b-0 pb-2 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                행 {error.row}: {error.error}
                              </p>
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                데이터: {JSON.stringify(error.data).slice(0, 100)}...
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeUploadResults}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
