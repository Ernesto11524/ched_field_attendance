import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'https://cocobod-backend-production.up.railway.app/api';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [focused, setFocused]       = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${BASE_URL}/workers/by-employee-id/${employeeId.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Worker not found.');
      login(data.worker, data.token || 'pending');
      navigate('/checkin');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="screen" style={{ background: 'var(--b0)' }}>
      {/* Noise */}
      <div className="noise" />

      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(45deg, var(--b5) 0px, var(--b5) 1px, transparent 1px, transparent 20px)`,
      }} />

      <div className="content" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '52px 28px 44px',
      }}>

        {/* Logo area */}
        <div className="animate-slideDown" style={{ marginBottom: 52 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '20px', marginBottom: 28,
            background: 'linear-gradient(135deg, var(--b5), var(--b3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30,
            boxShadow: '0 8px 32px #8C4A1F60, inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'floatY 4s ease-in-out infinite',
            position: 'relative',
          }}>
            🌿
            <div style={{
              position: 'absolute', inset: -4, borderRadius: 24,
              border: '1px solid var(--b4)',
              animation: 'pulseRing 3s ease-out infinite',
            }} />
          </div>

          <p style={{
            fontFamily: 'var(--font-d)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--b6)', marginBottom: 10,
          }}>
            COCOBOD Field Attendance
          </p>

          <h1 style={{
            fontSize: 40, fontWeight: 800, lineHeight: 1.05, marginBottom: 12,
            background: 'linear-gradient(135deg, var(--b9), var(--b7) 60%, var(--b6))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Good to see<br />you again.
          </h1>

          <p style={{ color: 'var(--b6)', fontSize: 15, lineHeight: 1.7 }}>
            Enter your employee ID to start your shift.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="animate-fadeUp" style={{ animationDelay: '0.15s', opacity: 0 }}>
            <div className="input-group">
              <label className="input-label">Employee ID</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type="text"
                  placeholder="e.g. EMP-001"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    paddingLeft: 52,
                    boxShadow: focused ? '0 0 0 3px #B4683025' : 'none',
                  }}
                />
                <span style={{
                  position: 'absolute', left: 18, top: '50%',
                  transform: `translateY(-50%) scale(${focused ? 1.15 : 1})`,
                  fontSize: 18, transition: 'transform 0.2s',
                }}>🪪</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="animate-scaleIn" style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #C0392B15, #8B000010)',
              border: '1px solid #C0392B40',
              borderRadius: 14, color: '#EB5757', fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span> {error}
            </div>
          )}

          <div className="animate-fadeUp" style={{ animationDelay: '0.25s', opacity: 0 }}>
            <div className="checkin-btn-wrap">
              {!loading && employeeId.trim() && (
                <>
                  <div className="ring" />
                  <div className="ring ring-2" />
                </>
              )}
              <button className="btn btn-primary" type="submit"
                disabled={loading || !employeeId.trim()}
                style={{ position: 'relative', zIndex: 1 }}>
                {loading
                  ? <><span className="spinner" /> Checking ID...</>
                  : <>Continue to Check-In →</>
                }
              </button>
            </div>
          </div>
        </form>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 48 }}>
          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--b4)', lineHeight: 1.7 }}>
            Don't know your ID? Contact your supervisor.<br />
            <span style={{ color: 'var(--b5)' }}>COCOBOD © {new Date().getFullYear()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
