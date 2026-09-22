import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HardHat, Phone, Calendar, CreditCard, FileText, Clock, TrendingUp, Upload, Trash2, Plus, X, Save } from 'lucide-react';
import { getOperatorById, getWorkLogs, getAdvances, getOperatorAdvanceSummary, getDocuments, addDocument, deleteDocument, getPayrollRecords } from '../db';

const DOCUMENT_TYPES = ['MEDICAL_CERT', 'DRIVING_LICENSE', 'ID_PROOF', 'AADHAAR', 'TRAINING_CERT', 'SAFETY_CERT', 'OTHER'];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
      fontSize: '0.82rem', transition: 'all 0.15s',
      background: active ? '#3b82f6' : 'transparent',
      color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    }}>{children}</button>
  );
}

function DocExpiryBadge({ expiryDate }) {
  if (!expiryDate) return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>No expiry</span>;
  const diff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span style={{ background: '#ef444420', color: '#ef4444', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>Expired</span>;
  if (diff <= 30) return <span style={{ background: '#f59e0b20', color: '#f59e0b', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>Expires in {diff}d</span>;
  return <span style={{ background: '#10b98120', color: '#10b981', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>Valid</span>;
}

export default function OmsOperatorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operator, setOperator] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [advanceSummary, setAdvanceSummary] = useState({ totalAdvance: 0, totalRecovered: 0, outstanding: 0 });
  const [documents, setDocuments] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: 'MEDICAL_CERT', file_name: '', expiry_date: '', description: '' });
  const [saving, setSaving] = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [op, logs, adv, advSummary, docs, pays] = await Promise.all([
          getOperatorById(id),
          getWorkLogs({ operator_id: id }),
          getAdvances({ operator_id: id }),
          getOperatorAdvanceSummary(id),
          getDocuments(id),
          getPayrollRecords({ operator_id: id }),
        ]);
        setOperator(op);
        setWorkLogs(logs);
        setAdvances(adv);
        setAdvanceSummary(advSummary);
        setDocuments(docs);
        setPayrolls(pays);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  const handleAddDoc = async () => {
    if (!docForm.file_name) return;
    setSaving(true);
    try {
      await addDocument({ ...docForm, operator_id: id, upload_date: new Date().toISOString().split('T')[0], uploaded_by: 'ADMIN' });
      setDocuments(await getDocuments(id));
      setShowDocForm(false);
      setDocForm({ document_type: 'MEDICAL_CERT', file_name: '', expiry_date: '', description: '' });
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    await deleteDocument(docId);
    setDocuments(await getDocuments(id));
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading operator profile...</div>;
  if (!operator) return <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>Operator not found.</div>;

  const thisMonthLogs = workLogs.filter(l => l.work_date?.startsWith(thisMonth));
  const thisMonthShifts = thisMonthLogs.reduce((s, l) => s + parseFloat(l.shift_count || 0), 0);
  const thisMonthOT = thisMonthLogs.reduce((s, l) => s + parseFloat(l.ot_hours || 0), 0);
  const thisMonthAttendance = new Set(thisMonthLogs.filter(l => l.work_status === 'PRESENT').map(l => l.work_date)).size;

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {/* Back */}
      <button onClick={() => navigate('/oms/operators')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: '0.85rem' }}>
        <ArrowLeft size={16} /> Back to Operators
      </button>

      {/* Profile Header */}
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {operator.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{operator.full_name}</h1>
              <span style={{ background: '#3b82f620', color: '#3b82f6', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>{operator.operator_code}</span>
              <span style={{ background: operator.status === 'ACTIVE' ? '#10b98120' : '#6b728020', color: operator.status === 'ACTIVE' ? '#10b981' : '#6b7280', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{operator.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'rgba(255,255,255,0.5)', fontSize: '0.83rem' }}>
              {operator.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={14} />{operator.phone}</span>}
              {operator.joining_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} />Since {new Date(operator.joining_date).toLocaleDateString('en-IN')}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 700 }}><CreditCard size={14} />₹{parseFloat(operator.salary || 0).toLocaleString('en-IN')} / {operator.salary_type}</span>
            </div>
          </div>
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'This Month Attendance', value: `${thisMonthAttendance} Days`, color: '#10b981' },
              { label: 'This Month Shifts', value: thisMonthShifts, color: '#3b82f6' },
              { label: 'This Month OT', value: `${thisMonthOT}h`, color: '#f59e0b' },
              { label: 'Outstanding Advance', value: `₹${advanceSummary.outstanding.toLocaleString('en-IN')}`, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {[
          { key: 'info', label: 'Basic Info' },
          { key: 'worklogs', label: `Work History (${workLogs.length})` },
          { key: 'advances', label: `Advances` },
          { key: 'docs', label: `Documents (${documents.length})` },
          { key: 'payroll', label: 'Payroll' },
        ].map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Basic Info */}
        {tab === 'info' && (
          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { label: 'Full Name', value: operator.full_name },
              { label: 'Operator Code', value: operator.operator_code },
              { label: 'Phone', value: operator.phone || '—' },
              { label: 'Alternate Phone', value: operator.alternate_phone || '—' },
              { label: 'Joining Date', value: operator.joining_date ? new Date(operator.joining_date).toLocaleDateString('en-IN') : '—' },
              { label: 'Salary', value: `₹${parseFloat(operator.salary || 0).toLocaleString('en-IN')}` },
              { label: 'Salary Type', value: operator.salary_type },
              { label: 'Status', value: operator.status },
              { label: 'Emergency Contact', value: operator.emergency_contact || '—' },
              { label: 'Address', value: operator.address || '—' },
              { label: 'Notes', value: operator.notes || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Work History */}
        {tab === 'worklogs' && (
          <div style={{ overflowX: 'auto' }}>
            {workLogs.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No work logs yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Date', 'Vehicle', 'Customer', 'Type', 'Status', 'Shift', 'OT Hrs', 'OT Amt', 'Remarks'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workLogs.slice(0, 100).map((log, i) => (
                    <tr key={log.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(log.work_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{log.vehicle?.vehicle_code || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customer?.company_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ background: log.rental_type === 'MONTHLY' ? '#3b82f620' : '#8b5cf620', color: log.rental_type === 'MONTHLY' ? '#3b82f6' : '#8b5cf6', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{log.rental_type}</span></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ background: log.work_status === 'PRESENT' ? '#10b98120' : '#ef444420', color: log.work_status === 'PRESENT' ? '#10b981' : '#ef4444', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{log.work_status}</span></td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700, textAlign: 'center' }}>{log.shift_count}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{log.ot_hours}h</td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(log.ot_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{log.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Advances */}
        {tab === 'advances' && (
          <div>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Given', value: `₹${advanceSummary.totalAdvance.toLocaleString('en-IN')}`, color: '#3b82f6' },
                { label: 'Recovered', value: `₹${advanceSummary.totalRecovered.toLocaleString('en-IN')}`, color: '#10b981' },
                { label: 'Outstanding', value: `₹${advanceSummary.outstanding.toLocaleString('en-IN')}`, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 8, padding: '10px 18px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: '1rem' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Date', 'Type', 'Amount', 'Method', 'Reason', 'Remarks'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {advances.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No advance transactions.</td></tr>
                  ) : advances.map(a => (
                    <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{new Date(a.transaction_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: a.transaction_type === 'ADVANCE' ? '#ef444420' : '#10b98120', color: a.transaction_type === 'ADVANCE' ? '#ef4444' : '#10b981', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{a.transaction_type}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(a.amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)' }}>{a.payment_method || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)' }}>{a.reason || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)' }}>{a.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents */}
        {tab === 'docs' && (
          <div>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#fff' }}>{documents.length} Documents</span>
              <button onClick={() => setShowDocForm(!showDocForm)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem' }}>
                <Plus size={14} /> Add Document
              </button>
            </div>
            {showDocForm && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(59,130,246,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={lbl}>DOCUMENT TYPE</label>
                    <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} style={inp}>
                      {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>FILE NAME / REFERENCE</label>
                    <input value={docForm.file_name} onChange={e => setDocForm(f => ({ ...f, file_name: e.target.value }))} style={inp} placeholder="Document name or reference" />
                  </div>
                  <div>
                    <label style={lbl}>EXPIRY DATE (if applicable)</label>
                    <input type="date" value={docForm.expiry_date} onChange={e => setDocForm(f => ({ ...f, expiry_date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>DESCRIPTION</label>
                    <input value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Notes about this document" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={handleAddDoc} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Document'}</button>
                  <button onClick={() => setShowDocForm(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
            {documents.length === 0 && !showDocForm ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No documents uploaded yet.</div>
            ) : (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{doc.file_name}</div>
                        <div style={{ color: '#3b82f6', fontSize: '0.72rem', fontWeight: 700, marginTop: 2 }}>{doc.document_type.replace('_', ' ')}</div>
                      </div>
                      <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Uploaded: {new Date(doc.upload_date).toLocaleDateString('en-IN')}</span>
                      <DocExpiryBadge expiryDate={doc.expiry_date} />
                    </div>
                    {doc.description && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 6 }}>{doc.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payroll */}
        {tab === 'payroll' && (
          <div style={{ overflowX: 'auto' }}>
            {payrolls.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No payroll records yet. Go to Payroll module to generate.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Month', 'Shifts', 'OT Hrs', 'Base', 'OT Amt', 'Allowances', 'Adv. Recovery', 'Deductions', 'Final Payable', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 700 }}>{p.month}</td>
                      <td style={{ padding: '11px 14px', color: '#f59e0b', fontWeight: 700, textAlign: 'center' }}>{p.total_shifts}</td>
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{p.ot_hours}h</td>
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>₹{parseFloat(p.base_earnings).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', color: '#f59e0b' }}>₹{parseFloat(p.ot_amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>₹{parseFloat(p.allowances).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', color: '#ef4444' }}>₹{parseFloat(p.advance_recovery).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', color: '#ef4444' }}>₹{parseFloat(p.other_deductions).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', color: '#10b981', fontWeight: 800 }}>₹{parseFloat(p.final_payable).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: p.status === 'FINALIZED' ? '#10b98120' : '#f59e0b20', color: p.status === 'FINALIZED' ? '#10b981' : '#f59e0b', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
