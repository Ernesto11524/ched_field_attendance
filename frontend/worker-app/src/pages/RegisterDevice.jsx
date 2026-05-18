import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';
import { webauthnAPI } from '../services/api';

const STEPS = [
  { icon: '🔐', title: 'Secure Setup', desc: 'Your biometrics never leave your phone. We only store a secure key.' },
  { icon: '👆', title: 'One-Time Only', desc: 'You only register your device once. After this, just use your fingerprint or face.' },
  { icon: '✅', title: 'Always Verified', desc: 'Every check-in will confirm it\'s really you at the right location.' },
];

export default function RegisterDevice() {
  const [step, setStep]         = useState('intro');   // intro | registering | success | error
  const [error, setError]       = useState('');
  const [deviceName, setDevice] = useState('My Phone');
  const { worker } = useAuth();
  const navigate = useNavigate();

  async function handleRegister() {
    setStep('registering');
    setError('');

    try {
      // Step 1: Get options from server
      const options = await webauthnAPI.getRegistrationOptions(worker.id);

      // Step 2: Trigger the browser's biometric prompt
      const registrationResponse = await startRegistration(options);

      // Step 3: Send result to server for verification
      await webauthnAPI.verifyRegistration(worker.id, registrationResponse, deviceName);

      setStep('success');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div className="screen">
        <div className="bg-mesh" />
        <div className="content" style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', textAlign: 'center', gap: 24,
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'var(--accent-glow)',
            border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 44,
            position: 'relative',
          }}>
            ✅
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '2px solid var(--accent)',
              animation: 'pulse-ring 1.5s ease-out infinite',
            }} />
          </div>

          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Device Registered!</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your biometrics are set up. You can now check in using your fingerprint or face.
            </p>
          </div>

          <button className="btn btn-primary" style={{ maxWidth: 320 }} onClick={() => navigate('/checkin')}>
            Go to Check-In →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="bg-mesh" />

      <div className="content" style={{
        flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 24px 40px',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/checkin')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center',
            gap: 6, marginBottom: 40, fontFamily: 'var(--font-body)', padding: 0 }}
        >
          ← Back
        </button>

        <div className="animate-fadeUp">
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            One-Time Setup
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }}>
            Register<br />This Device
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 36 }}>
            Set up biometric authentication for {worker?.full_name}.
          </p>
        </div>

        {/* Info cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={i} className="card animate-fadeUp"
              style={{ animationDelay: `${i * 0.1}s`, opacity: 0,
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 15, marginBottom: 4 }}>{s.title}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Device name */}
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Device Name (optional)</label>
          <input
            className="input-field"
            type="text"
            value={deviceName}
            onChange={e => setDevice(e.target.value)}
            placeholder="My Phone"
          />
        </div>

        {error && (
          <div style={{ padding: '14px 16px', background: '#FF5A5A15',
            border: '1px solid #FF5A5A40', borderRadius: 'var(--radius-md)',
            color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleRegister}
          disabled={step === 'registering'}
        >
          {step === 'registering' ? <span className="spinner" /> : '👆'}
          {step === 'registering' ? 'Waiting for biometric...' : 'Register with Biometrics'}
        </button>
      </div>
    </div>
  );
}
