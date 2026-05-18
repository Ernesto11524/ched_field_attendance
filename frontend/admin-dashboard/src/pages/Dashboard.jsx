import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const STATUS_COLORS = {
  on_time:          '#00D4AA',
  late:             '#F5A623',
  outside_geofence: '#E53E3E',
  biometric_failed: '#9F7AEA',
  overridden:       '#3182CE',
};

export default function Dashboard() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const d = await adminAPI.getDashboard(token);
        setData(d);
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 36, height: 36, color: 'var(--accent)' }} />
    </div>
  );

  const today = data?.today || {};
  const total = parseInt(today.total_checkins) || 0;

  const pieData = [
    { name: 'On Time',         value: parseInt(today.on_time)          || 0, key: 'on_time' },
    { name: 'Late',            value: parseInt(today.late)             || 0, key: 'late' },
    { name: 'Wrong Location',  value: parseInt(today.outside_geofence) || 0, key: 'outside_geofence' },
    { name: 'Bio Failed',      value: parseInt(today.biometric_failed) || 0, key: 'biometric_failed' },
    { name: 'Overridden',      value: parseInt(today.overridden)       || 0, key: 'overridden' },
  ].filter(d => d.value > 0);

  const barData = (data?.by_site || []).map(s => ({
    name: s.site_name.replace('Site ', '').slice(0, 16),
    'On Time': parseInt(s.on_time) || 0,
    'Issues':  parseInt(s.issues)  || 0,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live attendance overview for today</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/today')}>
          View All Check-ins →
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {[
          { label: 'Total Workers',   value: data?.total_workers || 0, color: 'var(--text-primary)', icon: '👥' },
          { label: 'On Time Today',   value: today.on_time || 0,       color: '#00D4AA',             icon: '✅' },
          { label: 'Late Today',      value: today.late || 0,          color: '#F5A623',             icon: '🕐' },
          { label: 'Failed/Issues',   value: (parseInt(today.outside_geofence)||0) + (parseInt(today.biometric_failed)||0), color: '#E53E3E', icon: '⚠️' },
          { label: 'Total Check-ins', value: total,                    color: 'var(--info)',         icon: '📋' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, marginBottom: 24 }}>

        {/* Pie chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Check-in Status</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today</span>
          </div>
          <div className="card-body">
            {pieData.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-icon">📭</div>
                <div className="empty-title">No check-ins yet</div>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {pieData.map(d => (
                    <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%',
                          background: STATUS_COLORS[d.key] }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bar chart by site */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Check-ins by Site</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today</span>
          </div>
          <div className="card-body">
            {barData.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-icon">📭</div>
                <div className="empty-title">No data yet</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip />
                  <Bar dataKey="On Time" fill="#00D4AA" radius={[4,4,0,0]} />
                  <Bar dataKey="Issues"  fill="#E53E3E" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Per-site table */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <h3 className="card-title">Site Summary</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>On Time</th>
                <th>Issues</th>
                <th>Total Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_site || []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  No check-ins today yet.
                </td></tr>
              ) : (data?.by_site || []).map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.site_name}</td>
                  <td><span className="badge badge-success">{s.on_time}</span></td>
                  <td><span className="badge badge-danger">{s.issues}</span></td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
