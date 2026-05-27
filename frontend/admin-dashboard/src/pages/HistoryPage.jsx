import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, siteAPI } from '../services/api';

const API = 'https://cocobod-backend-production.up.railway.app/api';

const STATUS_CONFIG = {
  on_time:          { label: 'On Time',        badge: 'badge-success' },
  late:             { label: 'Late',           badge: 'badge-warning' },
  outside_geofence: { label: 'Wrong Location', badge: 'badge-danger'  },
  biometric_failed: { label: 'Auth Failed',    badge: 'badge-danger'  },
  overridden:       { label: 'Approved',       badge: 'badge-info'    },
  pending:          { label: 'Pending',        badge: 'badge-muted'   },
};

function getDefaultDates() {
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { from, to };
}

export default function HistoryPage() {
  const { token } = useAuth();
  const defaults  = getDefaultDates();

  const [from, setFrom]       = useState(defaults.from);
  const [to, setTo]           = useState(defaults.to);
  const [siteFilter, setSite] = useState('');
  const [sites, setSites]     = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    siteAPI.getAll(token).then(d => setSites(d.sites || [])).catch(() => {});
    // Auto-load last 30 days on mount
    handleSearch();
  }, []);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = { from, to };
      if (siteFilter) params.site_id = siteFilter;
      const data = await adminAPI.getReport(token, params);
      setRecords(data.report || []);
      setLoaded(true);
    } catch(_) {}
    finally { setLoading(false); }
  }

  function exportCSV() {
    const headers = ['Date', 'Worker', 'Employee ID', 'Site', 'Window', 'Status', 'Time', 'Location Verified', 'Distance (m)'];
    const rows = filtered.map(r => [
      r.date,
      r.worker_name,
      r.employee_id,
      r.site_name,
      r.window || '',
      r.status,
      new Date(r.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      r.location_verified ? 'Yes' : 'No',
      r.distance_from_site_m || '',
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ched-attendance-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = records.filter(r =>
    !search ||
    r.worker_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.site_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by date
  const grouped = filtered.reduce((g, r) => {
    const d = r.date?.slice(0,10) || r.checked_in_at?.slice(0,10);
    if (!g[d]) g[d] = [];
    g[d].push(r); return g;
  }, {});

  const stats = {
    total:   filtered.length,
    on_time: filtered.filter(r => r.status === 'on_time' || r.status === 'overridden').length,
    late:    filtered.filter(r => r.status === 'late').length,
    failed:  filtered.filter(r => r.status === 'outside_geofence' || r.status === 'biometric_failed').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance History</h1>
          <p className="page-subtitle">Full check-in records across all workers and sites</p>
        </div>
        {loaded && filtered.length > 0 && (
          <button className="btn btn-ghost" onClick={exportCSV}>↓ Export CSV</button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 150 }}>
              <label className="input-label">From</label>
              <input className="input-field" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 150 }}>
              <label className="input-label">To</label>
              <input className="input-field" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="input-label">Site</label>
              <select className="input-field" value={siteFilter} onChange={e => setSite(e.target.value)}>
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 38 }}>
              {loading ? <><span className="spinner"/>Loading...</> : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Stats */}
      {loaded && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Records', value: stats.total,   color: 'var(--text1)' },
            { label: 'On Time',       value: stats.on_time, color: 'var(--green)'  },
            { label: 'Late',          value: stats.late,    color: '#92400E'       },
            { label: 'Failed',        value: stats.failed,  color: 'var(--red)'    },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color, fontSize: 30 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {loaded && records.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" style={{ maxWidth: 300 }}
            placeholder="Search by worker, ID or site..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Records grouped by date */}
      {loaded && (
        Object.entries(grouped)
          .sort(([a],[b]) => new Date(b) - new Date(a))
          .map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>
                  {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <span className="badge badge-muted">{items.length} check-in{items.length !== 1 ? 's' : ''}</span>
              </div>
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
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r, i) => {
                        const cfg  = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                        const time = new Date(r.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{r.worker_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.employee_id}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>{r.site_name}</td>
                            <td><span className="badge badge-muted" style={{ fontSize: 11 }}>{r.window || '—'}</span></td>
                            <td style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13 }}>{time}</td>
                            <td>
                              <span className={`badge ${r.location_verified ? 'badge-success' : 'badge-danger'}`}>
                                {r.location_verified ? '✓ OK' : '✗ Failed'}
                              </span>
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

      {!loaded && !loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">Attendance History</div>
            <div className="empty-desc">Select a date range and click Search to view records.</div>
          </div>
        </div>
      )}

      {loaded && filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No records found</div>
            <div className="empty-desc">Try adjusting your date range or site filter.</div>
          </div>
        </div>
      )}
    </div>
  );
}
