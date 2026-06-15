import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; 

export const FacultyLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 
  const [status, setStatus] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: 'Authenticating…', type: 'info' });
    try {
      const payload = { ...credentials, role: 'teacher' };
      
      if (!credentials.email.includes('@')) {
        payload.id = credentials.email;
        delete payload.email;
      }

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, payload);
      
      if (res.data.success) {
        setStatus({ message: '✅ Login successful!', type: 'success' });
        login(res.data); 
        setTimeout(() => {
          if (res.data.passwordResetRequired) {
            navigate('/change-password');
          } else {
            const routes = { student: '/student-dashboard', teacher: '/teacher-dashboard', faculty: '/teacher-dashboard', admin: '/admin' };
            navigate(routes[res.data.role] || '/');
          }
        }, 800);
      }
    } catch (err) {
      setStatus({ message: `❌ ${err.response?.data?.message || err.message || 'Cannot reach cloud server.'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white font-sans text-gray-900">
      <div className="hidden lg:flex lg:w-5/12 bg-gray-50 flex-col justify-between p-12 border-r border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl bg-blue-100 text-blue-600 p-2.5 rounded-xl shadow-sm">🛡️</span>
          <h1 className="text-2xl font-extrabold tracking-tight">NEXUS <span className="text-blue-600">PROCTOR</span></h1>
        </div>
        <div className="max-w-sm">
          <h2 className="text-4xl font-bold mb-4 leading-tight text-gray-900">Faculty Secure Access.</h2>
          <p className="text-gray-500 text-lg leading-relaxed">Please log in to manage your assessments and monitor student activity.</p>
        </div>
        <div className="text-sm text-gray-400 font-medium">© {new Date().getFullYear()} Nexus Systems. All rights reserved.</div>
      </div>

      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Faculty Login</h2>
            <p className={`text-sm font-medium transition-all ${status.type === 'error' ? 'text-red-500' : status.type === 'success' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {status.message || `Welcome to the Faculty portal.`}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">Faculty ID or Email</label>
              <input type="text" name="email" value={credentials.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all focus:border-emerald-400" placeholder="ID or Email" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">Password</label>
              <input type="password" name="password" value={credentials.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all focus:border-emerald-400" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#1A5F53] hover:bg-[#134d42] disabled:opacity-60 text-white font-bold py-4 rounded-lg shadow-lg transition-all transform active:scale-[0.98]">
              {loading ? '⏳ Please wait…' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
