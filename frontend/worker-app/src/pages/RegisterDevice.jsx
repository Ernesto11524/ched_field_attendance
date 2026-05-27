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
      if (err.status === 409 || err.code === 'DEVICE_ALREADY_REGISTERED') {
        setStep('blocked');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
        setStep('error');
      }
    }
  }

  if (step === 'blocked') return (
    <div className="screen" style={{ background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ padding: '0 28px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>🔒</div>
        <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#EF4444' }}>Already Registered</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
          This account is already registered on another device.
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
          You must use your original registered phone to check in. If you lost your phone, ask your supervisor to reset your device registration.
        </p>
        <button className="btn btn-ghost" onClick={() => navigate('/checkin')}>← Back to Check-In</button>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div className="screen" style={{ background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ padding: '0 28px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulseGlow 1.5s ease infinite' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Device Registered!</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>Your device is set up. You can now check in with your fingerprint each time.</p>
        <button className="btn btn-primary" onClick={() => navigate('/checkin')}>Go to Check-In</button>
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
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
            title: 'Stays on your device',
            desc: 'Your biometrics never leave this phone — only a secure key is stored.',
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"><path d="M2 12C2 6.5 6.5 2 12 2"/><path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6 1.5 0 2.9.6 3.9 1.5"/><path d="M8 19.8c.3-.8.5-1.7.5-2.8 0-2.2 1.8-4 4-4"/><path d="M22 12c0-5.5-4.5-10-10-10"/></svg>,
            title: 'One-time setup',
            desc: 'Register once — after that, check-in only needs your fingerprint or face.',
          },
          {
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="17" x2="12" y2="17" strokeWidth="3" strokeLinecap="round"/></svg>,
            title: 'Locked to this phone',
            desc: 'Your account is tied to this specific phone for security.',
          },
        ].map((s, i) => (
          <div key={i} className="card fade-up" style={{ animationDelay: `${i * 0.08}s`, opacity: 0, display: 'flex', gap: 14, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
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
          {step === 'loading'
            ? <><span className="spinner"/>Waiting for biometric prompt...</>
            : <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M2 12C2 6.5 6.5 2 12 2"/><path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6 1.5 0 2.9.6 3.9 1.5"/>
                  <path d="M8 19.8c.3-.8.5-1.7.5-2.8 0-2.2 1.8-4 4-4 .5 0 .9.1 1.3.2"/><path d="M22 12c0-5.5-4.5-10-10-10"/>
                </svg>
                Register with Biometrics
              </>
          }
        </button>
      </div>
    </div>
  );
}
