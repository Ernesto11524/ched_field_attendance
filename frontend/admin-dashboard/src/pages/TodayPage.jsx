import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkinAPI, siteAPI } from '../services/api';

const STATUS_CONFIG = {
  on_time:          { label: 'On Time',          badge: 'badge-success' },
  late:             { label: 'Late',             badge: 'badge-warning' },
  outside_geofence: { label: 'Wrong Location',   badge: 'badge-danger'  },
  biometric_failed: { label: 'Bio Failed',       badge: 'badge-danger'  },
  overridden:       { label: 'Approved',         badge: 'badge-info'    },
  pending:          { label: 'Pending',          badge: 'badge-muted'   },
};

export default function TodayPage() {
  const { token } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [sites, setSites]       = useState([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [overrideModal, setOverrideModal] = useState(null); // checkin object
  const [reason, setReason]     = useState('');
  const [overriding, setOverriding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        checkinAPI.getToday(token, siteFilter),
        siteAPI.getAll(token),
      ]);
      setCheckins(c.checkins || []);
      setSites(s.sites || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [siteFilter]);

  async function handleOverride() {
    if (!reason.trim()) return;
    setOverriding(true);
    try {
      await checkinAPI.override(token, overrideModal.id, reason);
      setOverrideModal(null);
      setReason('');
      load();
    } catch (_) {}
    finally { setOverriding(false); }
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today's Check-ins</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="input-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Filter by Site:</label>
          <select className="input-field" style={{ maxWidth: 280 }}
            value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
            {checkins.length} record{checkins.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Site</th>
                <th>Window</th>
                <th>Time</th>
                <th>Location</th>
                <th>Biometric</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
                </td></tr>
              ) : checkins.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-title">No check-ins yet today</div>
                    <div className="empty-desc">Check-ins will appear here as workers submit them.</div>
                  </div>
                </td></tr>
              ) : checkins.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                const time = new Date(c.checked_in_at).toLocaleTimeString('en-GB',
                  { hour: '2-digit', minute: '2-digit' });
                const canOverride = c.status === 'outside_geofence' || c.status === 'biometric_failed';

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.worker_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.employee_id}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.site_name}</td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>
                        {c.window_label || '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{time}</td>
                    <td>
                      <span className={`badge ${c.location_verified ? 'badge-success' : 'badge-danger'}`}>
                        {c.location_verified ? '✓ Verified' : '✗ Failed'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.biometric_verified ? 'badge-success' : 'badge-danger'}`}>
                        {c.biometric_verified ? '✓ Verified' : '✗ Failed'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td>
                      {canOverride && (
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setOverrideModal(c); setReason(''); }}>
                          Override
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOverrideModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                Approve Check-in
              </h3>
              <button onClick={() => setOverrideModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20,
                  color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Approving check-in for <strong>{overrideModal.worker_name}</strong> at{' '}
                <strong>{overrideModal.site_name}</strong>.
              </p>
              <div className="input-group">
                <label className="input-label">Reason for Override</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="e.g. Worker was at site but GPS signal was poor indoors..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOverrideModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOverride}
                disabled={!reason.trim() || overriding}>
                {overriding ? <span className="spinner" /> : null}
                Approve Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
