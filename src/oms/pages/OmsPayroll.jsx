import { useState, useEffect } from 'react';
import { Play, CheckCircle, FileBox, X, Save, AlertCircle, Edit3, Lock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getPayrollRecords, generatePayroll, getOperators, finalizePayrollWithAdvance, updatePayroll } from '../db';

const currentMonthStr = new Date().toISOString().slice(0, 7);

function fmt(n) { return parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ─── Salary Slip / Edit Modal ───────────────────────────────────────────────
function SlipModal({ payroll, onClose, onFinalize, onSaveDraft }) {
  const isFinalized = payroll.status === 'FINALIZED';
  const [advRec, setAdvRec] = useState(parseFloat(payroll.advance_recovery || 0));
  const [notes, setNotes] = useState(payroll.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const gross = parseFloat(payroll.gross_earnings || 0);
  const netPayable = gross - advRec;

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', marginBottom: 5 };
  const row = (label, value, highlight) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: highlight || 'rgba(255,255,255,0.9)', fontWeight: 700 }}>₹{fmt(value)}</span>
    </div>
  );

  const handleFinalize = async () => {
    if (netPayable < 0) { setError('Net payable cannot be negative. Reduce advance recovery.'); return; }
    setSaving(true); setError('');
    try {
      await onFinalize(payroll.id, advRec);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError('');
    try {
      await onSaveDraft(payroll.id, { advance_recovery: advRec, final_payable: netPayable, notes });
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #slip-modal-content, #slip-modal-content * { visibility: visible; }
            #slip-modal-content { position: absolute; left: 0; top: 0; width: 100%; border: none !important; background: white !important; color: black !important; box-shadow: none !important; }
            #slip-modal-content .no-print { display: none !important; }
            #slip-modal-content span { color: black !important; }
          }
        `}
      </style>
      <div id="slip-modal-content" style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1a1d27', zIndex: 1 }} className="no-print">
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#10b981', marginBottom: 2 }}>SALARY SLIP</div>
            <h2 style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>{payroll.operator?.full_name}</h2>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: 2 }}>{payroll.month}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFinalized && (
              <button onClick={() => window.print()} style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileBox size={14} /> Print Receipt
              </button>
            )}
            <span style={{ background: isFinalized ? '#10b98120' : '#10b981', color: isFinalized ? '#10b981' : '#f59e0b', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
              {isFinalized ? '✓ FINALIZED' : 'DRAFT'}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
          </div>
        </div>

        {/* Print Header (Only visible when printing) */}
        <div style={{ display: 'none' }} className="print-header">
          <h1 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>OM SARAVANA CRANES</h1>
          <h2 style={{ margin: '5px 0 20px', fontSize: '1.1rem', textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: 10 }}>Salary Receipt: {payroll.month}</h2>
          <div style={{ marginBottom: 20 }}>
            <strong>Operator:</strong> {payroll.operator?.full_name} <br/>
            <strong>Date Generated:</strong> {new Date().toLocaleDateString('en-IN')}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}

          {/* Earnings */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#3b82f6', marginBottom: 10 }}>EARNINGS</div>
            {row('Base Monthly Salary', payroll.base_earnings, '#fff')}
            {row(`OT (${payroll.ot_hours}h × ₹${fmt(payroll.ot_rate_snapshot)})`, payroll.ot_amount, '#f59e0b')}
            {row('Allowances', payroll.allowances)}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: '#fff', fontWeight: 800 }}>GROSS EARNINGS</span>
              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.05rem' }}>₹{fmt(payroll.gross_earnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#ef4444', marginBottom: 10 }}>DEDUCTIONS</div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>ADVANCE RECOVERY (editable)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advRec}
                  onChange={e => setAdvRec(parseFloat(e.target.value) || 0)}
                  disabled={isFinalized}
                  style={{ ...inp, paddingLeft: 28, opacity: isFinalized ? 0.5 : 1 }}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontWeight: 700 }}>₹</span>
              </div>
              {!isFinalized && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  Suggested: ₹{fmt(payroll.advance_recovery)} outstanding. Set to 0 to defer to next month — balance stays recorded.
                </div>
              )}
            </div>

            {row('Other Deductions', payroll.other_deductions, '#ef4444')}
          </div>

          {/* Net Payable */}
          <div style={{ background: 'linear-gradient(135deg, #10b98115, #3b82f615)', border: '1px solid #10b98130', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>NET PAYABLE</span>
              <span style={{ color: netPayable >= 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: '1.5rem' }}>
                ₹{fmt(netPayable)}
              </span>
            </div>
            {netPayable !== parseFloat(payroll.final_payable || 0) && (
              <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>
                ⚠ Modified from saved value of ₹{fmt(payroll.final_payable)}
              </div>
            )}
          </div>

          {/* Notes */}
          {!isFinalized && (
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>NOTES (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                style={{ ...inp, resize: 'vertical' }} placeholder="e.g. Advance deferred by operator request..." />
            </div>
          )}

          {isFinalized ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              <Lock size={14} /> Finalized — no further edits allowed.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={handleFinalize} disabled={saving}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={16} /> {saving ? 'Saving...' : 'Finalize & Lock'}
              </button>
              <button onClick={handleSaveDraft} disabled={saving}
                style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640', borderRadius: 8, padding: '11px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={15} /> Save Draft
              </button>
              <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Generate Modal ──────────────────────────────────────────────────────────
function GenerateModal({ onGenerate, onClose, operators }) {
  const [form, setForm] = useState({ month: currentMonthStr, operator_id: '' });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!form.month) { setError('Month is required.'); return; }
    if (!form.operator_id) { setError('Please select an operator.'); return; }
    setGenerating(true); setError('');
    try { await onGenerate(form.operator_id, form.month); onClose(); }
    catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 480 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Generate Payroll</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={lbl}>MONTH *</label>
              <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>OPERATOR *</label>
              <select value={form.operator_id} onChange={e => setForm(f => ({ ...f, operator_id: e.target.value }))} style={inp}>
                <option value="">— Select Operator —</option>
                {operators.filter(o => o.status === 'ACTIVE').map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div style={{ background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: 8, padding: '12px 16px', color: '#3b82f6', fontSize: '0.8rem', display: 'flex', gap: 10 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>Base salary = full monthly salary. OT is added on top. Outstanding advances are suggested for deduction — editable per operator on the salary slip.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={handleGenerate} disabled={generating}
              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
              <Play size={16} fill="currentColor" /> {generating ? 'Generating...' : 'Run Payroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Payroll Page ───────────────────────────────────────────────────────
export default function OmsPayroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [modal, setModal] = useState(false);
  const [slipRecord, setSlipRecord] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const [p, ops] = await Promise.all([getPayrollRecords({ month: monthFilter }), getOperators()]);
      setPayrolls(p); setOperators(ops);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [monthFilter]);

  const handleGenerate = async (opId, month) => {
    if (opId) {
      await generatePayroll(opId, month);
      showToast('Payroll generated!');
    }
    await load();
  };

  const handleFinalize = async (id, advanceRecovery) => {
    await finalizePayrollWithAdvance(id, advanceRecovery);
    showToast('Salary slip finalized!');
    await load();
  };

  const handleSaveDraft = async (id, updates) => {
    await updatePayroll(id, updates);
    showToast('Draft saved!');
    await load();
  };

  const totBase = payrolls.reduce((s, p) => s + parseFloat(p.base_earnings || 0), 0);
  const totOT = payrolls.reduce((s, p) => s + parseFloat(p.ot_amount || 0), 0);
  const totAdv = payrolls.reduce((s, p) => s + parseFloat(p.advance_recovery || 0), 0);
  const totNet = payrolls.reduce((s, p) => s + parseFloat(p.final_payable || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: 1400 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {modal && <GenerateModal onGenerate={handleGenerate} onClose={() => setModal(false)} operators={operators} />}
      {slipRecord && (
        <SlipModal
          payroll={slipRecord}
          onClose={() => { setSlipRecord(null); load(); }}
          onFinalize={handleFinalize}
          onSaveDraft={handleSaveDraft}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#10b981', marginBottom: 4 }}>PAYROLL</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Payroll & Salary Slips</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Base salary + OT earnings. Advance deductions are editable per operator.</p>
      </div>

      {/* Summary cards */}
      {payrolls.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Base', value: `₹${fmt(totBase)}`, color: '#3b82f6' },
            { label: 'Total OT', value: `₹${fmt(totOT)}`, color: '#f59e0b' },
            { label: 'Advance Recovery', value: `-₹${fmt(totAdv)}`, color: '#ef4444' },
            { label: 'Net Payable', value: `₹${fmt(totNet)}`, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '10px 18px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 800, fontSize: '1rem' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', outline: 'none', fontSize: '0.88rem' }} />
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <RefreshCw size={16} />
        </button>
        <button onClick={() => setModal(true)}
          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Play size={16} fill="currentColor" /> Generate Payroll
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading payroll...</div>
        ) : payrolls.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileBox size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No payroll records for this month.</p>
            <button onClick={() => setModal(true)} style={{ marginTop: 16, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>
              Generate Now
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Operator', 'Base Salary', 'Shifts', 'OT Hrs', 'OT Amount', 'Gross', 'Adv. Deducted', 'Net Payable', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrolls.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 700 }}>{p.operator?.full_name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>₹{fmt(p.base_earnings)}</td>
                    <td style={{ padding: '12px 14px', color: '#f59e0b', fontWeight: 700, textAlign: 'center' }}>{p.total_shifts}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{p.ot_hours}h</td>
                    <td style={{ padding: '12px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{fmt(p.ot_amount)}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>₹{fmt(p.gross_earnings)}</td>
                    <td style={{ padding: '12px 14px', color: parseFloat(p.advance_recovery || 0) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                      {parseFloat(p.advance_recovery || 0) > 0 ? `-₹${fmt(p.advance_recovery)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>₹{fmt(p.final_payable)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: p.status === 'FINALIZED' ? '#10b98120' : '#f59e0b20', color: p.status === 'FINALIZED' ? '#10b981' : '#f59e0b', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setSlipRecord(p)}
                        style={{ background: p.status === 'FINALIZED' ? 'rgba(255,255,255,0.05)' : '#3b82f620', color: p.status === 'FINALIZED' ? 'rgba(255,255,255,0.4)' : '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {p.status === 'FINALIZED' ? <><FileBox size={13} /> View</> : <><Edit3 size={13} /> Edit Slip</>}
                      </button>
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
