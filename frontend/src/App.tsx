import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, SignupPage } from './pages/auth';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import AdminDashboard from './pages/dashboard/admin/AdminDashboard';
import UserManagement from './pages/dashboard/admin/UserManagement';
import AttendanceManagement from './pages/dashboard/admin/AttendanceManagement';
import AttendanceReader from './pages/dashboard/admin/AttendanceReader';
import StudentQRCode from './pages/dashboard/student/StudentQRCode';
import StudentProfile from './pages/dashboard/student/StudentProfile';
import StudentAttendanceManagement from './pages/dashboard/student/StudentAttendanceManagement';
import DashboardRedirect from './components/DashboardRedirect';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
          {/* 홈 경로를 로그인 페이지로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          
          {/* 인증 관련 라우트 (로그인하지 않은 사용자만 접근 가능) */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={
            <ProtectedRoute requireAuth={false}>
              <SignupPage />
            </ProtectedRoute>
          } />
          
          {/* 대시보드 정확히 일치하는 경우 리다이렉트 */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />
          
          {/* 보호된 라우트 - 대시보드 하위 경로들 (단순화) */}
          <Route path="/dashboard/admin/users" element={
            <ProtectedRoute>
              <DashboardLayout><UserManagement /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/users" element={
            <ProtectedRoute>
              <DashboardLayout><UserManagement /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/attendance" element={
            <ProtectedRoute>
              <DashboardLayout><AttendanceManagement /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/attendance" element={
            <ProtectedRoute>
              <DashboardLayout><AttendanceManagement /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/reader" element={
            <ProtectedRoute>
              <AttendanceReader />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/reader" element={
            <ProtectedRoute>
              <AttendanceReader />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/main" element={
            <ProtectedRoute>
              <DashboardLayout><AdminDashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher/main" element={
            <ProtectedRoute>
              <DashboardLayout><AdminDashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/student" element={
            <ProtectedRoute>
              <DashboardLayout><StudentQRCode /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/student/profile" element={
            <ProtectedRoute>
              <DashboardLayout><StudentProfile /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/student/attendance" element={
            <ProtectedRoute>
              <DashboardLayout><StudentAttendanceManagement /></DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 법적 문서 라우트 (누구나 접근 가능) */}
          <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/legal/terms" element={<TermsOfServicePage />} />
          
          {/* 404 페이지 - 존재하지 않는 경로는 로그인으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App