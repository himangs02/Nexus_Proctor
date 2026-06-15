import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/profile')
        .then(res => { setUser(res.data); })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('role'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('role', userData.role);
    setToken(userData.token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, isTeacher, isStudent, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
