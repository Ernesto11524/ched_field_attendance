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
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(email, password);
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Left panel */}
      <div style={{
        width: 480,
        background: 'var(--sidebar)',
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, #00D4AA15, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: 'linear-gradient(135deg, #00D4AA, #00A886)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>📍</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 18, color: '#F0F4FF' }}>COCOBOD Attendance</div>
              <div style={{ fontSize: 12, color: '#4A6785' }}>Admin Dashboard</div>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800,
            color: '#F0F4FF', lineHeight: 1.1, marginBottom: 16 }}>
            Manage your<br />
            <span style={{ color: 'var(--accent)' }}>field teams</span>
          </h1>

          <p style={{ color: '#8BA4C0', fontSize: 15, lineHeight: 1.7 }}>
            Real-time attendance tracking with GPS verification and biometric authentication for your field workers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 60 }}>
          {[
            { value: 'GPS', label: 'Location verified' },
            { value: '4×', label: 'Daily check-ins' },
            { value: 'Live', label: 'Dashboard' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22,
                fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#4A6785', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
            marginBottom: 8 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 36 }}>
            Sign in to your admin account
          </p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ padding: '12px 14px', background: '#FFF5F5',
                border: '1px solid #FED7D7', borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit"
              disabled={loading || !email || !password}
              style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 8 }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)',
            fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            Don't have an account?<br />
            Ask your administrator to create one for you.
          </p>
        </div>
      </div>
    </div>
  );
}
