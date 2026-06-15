import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ name: '', email: '', department: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // 🚨 REPLACED WINDOW.PROMPT WITH A GORGEOUS CUSTOM MODAL STATE!
  const [resetModal, setResetModal] = useState({ isOpen: false, id: null, newPassword: '' });

  const departments = ['All', 'Computer Science', 'Information Technology', 'Mechanical Engineering', 'Business', 'Arts', 'General'];

  useEffect(() => {
    fetchFaculty();
  }, [search, deptFilter]);

  const fetchFaculty = async () => {
    try {
      const res = await api.get(`/admin/faculty?search=${search}&department=${deptFilter}`);
      setFaculty(res.data.data);
    } catch (err) {
      showToast("Failed to fetch faculty matrix", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: newFaculty.name,
        email: newFaculty.email,
        password: newFaculty.password,
        role: 'teacher' 
      };

      const res = await api.post('/auth/signup', payload);
      
      if (res.data.success) {
        setShowModal(false);
        fetchFaculty();
        showToast('Faculty provisioned successfully!', 'success');
        setNewFaculty({ name: '', email: '', department: '', password: '' });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating faculty', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/admin/faculty/${id}/status`);
      fetchFaculty();
      showToast('Faculty status updated!', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  // 🚨 NOW IT OPENS OUR BEAUTIFUL UI INSTEAD OF A BROWSER ALERT!
  const triggerPasswordReset = (id) => {
    setResetModal({ isOpen: true, id, newPassword: '' });
  };

  const submitPasswordReset = async () => {
    if (!resetModal.newPassword) return showToast("Password cannot be empty!", "error");
    
    try {
      await api.post(`/admin/faculty/${resetModal.id}/reset-password`, { password: resetModal.newPassword });
      showToast('Password manually updated successfully!', 'success');
      setResetModal({ isOpen: false, id: null, newPassword: '' });
    } catch (err) {
      showToast('Failed to reset password', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm("Are you sure you want to delete this faculty account forever? This action cannot be undone.", async () => {
      try {
        await api.delete(`/admin/faculty/${id}`);
        fetchFaculty();
        showToast('Faculty terminated successfully.', 'success');
      } catch (err) {
        showToast('Failed to delete faculty', 'error');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans relative">

      {/* ✨ SLEEK FLOATING PILL TOAST ✨ */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`px-6 py-3.5 rounded-full shadow-2xl border flex items-center gap-3 text-sm font-bold ${
            toast.type === 'error' ? 'bg-red-600 text-white border-red-500 shadow-red-600/20' : 
            'bg-gray-900 text-white border-gray-700 shadow-xl'
          }`}>
            <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
            <span className="tracking-wide pr-2">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">✕</button>
          </div>
        </div>
      )}

      {/* ⚠️ NATIVE-LOOKING CONFIRM MODAL ⚠️ */}
      {confirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-5 shadow-inner">⚠️</div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Confirm Action</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 px-4 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔑 SLEEK PASSWORD RESET MODAL 🔑 */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-5 shadow-inner">🔑</div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2 text-center">Reset Password</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-6 text-center">Enter a new secure password for this faculty member.</p>
            
            <input 
              type="text" 
              autoFocus
              value={resetModal.newPassword} 
              onChange={e => setResetModal({...resetModal, newPassword: e.target.value})}
              placeholder="Enter new password..."
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-400 transition-all text-sm font-bold text-gray-800 text-center mb-6"
            />

            <div className="flex gap-3">
              <button onClick={() => setResetModal({ isOpen: false, id: null, newPassword: '' })} className="flex-1 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
              <button onClick={submitPasswordReset} className="flex-1 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-600 text-white p-1.5 rounded-lg shadow-lg">🛡️</span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Admin <span className="text-emerald-600">Control Center</span></h1>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Faculty Management & Credential Portal</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher-dashboard')} className="bg-blue-50 border border-blue-200 text-blue-600 font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-xl hover:bg-blue-100 transition-all shadow-sm">
            🧑‍🏫 Open Teacher Terminal
          </button>

          <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95">
            + Provision Faculty
          </button>
          <button onClick={() => { logout(); navigate('/'); }} className="bg-white border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8">
        
        {/* Search & Filters */}
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
             <input type="text" placeholder="Search by name, ID or email..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-emerald-400 transition-all text-sm font-medium" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-emerald-400 transition-all text-sm font-bold text-gray-600">
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Faculty Table */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Faculty Identity</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Dept</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Activity</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center text-gray-300 font-bold uppercase tracking-widest italic animate-pulse">Syncing Faculty Matrix...</td></tr>
              ) : faculty.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-gray-300 font-bold uppercase tracking-widest italic">No faculty nodes found.</td></tr>
              ) : (
                faculty.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 uppercase shadow-sm">
                          {f.name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{f.name}</p>
                          <p className="text-[10px] font-bold text-gray-400">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                       <p className="text-xs font-black text-gray-700 font-mono tracking-tighter">{f.facultyId}</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">{f.department || 'General'}</p>
                    </td>
                    <td className="p-6">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${f.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {f.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-6">
                       <p className="text-[10px] font-bold text-gray-500 uppercase">
                         {f.lastLogin ? new Date(f.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never Logged In'}
                       </p>
                    </td>
                    <td className="p-6 text-right space-x-2">
                       <button onClick={() => handleToggleStatus(f.id)} title={f.isActive ? 'Disable' : 'Enable'}
                        className={`p-2 rounded-lg border transition-all ${f.isActive ? 'border-amber-100 text-amber-600 hover:bg-amber-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}>
                         {f.isActive ? '🚫' : '✅'}
                       </button>
                       <button onClick={() => triggerPasswordReset(f.id)} title="Reset Password"
                        className="p-2 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50 transition-all">
                         🔑
                       </button>
                       <button onClick={() => handleDelete(f.id)} title="Delete Forever"
                        className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all">
                         🗑️
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
           <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Provision Faculty</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8">Manual Credential Generation</p>
              
              <form className="space-y-6" onSubmit={handleCreateFaculty}>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                  <input type="text" value={newFaculty.name} onChange={e => setNewFaculty({...newFaculty, name: e.target.value})} required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-400 transition-all text-sm font-medium" 
                    placeholder="Enter full name..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Email</label>
                  <input type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-400 transition-all text-sm font-medium" 
                    placeholder="faculty@geetauniversity.edu.in" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Initial Password</label>
                  <input type="text" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-emerald-400 transition-all text-sm font-medium" 
                    placeholder="Enter manual password..." />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                    className="flex-1 py-4 bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                    {submitting ? '⏳ Processing...' : 'Create Account'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
