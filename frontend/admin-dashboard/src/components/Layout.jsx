import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '▦',  label: 'Dashboard'   },
  { path: '/today',     icon: '📋', label: 'Today'       },
  { path: '/workers',   icon: '👥', label: 'Workers'     },
  { path: '/sites',     icon: '📍', label: 'Work Sites'  },
  { path: '/reports',   icon: '📊', label: 'Reports'     },
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

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">

        {/* Logo */}
        <div style={{
          padding: '28px 20px 24px',
          borderBottom: '1px solid #1A3A5C',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #00D4AA, #00A886)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>📍</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 14, color: '#F0F4FF', lineHeight: 1.1 }}>
                COCOBOD
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 14, color: '#00D4AA', lineHeight: 1.1 }}>
                Attendance
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#4A6785', marginTop: 8, paddingLeft: 2 }}>
            Admin Dashboard
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #1A3A5C',
        }}>
          <div style={{ fontSize: 12, color: '#4A6785', marginBottom: 4, fontWeight: 500 }}>
            Signed in as
          </div>
          <div style={{ fontSize: 14, color: '#E2E8F0', fontWeight: 600, marginBottom: 2 }}>
            {admin?.full_name}
          </div>
          <div style={{ fontSize: 12, color: '#8BA4C0', marginBottom: 12 }}>
            {admin?.role === 'admin' ? '⬟ Admin' : '◈ Supervisor'}
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: '1px solid #1A3A5C', color: '#8BA4C0',
              padding: '8px 14px', borderRadius: '8px', fontSize: 13, cursor: 'pointer',
              width: '100%', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.target.style.borderColor = '#E53E3E'}
            onMouseLeave={e => e.target.style.borderColor = '#1A3A5C'}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────── */}
      <div className="main-area">
        <header className="topbar">
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{now}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent-glow)',
              border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
              color: 'var(--accent)',
            }}>
              {admin?.full_name?.[0]}
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
