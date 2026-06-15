import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { FacultyLogin } from './pages/FacultyLogin';
import { AdminLogin } from './pages/AdminLogin';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { CompilerPage } from './pages/CompilerPage';
import { LiveExamPage } from './pages/LiveExamPage';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-950 text-white">Loading…</div>;
  if (!isAuthenticated) { navigate('/'); return null; }
  if (roles && !roles.includes(user?.role)) { navigate('/'); return null; }
  return children;
};

function App() {
  const location = useLocation();
  const isLiveExam = location.pathname.includes('/exam/live/');
  const isCompiler = location.pathname === '/compiler';
  const isAdmin = location.pathname === '/admin';
  const isChangePass = location.pathname === '/change-password';
  
  // 🚨 Hide the header on ALL our VIP entrance pages!
  const isAuthPage = ['/', '/fac', '/adm'].includes(location.pathname);

  return (
    <AuthProvider>
      <div className={`min-h-screen font-sans flex flex-col ${isLiveExam || isCompiler ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        
        {!isLiveExam && !isCompiler && !isAuthPage && !isAdmin && !isChangePass && (
          <header className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.href = '/'}>
              <span className="text-2xl bg-blue-50 text-blue-600 p-2 rounded-lg">🛡️</span>
              <h1 className="text-xl font-extrabold tracking-tight">NEXUS <span className="text-blue-600">PROCTOR</span></h1>
            </div>
          </header>
        )}

        <main className={`flex-grow ${isLiveExam || isCompiler || isAuthPage || isAdmin || isChangePass ? '' : 'p-4 md:p-8'}`}>
          <Routes>
            {/* 🚨 THE 3 EXCLUSIVE VIP DOORS */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/fac" element={<FacultyLogin />} />
            <Route path="/adm" element={<AdminLogin />} />

            <Route path="/student-dashboard" element={
              <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
            } />

            <Route path="/teacher-dashboard" element={
              <ProtectedRoute roles={['faculty','teacher']}><TeacherDashboard /></ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />

            <Route path="/change-password" element={
              <ProtectedRoute><ChangePassword /></ProtectedRoute>
            } />

            <Route path="/compiler" element={
              <ProtectedRoute><CompilerPage /></ProtectedRoute>
            } />

            <Route path="/exam/live/:id" element={
              <ProtectedRoute roles={['student']}><LiveExamPage /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
