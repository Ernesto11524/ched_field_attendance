import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, siteAPI } from '../services/api';

const STATUS_CONFIG = {
  on_time:          { label: 'On Time',         badge: 'badge-success' },
  late:             { label: 'Late',            badge: 'badge-warning' },
  outside_geofence: { label: 'Wrong Location',  badge: 'badge-danger'  },
  biometric_failed: { label: 'Bio Failed',      badge: 'badge-danger'  },
  overridden:       { label: 'Approved',        badge: 'badge-info'    },
  pending:          { label: 'Pending',         badge: 'badge-muted'   },
};

function getDefaultDates() {
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { from, to };
}

export default function ReportsPage() {
  const { token } = useAuth();
  const defaults  = getDefaultDates();

  const [from, setFrom]         = useState(defaults.from);
  const [to, setTo]             = useState(defaults.to);
  const [siteFilter, setSite]   = useState('');
  const [sites, setSites]       = useState([]);
  const [report, setReport]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    siteAPI.getAll(token).then(d => setSites(d.sites || [])).catch(() => {});
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const params = { from, to };
      if (siteFilter) params.site_id = siteFilter;
      const data = await adminAPI.getReport(token, params);
      setReport(data.report || []);
      setLoaded(true);
    } catch (_) {}
    finally { setLoading(false); }
  }

  function exportCSV() {
    const headers = ['Date', 'Worker', 'Employee ID', 'Site', 'Window', 'Status', 'Time', 'Location Verified', 'Biometric Verified', 'Distance (m)'];
    const rows = report.map(r => [
      r.date,
      r.worker_name,
      r.employee_id,
      r.site_name,
      r.window || '',
      r.status,
      new Date(r.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      r.location_verified ? 'Yes' : 'No',
      r.biometric_verified ? 'Yes' : 'No',
      r.distance_from_site_m || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary stats from report data
  const stats = loaded ? {
    total:    report.length,
    on_time:  report.filter(r => r.status === 'on_time' || r.status === 'overridden').length,
    late:     report.filter(r => r.status === 'late').length,
    failed:   report.filter(r => r.status === 'outside_geofence' || r.status === 'biometric_failed').length,
  } : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Reports</h1>
          <p className="page-subtitle">Filter and export attendance data</p>
        </div>
        {loaded && report.length > 0 && (
          <button className="btn btn-ghost" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* Filter form */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="input-label">From</label>
              <input className="input-field" type="date" value={from}
                onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="input-label">To</label>
              <input className="input-field" type="date" value={to}
                onChange={e => setTo(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="input-label">Site</label>
              <select className="input-field" value={siteFilter} onChange={e => setSite(e.target.value)}>
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Loading...' : 'Run Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Records', value: stats.total,   color: 'var(--text-primary)' },
            { label: 'On Time',       value: stats.on_time, color: 'var(--success)' },
            { label: 'Late',          value: stats.late,    color: 'var(--warning)' },
            { label: 'Failed',        value: stats.failed,  color: 'var(--danger)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color, fontSize: 32 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {loaded && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Site</th>
                  <th>Window</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Biometric</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <div className="empty-title">No records found</div>
                      <div className="empty-desc">Try a different date range or site.</div>
                    </div>
                  </td></tr>
                ) : report.map((r, i) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const time = new Date(r.checked_in_at).toLocaleTimeString('en-GB',
                    { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.worker_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.employee_id}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.site_name}</td>
                      <td><span className="badge badge-muted" style={{ fontSize: 11 }}>{r.window || '—'}</span></td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{time}</td>
                      <td>
                        <span className={`badge ${r.location_verified ? 'badge-success' : 'badge-danger'}`}>
                          {r.location_verified ? '✓' : '✗'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.biometric_verified ? 'badge-success' : 'badge-danger'}`}>
                          {r.biometric_verified ? '✓' : '✗'}
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
      )}

      {!loaded && !loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">Run a report</div>
            <div className="empty-desc">Select a date range and click "Run Report" to see attendance data.</div>
          </div>
        </div>
      )}
    </div>
  );
}
