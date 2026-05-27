import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';
import { checkinAPI, webauthnAPI } from '../services/api';

const API = 'https://cocobod-backend-production.up.railway.app/api';

const STATUS = {
  on_time:          { icon: '✅', label: 'Checked In!',         color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
  late:             { icon: '🕐', label: 'Late Check-In',       color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
  outside_geofence: { icon: '📍', label: 'Wrong Location',      color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  biometric_failed: { icon: '🔐', label: 'Auth Failed',         color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  overridden:       { icon: '✅', label: 'Approved',            color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
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

  const [phase, setPhase]           = useState('idle');
  const [site, setSite]             = useState(null);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [isRegistered, setIsReg]    = useState(null);
  const [ripples, setRipples]       = useState([]);

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
          () => rej(new Error('Could not get location. Please enable GPS.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      );
    } catch(err) { setError(err.message); setPhase('error'); return; }

    // Step 2: Biometric — get options from backend, trigger fingerprint prompt
    setPhase('biometric');
    let webauthnResponse;
    try {
      const authOptions = await webauthnAPI.getAuthenticationOptions(worker.id);
      webauthnResponse = await startAuthentication(authOptions);
    } catch(err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Biometric scan was cancelled. Please try again.'
        : (err.message || 'Could not verify biometrics. Please try again.');
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
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '44px 22px 28px' }}>

        {/* Topbar */}
        <div className="slide-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 3 }}>CHED Field Attendance</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', animation: 'pulseGlow 2s ease infinite' }} />
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>{worker?.full_name}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['📋', () => navigate('/history')], ['↩', logout]].map(([icon, fn], i) => (
              <button key={i} onClick={fn} style={{
                width: 38, height: 38, borderRadius: '10px', background: 'var(--bg2)',
                border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Clock */}
        <div className="fade-up" style={{ animationDelay: '0.05s', opacity: 0 }}><Clock /></div>

        {/* No device warning */}
        {isRegistered === false && (
          <div className="card scale-in" style={{ marginBottom: 14, background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.2)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📱</span>
              <div>
                <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 1 }}>Device Not Registered</p>
                <p style={{ color: 'var(--text3)', fontSize: 12 }}>Tap Check In to register this device first.</p>
              </div>
            </div>
          </div>
        )}

        {/* Site card */}
        <div className="fade-up" style={{ animationDelay: '0.1s', opacity: 0, marginBottom: 16 }}>
          {site ? (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 1 }}>{site.name}</p>
                  <p style={{ color: 'var(--text3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.address}</p>
                </div>
                <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>Active</span>
              </div>
              {site.checkin_windows?.length > 0 && (
                <>
                  <div className="divider" style={{ margin: '12px 0 10px' }} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {site.checkin_windows.map(w => (
                      <span key={w.id} className="badge badge-gray" style={{ fontSize: 10 }}>
                        {w.label}: {w.window_open?.slice(0,5)}–{w.window_close?.slice(0,5)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '14px 16px', background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>No Site Assigned</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>Contact your supervisor.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Busy phases */}
        {phase === 'gps' && (
          <div className="card scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'floatY 2s ease-in-out infinite' }}>📡</div>
            <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto 10px', width: 24, height: 24 }} />
            <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text1)', marginBottom: 4 }}>Getting your location...</p>
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>Please allow GPS access</p>
          </div>
        )}

        {phase === 'biometric' && (
          <div className="card scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px', background: 'rgba(245,166,35,0.04)', borderColor: 'rgba(245,166,35,0.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'floatY 2s ease-in-out infinite' }}>👆</div>
            <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto 10px', width: 24, height: 24 }} />
            <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text1)', marginBottom: 4 }}>Verify your identity</p>
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>Use your fingerprint or face ID when prompted</p>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="card scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'floatY 2s ease-in-out infinite' }}>⏳</div>
            <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto 10px', width: 24, height: 24 }} />
            <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text1)', marginBottom: 4 }}>Recording check-in...</p>
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>Almost done, hold tight</p>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && result && (() => {
          const cfg = STATUS[result.status] || STATUS.on_time;
          return (
            <div className="card scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px', background: cfg.bg, borderColor: cfg.color + '30' }}>
              <div style={{ fontSize: 48, marginBottom: 10, animation: 'floatY 3s ease-in-out infinite' }}>{cfg.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 800, color: cfg.color, marginBottom: 6 }}>{cfg.label}</h3>
              <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>
                {result.window ? `Window: ${result.window}` : 'Outside check-in window'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <span className={`badge ${result.location_verified ? 'badge-green' : 'badge-red'}`}>
                  📍 {result.location_verified ? 'Location OK' : 'Wrong Location'}
                </span>
              </div>
              {result.distance_from_site_m != null && (
                <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>{result.distance_from_site_m}m from site</p>
              )}
              {result.biometric_fail_reason && (
                <p style={{ color: 'var(--text3)', fontSize: 10, marginTop: 6, wordBreak: 'break-all' }}>
                  Debug: {result.biometric_fail_reason}
                </p>
              )}
            </div>
          );
        })()}

        {/* Error */}
        {phase === 'error' && (
          <div className="card scale-in" style={{ marginBottom: 16, textAlign: 'center', padding: '20px 16px', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: '#EF4444', marginBottom: 4 }}>Check-In Failed</p>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* Action */}
        <div style={{ marginTop: 'auto' }}>
          {phase === 'idle' && (
            <div className="fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
              <button ref={btnRef} className="btn btn-primary"
                onClick={handleCheckIn} disabled={!site || isRegistered === null}
                style={{ fontSize: 16, padding: '20px', position: 'relative', overflow: 'hidden', animation: site && isRegistered ? 'pulseGlow 2.5s ease infinite' : 'none' }}>
                {ripples.map(r => (
                  <span key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: 0, height: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', transform: 'translate(-50%,-50%)', animation: 'ripple 0.7s ease-out forwards', pointerEvents: 'none' }} />
                ))}
                <span style={{ fontSize: 20 }}>📍</span>
                {isRegistered === false ? 'Register Device First' : 'Check In Now'}
              </button>
            </div>
          )}

          {(phase === 'result' || phase === 'error') && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => { setPhase('idle'); setError(''); setResult(null); }}>Check In Again</button>
              <button className="btn btn-outline" onClick={() => navigate('/history')}>View History</button>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/register-device')} style={{
          background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
          fontSize: 12, marginTop: 16, textAlign: 'center', fontFamily: 'var(--font-b)',
          textDecoration: 'underline', padding: '8px',
        }}>Register this device</button>
      </div>
    </div>
  );
}
