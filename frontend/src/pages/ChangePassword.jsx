import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });

  const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setStatus({ message: 'Passwords do not match!', type: 'error' });
    }
    if (passwords.newPassword.length < 8) {
      return setStatus({ message: 'Password must be at least 8 characters.', type: 'error' });
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', passwords);
      if (res.data.success) {
        setStatus({ message: 'Password changed successfully! Redirecting...', type: 'success' });
        setTimeout(() => {
          const routes = { student: '/student-dashboard', teacher: '/teacher-dashboard', admin: '/admin' };
          navigate(routes[user?.role] || '/');
        }, 2000);
      }
    } catch (err) {
      setStatus({ message: err.response?.data?.message || 'Error updating password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-blue-100 shadow-sm">
            🔐
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Security Protocol</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Mandatory Password Update</p>
        </div>

        <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-4 rounded-xl mb-8 leading-relaxed border border-blue-100">
           🛡️ SYSTEM NOTICE: Your account currently uses a temporary credential. For your protection and institutional compliance, you must establish a new secure password before proceeding.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Current Temporary Password</label>
            <input type="password" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-400 transition-all text-sm font-medium" 
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Establish New Password</label>
            <input type="password" name="newPassword" value={passwords.newPassword} onChange={handleChange} required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-400 transition-all text-sm font-medium" 
              placeholder="At least 8 characters..." />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
            <input type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-400 transition-all text-sm font-medium" 
              placeholder="Repeat new password..." />
          </div>

          {status.message && (
            <p className={`text-xs font-bold text-center p-3 rounded-xl border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {status.message}
            </p>
          )}

          <div className="pt-2">
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-[#1e293b] hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? '⏳ Updating Matrix...' : 'SECURE MY ACCOUNT'}
            </button>
            <button type="button" onClick={logout} className="w-full mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-all">
              Abort & Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
