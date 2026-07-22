import { useState, useEffect } from 'react';
import { db, saveCustomer, updateCustomer, deleteCustomer } from '../db';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail, Globe, Hash, Users, FileText, Printer, X, CheckCircle, Clock } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    companyName: '', gstin: '', address: '', mobile: '', email: '', website: '', vendorCode: ''
  });

  // Party Ledger State
  const [showLedger, setShowLedger] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [ledgerDocs, setLedgerDocs] = useState([]);
  const [ledgerStats, setLedgerStats] = useState({ totalBilled: 0, totalPaid: 0, balanceDue: 0 });

  useEffect(() => {
    loadCustomers();
    const handleSyncComplete = () => loadCustomers();
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sync-complete', handleSyncComplete);
  }, []);

  const loadCustomers = async () => {
    try {
      const all = await db.customers.toArray();
      setCustomers(all || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setCustomers([]);
    }
  };

  const openLedger = async (customer) => {
    setSelectedLedgerCustomer(customer);
    const targetName = (customer.companyName || customer.company_name || '').toLowerCase().trim();
    
    try {
      const [invoices, cashbills, dcs, quotations] = await Promise.all([
        db.invoices.toArray(),
        db.cashbills.toArray(),
        db.deliveryChellans.toArray(),
        db.quotations.toArray()
      ]);

      const isMatch = (clientComp) => {
        if (!clientComp) return false;
        const cName = clientComp.toLowerCase().trim();
        return cName.includes(targetName) || targetName.includes(cName);
      };

      const matchedDocs = [
        ...invoices.filter(i => isMatch(i.clientCompany)).map(i => ({
          ...i,
          type: 'Tax Invoice',
          docNo: i.invoiceNo || i.docName,
          amount: i.grandTotal || 0,
          paid: i.paidAmount !== undefined ? Number(i.paidAmount) : (i.paymentStatus === 'paid' ? (i.grandTotal || 0) : 0)
        })),
        ...cashbills.filter(c => isMatch(c.clientCompany)).map(c => ({
          ...c,
          type: 'Cash Bill',
          docNo: c.billNo || c.docName,
          amount: c.grandTotal || 0,
          paid: c.paidAmount !== undefined ? Number(c.paidAmount) : (c.paymentStatus === 'paid' ? (c.grandTotal || 0) : 0)
        })),
        ...dcs.filter(d => isMatch(d.clientCompany)).map(d => ({
          ...d,
          type: 'Delivery Challan',
          docNo: d.dcNo || d.docName,
          amount: 0,
          paid: 0
        })),
        ...quotations.filter(q => isMatch(q.clientCompany)).map(q => ({
          ...q,
          type: 'Quotation',
          docNo: q.docName,
          amount: 0,
          paid: 0
        }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalBilled = matchedDocs.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalPaid = matchedDocs.reduce((sum, d) => sum + (d.paid || 0), 0);
      const balanceDue = totalBilled - totalPaid;

      setLedgerDocs(matchedDocs);
      setLedgerStats({ totalBilled, totalPaid, balanceDue });
      setShowLedger(true);
    } catch (e) {
      console.error("Error generating ledger:", e);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const name = (c.companyName || c.company_name || '').toLowerCase();
    const gstin = (c.gstin || '').toLowerCase();
    const mobile = (c.mobile || '').toLowerCase();
    return name.includes(q) || gstin.includes(q) || mobile.includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;

    if (!editId) {
      const exists = customers.find(c => 
        (c.companyName || '').toLowerCase() === form.companyName.trim().toLowerCase() ||
        (form.gstin && (c.gstin || '').toLowerCase() === form.gstin.trim().toLowerCase())
      );
      if (exists) {
        alert('A customer with this company name or GSTIN already exists!');
        return;
      }
    }

    if (editId) {
      await updateCustomer(editId, { ...form });
    } else {
      await saveCustomer({ ...form });
    }
    setForm({ companyName: '', gstin: '', address: '', mobile: '', email: '', website: '', vendorCode: '' });
    setShowForm(false);
    setEditId(null);
    loadCustomers();
  };

  const handleEdit = (customer) => {
    setForm({
      companyName: customer.companyName,
      gstin: customer.gstin,
      address: customer.address,
      mobile: customer.mobile || '',
      email: customer.email || '',
      website: customer.website || '',
      vendorCode: customer.vendorCode || ''
    });
    setEditId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this customer?')) {
      await deleteCustomer(id);
      loadCustomers();
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ companyName: '', gstin: '', address: '', mobile: '', email: '', website: '', vendorCode: '' });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <>
      <div className="page-header">
        <h1>Customer Details & Party Ledgers</h1>
        <p>Manage your customer database and view real-time account statements</p>
      </div>
      <div className="page-body fade-in">
        <div className="toolbar">
          <div className="search-bar">
            <Search />
            <input
              placeholder="Search by name, GSTIN, or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { cancelForm(); setShowForm(true); }} style={{ gap: '12px' }}>
            <Plus size={20} color="#22c55e" strokeWidth={3} /> <span style={{ fontWeight: 800 }}>Add Customer</span>
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={cancelForm}>
            <div className="modal-content slide-in" onClick={e => e.stopPropagation()}>
              <h2>{editId ? 'Edit Customer' : 'Add New Customer'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    className="form-control"
                    placeholder="Enter company name"
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <input
                    className="form-control"
                    placeholder="e.g. 33AOVPN6372D1ZM"
                    value={form.gstin}
                    onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    className="form-control"
                    placeholder="Enter full address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label>Mobile (Optional)</label>
                    <input
                      className="form-control"
                      placeholder="Phone number"
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (Optional)</label>
                    <input
                      className="form-control"
                      placeholder="Email address"
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Website (Optional)</label>
                  <input
                    className="form-control"
                    placeholder="e.g. example.com"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Code (Optional)</label>
                  <input
                    className="form-control"
                    placeholder="Enter vendor code"
                    value={form.vendorCode}
                    onChange={e => setForm({ ...form, vendorCode: e.target.value })}
                  />
                </div>
                <div className="btn-group" style={{ marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary">
                    {editId ? 'Update Customer' : 'Save Customer'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Party Ledger Modal */}
        {showLedger && selectedLedgerCustomer && (
          <div className="modal-overlay" onClick={() => setShowLedger(false)}>
            <div className="modal-content slide-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Party Ledger: {selectedLedgerCustomer.companyName}</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    GSTIN: {selectedLedgerCustomer.gstin || 'N/A'} | Phone: {selectedLedgerCustomer.mobile || 'N/A'}
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowLedger(false)}><X size={18} /></button>
              </div>

              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL BILLED</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(ledgerStats.totalBilled)}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL RECEIVED</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(ledgerStats.totalPaid)}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OUTSTANDING BALANCE</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: ledgerStats.balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                    {formatCurrency(ledgerStats.balanceDue)}
                  </div>
                </div>
              </div>

              {/* Document List Table */}
              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Doc No</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerDocs.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No transactions recorded for this client.</td></tr>
                    ) : (
                      ledgerDocs.map((doc, idx) => {
                        const due = (doc.amount || 0) - (doc.paid || 0);
                        return (
                          <tr key={idx}>
                            <td>{doc.date ? new Date(doc.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                            <td><span className="badge" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>{doc.type}</span></td>
                            <td style={{ fontWeight: 600 }}>{doc.docNo || 'N/A'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{doc.amount ? formatCurrency(doc.amount) : '₹0'}</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>{doc.paid ? formatCurrency(doc.paid) : '₹0'}</td>
                            <td style={{ textAlign: 'right', color: due > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>{formatCurrency(due)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={16} /> Print Statement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>{search ? 'No customers found' : 'No customers yet'}</h3>
            <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
          </div>
        ) : (
          <div className="customer-grid">
            {filtered.map(c => (
              <div key={c.id} className="customer-card fade-in">
                <h3>
                  <Building2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  {c.companyName || c.company_name || 'Unnamed Company'}
                </h3>
                {c.gstin && <div className="detail"><Hash size={14} /><span>GSTIN: {c.gstin}</span></div>}
                {c.address && <div className="detail"><MapPin size={14} /><span>{c.address}</span></div>}
                {c.mobile && <div className="detail"><Phone size={14} /><span>{c.mobile}</span></div>}
                {c.email && <div className="detail"><Mail size={14} /><span>{c.email}</span></div>}
                {c.website && <div className="detail"><Globe size={14} /><span>{c.website}</span></div>}
                {c.vendorCode && <div className="detail" style={{ color: '#0066cc', fontWeight: 600 }}><Hash size={14} /><span>Vendor Code: {c.vendorCode}</span></div>}
                <div className="actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => openLedger(c)} style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                    <FileText size={14} /> Ledger
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(c)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
