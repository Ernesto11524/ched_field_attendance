import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';
import { webauthnAPI, checkinAPI } from '../services/api';

const STATUS_CONFIG = {
  on_time:          { icon: '✅', label: 'On Time',             color: 'var(--accent)',  bg: '#00D4AA15' },
  late:             { icon: '🕐', label: 'Late Check-In',       color: 'var(--gold)',   bg: '#F5A62315' },
  outside_geofence: { icon: '📍', label: 'Wrong Location',      color: 'var(--danger)', bg: '#FF5A5A15' },
  biometric_failed: { icon: '👆', label: 'Biometric Failed',    color: 'var(--danger)', bg: '#FF5A5A15' },
  overridden:       { icon: '✅', label: 'Supervisor Approved',  color: 'var(--accent)', bg: '#00D4AA15' },
};

export default function CheckInPage() {
  const { worker, token, logout } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase]       = useState('idle');
  const [location, setLocation] = useState(null);
  const [site, setSite]         = useState(null);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [currentTime, setTime]  = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load ONLY this worker's assigned site
  useEffect(() => {
    async function loadAssignedSite() {
      try {
        const res = await fetch(`https://cocobod-backend-production.up.railway.app/api/workers/${worker.id}/assigned-site`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.site) {
          setSite(data.site);
        } else {
          setSite(null); // worker has no assignment
        }
      } catch (_) {
        setSite(null);
      }
    }
    if (worker?.id && token && token !== 'pending') loadAssignedSite();
  }, [worker?.id, token]);

  async function handleCheckIn() {
    setError('');
    setResult(null);

    if (!site) {
      setError('You have not been assigned to a work site yet. Please contact your supervisor.');
      setPhase('error');
      return;
    }

    // ── Step 1: Get GPS ──────────────────────────────────
    setPhase('gps');
    let coords;
    try {
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => reject(new Error('Could not get your location. Please enable GPS and try again.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
      setLocation(coords);
    } catch (err) {
      setError(err.message);
      setPhase('error');
      return;
    }

    // ── Step 2: Biometric auth ───────────────────────────
    setPhase('biometric');
    let biometricVerified = false;
    let credentialId = null;

    try {
      const authOptions  = await webauthnAPI.getAuthenticationOptions(worker.id);
      const authResponse = await startAuthentication(authOptions);
      const verifyResult = await webauthnAPI.verifyAuthentication(worker.id, authResponse);
      biometricVerified  = verifyResult.verified;
      credentialId       = verifyResult.credential_id;
    } catch (err) {
      if (err.message?.includes('No registered device')) {
        navigate('/register-device');
        return;
      }
      biometricVerified = false;
    }

    // ── Step 3: Submit check-in ──────────────────────────
    setPhase('submitting');
    try {
      const data = await checkinAPI.submit({
        worker_id:          worker.id,
        site_id:            site.id,
        latitude:           coords.latitude,
        longitude:          coords.longitude,
        biometric_verified: biometricVerified,
        credential_id:      credentialId,
      }, token);

      setResult(data.checkin);
      setPhase('result');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setError('');
    setResult(null);
  }

  const timeStr = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="screen">
      <div className="bg-mesh" />
      <div className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 24px 32px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>
              COCOBOD Attendance
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{worker?.full_name}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/history')}
              style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--navy-light)',
                border: '1px solid var(--card-border)', color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📋
            </button>
            <button onClick={logout}
              style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--navy-light)',
                border: '1px solid var(--card-border)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↩
            </button>
          </div>
        </div>

        {/* Time display */}
        <div className="animate-fadeUp" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 64, fontFamily: 'var(--font-display)', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
            {timeStr}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{dateStr}</p>
        </div>

        {/* Site card — only show if assigned */}
        {site ? (
          <div className="card animate-fadeUp" style={{ animationDelay: '0.1s', opacity: 0, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px',
                background: 'var(--accent-glow)', border: '1px solid var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                📍
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {site.name}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{site.address}</p>
              </div>
            </div>
            {site.checkin_windows && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--card-border)',
                display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {site.checkin_windows.map(w => (
                  <span key={w.id} className="badge badge-muted" style={{ fontSize: 11 }}>
                    {w.label}: {w.window_open?.slice(0,5)}–{w.window_close?.slice(0,5)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card animate-fadeUp" style={{ animationDelay: '0.1s', opacity: 0,
            marginBottom: 24, background: '#F5A62310', borderColor: '#F5A62340' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 14, color: 'var(--gold)', marginBottom: 2 }}>
                  No Site Assigned
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  Contact your supervisor to be assigned to a work site.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phase indicator */}
        {phase !== 'idle' && phase !== 'result' && phase !== 'error' && (
          <div className="card animate-fadeIn" style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              {phase === 'gps'        && <span style={{ fontSize: 36 }}>📡</span>}
              {phase === 'biometric'  && <span style={{ fontSize: 36 }}>👆</span>}
              {phase === 'submitting' && <span style={{ fontSize: 36 }}>⏳</span>}
            </div>
            <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
              {phase === 'gps'        && 'Getting your location...'}
              {phase === 'biometric'  && 'Waiting for biometric...'}
              {phase === 'submitting' && 'Recording your check-in...'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
              {phase === 'gps'       && 'Please allow location access when prompted'}
              {phase === 'biometric' && 'Use your fingerprint or face ID'}
              {phase === 'submitting' && 'Almost done...'}
            </p>
          </div>
        )}

        {/* Result card */}
        {phase === 'result' && result && (() => {
          const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.on_time;
          return (
            <div className="card animate-fadeIn" style={{ marginBottom: 24, textAlign: 'center',
              background: cfg.bg, borderColor: cfg.color + '40' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{cfg.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
                color: cfg.color, marginBottom: 8 }}>{cfg.label}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                {result.window ? `Window: ${result.window}` : 'Outside check-in window'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className={`badge ${result.location_verified ? 'badge-success' : 'badge-danger'}`}>
                  📍 {result.location_verified ? 'Location OK' : 'Wrong Location'}
                </span>
                <span className={`badge ${result.biometric_verified ? 'badge-success' : 'badge-danger'}`}>
                  👆 {result.biometric_verified ? 'Biometric OK' : 'Biometric Failed'}
                </span>
              </div>
              {result.distance_from_site_m != null && (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                  {result.distance_from_site_m}m from site
                </p>
              )}
            </div>
          );
        })()}

        {/* Error card */}
        {phase === 'error' && (
          <div className="card animate-fadeIn" style={{ marginBottom: 24, textAlign: 'center',
            background: '#FF5A5A10', borderColor: '#FF5A5A40' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-display)',
              fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check-In Failed</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: 'auto' }}>
          {phase === 'idle' && (
            <button className="btn btn-primary animate-fadeUp"
              style={{ animationDelay: '0.2s', opacity: 0, fontSize: 18, padding: '22px 24px' }}
              onClick={handleCheckIn}
              disabled={!site}>
              <span style={{ fontSize: 22 }}>👆</span>
              Check In Now
            </button>
          )}
          {(phase === 'result' || phase === 'error') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-ghost" onClick={reset}>Check In Again</button>
              <button className="btn btn-secondary" onClick={() => navigate('/history')}>View History</button>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/register-device')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 13, marginTop: 20, textAlign: 'center',
            fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
          Set up biometrics on this device
        </button>
      </div>
    </div>
  );
}
