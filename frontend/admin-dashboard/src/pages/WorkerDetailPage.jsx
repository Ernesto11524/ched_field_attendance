import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'https://cocobod-backend-production.up.railway.app/api';

const STATUS_CONFIG = {
  on_time:          { label: 'On Time',        badge: 'badge-success', icon: '✅' },
  late:             { label: 'Late',           badge: 'badge-warning', icon: '🕐' },
  outside_geofence: { label: 'Wrong Location', badge: 'badge-danger',  icon: '📍' },
  biometric_failed: { label: 'Auth Failed',    badge: 'badge-danger',  icon: '🔐' },
  overridden:       { label: 'Approved',       badge: 'badge-info',    icon: '✅' },
  pending:          { label: 'Pending',        badge: 'badge-muted',   icon: '⏳' },
};

export default function WorkerDetailPage() {
  const { id }     = useParams();
  const { token }  = useAuth();
  const navigate   = useNavigate();

  const [worker, setWorker]       = useState(null);
  const [checkins, setCheckins]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [resetting, setResetting] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, cRes, dRes] = await Promise.all([
          fetch(`${API}/workers/${id}`,             { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/checkins/worker/${id}?from=${new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/workers/${id}/credentials`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [wData, cData, dData] = await Promise.all([wRes.json(), cRes.json(), dRes.json()]);
        setWorker(wData.worker);
        setCheckins(cData.checkins || []);
        setDeviceCount(dData.count || 0);
      } catch(_) {}
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function handleResetDevice() {
    if (!confirm('This will force the worker to re-register their device. Are you sure?')) return;
    setResetting(true);
    try {
      await fetch(`${API}/workers/${id}/device`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeviceCount(0);
      alert('Device reset successfully. The worker must register their device again.');
    } catch(_) {}
    finally { setResetting(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32, color: 'var(--accent)' }} />
    </div>
  );

  if (!worker) return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <div className="empty-title">Worker not found</div>
        <button className="btn btn-ghost" onClick={() => navigate('/workers')} style={{ marginTop: 16 }}>← Back to Workers</button>
      </div>
    </div>
  );

  const onTime  = checkins.filter(c => c.status === 'on_time' || c.status === 'overridden').length;
  const late    = checkins.filter(c => c.status === 'late').length;
  const failed  = checkins.filter(c => ['outside_geofence','biometric_failed'].includes(c.status)).length;
  const rate    = checkins.length > 0 ? Math.round((onTime / checkins.length) * 100) : 0;

  // Determine rank based on on-time rate
  function getRank(rate) {
    if (rate >= 95) return { label: 'Excellent',   color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
    if (rate >= 80) return { label: 'Good',        color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' };
    if (rate >= 60) return { label: 'Average',     color: '#92400E', bg: '#FEF9C3', border: '#FDE68A' };
    return              { label: 'Needs Improvement', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
  }

  const rank = getRank(rate);

  // Group checkins by date
  const grouped = checkins.reduce((g, c) => {
    const d = c.checked_in_date || c.checked_in_at?.slice(0,10);
    if (!g[d]) g[d] = [];
    g[d].push(c); return g;
  }, {});

  return (
    <div>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workers')}
        style={{ marginBottom: 20, display: 'inline-flex' }}>
        ← Back to Workers
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left column — worker profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile card */}
          <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: '#000',
            }}>
              {worker.full_name?.[0]}
            </div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{worker.full_name}</h2>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>{worker.employee_id}</p>

            {/* Rank badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: rank.bg, border: `1px solid ${rank.border}`, borderRadius: '100px', marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: rank.color }}>{rank.label}</span>
              <span style={{ fontSize: 12, color: rank.color }}>{rate}% on time</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              {[
                ['📱', 'Phone', worker.phone_number],
                ['✉️', 'Email', worker.email || 'Not provided'],
                ['📍', 'Site', worker.sites?.[0]?.site_name || 'Not assigned'],
                ['🔐', 'Device', deviceCount > 0 ? `Registered (${deviceCount})` : 'Not registered'],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-h)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</p>
                    <p style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats card */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h4 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text2)' }}>LAST 30 DAYS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total',   value: checkins.length, color: 'var(--text1)' },
                { label: 'On Time', value: onTime,          color: '#16A34A' },
                { label: 'Late',    value: late,            color: '#92400E' },
                { label: 'Failed',  value: failed,          color: '#DC2626' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Device management */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h4 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text2)' }}>DEVICE MANAGEMENT</h4>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>
              {deviceCount > 0
                ? 'Worker has a registered device. Reset if they change phones.'
                : 'No device registered. Worker must register their phone.'}
            </p>
            {deviceCount > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleResetDevice}
                disabled={resetting} style={{ width: '100%' }}>
                {resetting ? <><span className="spinner"/>Resetting...</> : '🔄 Reset Device'}
              </button>
            )}
          </div>
        </div>

        {/* Right column — check-in history */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 17, fontWeight: 800, marginBottom: 16 }}>
            Check-in History <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 13 }}>— Last 30 days</span>
          </h3>

          {checkins.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No check-ins yet</div>
                <div className="empty-desc">This worker hasn't checked in during the last 30 days.</div>
              </div>
            </div>
          ) : (
            Object.entries(grouped)
              .sort(([a],[b]) => new Date(b) - new Date(a))
              .map(([date, items]) => (
                <div key={date} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h4 style={{ fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                      {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h4>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{items.length} check-in{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Window</th>
                            <th>Time</th>
                            <th>Location</th>
                            <th>Distance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((c, i) => {
                            const cfg  = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                            const time = new Date(c.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <tr key={i}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{cfg.icon}</span>
                                    <span className="badge badge-muted" style={{ fontSize: 11 }}>{c.window_label || '—'}</span>
                                  </div>
                                </td>
                                <td style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13 }}>{time}</td>
                                <td>
                                  <span className={`badge ${c.location_verified ? 'badge-success' : 'badge-danger'}`}>
                                    {c.location_verified ? '✓ OK' : '✗ Failed'}
                                  </span>
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                                  {c.distance_from_site_m != null ? `${c.distance_from_site_m}m` : '—'}
                                </td>
                                <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
