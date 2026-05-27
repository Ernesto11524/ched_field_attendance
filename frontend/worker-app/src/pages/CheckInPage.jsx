import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';
import { checkinAPI, webauthnAPI } from '../services/api';

const API = 'https://cocobod-backend-production.up.railway.app/api';

const STATUS_CONFIG = {
  on_time:          { label: 'Checked In!',          detail: 'You are on time.',                            color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
  late:             { label: 'Late Check-In',         detail: 'Recorded outside the check-in window.',       color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
  outside_geofence: { label: 'Wrong Location',        detail: 'You are not within the work site boundary.',  color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  biometric_failed: { label: 'Identity Not Verified', detail: 'Biometric check failed.',                     color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  overridden:       { label: 'Supervisor Approved',   detail: 'Check-in was manually approved.',             color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
};

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  const hh   = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const ss   = t.toLocaleTimeString('en-GB', { second: '2-digit' }).slice(-2);
  const date = t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{
          fontFamily: 'var(--font-h)', fontSize: 68, fontWeight: 800,
          letterSpacing: '-0.04em', lineHeight: 1,
          background: 'linear-gradient(135deg, #fff 0%, #71717a 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'clockTick 1s ease infinite',
        }}>{hh}</span>
        <span style={{ fontFamily: 'var(--font-h)', fontSize: 26, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>:{ss}</span>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>{date}</p>
    </div>
  );
}

export default function CheckInPage() {
  const { worker, token, logout } = useAuth();
  const navigate = useNavigate();
  const btnRef   = useRef(null);

  const [phase, setPhase]        = useState('idle');
  const [site, setSite]          = useState(null);
  const [result, setResult]      = useState(null);
  const [error, setError]        = useState('');
  const [isRegistered, setIsReg] = useState(null);
  const [ripples, setRipples]    = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [siteRes, credRes] = await Promise.all([
          fetch(`${API}/workers/${worker.id}/assigned-site`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/workers/${worker.id}/credentials`,   { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [siteData, credData] = await Promise.all([siteRes.json(), credRes.json()]);
        setSite(siteRes.ok && siteData.site ? siteData.site : null);
        setIsReg(credRes.ok && credData.count > 0);
      } catch(_) { setSite(null); setIsReg(false); }
    }
    if (worker?.id && token && token !== 'pending') load();
  }, [worker?.id, token]);

  function addRipple(e) {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now();
    setRipples(r => [...r, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700);
  }

  async function handleCheckIn(e) {
    addRipple(e);
    setError(''); setResult(null);
    if (!site)         { setError('No site assigned. Contact your supervisor.'); setPhase('error'); return; }
    if (!isRegistered) { navigate('/register-device'); return; }

    // Step 1: GPS
    setPhase('gps');
    let coords;
    try {
      coords = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(
          p => res({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => rej(new Error('Could not get your location. Please enable GPS and try again.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      );
    } catch(err) { setError(err.message); setPhase('error'); return; }

    // Step 2: Biometric
    setPhase('biometric');
    let webauthnResponse;
    try {
      const authOptions = await webauthnAPI.getAuthenticationOptions(worker.id);
      webauthnResponse = await startAuthentication(authOptions);
    } catch(err) {
      let msg;
      if (err.name === 'NotAllowedError') {
        msg = isRegistered
          ? 'Biometric failed. Make sure you are using your registered phone. If you recently changed phones, ask your supervisor to reset your device registration.'
          : 'Biometric scan was cancelled. Please try again.';
      } else {
        msg = err.message || 'Could not verify biometrics. Please try again.';
      }
      setError(msg);
      setPhase('error');
      return;
    }

    // Step 3: Submit — backend verifies the WebAuthn response server-side
    setPhase('submitting');
    try {
      const data = await checkinAPI.submit({
        worker_id: worker.id,
        site_id: site.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        webauthn_response: webauthnResponse,
      }, token);
      setResult(data.checkin); setPhase('result');
    } catch(err) { setError(err.message); setPhase('error'); }
  }

  const busy = phase === 'gps' || phase === 'biometric' || phase === 'submitting';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '48px 22px 24px' }}>

          {/* Header */}
          <div className="slide-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>CHED Field Attendance</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', animation: 'pulseGlow 2s ease infinite', flexShrink: 0 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>{worker?.full_name}</p>
              </div>
            </div>
            <button onClick={logout} style={{
              padding: '8px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text3)', fontSize: 13,
              fontFamily: 'var(--font-h)', fontWeight: 600, cursor: 'pointer',
              flexShrink: 0, marginLeft: 12, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text1)'; e.currentTarget.style.background = 'var(--bg3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'var(--bg2)'; }}>
              Sign Out
            </button>
          </div>

          {/* Clock */}
          <div className="fade-up" style={{ animationDelay: '0.05s', opacity: 0 }}><Clock /></div>

          {/* Device not registered warning */}
          {isRegistered === false && (
            <div className="card scale-in" style={{ marginBottom: 14, background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.2)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <line x1="12" y1="17" x2="12" y2="17" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 2 }}>Device Not Registered</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.5 }}>Tap the button below to set up this device for check-in.</p>
                </div>
              </div>
            </div>
          )}

          {/* Site card */}
          <div className="fade-up" style={{ animationDelay: '0.1s', opacity: 0, marginBottom: 16 }}>
            {site ? (
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
                      <circle cx="12" cy="10.5" r="2.5"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>{site.name}</p>
                    <p style={{ color: 'var(--text3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.address}</p>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>Active</span>
                </div>
                {site.checkin_windows?.length > 0 && (
                  <>
                    <div className="divider" style={{ margin: '12px 0 10px' }} />
                    <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>Check-In Windows</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {site.checkin_windows.map(w => (
                        <span key={w.id} className="badge badge-gray" style={{ fontSize: 11 }}>
                          {w.label}: {w.window_open?.slice(0,5)}–{w.window_close?.slice(0,5)}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '14px 16px', background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>No Site Assigned</p>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>Contact your supervisor to get assigned to a site.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Phase: Getting location */}
          {phase === 'gps' && (
            <div className="card scale-in" style={{ marginBottom: 16, padding: '18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'pulseGlow 1.5s ease infinite' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12.55a11 11 0 0014.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 006.95 0"/>
                    <line x1="12" y1="20" x2="12" y2="22"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>Getting your location</p>
                    <div className="spinner" style={{ color: '#3B82F6', width: 14, height: 14, borderWidth: '2px' }} />
                  </div>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>Please allow location access if prompted</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Biometric scan */}
          {phase === 'biometric' && (
            <div className="card scale-in" style={{ marginBottom: 16, padding: '18px 16px', background: 'rgba(245,166,35,0.04)', borderColor: 'rgba(245,166,35,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'pulseGlow 1s ease infinite' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M2 12C2 6.5 6.5 2 12 2"/><path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6 1.5 0 2.9.6 3.9 1.5"/>
                    <path d="M8 19.8c.3-.8.5-1.7.5-2.8 0-2.2 1.8-4 4-4 .5 0 .9.1 1.3.2"/><path d="M12 16c-.4.8-.7 1.8-.7 2.8 0 .7.1 1.4.3 2"/>
                    <path d="M20 13c0 4.4-1.8 8.4-4.7 11.3"/><path d="M22 12c0-5.5-4.5-10-10-10"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>Scan your fingerprint</p>
                    <div className="spinner" style={{ color: 'var(--accent)', width: 14, height: 14, borderWidth: '2px' }} />
                  </div>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>Check your screen for the biometric prompt</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Submitting */}
          {phase === 'submitting' && (
            <div className="card scale-in" style={{ marginBottom: 16, padding: '18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div className="spinner" style={{ color: '#22C55E', width: 22, height: 22, borderWidth: '2.5px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text1)', marginBottom: 4 }}>Recording your attendance</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>Almost done, please wait...</p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && result && (() => {
            const cfg = STATUS_CONFIG[result.status] || { label: 'Recorded', detail: '', color: '#71717A', bg: 'rgba(113,113,122,0.08)' };
            const isSuccess = result.status === 'on_time' || result.status === 'overridden';
            return (
              <div className="card scale-in" style={{ marginBottom: 16, padding: '18px 16px', background: cfg.bg, borderColor: cfg.color + '40' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '14px', background: cfg.color + '18', border: `1px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSuccess
                      ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17, color: cfg.color, marginBottom: 3 }}>{cfg.label}</p>
                    <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{cfg.detail}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={result.location_verified ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 11 }}>
                        {result.location_verified ? 'Location verified' : 'Outside boundary'}
                      </span>
                      {result.window && <span className="badge badge-gray" style={{ fontSize: 11 }}>Window: {result.window}</span>}
                      {result.distance_from_site_m != null && (
                        <span className="badge badge-gray" style={{ fontSize: 11 }}>{result.distance_from_site_m}m from site</span>
                      )}
                    </div>
                    {result.biometric_fail_reason && (
                      <p style={{ color: 'var(--text3)', fontSize: 10, marginTop: 8, wordBreak: 'break-all' }}>
                        Debug: {result.biometric_fail_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Error */}
          {phase === 'error' && (
            <div className="card scale-in" style={{ marginBottom: 16, padding: '18px 16px', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: '#EF4444', marginBottom: 4 }}>Check-In Failed</p>
                  <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.5 }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 4 }}>
            {phase === 'idle' && (
              <div className="fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
                <button ref={btnRef} className="btn btn-primary"
                  onClick={handleCheckIn} disabled={!site || isRegistered === null}
                  style={{ fontSize: 16, padding: '18px', position: 'relative', overflow: 'hidden', animation: site && isRegistered ? 'pulseGlow 2.5s ease infinite' : 'none' }}>
                  {ripples.map(r => (
                    <span key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: 0, height: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', transform: 'translate(-50%,-50%)', animation: 'ripple 0.7s ease-out forwards', pointerEvents: 'none' }} />
                  ))}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
                    <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none"/>
                  </svg>
                  {isRegistered === false ? 'Register Device to Check In' : 'Check In Now'}
                </button>
              </div>
            )}

            {(phase === 'result' || phase === 'error') && (
              <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => { setPhase('idle'); setError(''); setResult(null); }}>Check In Again</button>
                <button className="btn btn-outline" onClick={() => navigate('/history')}>View My Attendance History</button>
              </div>
            )}

            {!isRegistered && (
              <button onClick={() => navigate('/register-device')} style={{
                background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
                fontSize: 12, marginTop: 14, textAlign: 'center', fontFamily: 'var(--font-b)',
                textDecoration: 'underline', padding: '8px', width: '100%',
              }}>Set up biometrics on this device</button>
            )}
          </div>

        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav">
        <button className="nav-tab active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
            <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
          <span className="nav-tab-label">Check In</span>
        </button>
        <button className="nav-tab" onClick={() => navigate('/history')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
          </svg>
          <span className="nav-tab-label">My History</span>
        </button>
      </nav>
    </div>
  );
}
