import { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Edit, Trash2, X, Save, CheckCircle } from 'lucide-react';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '../db';

const STATUS_COLORS = {
  AVAILABLE: { bg: '#10b98120', color: '#10b981' },
  MONTHLY_RENTAL: { bg: '#3b82f620', color: '#3b82f6' },
  DAILY_RENTAL: { bg: '#8b5cf620', color: '#8b5cf6' },
  MAINTENANCE: { bg: '#f59e0b20', color: '#f59e0b' },
  INACTIVE: { bg: '#6b728020', color: '#6b7280' },
};

function VehicleModal({ vehicle, onSave, onClose }) {
  const isEdit = !!vehicle?.id;
  const [form, setForm] = useState({
    vehicle_type: 'FORKLIFT', vehicle_code: '', registration_number: '', capacity: '', model: '',
    status: 'AVAILABLE', notes: '',
    ...(vehicle || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1a1d27' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>{isEdit ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>VEHICLE TYPE</label>
              <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} style={inp}>
                <option value="FORKLIFT">Forklift</option>
                <option value="CRANE">Crane</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label style={lbl}>VEHICLE ID / CODE</label>
              <input
                value={form.vehicle_code || ''}
                onChange={e => set('vehicle_code', e.target.value.toUpperCase())}
                style={inp}
                placeholder={form.vehicle_type === 'CRANE' ? 'e.g. CR001 (auto if empty)' : 'e.g. FL001 (auto if empty)'}
              />
            </div>
            <div>
              <label style={lbl}>REGISTRATION NUMBER</label>
              <input value={form.registration_number} onChange={e => set('registration_number', e.target.value)} style={inp} placeholder="e.g. TN 01 AB 1234" />
            </div>
            <div>
              <label style={lbl}>CAPACITY</label>
              <input value={form.capacity} onChange={e => set('capacity', e.target.value)} style={inp} placeholder="e.g. 5 TON" />
            </div>
            <div>
              <label style={lbl}>MODEL</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} style={inp} placeholder="e.g. Hyster H5.0XT" />
            </div>
            <div>
              <label style={lbl}>STATUS</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                <option value="AVAILABLE">Available</option>
                <option value="MONTHLY_RENTAL">Monthly Rental</option>
                <option value="DAILY_RENTAL">Daily Rental</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>NOTES</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, height: 72, resize: 'vertical' }} placeholder="Additional notes" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: '#f59e0b', color: '#0f1117', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OmsVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { setVehicles(await getVehicles()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form.id) { await updateVehicle(form.id, form); showToast('Vehicle updated!'); }
    else { await addVehicle(form); showToast('Vehicle added!'); }
    await load();
  };

  const handleDelete = async (vehicle) => {
    if (window.confirm(`Are you sure you want to delete ${vehicle.registration_number || vehicle.model || vehicle.vehicle_code}?`)) {
      try {
        await deleteVehicle(vehicle.id);
        showToast('Vehicle deleted successfully!');
        await load();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const filtered = vehicles
    .filter(v => {
      const matchSearch = !search || (v.vehicle_code || '').toLowerCase().includes(search.toLowerCase()) || (v.registration_number || '').toLowerCase().includes(search.toLowerCase()) || (v.model || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || v.status === statusFilter;
      const matchType = !typeFilter || v.vehicle_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a, b) => (a.vehicle_code || '').localeCompare(b.vehicle_code || '', undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}
      {modal !== null && <VehicleModal vehicle={modal === 'add' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 4 }}>VEHICLES</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Vehicle Management</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage forklifts, cranes and other equipment</p>
      </div>

      {/* Status summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, colors]) => {
          const count = vehicles.filter(v => v.status === status).length;
          if (!count) return null;
          return (
            <div key={status} style={{ background: colors.bg, border: `1px solid ${colors.color}40`, borderRadius: 8, padding: '7px 14px', color: colors.color, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
              {status.replace('_', ' ')}: {count}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code, reg. no., model..." style={{ width: '100%', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px 10px 36px', color: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: '0.88rem' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: typeFilter ? '#fff' : 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.88rem' }}>
          <option value="">All Types</option>
          <option value="FORKLIFT">Forklift</option>
          <option value="CRANE">Crane</option>
          <option value="OTHER">Other</option>
        </select>
        <button onClick={() => setModal('add')} style={{ background: '#f59e0b', color: '#0f1117', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading vehicles...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Wrench size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No vehicles found.</p>
            <button onClick={() => setModal('add')} style={{ marginTop: 16, background: '#f59e0b', color: '#0f1117', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 800 }}>+ Add First Vehicle</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Code', 'Type', 'Reg. Number', 'Capacity', 'Model', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#f59e0b20', color: '#f59e0b', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>{v.vehicle_code}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>{v.vehicle_type}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{v.registration_number || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{v.capacity || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{v.model || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: STATUS_COLORS[v.status]?.bg || '#6b728020', color: STATUS_COLORS[v.status]?.color || '#6b7280', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {v.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setModal(v)} style={{ background: '#f59e0b10', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#f59e0b' }} title="Edit"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(v)} style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
