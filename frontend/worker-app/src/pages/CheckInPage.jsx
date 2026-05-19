import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkinAPI } from '../services/api';

const BASE_URL = 'https://cocobod-backend-production.up.railway.app/api';

const STATUS_CONFIG = {
  on_time:          { icon: '✅', label: 'On Time!',            color: '#6FCF97', bg: '#2A7A4020', border: '#2A7A4050' },
  late:             { icon: '🕐', label: 'Checked In Late',     color: '#F2C94C', bg: '#B7770D15', border: '#B7770D50' },
  outside_geofence: { icon: '📍', label: 'Wrong Location',      color: '#EB5757', bg: '#C0392B15', border: '#C0392B50' },
  biometric_failed: { icon: '👆', label: 'Biometric Failed',    color: '#EB5757', bg: '#C0392B15', border: '#C0392B50' },
  overridden:       { icon: '✅', label: 'Supervisor Approved', color: '#6FCF97', bg: '#2A7A4020', border: '#2A7A4050' },
};

const PHASE_CONFIG = {
  gps:        { icon: '📡', label: 'Getting your location...', sub: 'Please allow GPS access when prompted' },
  submitting: { icon: '⏳', label: 'Recording check-in...',    sub: 'Almost done, please wait'              },
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh   = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const ss   = time.toLocaleTimeString('en-GB', { second: '2-digit' }).slice(-2);
  const date = time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span className="clock-display">{hh}</span>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700,
          color: 'var(--b5)', lineHeight: 1, marginBottom: 4,
          animation: 'tickerBounce 1s ease infinite' }}>:{ss}</span>
      </div>
      <p style={{ color: 'var(--b6)', fontSize: 14, marginTop: 6, letterSpacing: '0.02em' }}>{date}</p>
    </div>
  );
}

