import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';
import { webauthnAPI } from '../services/api';

export default function RegisterDevice() {
  const [step, setStep]       = useState('intro');
  const [error, setError]     = useState('');
  const [device, setDevice]   = useState('My Phone');
  const { worker } = useAuth();
  const navigate   = useNavigate();

  async function handleRegister() {
    setStep('loading'); setError('');
    try {
      const options  = await webauthnAPI.getRegistrationOptions(worker.id);
      const response = await startRegistration(options);
      await webauthnAPI.verifyRegistration(worker.id, response, device);
      setStep('success');
    } catch(err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep('error');
    }
  }

  if (step === 'success') return (
    <div className="screen" style={{ background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ padding: '0 28px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px', animation: 'pulseGlow 1.5s ease infinite' }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Device Registered!</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>Your device is set up. You can now check in without biometrics each time.</p>
        <button className="btn btn-primary" onClick={() => navigate('/checkin')}>Go to Check-In →</button>
      </div>
    </div>
  );

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '44px 24px 32px' }}>

        <button onClick={() => navigate('/checkin')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, fontFamily: 'var(--font-b)', padding: 0 }}>← Back</button>

        <div className="fade-up">
          <p style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>One-Time Setup</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, background: 'linear-gradient(135deg,#fff,#71717a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Register This Device</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Set up <strong style={{ color: 'var(--text2)' }}>{worker?.full_name}</strong> on this phone. You only need to do this once.
          </p>
        </div>

        {[
          { icon: '🔐', title: 'Stays on your device', desc: 'Your biometrics never leave this phone — only a secure key is stored.' },
          { icon: '👆', title: 'One-time only',        desc: 'Register once and check-ins just need a tap — no biometric every time.' },
          { icon: '📱', title: 'Phone-locked',         desc: 'This registration ties your account to this specific phone.' },
        ].map((s, i) => (
          <div key={i} className="card fade-up" style={{ animationDelay: `${i * 0.08}s`, opacity: 0, display: 'flex', gap: 14, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>{s.title}</p>
              <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}

        <div className="input-group" style={{ marginTop: 20, marginBottom: 16 }}>
          <label className="input-label">Device Name (optional)</label>
          <input className="input-field" type="text" value={device} onChange={e => setDevice(e.target.value)} placeholder="My Phone" />
        </div>

        {(step === 'error' || error) && (
          <div className="scale-in" style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>
        )}

        <button className="btn btn-primary" onClick={handleRegister} disabled={step === 'loading'} style={{ marginTop: 'auto' }}>
          {step === 'loading' ? <><span className="spinner"/>Waiting for biometric...</> : <><span style={{ fontSize: 18 }}>👆</span>Register with Biometrics</>}
        </button>
      </div>
    </div>
  );
}
