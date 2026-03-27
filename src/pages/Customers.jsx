import { useState, useEffect } from 'react';
import { db } from '../db';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail, Globe, Hash, Users } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    companyName: '', gstin: '', address: '', mobile: '', email: '', website: ''
  });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return c.companyName.toLowerCase().includes(q) ||
           c.gstin.toLowerCase().includes(q) ||
           (c.mobile || '').includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    if (editId) {
      await db.customers.update(editId, { ...form });
    } else {
      await db.customers.add({ ...form });
    }
    setForm({ companyName: '', gstin: '', address: '', mobile: '', email: '', website: '' });
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
      website: customer.website || ''
    });
    setEditId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this customer?')) {
      await db.customers.delete(id);
      loadCustomers();
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ companyName: '', gstin: '', address: '', mobile: '', email: '', website: '' });
  };

  return (
    <>
      <div className="page-header">
        <h1>Customer Details</h1>
        <p>Manage your customer database for quick invoice filling</p>
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
          <button className="btn btn-primary" onClick={() => { cancelForm(); setShowForm(true); }}>
            <Plus size={16} /> Add Customer
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
                <h3><Building2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />{c.companyName}</h3>
                {c.gstin && <div className="detail"><Hash size={14} /><span>GSTIN: {c.gstin}</span></div>}
                {c.address && <div className="detail"><MapPin size={14} /><span>{c.address}</span></div>}
                {c.mobile && <div className="detail"><Phone size={14} /><span>{c.mobile}</span></div>}
                {c.email && <div className="detail"><Mail size={14} /><span>{c.email}</span></div>}
                {c.website && <div className="detail"><Globe size={14} /><span>{c.website}</span></div>}
                <div className="actions">
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
