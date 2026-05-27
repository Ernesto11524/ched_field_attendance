import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkinAPI } from '../services/api';

const STATUS = {
  on_time:          { icon: '✅', label: 'On Time',          color: '#22C55E' },
  late:             { icon: '🕐', label: 'Late',             color: '#F5A623' },
  outside_geofence: { icon: '📍', label: 'Wrong Location',   color: '#EF4444' },
  biometric_failed: { icon: '🔐', label: 'Auth Failed',      color: '#EF4444' },
  overridden:       { icon: '✅', label: 'Approved',         color: '#22C55E' },
  pending:          { icon: '⏳', label: 'Pending',          color: '#71717A' },
};

function groupByDate(items) {
  return items.reduce((g, c) => {
    const d = c.checked_in_date || c.checked_in_at?.slice(0,10);
    if (!g[d]) g[d] = [];
    g[d].push(c); return g;
  }, {});
}

function fmtDate(s) {
  const d = new Date(s), t = new Date(), y = new Date(t); y.setDate(y.getDate()-1);
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

  const onTime = checkins.filter(c => c.status === 'on_time' || c.status === 'overridden').length;
  const late   = checkins.filter(c => c.status === 'late').length;
  const failed = checkins.filter(c => ['outside_geofence','biometric_failed'].includes(c.status)).length;
  const grouped = groupByDate(checkins);

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '44px 22px 32px' }}>

        <div className="slide-down" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate('/checkin')} style={{ width: 38, height: 38, borderRadius: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 800 }}>My History</h2>
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>Last 30 days</p>
          </div>
        </div>

        {checkins.length > 0 && (
          <div className="fade-up" style={{ animationDelay: '0.05s', opacity: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'On Time', value: onTime, color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
              { label: 'Late',    value: late,   color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
              { label: 'Failed',  value: failed, color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 10px', background: s.bg, borderColor: s.color + '30' }}>
                <div style={{ fontFamily: 'var(--font-h)', fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ color: 'var(--accent)', width: 28, height: 28 }} />
          </div>
        )}

        {!loading && checkins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 14, animation: 'floatY 3s ease-in-out infinite' }}>📋</div>
            <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No check-ins yet</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Your attendance history will appear here.</p>
          </div>
        )}

        {Object.entries(grouped)
          .sort(([a],[b]) => new Date(b) - new Date(a))
          .map(([date, items], gi) => (
            <div key={date} className="fade-up" style={{ animationDelay: `${gi * 0.06}s`, opacity: 0, marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-h)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>{fmtDate(date)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(c => {
                  const cfg  = STATUS[c.status] || STATUS.pending;
                  const time = new Date(c.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={c.id} className="card" style={{ padding: '14px 16px', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                          <div>
                            <p style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</p>
                            <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 1 }}>{c.window_label || 'Outside window'} · {c.site_name}</p>
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
  );
}
