import { useState, useEffect } from 'react';
import { Plus, Search, Layers, Edit, X, Save, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { getRentals, addRental, updateRental, getVehicles, getCustomers, getOperators, addWorkLog } from '../db';

function RentalModal({ rental, onSave, onClose, vehicles, customers, operators }) {
  const isEdit = !!rental?.id;
  const [form, setForm] = useState({
    vehicle_id: '', customer_id: '', operator_id: '', rental_type: 'MONTHLY',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    status: 'ACTIVE', notes: '',
    ...(rental || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Sort vehicles by model name for display
  const sortedVehicles = [...vehicles].sort((a, b) =>
    (a.model || a.vehicle_type || '').localeCompare(b.model || b.vehicle_type || '')
  );

  const handleSave = async () => {
    if (!form.vehicle_id || !form.customer_id) { setError('Vehicle and Customer are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(form);
      onClose();
    }
    catch (e) { setError(e.message); setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  const isMonthly = form.rental_type === 'MONTHLY';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1a1d27', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>{isEdit ? 'Edit Rental Assignment' : 'New Rental Assignment'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>VEHICLE * (by model)</label>
              <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} style={inp}>
                <option value="">Select vehicle...</option>
                {sortedVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.model ? `${v.model} (${v.vehicle_code})` : `${v.vehicle_type} — ${v.vehicle_code}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>CUSTOMER *</label>
              <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)} style={inp}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>OPERATOR (Optional)</label>
              <select value={form.operator_id} onChange={e => set('operator_id', e.target.value)} style={inp}>
                <option value="">— No Operator —</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.operator_code})</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>RENTAL TYPE</label>
              <select value={form.rental_type} onChange={e => { set('rental_type', e.target.value); if (e.target.value === 'MONTHLY') set('end_date', ''); }} style={inp}>
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>
            <div>
              <label style={lbl}>START DATE *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>END DATE {isMonthly ? '(Open — Monthly)' : ''}</label>
              {isMonthly ? (
                <div style={{ ...inp, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>∞</span> Open-ended — ends when set to Inactive
                </div>
              ) : (
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={inp} />
              )}
            </div>
            {isEdit && (
              <div>
                <label style={lbl}>STATUS</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="CLOSED">Closed</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>NOTES</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, height: 60, resize: 'vertical' }} placeholder="Assignment notes..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Assignment' : 'Save Assignment'}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  ACTIVE: { bg: '#10b98120', color: '#10b981' },
  INACTIVE: { bg: '#6b728020', color: '#6b7280' },
  CLOSED: { bg: '#ef444420', color: '#ef4444' },
  SUSPENDED: { bg: '#f59e0b20', color: '#f59e0b' },
};

export default function OmsRentals() {
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [r, v, c, o] = await Promise.all([
        getRentals(), getVehicles(), getCustomers(), getOperators()
      ]);
      setRentals(r); setVehicles(v); setCustomers(c); setOperators(o);
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form.id) {
      await updateRental(form.id, form);
      showToast('Rental updated!');
    } else {
      // Save rental
      const newRental = await addRental(form);
      // Auto-create a work log entry from this rental assignment
      try {
        await addWorkLog({
          work_date: form.start_date,
          operator_id: form.operator_id || null,
          vehicle_id: form.vehicle_id,
          customer_id: form.customer_id,
          rental_type: form.rental_type,
          work_status: 'PRESENT',
          shift_count: 1,
          ot_hours: 0,
          ot_rate: 0,
          ot_amount: 0,
          remarks: `Auto-entry from rental ${newRental.assignment_code}`,
        });
      } catch (e) {
        console.warn('Auto work log creation failed:', e.message);
      }
      showToast('Rental added + Work log entry created!');
    }
    await load();
  };

  // One-click toggle: ACTIVE ↔ INACTIVE
  const handleToggleStatus = async (r) => {
    setTogglingId(r.id);
    try {
      const newStatus = r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateRental(r.id, { ...r, status: newStatus });
      showToast(`Rental ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = rentals.filter(r => {
    const matchSearch = !search ||
      (r.assignment_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.vehicle?.vehicle_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.vehicle?.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.operator?.full_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = rentals.filter(r => r.status === 'ACTIVE').length;
  const inactiveCount = rentals.filter(r => r.status === 'INACTIVE').length;

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}
      {modal !== null && (
        <RentalModal
          rental={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          vehicles={vehicles}
          customers={customers}
          operators={operators}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#06b6d4', marginBottom: 4 }}>RENTALS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Rental Assignments</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage vehicle deployments. Monthly rentals are open-ended — toggle status to deactivate.</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#06b6d410', border: '1px solid #06b6d430', borderRadius: 8, padding: '8px 16px', color: '#06b6d4', fontWeight: 700, fontSize: '0.83rem' }}>Total: {rentals.length}</div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? '' : 'ACTIVE')}
          style={{ background: statusFilter === 'ACTIVE' ? '#10b981' : '#10b98115', border: '1px solid #10b98140', borderRadius: 8, padding: '8px 16px', color: statusFilter === 'ACTIVE' ? '#fff' : '#10b981', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}
        >Active: {activeCount}</div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'INACTIVE' ? '' : 'INACTIVE')}
          style={{ background: statusFilter === 'INACTIVE' ? '#6b7280' : '#6b728015', border: '1px solid #6b728040', borderRadius: 8, padding: '8px 16px', color: statusFilter === 'INACTIVE' ? '#fff' : '#6b7280', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}
        >Inactive: {inactiveCount}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignment, customer, vehicle, model..." style={{ width: '100%', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px 10px 36px', color: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: '0.88rem' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: statusFilter ? '#fff' : 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.88rem' }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="CLOSED">Closed</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button onClick={() => setModal('add')} style={{ background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Assignment
        </button>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading rentals...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Layers size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No rental assignments found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Assignment', 'Vehicle (Model)', 'Customer', 'Operator', 'Type', 'Start Date', 'End Date', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isToggling = togglingId === r.id;
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.INACTIVE;
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#06b6d420', color: '#06b6d4', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>{r.assignment_code}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 700 }}>{r.vehicle?.model || r.vehicle?.vehicle_type || '—'}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{r.vehicle?.vehicle_code}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customer?.company_name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{r.operator?.full_name || <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No operator</span>}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: r.rental_type === 'MONTHLY' ? '#3b82f620' : '#8b5cf620', color: r.rental_type === 'MONTHLY' ? '#3b82f6' : '#8b5cf6', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{r.rental_type}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                        {r.rental_type === 'MONTHLY' && !r.end_date
                          ? <span style={{ color: '#3b82f6', fontStyle: 'italic' }}>∞ Open</span>
                          : r.end_date ? new Date(r.end_date).toLocaleDateString('en-IN') : '—'
                        }
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {/* Click to toggle ACTIVE ↔ INACTIVE */}
                        <button
                          onClick={() => handleToggleStatus(r)}
                          disabled={isToggling || (r.status !== 'ACTIVE' && r.status !== 'INACTIVE')}
                          title={r.status === 'ACTIVE' ? 'Click to deactivate' : 'Click to activate'}
                          style={{
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40`,
                            borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
                            cursor: (r.status === 'ACTIVE' || r.status === 'INACTIVE') ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', gap: 5,
                            opacity: isToggling ? 0.5 : 1, transition: 'all 0.2s',
                          }}
                        >
                          {r.status === 'ACTIVE' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {isToggling ? '...' : r.status}
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => setModal(r)} style={{ background: '#06b6d410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#06b6d4' }}><Edit size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
