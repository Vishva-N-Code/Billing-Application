import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Edit, Trash2, X, Save, CheckCircle, Download } from 'lucide-react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db';
import { db as billingDb } from '../../db';

function CustomerModal({ customer, onSave, onClose }) {
  const isEdit = !!customer?.id;
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    location: '', address: '', billing_details: '', status: 'ACTIVE', notes: '',
    ...(customer || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.company_name.trim()) { setError('Company name is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1a1d27' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>{isEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>COMPANY NAME *</label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} style={inp} placeholder="e.g. ABC Industries Pvt. Ltd." />
            </div>
            <div>
              <label style={lbl}>CONTACT PERSON</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} style={inp} placeholder="Primary contact name" />
            </div>
            <div>
              <label style={lbl}>PHONE</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="Contact number" />
            </div>
            <div>
              <label style={lbl}>EMAIL</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="Email address" />
            </div>
            <div>
              <label style={lbl}>LOCATION</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} style={inp} placeholder="City / Area" />
            </div>
            <div>
              <label style={lbl}>STATUS</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>ADDRESS</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} style={{ ...inp, height: 68, resize: 'vertical' }} placeholder="Full postal address" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>BILLING DETAILS</label>
              <textarea value={form.billing_details} onChange={e => set('billing_details', e.target.value)} style={{ ...inp, height: 60, resize: 'vertical' }} placeholder="GST number, billing address, etc." />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>NOTES</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} placeholder="Additional notes" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportCustomerModal({ onClose, onSelect, omsCustomers }) {
  const [bCusts, setBCusts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const all = await billingDb.customers.toArray();
        const existingNames = new Set(omsCustomers.map(c => c.company_name.toLowerCase()));
        const available = all.filter(c => c.companyName && !existingNames.has(c.companyName.toLowerCase()));
        setBCusts(available);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetch();
  }, [omsCustomers]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Import from Billing</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={22} /></button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Loading billing customers...</div>
          ) : bCusts.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No new customers available to import.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bCusts.map(c => (
                <div key={c.id} onClick={() => onSelect(c)} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{c.companyName}</div>
                  {(c.mobile || c.address) && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 4 }}>{[c.mobile, c.address].filter(Boolean).join(' • ')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OmsCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [showImport, setShowImport] = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { setCustomers(await getCustomers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form.id) { await updateCustomer(form.id, form); showToast('Customer updated!'); }
    else { await addCustomer(form); showToast('Customer added!'); }
    await load();
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.company_name}?`)) {
      try {
        await deleteCustomer(customer.id);
        showToast('Customer deleted successfully!');
        await load();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleImportSelect = (bCust) => {
    setModal({
      company_name: bCust.companyName || '',
      phone: bCust.mobile || '',
      email: bCust.email || '',
      address: bCust.address || '',
      billing_details: bCust.gstin ? `GSTIN: ${bCust.gstin}` : '',
      status: 'ACTIVE'
    });
    setShowImport(false);
  };

  const filtered = customers
    .filter(c => {
      const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || (c.contact_person || '').toLowerCase().includes(search.toLowerCase()) || (c.customer_code || '').toLowerCase().includes(search.toLowerCase()) || (c.location || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}
      {modal !== null && <CustomerModal customer={modal === 'add' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}
      {showImport && <ImportCustomerModal omsCustomers={customers} onClose={() => setShowImport(false)} onSelect={handleImportSelect} />}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8b5cf6', marginBottom: 4 }}>CUSTOMERS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Customer Management</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage companies and clients</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 8, padding: '8px 16px', color: '#8b5cf6', fontWeight: 700, fontSize: '0.83rem' }}>Total: {customers.length}</div>
        <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: '8px 16px', color: '#10b981', fontWeight: 700, fontSize: '0.83rem' }}>Active: {customers.filter(c => c.status === 'ACTIVE').length}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by company, contact, location..." style={{ width: '100%', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px 10px 36px', color: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: '0.88rem' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: statusFilter ? '#fff' : 'rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.88rem' }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button onClick={() => setShowImport(true)} style={{ background: '#1a1d27', color: '#fff', border: '1px solid #8b5cf6', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={16} /> Import from Billing
        </button>
        <button onClick={() => setModal('add')} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Building2 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No customers found.</p>
            <button onClick={() => setModal('add')} style={{ marginTop: 16, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>+ Add First Customer</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Code', 'Company Name', 'Contact Person', 'Phone', 'Location', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}><span style={{ background: '#8b5cf620', color: '#8b5cf6', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>{c.customer_code}</span></td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 700 }}>{c.company_name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{c.contact_person || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{c.location || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: c.status === 'ACTIVE' ? '#10b98120' : '#6b728020', color: c.status === 'ACTIVE' ? '#10b981' : '#6b7280', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setModal(c)} style={{ background: '#8b5cf610', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#8b5cf6' }} title="Edit"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(c)} style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
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
