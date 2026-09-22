import { useState, useEffect } from 'react';
import { Plus, CreditCard, X, Save, CheckCircle, Trash2 } from 'lucide-react';
import { getAdvances, addAdvance, deleteAdvance, getOperators } from '../db';

function AdvanceModal({ onSave, onClose, operators }) {
  const [form, setForm] = useState({
    operator_id: '', transaction_type: 'ADVANCE', amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'CASH', reason: '', remarks: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.operator_id || !form.amount) { setError('Operator and Amount are required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>New Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={lbl}>OPERATOR *</label>
              <select value={form.operator_id} onChange={e => set('operator_id', e.target.value)} style={inp}>
                <option value="">Select operator...</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.operator_code})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>TYPE *</label>
                <select value={form.transaction_type} onChange={e => set('transaction_type', e.target.value)} style={inp}>
                  <option value="ADVANCE">Advance Given</option>
                  <option value="RECOVERY">Manual Recovery</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>AMOUNT (₹) *</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inp} placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>DATE *</label>
                <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>PAYMENT METHOD</label>
                <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} style={inp}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>REASON</label>
              <input value={form.reason} onChange={e => set('reason', e.target.value)} style={inp} placeholder="Reason for advance..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: form.transaction_type === 'ADVANCE' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
              <Save size={16} /> {saving ? 'Saving...' : `Save ${form.transaction_type}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OmsAdvances() {
  const [advances, setAdvances] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [filterOp, setFilterOp] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [adv, ops] = await Promise.all([getAdvances(), getOperators()]);
      setAdvances(adv); setOperators(ops);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    await addAdvance(form);
    showToast('Transaction recorded!');
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await deleteAdvance(id);
    showToast('Transaction deleted.');
    await load();
  };

  const filtered = filterOp ? advances.filter(a => a.operator_id === filterOp) : advances;

  return (
    <div style={{ padding: '24px', maxWidth: 1000 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}
      {modal && <AdvanceModal onSave={handleSave} onClose={() => setModal(false)} operators={operators} />}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444', marginBottom: 4 }}>ADVANCES</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Advance Ledger</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage salary advances and manual recoveries</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)} style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: filterOp ? '#fff' : 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.88rem', minWidth: 200 }}>
          <option value="">All Operators</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
        <button onClick={() => setModal(true)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Transaction
        </button>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading ledger...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <CreditCard size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No advance transactions found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Date', 'Operator', 'Type', 'Amount', 'Method', 'Reason', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 14px', color: '#fff' }}>{new Date(a.transaction_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 700 }}>{a.operator?.full_name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: a.transaction_type === 'ADVANCE' ? '#ef444420' : '#10b98120', color: a.transaction_type === 'ADVANCE' ? '#ef4444' : '#10b981', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{a.transaction_type}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: a.transaction_type === 'ADVANCE' ? '#ef4444' : '#10b981', fontWeight: 800 }}>₹{parseFloat(a.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{a.payment_method}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{a.reason || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => handleDelete(a.id)} style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
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
