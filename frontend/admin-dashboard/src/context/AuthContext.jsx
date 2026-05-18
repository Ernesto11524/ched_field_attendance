import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin]   = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('ched_admin');
    const savedToken = localStorage.getItem('ched_admin_token');
    if (savedAdmin && savedToken) {
      setAdmin(JSON.parse(savedAdmin));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  function login(adminData, authToken) {
    setAdmin(adminData);
    setToken(authToken);
    localStorage.setItem('ched_admin', JSON.stringify(adminData));
    localStorage.setItem('ched_admin_token', authToken);
  }

  function logout() {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('ched_admin');
    localStorage.removeItem('ched_admin_token');
  }

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
