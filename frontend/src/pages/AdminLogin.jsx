import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; 

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ name: '', email: '', password: '' });

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: isSignUp ? 'Creating account…' : 'Authenticating…', type: 'info' });
    const endpoint = isSignUp ? '/auth/signup' : '/auth/login';
    try {
      const payload = { ...credentials, role: 'admin' };
      
      if (!isSignUp && !credentials.email.includes('@')) {
        payload.id = credentials.email;
        delete payload.email;
      }

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, payload);
      
      if (res.data.success) {
        setStatus({ message: isSignUp ? 'Account created! Please sign in.' : '✅ Login successful!', type: 'success' });
        if (!isSignUp) {
          login(res.data); 
          setTimeout(() => {
            if (res.data.passwordResetRequired) {
              navigate('/change-password');
            } else {
              const routes = { student: '/student-dashboard', teacher: '/teacher-dashboard', faculty: '/teacher-dashboard', admin: '/admin' };
              navigate(routes[res.data.role] || '/');
            }
          }, 800);
        } else {
          // Clear form after successful registration
          setCredentials({ name: '', email: '', password: '' });
          setTimeout(() => { 
            setIsSignUp(false); 
            setStatus({ message: 'Now sign in with your new account.', type: 'info' }); 
          }, 2000);
        }
      }
    } catch (err) {
      setStatus({ message: `❌ ${err.response?.data?.message || err.message || 'Cannot reach cloud server.'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white font-sans text-gray-900">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gray-900 text-white flex-col justify-between p-12 border-r border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl bg-blue-900 text-blue-300 p-2.5 rounded-xl shadow-sm">🛡️</span>
          <h1 className="text-2xl font-extrabold tracking-tight">NEXUS <span className="text-blue-400">PROCTOR</span></h1>
        </div>
        <div className="max-w-sm">
          <h2 className="text-4xl font-bold mb-4 leading-tight text-white">System Override.</h2>
          <p className="text-gray-400 text-lg leading-relaxed">Admin Control Center. High-level clearance required.</p>
        </div>
        <div className="text-sm text-gray-500 font-medium">© {new Date().getFullYear()} Nexus Systems. All rights reserved.</div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{isSignUp ? 'Admin Registration' : 'Admin Login'}</h2>
            <p className={`text-sm font-medium transition-all ${status.type === 'error' ? 'text-red-500' : status.type === 'success' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {status.message || `Welcome to the Admin portal.`}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">Full Name</label>
                <input type="text" name="name" value={credentials.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all focus:border-blue-400" placeholder="System Administrator" />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">Email Address</label>
              <input type="text" name="email" value={credentials.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all focus:border-blue-400" placeholder={isSignUp ? "admin@system.com" : "Email"} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">Password</label>
              <input type="password" name="password" value={credentials.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none transition-all focus:border-blue-400" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-bold py-4 rounded-lg shadow-lg transition-all transform active:scale-[0.98]">
              {loading ? '⏳ Processing…' : isSignUp ? 'CREATE ADMIN' : 'SYSTEM LOGIN'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setStatus({ message: '', type: 'info' }); }} className="text-sm font-bold text-blue-600 hover:underline">
              {isSignUp ? 'Already have access? Sign In' : 'Need clearance? Register Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
