import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [worker, setWorker] = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on app start
  useEffect(() => {
    const savedWorker = localStorage.getItem('ched_worker');
    const savedToken  = localStorage.getItem('ched_token');

    if (savedWorker && savedToken) {
      setWorker(JSON.parse(savedWorker));
      setToken(savedToken);
    }

    setLoading(false);
  }, []);

  function login(workerData, authToken) {
    setWorker(workerData);
    setToken(authToken);
    localStorage.setItem('ched_worker', JSON.stringify(workerData));
    localStorage.setItem('ched_token', authToken);
  }

  function logout() {
    setWorker(null);
    setToken(null);
    localStorage.removeItem('ched_worker');
    localStorage.removeItem('ched_token');
  }

  return (
    <AuthContext.Provider value={{ worker, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
