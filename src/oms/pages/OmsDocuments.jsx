import { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Trash2, X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { getDocuments, addDocument, deleteDocument, getOperators } from '../db';

const DOC_TYPES = [
  'DRIVING_LICENSE',
  'MEDICAL_CERT',
  'AADHAAR',
  'ID_PROOF',
  'TRAINING_CERT',
  'SAFETY_CERT',
  'OTHER',
];

const EMPTY_FORM = {
  operator_id: '',
  document_type: 'DRIVING_LICENSE',
  file_name: '',
  file_url: '',
  upload_date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  description: '',
};

export default function OmsDocuments() {
  const [documents, setDocuments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [docs, ops] = await Promise.all([getDocuments(null), getOperators()]);
      setDocuments(docs);
      setOperators(ops);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.operator_id) { setError('Please select an operator.'); return; }
    if (!form.file_name.trim()) { setError('Please enter a document name.'); return; }
    setSaving(true);
    setError('');
    try {
      await addDocument({
        operator_id: form.operator_id,
        document_type: form.document_type,
        file_name: form.file_name.trim(),
        file_url: form.file_url.trim() || null,
        upload_date: form.upload_date || new Date().toISOString().split('T')[0],
        expiry_date: form.expiry_date || null,
        description: form.description.trim() || null,
      });
      showToast('Document added successfully!');
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete document "${name}"?`)) return;
    try {
      await deleteDocument(id);
      showToast('Document deleted.');
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = documents.filter(d =>
    !search ||
    (d.file_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.operator?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.document_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  const getStatus = (expiryDate) => {
    if (!expiryDate) return { label: 'No Expiry', color: '#6b7280' };
    const diff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Expired', color: '#ef4444' };
    if (diff <= 30) return { label: `Exp in ${diff}d`, color: '#f59e0b' };
    return { label: 'Valid', color: '#10b981' };
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', marginBottom: 4 }}>DOCUMENTS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Document Repository</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage operator documents, licenses and certifications</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by document name, operator, or type..." style={{ ...inp, paddingLeft: 36 }} />
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          <Plus size={16} /> Add Document
        </button>
      </div>

      {/* Add Document Form */}
      {showForm && (
        <div style={{ background: '#1a1d27', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#fff', fontWeight: 800 }}>Add New Document</h3>
            <button onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {error && (
            <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={lbl}>OPERATOR *</label>
              <select value={form.operator_id} onChange={e => set('operator_id', e.target.value)} style={inp}>
                <option value="">— Select Operator —</option>
                {operators.map(o => (
                  <option key={o.id} value={o.id}>{o.full_name} ({o.operator_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>DOCUMENT TYPE *</label>
              <select value={form.document_type} onChange={e => set('document_type', e.target.value)} style={inp}>
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>DOCUMENT NAME *</label>
              <input
                type="text"
                value={form.file_name}
                onChange={e => set('file_name', e.target.value)}
                placeholder="e.g. Driving License - Ravi"
                style={inp}
              />
            </div>

            <div>
              <label style={lbl}>UPLOAD DATE</label>
              <input type="date" value={form.upload_date} onChange={e => set('upload_date', e.target.value)} style={inp} />
            </div>

            <div>
              <label style={lbl}>EXPIRY DATE (Optional)</label>
              <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} style={inp} />
            </div>

            <div>
              <label style={lbl}>FILE URL / LINK (Optional)</label>
              <input
                type="text"
                value={form.file_url}
                onChange={e => set('file_url', e.target.value)}
                placeholder="https://..."
                style={inp}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>DESCRIPTION / NOTES (Optional)</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Document'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileText size={40} style={{ opacity: 0.2, marginBottom: 12, color: '#fff' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No documents found.</p>
            <button onClick={() => setShowForm(true)} style={{ marginTop: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>+ Add Document</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Document Name', 'Type', 'Operator', 'Upload Date', 'Expiry Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const status = getStatus(d.expiry_date);
                  return (
                    <tr key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>
                          {d.file_url
                            ? <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{d.file_name}</a>
                            : d.file_name
                          }
                        </div>
                        {d.description && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>{d.description}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700 }}>{d.document_type.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{d.operator?.full_name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{d.operator?.operator_code}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        {d.upload_date ? new Date(d.upload_date + 'T00:00:00').toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                        {d.expiry_date ? new Date(d.expiry_date + 'T00:00:00').toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: `${status.color}20`, color: status.color, borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{status.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => handleDelete(d.id, d.file_name)}
                          style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
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