export default function CheckInPage() {
  const { worker, token, logout } = useAuth();
  const navigate = useNavigate();
  const btnRef   = useRef(null);

  const [phase, setPhase]         = useState('idle');
  const [site, setSite]           = useState(null);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [ripples, setRipples]     = useState([]);
  const [isRegistered, setIsRegistered] = useState(null); // null=loading, true/false

  // Load worker's assigned site and check device registration
  useEffect(() => {
    async function loadData() {
      try {
        // Load assigned site
        const siteRes  = await fetch(`${BASE_URL}/workers/${worker.id}/assigned-site`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const siteData = await siteRes.json();
        setSite(siteRes.ok && siteData.site ? siteData.site : null);

        // Check if this device has been registered
        const credRes  = await fetch(`${BASE_URL}/workers/${worker.id}/credentials`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const credData = await credRes.json();
        setIsRegistered(credRes.ok && credData.count > 0);
      } catch (_) {
        setSite(null);
        setIsRegistered(false);
      }
    }
    if (worker?.id && token && token !== 'pending') loadData();
  }, [worker?.id, token]);

  function addRipple(e) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x  = e.clientX - rect.left;
    const y  = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { x, y, id }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600);
  }

  async function handleCheckIn(e) {
    addRipple(e);
    setError(''); setResult(null);

    if (!site) {
      setError('You have not been assigned to a work site yet. Contact your supervisor.');
      setPhase('error'); return;
    }

    if (!isRegistered) {
      navigate('/register-device'); return;
    }

    // GPS only — no biometric on every check-in
    setPhase('gps');
    let coords;
    try {
      coords = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => reject(new Error('Could not get your location. Please enable GPS and try again.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      );
    } catch (err) { setError(err.message); setPhase('error'); return; }

    // Submit check-in
    setPhase('submitting');
    try {
      const data = await checkinAPI.submit({
        worker_id:          worker.id,
        site_id:            site.id,
        latitude:           coords.latitude,
        longitude:          coords.longitude,
        biometric_verified: true,  // verified at device registration
        credential_id:      null,
      }, token);
      setResult(data.checkin); setPhase('result');
    } catch (err) { setError(err.message); setPhase('error'); }
  }

  const inProgress = ['gps', 'submitting'].includes(phase);

  return (
    <div className="screen" style={{ background: 'var(--b0)' }}>
      <div className="noise" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '44px 24px 32px' }}>

        {/* Top bar */}
        <div className="animate-slideDown" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36,
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-d)', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--b5)', marginBottom: 3 }}>
              COCOBOD Field Attendance
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#6FCF97',
                boxShadow: '0 0 8px #6FCF97',
                animation: 'pulseRing 2s ease-out infinite',
              }} />
              <p style={{ color: 'var(--b7)', fontSize: 14, fontWeight: 500 }}>{worker?.full_name}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: '📋', action: () => navigate('/history'), title: 'History' },
              { icon: '↩',  action: logout,                     title: 'Logout'  },
            ].map(({ icon, action, title }) => (
              <button key={title} onClick={action} title={title} style={{
                width: 40, height: 40, borderRadius: '12px',
                background: 'var(--b2)', border: '1px solid var(--b3)',
                color: 'var(--b7)', cursor: 'pointer', fontSize: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--b3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--b2)'}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Live clock */}
        <div className="animate-fadeUp" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <LiveClock />
        </div>

        {/* Device not registered warning */}
        {isRegistered === false && (
          <div className="card animate-fadeUp" style={{
            animationDelay: '0.15s', opacity: 0, marginBottom: 16,
            background: '#B7770D10', borderColor: '#B7770D40', padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>📱</span>
              <div>
                <p style={{ fontFamily: 'var(--font-d)', fontWeight: 700,
                  fontSize: 13, color: '#F2C94C', marginBottom: 2 }}>Device Not Registered</p>
                <p style={{ color: 'var(--b6)', fontSize: 12 }}>
                  Tap Check In to register this device first.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Site card */}
        <div className="animate-fadeUp" style={{ animationDelay: '0.2s', opacity: 0, marginBottom: 20 }}>
          {site ? (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--b4), var(--b3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  boxShadow: '0 4px 12px #6B2F0D50',
                }}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 14,
                    marginBottom: 2, color: 'var(--b8)' }}>{site.name}</p>
                  <p style={{ color: 'var(--b5)', fontSize: 12, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.address}</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 10, flexShrink: 0 }}>Active</span>
              </div>
              {site.checkin_windows?.length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {site.checkin_windows.map(w => (
                      <span key={w.id} className="badge badge-muted" style={{ fontSize: 10 }}>
                        {w.label}: {w.window_open?.slice(0,5)}–{w.window_close?.slice(0,5)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '16px 20px',
              background: 'linear-gradient(135deg, #B7770D15, #6B2F0D10)',
              borderColor: '#B7770D40' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-d)', fontWeight: 700,
                    fontSize: 14, color: '#F2C94C', marginBottom: 2 }}>No Site Assigned</p>
                  <p style={{ color: 'var(--b6)', fontSize: 12 }}>
                    Contact your supervisor to be assigned to a work site.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Phase card */}
        {inProgress && (
          <div className="card phase-card animate-scaleIn" style={{
            marginBottom: 20, textAlign: 'center', padding: '28px 20px',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16,
              animation: 'floatY 2s ease-in-out infinite' }}>
              {PHASE_CONFIG[phase].icon}
            </div>
            <div className="spinner" style={{ color: 'var(--b6)', margin: '0 auto 14px',
              width: 28, height: 28, borderWidth: 3 }} />
            <p style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 17,
              color: 'var(--b8)', marginBottom: 6 }}>
              {PHASE_CONFIG[phase].label}
            </p>
            <p style={{ color: 'var(--b5)', fontSize: 13 }}>{PHASE_CONFIG[phase].sub}</p>
          </div>
        )}

        {/* Result card */}
        {phase === 'result' && result && (() => {
          const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.on_time;
          return (
            <div className="card animate-scaleIn" style={{
              marginBottom: 20, textAlign: 'center', padding: '28px 20px',
              background: cfg.bg, borderColor: cfg.border,
            }}>
              <div style={{ fontSize: 52, marginBottom: 12,
                animation: 'floatY 3s ease-in-out infinite' }}>{cfg.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 800,
                color: cfg.color, marginBottom: 8 }}>{cfg.label}</h3>
              <p style={{ color: 'var(--b6)', fontSize: 13, marginBottom: 16 }}>
                {result.window ? `Window: ${result.window}` : 'Outside check-in window'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${result.location_verified ? 'badge-success' : 'badge-danger'}`}>
                  📍 {result.location_verified ? 'Location OK' : 'Wrong Location'}
                </span>
              </div>
              {result.distance_from_site_m != null && (
                <p style={{ color: 'var(--b4)', fontSize: 11, marginTop: 8 }}>
                  {result.distance_from_site_m}m from site
                </p>
              )}
            </div>
          );
        })()}

        {/* Error card */}
        {phase === 'error' && (
          <div className="card animate-scaleIn" style={{
            marginBottom: 20, textAlign: 'center', padding: '24px 20px',
            background: '#C0392B10', borderColor: '#C0392B40',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            <p style={{ color: '#EB5757', fontFamily: 'var(--font-d)', fontWeight: 700,
              fontSize: 16, marginBottom: 6 }}>Check-In Failed</p>
            <p style={{ color: 'var(--b6)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* Action area */}
        <div style={{ marginTop: 'auto' }}>
          {phase === 'idle' && (
            <div className="animate-fadeUp" style={{ animationDelay: '0.3s', opacity: 0 }}>
              <div className="checkin-btn-wrap" ref={btnRef}>
                {site && isRegistered && <><div className="ring" /><div className="ring ring-2" /></>}
                <button
                  className="btn btn-primary checkin-hero"
                  onClick={handleCheckIn}
                  disabled={!site || isRegistered === null}
                  style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
                  {ripples.map(r => (
                    <span key={r.id} style={{
                      position: 'absolute', left: r.x, top: r.y,
                      width: 0, height: 0, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.3)',
                      transform: 'translate(-50%,-50%)',
                      animation: 'rippleOut 0.6s ease-out forwards',
                    }} />
                  ))}
                  <span style={{ fontSize: 22 }}>📍</span>
                  {isRegistered === false ? 'Register Device First' : 'Tap to Check In'}
                </button>
              </div>
            </div>
          )}

          {(phase === 'result' || phase === 'error') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              className="animate-fadeUp">
              <button className="btn btn-ghost"
                onClick={() => { setPhase('idle'); setError(''); setResult(null); }}>
                Check In Again
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/history')}>
                View My History
              </button>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/register-device')} style={{
          background: 'none', border: 'none', color: 'var(--b4)',
          cursor: 'pointer', fontSize: 12, marginTop: 20, textAlign: 'center',
          fontFamily: 'var(--font-b)', textDecoration: 'underline',
        }}>
          Register this device
        </button>
      </div>

      <style>{`
        @keyframes rippleOut {
          to { width: 200px; height: 200px; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
