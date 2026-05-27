import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'https://cocobod-backend-production.up.railway.app/api';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeId.trim()) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/workers/by-employee-id/${employeeId.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Employee ID not found.');

      // Save worker + token + device registration status
      login(data.worker, data.token);

      // If they have a registered device, go to check-in
      // If not, go to register device first
      if (data.hasRegisteredDevice) {
        navigate('/checkin');
      } else {
        navigate('/checkin'); // CheckInPage handles the redirect to register
      }
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="screen" style={{ background: 'var(--bg)', justifyContent: 'center' }}>
      <div style={{ padding: '0 28px', width: '100%', maxWidth: 380, margin: '0 auto' }}>

        {/* Logo */}
        <div className="fade-up" style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '20px', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, boxShadow: '0 8px 32px rgba(245,166,35,0.35)',
            animation: 'floatY 3s ease-in-out infinite',
          }}>🌿</div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, marginBottom: 6,
            background: 'linear-gradient(135deg, #fff 0%, #71717a 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>CHED Attendance</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>Field Worker Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Employee ID</label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. EMP-001"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>

          {error && (
            <div className="scale-in" style={{
              padding: '12px 14px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
              color: '#EF4444', fontSize: 13, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span>{error}
            </div>
          )}

          <button className="btn btn-primary" type="submit"
            disabled={loading || !employeeId.trim()}>
            {loading ? <><span className="spinner"/>Verifying...</> : 'Continue →'}
          </button>
        </form>

        {/* Security notice */}
        <div className="fade-up" style={{
          animationDelay: '0.2s', opacity: 0, marginTop: 24,
          padding: '12px 14px', background: 'rgba(245,166,35,0.06)',
          border: '1px solid rgba(245,166,35,0.15)', borderRadius: 10,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, textAlign: 'center' }}>
            🔐 For security, your account can only be used on one registered device. Contact your supervisor if you need to switch phones.
          </p>
        </div>

        <p className="fade-up" style={{
          animationDelay: '0.3s', opacity: 0,
          textAlign: 'center', color: 'var(--text3)', fontSize: 12,
          marginTop: 20, lineHeight: 1.7,
        }}>
          Don't know your ID? Contact your supervisor.<br/>
          <span style={{ color: 'var(--text3)' }}>CHED © {new Date().getFullYear()}</span>
        </p>
      </div>
    </div>
  );
}
