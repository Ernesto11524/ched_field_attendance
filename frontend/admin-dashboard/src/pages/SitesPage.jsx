import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteAPI } from '../services/api';

export default function SitesPage() {
  const { token } = useAuth();
  const [sites, setSites]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // 'add-site' | 'add-window' | null
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [siteForm, setSiteForm] = useState({
    name: '', address: '', latitude: '', longitude: '', geofence_radius_m: '100'
  });
  const [windowForm, setWindowForm] = useState({
    label: '', window_open: '', window_close: ''
  });

  async function load() {
    setLoading(true);
    try {
      const d = await siteAPI.getAll(token);
      setSites(d.sites || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateSite(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await siteAPI.create(token, {
        ...siteForm,
        latitude: parseFloat(siteForm.latitude),
        longitude: parseFloat(siteForm.longitude),
        geofence_radius_m: parseInt(siteForm.geofence_radius_m),
      });
      setModal(null);
      setSiteForm({ name: '', address: '', latitude: '', longitude: '', geofence_radius_m: '100' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleAddWindow(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await siteAPI.addWindow(token, selected.id, windowForm);
      setModal(null);
      setWindowForm({ label: '', window_open: '', window_close: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleRemoveWindow(windowId) {
    if (!confirm('Remove this check-in window?')) return;
    try { await siteAPI.removeWindow(token, windowId); load(); } catch (_) {}
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Sites</h1>
          <p className="page-subtitle">{sites.length} active sites</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModal('add-site'); setError(''); }}>
          + Add Site
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ color: 'var(--accent)', width: 32, height: 32 }} />
        </div>
      ) : sites.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <div className="empty-title">No sites yet</div>
            <div className="empty-desc">Add your first work site to get started.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sites.map(site => (
            <div key={site.id} className="card">
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                      fontSize: 18, marginBottom: 4 }}>{site.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{site.address}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        📍 {site.latitude}, {site.longitude}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--info)', fontWeight: 600 }}>
                        Geofence: {site.geofence_radius_m}m
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { setSelected(site); setModal('add-window'); setError(''); }}>
                    + Add Window
                  </button>
                </div>

                {/* Check-in windows */}
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--text-muted)', marginBottom: 10 }}>
                    Check-in Windows
                  </p>
                  {!site.checkin_windows || site.checkin_windows.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No windows defined yet.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {site.checkin_windows.map(w => (
                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 14px', background: 'var(--bg)',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                              fontSize: 13 }}>{w.label}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>
                              {w.window_open?.slice(0,5)} – {w.window_close?.slice(0,5)}
                            </span>
                          </div>
                          <button onClick={() => handleRemoveWindow(w.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
                              cursor: 'pointer', fontSize: 14, padding: '0 2px',
                              lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Site Modal */}
      {modal === 'add-site' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Add Work Site</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none',
                fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateSite}>
              <div className="modal-body">
                {error && <div style={{ padding: '10px 14px', background: '#FFF5F5',
                  border: '1px solid #FED7D7', borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
                <div className="input-group">
                  <label className="input-label">Site Name *</label>
                  <input className="input-field" required placeholder="Site A - Central Business District"
                    value={siteForm.name} onChange={e => setSiteForm({...siteForm, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Address *</label>
                  <input className="input-field" required placeholder="Liberation Road, Accra"
                    value={siteForm.address} onChange={e => setSiteForm({...siteForm, address: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Latitude *</label>
                    <input className="input-field" required type="number" step="any" placeholder="5.5913"
                      value={siteForm.latitude} onChange={e => setSiteForm({...siteForm, latitude: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Longitude *</label>
                    <input className="input-field" required type="number" step="any" placeholder="-0.1969"
                      value={siteForm.longitude} onChange={e => setSiteForm({...siteForm, longitude: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Geofence Radius (metres) *</label>
                  <input className="input-field" required type="number" placeholder="100"
                    value={siteForm.geofence_radius_m} onChange={e => setSiteForm({...siteForm, geofence_radius_m: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : null} Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Window Modal */}
      {modal === 'add-window' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                Add Check-in Window
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none',
                fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddWindow}>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Adding a window to <strong>{selected.name}</strong>
                </p>
                {error && <div style={{ padding: '10px 14px', background: '#FFF5F5',
                  border: '1px solid #FED7D7', borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
                <div className="input-group">
                  <label className="input-label">Label *</label>
                  <input className="input-field" required placeholder="Morning / Midday / Afternoon / Close"
                    value={windowForm.label} onChange={e => setWindowForm({...windowForm, label: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Opens At *</label>
                    <input className="input-field" required type="time"
                      value={windowForm.window_open} onChange={e => setWindowForm({...windowForm, window_open: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Closes At *</label>
                    <input className="input-field" required type="time"
                      value={windowForm.window_close} onChange={e => setWindowForm({...windowForm, window_close: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : null} Add Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
