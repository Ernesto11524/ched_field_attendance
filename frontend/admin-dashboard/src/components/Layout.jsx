import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/dashboard', icon: '▦',  label: 'Dashboard'  },
  { path: '/today',     icon: '📋', label: 'Today'      },
  { path: '/workers',   icon: '👥', label: 'Workers'    },
  { path: '/sites',     icon: '📍', label: 'Work Sites' },
  { path: '/reports',   icon: '📊', label: 'Reports'    },
];

export default function Layout({ children }) {
  const { admin, logout } = useAuth();
  const { pathname }      = useLocation();
  const navigate          = useNavigate();

  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="app-layout">
      <aside className="sidebar">

        {/* Logo */}
        <div style={{ padding: '24px 18px 20px', borderBottom: '1px solid #242424' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #F5A623, #E8941A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌿</div>
            <div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 15, color: '#F9FAFB', lineHeight: 1.1 }}>CHED</div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 600, fontSize: 11, color: '#F5A623', lineHeight: 1.1 }}>Field Attendance</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#4B5563', marginTop: 6 }}>Admin Dashboard</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {NAV.map(item => (
            <button key={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid #242424' }}>
          <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 2 }}>Signed in as</div>
          <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600, marginBottom: 1 }}>{admin?.full_name}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
            {admin?.role === 'admin' ? '⬟ Admin' : '◈ Supervisor'}
          </div>
          <button onClick={logout} style={{
            background: 'none', border: '1px solid #242424', color: '#6B7280',
            padding: '7px 12px', borderRadius: '8px', fontSize: 12, cursor: 'pointer',
            width: '100%', fontFamily: 'var(--font-b)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#EF4444'; e.target.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#242424'; e.target.style.color = '#6B7280'; }}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{now}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(245,166,35,0.12)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13, color: 'var(--accent)',
            }}>
              {admin?.full_name?.[0]}
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
