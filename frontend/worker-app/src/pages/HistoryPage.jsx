import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkinAPI } from '../services/api';

const STATUS_CONFIG = {
  on_time:          { icon: '✅', label: 'On Time',            color: 'var(--accent)' },
  late:             { icon: '🕐', label: 'Late',               color: 'var(--gold)' },
  outside_geofence: { icon: '📍', label: 'Wrong Location',     color: 'var(--danger)' },
  biometric_failed: { icon: '👆', label: 'Biometric Failed',   color: 'var(--danger)' },
  overridden:       { icon: '✅', label: 'Approved',           color: 'var(--accent)' },
  pending:          { icon: '⏳', label: 'Pending',            color: 'var(--text-secondary)' },
};

function groupByDate(checkins) {
  return checkins.reduce((groups, item) => {
    const date = item.checked_in_date || item.checked_in_at?.slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {});
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function HistoryPage() {
  const { worker, token } = useAuth();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await checkinAPI.getMyHistory(worker.id, token);
        setCheckins(data.checkins || []);
      } catch (err) {
        setError('Could not load history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [worker.id, token]);

  const grouped = groupByDate(checkins);

  return (
    <div className="screen">
      <div className="bg-mesh" />

      <div className="content" style={{
        flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 24px 32px',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/checkin')}
            style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--navy-light)',
              border: '1px solid var(--card-border)', color: 'var(--text-primary)',
              cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0 }}>
            ←
          </button>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>
              My History
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Last 30 days</p>
          </div>
        </div>

        {/* Stats row */}
        {checkins.length > 0 && (() => {
          const onTime  = checkins.filter(c => c.status === 'on_time' || c.status === 'overridden').length;
          const late    = checkins.filter(c => c.status === 'late').length;
          const failed  = checkins.filter(c => c.status === 'outside_geofence' || c.status === 'biometric_failed').length;

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
              {[
                { label: 'On Time', value: onTime, color: 'var(--accent)' },
                { label: 'Late',    value: late,   color: 'var(--gold)' },
                { label: 'Failed',  value: failed, color: 'var(--danger)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28,
                    fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* List */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ color: 'var(--accent)', width: 32, height: 32 }} />
          </div>
        )}

        {error && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        )}

        {!loading && checkins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>No check-ins yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Your attendance history will appear here.
            </p>
          </div>
        )}

        {Object.entries(grouped)
          .sort(([a], [b]) => new Date(b) - new Date(a))
          .map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: 10 }}>
                {formatDate(date)}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(c => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  const time = new Date(c.checked_in_at).toLocaleTimeString('en-GB',
                    { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={c.id} className="card" style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                          <div>
                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                              fontSize: 14, color: cfg.color }}>
                              {cfg.label}
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                              {c.window_label || 'Outside window'} · {c.site_name}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15,
                          fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {time}
                        </span>
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
