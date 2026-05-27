import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workerAPI, siteAPI } from '../services/api';

export default function WorkersPage() {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [sites, setSites]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null); // 'add' | 'assign' | null
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({ full_name: '', phone_number: '', email: '', employee_id: '' });
  const [assignForm, setAssignForm] = useState({ site_id: '', start_date: '' });

  async function load() {
    setLoading(true);
    try {
      const [w, s] = await Promise.all([workerAPI.getAll(token), siteAPI.getAll(token)]);
      setWorkers(w.workers || []);
      setSites(s.sites || []);
    } catch(_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await workerAPI.create(token, form);
      setModal(null);
      setForm({ full_name: '', phone_number: '', email: '', employee_id: '' });
      load();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeactivate(e, id) {
    e.stopPropagation(); // prevent row click
    if (!confirm('Deactivate this worker?')) return;
    try { await workerAPI.deactivate(token, id); load(); } catch(_) {}
  }

  async function handleAssign(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await workerAPI.assign(token, selected.id, assignForm);
      setModal(null);
      setAssignForm({ site_id: '', start_date: '' });
      load();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const filtered = workers.filter(w =>
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-subtitle">{workers.length} active field workers — click a row to view details</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModal('add'); setError(''); }}>+ Add Worker</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input className="input-field" style={{ maxWidth: 320 }}
          placeholder="Search by name or employee ID..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Assigned Site</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <div className="empty-title">No workers found</div>
                  </div>
                </td></tr>
              ) : filtered.map(w => (
                <tr key={w.id}
                  onClick={() => navigate(`/workers/${w.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 12, color: 'var(--blue)' }}>
                      {w.employee_id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                    {w.email && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{w.email}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{w.phone_number}</td>
                  <td>
                    {w.sites?.length > 0
                      ? <span className="badge badge-info">{w.sites[0].site_name}</span>
                      : <span className="badge badge-muted">Unassigned</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setSelected(w); setModal('assign'); setError(''); }}>
                        Assign Site
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={e => handleDeactivate(e, w.id)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17 }}>Add New Worker</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" required placeholder="Kofi Asante" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Employee ID *</label>
                  <input className="input-field" required placeholder="EMP-011" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone Number *</label>
                  <input className="input-field" required placeholder="+233241234567" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Email (optional)</label>
                  <input className="input-field" type="email" placeholder="kofi@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner"/>Saving...</> : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Site Modal */}
      {modal === 'assign' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17 }}>Assign Site</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                  Assigning <strong>{selected.full_name}</strong> to a work site.
                </p>
                {error && <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                <div className="input-group">
                  <label className="input-label">Work Site *</label>
                  <select className="input-field" required value={assignForm.site_id} onChange={e => setAssignForm({...assignForm, site_id: e.target.value})}>
                    <option value="">Select a site...</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Start Date *</label>
                  <input className="input-field" type="date" required value={assignForm.start_date} onChange={e => setAssignForm({...assignForm, start_date: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner"/>Saving...</> : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
