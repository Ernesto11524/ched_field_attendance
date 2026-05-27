import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const data = await authAPI.login(email, password);
      login(data.user, data.token);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F8F9FA' }}>

      {/* Left panel */}
      <div style={{ width: 440, background: '#0F0F0F', display: 'flex', flexDirection: 'column', padding: '56px 48px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.12), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ marginBottom: 'auto' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #F5A623, #E8941A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🌿</div>
            <div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: '#F9FAFB' }}>CHED</div>
              <div style={{ fontFamily: 'var(--font-h)', fontSize: 12, color: '#F5A623' }}>Field Attendance System</div>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-h)', fontSize: 38, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.1, marginBottom: 14 }}>
            Manage your<br/><span style={{ color: '#F5A623' }}>field teams</span>
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.7 }}>
            Real-time attendance tracking with GPS and biometric verification for your field workers across all sites.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginTop: 48 }}>
          {[['GPS', 'Location verified'], ['4×', 'Daily check-ins'], ['Live', 'Dashboard']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--font-h)', fontSize: 20, fontWeight: 800, color: '#F5A623' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 26, fontWeight: 800, marginBottom: 6, color: 'var(--text1)' }}>Welcome back</h2>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>Sign in to your admin account</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus style={{ padding: '11px 14px' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '11px 14px' }} />
            </div>

            {error && (
              <div style={{ padding: '11px 13px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: 'var(--red)', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading || !email || !password}
              style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: '10px', marginTop: 4 }}>
              {loading ? <><span className="spinner"/>Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, marginTop: 28, lineHeight: 1.6 }}>
            Don't have an account?<br/>Ask your administrator to create one.
          </p>
        </div>
      </div>
    </div>
  );
}
