import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkinAPI } from '../services/api';

const STATUS = {
  on_time:          { label: 'On Time',        color: '#22C55E' },
  late:             { label: 'Late',            color: '#F5A623' },
  outside_geofence: { label: 'Wrong Location',  color: '#EF4444' },
  biometric_failed: { label: 'Auth Failed',     color: '#EF4444' },
  overridden:       { label: 'Approved',        color: '#22C55E' },
  pending:          { label: 'Pending',         color: '#71717A' },
};

function StatusIcon({ status, color, size = 16 }) {
  if (status === 'on_time' || status === 'overridden') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  if (status === 'late') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    );
  }
  if (status === 'outside_geofence') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function groupByDate(items) {
  return items.reduce((g, c) => {
    const d = c.checked_in_date || c.checked_in_at?.slice(0, 10);
    if (!g[d]) g[d] = [];
    g[d].push(c); return g;
  }, {});
}

function fmtDate(s) {
  const d = new Date(s), t = new Date(), y = new Date(t); y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function HistoryPage() {
  const { worker, token } = useAuth();
  const navigate = useNavigate();
  const [checkins, set] = useState([]);
  const [loading, setL] = useState(true);

  useEffect(() => {
    checkinAPI.getMyHistory(worker.id, token)
      .then(d => set(d.checkins || []))
      .finally(() => setL(false));
  }, []);

  const onTime  = checkins.filter(c => c.status === 'on_time' || c.status === 'overridden').length;
  const late    = checkins.filter(c => c.status === 'late').length;
  const failed  = checkins.filter(c => ['outside_geofence', 'biometric_failed'].includes(c.status)).length;
  const grouped = groupByDate(checkins);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '48px 22px 24px' }}>

          {/* Header */}
          <div className="slide-down" style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--font-h)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>CHED Field Attendance</p>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 24, fontWeight: 800, color: 'var(--text1)', marginBottom: 2 }}>Attendance History</h2>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Your last 30 days of check-ins</p>
          </div>

          {/* Stats row */}
          {checkins.length > 0 && (
            <div className="fade-up" style={{ animationDelay: '0.05s', opacity: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'On Time', value: onTime, color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
                { label: 'Late',    value: late,   color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
                { label: 'Failed',  value: failed, color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 10px', background: s.bg, borderColor: s.color + '30' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" style={{ color: 'var(--accent)', width: 28, height: 28 }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && checkins.length === 0 && (
            <div style={{ textAlign: 'center', padding: '52px 20px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No check-ins yet</h3>
              <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.6 }}>Your attendance history will appear here after your first check-in.</p>
            </div>
          )}

          {/* Grouped check-in list */}
          {Object.entries(grouped)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, items], gi) => (
              <div key={date} className="fade-up" style={{ animationDelay: `${gi * 0.06}s`, opacity: 0, marginBottom: 22 }}>
                <p style={{
                  fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--text3)', marginBottom: 10,
                }}>{fmtDate(date)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(c => {
                    const cfg  = STATUS[c.status] || STATUS.pending;
                    const time = new Date(c.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={c.id} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${cfg.color}`, transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: cfg.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <StatusIcon status={c.status} color={cfg.color} size={16} />
                            </div>
                            <div>
                              <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</p>
                              <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>
                                {c.window_label || 'Outside window'} · {c.site_name}
                              </p>
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-h)', fontSize: 14, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>{time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav">
        <button className="nav-tab" onClick={() => navigate('/checkin')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
            <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
          <span className="nav-tab-label">Check In</span>
        </button>
        <button className="nav-tab active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
          </svg>
          <span className="nav-tab-label">My History</span>
        </button>
      </nav>
    </div>
  );
}
