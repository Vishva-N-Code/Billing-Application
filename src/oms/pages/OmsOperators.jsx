import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, HardHat, Edit, Eye, Trash2, X, Save, CheckCircle } from 'lucide-react';
import { getOperators, addOperator, updateOperator, deleteOperator } from '../db';

const STATUS_COLORS = {
  ACTIVE: { bg: '#10b98120', color: '#10b981' },
  INACTIVE: { bg: '#6b728020', color: '#6b7280' },
};

const SALARY_TYPES = ['MONTHLY', 'DAILY', 'PER_SHIFT'];

function OperatorModal({ operator, onSave, onClose }) {
  const isEdit = !!operator?.id;
  const [form, setForm] = useState({
    full_name: '', phone: '', alternate_phone: '', joining_date: '',
    salary: '', salary_type: 'MONTHLY', status: 'ACTIVE',
    address: '', emergency_contact: '', notes: '',
    ...(operator || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1a1d27', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>{isEdit ? 'Edit Operator' : 'Add New Operator'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>FULL NAME *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} style={inp} placeholder="e.g. Ravi Kumar" />
            </div>
            <div>
              <label style={lbl}>PHONE</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="Mobile number" />
            </div>
            <div>
              <label style={lbl}>ALTERNATE PHONE</label>
              <input value={form.alternate_phone} onChange={e => set('alternate_phone', e.target.value)} style={inp} placeholder="Alternative contact" />
            </div>
            <div>
              <label style={lbl}>JOINING DATE</label>
              <input type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>STATUS</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label style={lbl}>SALARY (₹)</label>
              <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} style={inp} placeholder="Monthly salary" />
            </div>
            <div>
              <label style={lbl}>SALARY TYPE</label>
              <select value={form.salary_type} onChange={e => set('salary_type', e.target.value)} style={inp}>
                {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>ADDRESS</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} style={{ ...inp, height: 72, resize: 'vertical' }} placeholder="Residential address" />
            </div>
            <div>
              <label style={lbl}>EMERGENCY CONTACT</label>
              <input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} style={inp} placeholder="Name & number" />
            </div>
            <div>
              <label style={lbl}>NOTES</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} placeholder="Additional notes" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Operator' : 'Add Operator'}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OmsOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | operator object
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { setOperators(await getOperators()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form.id) {
      await updateOperator(form.id, form);
      showToast('Operator updated successfully!');
    } else {
      await addOperator(form);
      showToast('Operator added successfully!');
    }
    await load();
  };

  const handleDelete = async (operator) => {
    if (window.confirm(`Are you sure you want to delete ${operator.full_name}?`)) {
      try {
        await deleteOperator(operator.id);
        showToast('Operator deleted successfully!');
        await load();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const filtered = operators
    .filter(o => {
      const matchSearch = !search || o.full_name.toLowerCase().includes(search.toLowerCase()) || (o.phone || '').includes(search) || (o.operator_code || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => (a.operator_code || '').localeCompare(b.operator_code || '', undefined, { numeric: true, sensitivity: 'base' }));

  const activeCount = operators.filter(o => o.status === 'ACTIVE').length;
  const inactiveCount = operators.filter(o => o.status === 'INACTIVE').length;

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {modal !== null && (
        <OperatorModal
          operator={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', marginBottom: 4 }}>OPERATORS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Operator Management</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage all crane and forklift operators</p>
      </div>

      {/* Summary Chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: 8, padding: '8px 16px', color: '#3b82f6', fontWeight: 700, fontSize: '0.83rem' }}>Total: {operators.length}</div>
        <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: '8px 16px', color: '#10b981', fontWeight: 700, fontSize: '0.83rem' }}>Active: {activeCount}</div>
        <div style={{ background: '#6b728010', border: '1px solid #6b728030', borderRadius: 8, padding: '8px 16px', color: '#6b7280', fontWeight: 700, fontSize: '0.83rem' }}>Inactive: {inactiveCount}</div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, phone..."
            style={{ width: '100%', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px 10px 36px', color: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: '0.88rem' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: statusFilter ? '#fff' : 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.88rem' }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button onClick={() => setModal('add')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Operator
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading operators...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <HardHat size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No operators found.</p>
            <button onClick={() => setModal('add')} style={{ marginTop: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>+ Add First Operator</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Code', 'Name', 'Phone', 'Joining Date', 'Salary', 'Salary Type', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((op, i) => (
                  <tr key={op.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#3b82f620', color: '#3b82f6', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>{op.operator_code}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 700 }} onClick={() => navigate(`/oms/operators/${op.id}`)}>{op.full_name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{op.phone || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{op.joining_date ? new Date(op.joining_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(op.salary || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{op.salary_type}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: STATUS_COLORS[op.status]?.bg || '#6b728020', color: STATUS_COLORS[op.status]?.color || '#6b7280', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {op.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/oms/operators/${op.id}`); }} style={{ background: '#3b82f610', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#3b82f6' }} title="View Profile"><Eye size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setModal(op); }} style={{ background: '#f59e0b10', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#f59e0b' }} title="Edit"><Edit size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(op); }} style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
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
