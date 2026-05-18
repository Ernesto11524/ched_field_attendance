import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeId.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/workers/by-employee-id/${employeeId.trim().toUpperCase()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Worker not found.');

      // Store worker info — token will come after biometric auth
      login(data.worker, data.token || 'pending');
      navigate('/checkin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="bg-mesh" />

      <div className="content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 24px 40px',
      }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }} className="animate-fadeUp">
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent), #00A886)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            marginBottom: 32,
            boxShadow: '0 8px 24px var(--accent-dim)',
          }}>
            📍
          </div>

          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 10,
          }}>
            COCOBOD Attendance
          </p>

          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }}>
            Welcome<br />Back
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            Enter your employee ID to access your attendance dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="input-group animate-fadeUp" style={{ animationDelay: '0.1s', opacity: 0 }}>
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
            />
          </div>

          {error && (
            <div style={{
              padding: '14px 16px',
              background: '#FF5A5A15',
              border: '1px solid #FF5A5A40',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className="btn btn-primary animate-fadeUp"
            style={{ animationDelay: '0.2s', opacity: 0, marginTop: 8 }}
            type="submit"
            disabled={loading || !employeeId.trim()}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Looking you up...' : 'Continue →'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: 'auto',
          paddingTop: 40,
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          Don't know your Employee ID?<br />
          Contact your supervisor.
        </p>
      </div>
    </div>
  );
}
