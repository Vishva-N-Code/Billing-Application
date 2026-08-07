import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { db, COMPANY, getCompanyProfile, getNextInvoiceNumber, updateInvoiceCounter, initSettings, saveInvoice, updateInvoice, deleteInvoice, saveCustomer } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function TaxInvoice({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewCustomerPrompt, setShowNewCustomerPrompt] = useState(false);

  const [form, setForm] = useState({
    docName: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    hsnCode: '996719',
    reference: '',
    workOrderNo: '',
    billingCompany: '',
    billingGstin: '',
    billingAddress: '',
    billingMobile: '',
    billingWebsite: '',
    vendorCode: '',
    gstType: 'cgst_sgst', // 'cgst_sgst' or 'igst'
    termsAndConditions: '',
    showQty: false,
    showRate: false,
  });

  const [items, setItems] = useState([
    { description: '', rate: '', unitType: 'shifts', quantity: '', amount: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const GST_STATE_CODES = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
    '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
    '38': 'Ladakh'
  };

  // Modern fetch implementation for auto-fill based on local database ONLY to preserve explicit user entry
  const handleInternetFetch = async (query, type) => {
    if (!query || query.length < 3) return;
    
    // First search in local DB
    const allCustomers = await db.customers.toArray();
    const localMatch = type === 'gstin' 
      ? allCustomers.find(c => c.gstin.toUpperCase() === query.toUpperCase())
      : allCustomers.find(c => c.companyName.toLowerCase() === query.toLowerCase());

    if (localMatch) {
      setForm(f => ({
        ...f,
        billingCompany: localMatch.companyName,
        billingGstin: localMatch.gstin,
        billingAddress: localMatch.address,
        billingMobile: localMatch.mobile || '',
        billingWebsite: localMatch.website || '',
        vendorCode: localMatch.vendorCode || '',
        gstType: localMatch.gstin?.startsWith(COMPANY.gstin.substring(0, 2)) ? 'cgst_sgst' : 'igst'
      }));
      return;
    }

    // Auto detect GST-TYPE cleanly if they manually enter an accurate GSTIN
    if (type === 'gstin' && query.length >= 2) {
      const stateCode = query.substring(0, 2);
      const autoGstType = stateCode === companyProfile.gstin.substring(0, 2) ? 'cgst_sgst' : 'igst';
      setForm(f => ({ ...f, gstType: autoGstType }));
    }
  };

  const fetchSaved = async () => {
    const data = await db.invoices.toArray();
    setSavedInvoices(data.reverse());
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      
      if (itemToLoad) {
        // Load data immediately for export
        const inv = itemToLoad;
        setForm({ ...inv.data.form, id: inv.id });
        setItems(inv.data.items);
        if (inv.data.signature) setSignature(inv.data.signature);
        setActiveTab('preview');
        
        // Parallel load essential company profile
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      const num = await getNextInvoiceNumber();
      setForm(f => ({ ...f, invoiceNo: num }));
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);
      await fetchSaved();
      
      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ ...f, termsAndConditions: '' }));
    };
    init();

    const handleSyncComplete = async () => {
      await fetchSaved();
      const itemToLoad = exportItem || location.state?.loadItem;
      if (!itemToLoad) {
        const num = await getNextInvoiceNumber();
        setForm(f => {
          if (!f.id && (!f.billingCompany || f.billingCompany.trim() === '')) {
            return { ...f, invoiceNo: num };
          }
          return f;
        });
      }
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sync-complete', handleSyncComplete);
  }, [location.state, exportItem]);

  const loadInvoice = (inv) => {
    setForm({ showQty: false, showRate: false, ...inv.data.form, id: inv.id });
    setItems(inv.data.items);
    if (inv.data.signature) setSignature(inv.data.signature);
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice from storage?')) {
      await deleteInvoice(id);
      await fetchSaved();
    }
  };

  const handleCompanySearch = (val) => {
    setForm({ ...form, billingCompany: val });
    if (val.length >= 2) {
      const matches = customers.filter(c => {
        const name = (c.companyName || c.company_name || '').toLowerCase();
        return name.includes(val.toLowerCase());
      });
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setShowNewCustomerPrompt(matches.length === 0 && val.length >= 3);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowNewCustomerPrompt(false);
    }
  };

  const handleGstinSearch = (val) => {
    setForm({ ...form, billingGstin: val.toUpperCase() });
    if (val.length >= 5) {
      const matches = customers.filter(c =>
        c.gstin.toLowerCase().includes(val.toLowerCase())
      );
      if (matches.length > 0) {
        setSuggestions(matches);
        setShowSuggestions(true);
        setShowNewCustomerPrompt(false);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setShowNewCustomerPrompt(val.length >= 8);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowNewCustomerPrompt(false);
    }
  };

  const selectCustomer = (customer) => {
    setForm({
      ...form,
      billingCompany: customer.companyName || customer.company_name,
      billingGstin: customer.gstin,
      billingAddress: customer.address,
      billingMobile: customer.mobile || '',
      billingWebsite: customer.website || '',
      vendorCode: customer.vendorCode || '',
    });
    setShowSuggestions(false);
    setShowNewCustomerPrompt(false);
  };

  const addAsNewCustomer = async () => {
    // Duplicate check
    const allCustomers = await db.customers.toArray();
    const exists = allCustomers.find(c => 
      (c.companyName || '').toLowerCase() === form.billingCompany.trim().toLowerCase() ||
      (form.billingGstin && (c.gstin || '').toLowerCase() === form.billingGstin.trim().toLowerCase())
    );

    if (exists) {
      alert('This customer already exists in the database!');
      return;
    }

    await saveCustomer({
      companyName: form.billingCompany,
      gstin: form.billingGstin,
      address: form.billingAddress,
      mobile: form.billingMobile,
      email: '',
      website: form.billingWebsite,
      vendorCode: form.vendorCode,
    });
    const updatedCustomers = await db.customers.toArray();
    setCustomers(updatedCustomers);
    setShowNewCustomerPrompt(false);
    alert('Customer added to database!');
  };

  const addItem = () => setItems([...items, { description: '', rate: '', unitType: 'shifts', quantity: '', amount: '' }]);
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    if (field === 'rate' || field === 'quantity') {
      const rate = parseFloat(updated[i].rate);
      const qty = parseFloat(updated[i].quantity);
      if (!isNaN(rate) && !isNaN(qty)) {
        updated[i].amount = (rate * qty).toString();
      }
    }
    setItems(updated);
  };

  // Calculations
  const calcAmount = (item) => {
    if (item.amount !== undefined && item.amount !== '') {
      return parseFloat(item.amount) || 0;
    }
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return rate * qty;
  };

  const subtotal = items.reduce((sum, item) => sum + calcAmount(item), 0);
  const cgst = form.gstType === 'cgst_sgst' ? subtotal * 0.09 : 0;
  const sgst = form.gstType === 'cgst_sgst' ? subtotal * 0.09 : 0;
  const igst = form.gstType === 'igst' ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + cgst + sgst + igst;

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    return parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveOnly = async () => {
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      docName: form.docName || `Tax Invoice ${form.invoiceNo}`,
      date: form.date,
      clientCompany: form.billingCompany,
      grandTotal: grandTotal,
      data: { form, items, signature }
    };
    if (form.id) {
      await updateInvoice(form.id, invoiceData);
      alert('Document updated successfully!');
    } else {
      const newId = await saveInvoice(invoiceData);
      setForm(f => ({ ...f, id: newId }));
      alert('Document saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    // Save to DB
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      docName: form.docName || `Tax Invoice ${form.invoiceNo}`,
      date: form.date,
      clientCompany: form.billingCompany,
      grandTotal: grandTotal,
      data: { form, items, signature }
    };
    
    if (form.id) {
      await updateInvoice(form.id, invoiceData);
    } else {
      const newId = await saveInvoice(invoiceData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    
    // Auto-increment the invoice number from the CURRENT entered one
    await updateInvoiceCounter(form.invoiceNo);
    const nextNum = await getNextInvoiceNumber();
    setForm(f => ({ ...f, invoiceNo: nextNum, id: undefined })); // Clear ID to allow new document
    alert('Invoice saved and number auto-incremented based on your entry!');
  };

  return (
    <>
      <div className="page-header">
        <h1>Tax Invoice</h1>
        <p>Generate GST-compliant tax invoices with auto-calculations</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
          {isFetchingInfo && <div style={{ color: '#0066cc', fontSize: '0.85rem', fontWeight: '500', animation: 'pulse 1.5s infinite' }}>Fetching internet details...</div>}
          <div style={{ display: 'flex', gap: '8px', marginLeft: isFetchingInfo ? 'auto' : '0' }}>
            <a href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>Official GST Portal</a>
            <a href="https://www.expressgst.com/gst-number-search/" target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>ExpressGST Search</a>
          </div>
        </div>
      </div>
      <div className="page-body fade-in">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Details</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        </div>

        <div className="doc-preview-wrapper">
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'form' ? 'block' : 'none' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Document Options</div>
              <div className="form-group">
                <label>Document Name (For Storage)</label>
                <input className="form-control" placeholder="E.g. XYZ Corp March Invoice"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
              <div className="card-title" style={{ marginTop: '16px' }}>Copy Type</div>
              <div className="gst-selector">
                <button className={`gst-option ${!isDuplicate ? 'active' : ''}`}
                  onClick={() => setIsDuplicate(false)}>
                  Original Copy
                </button>
                <button className={`gst-option ${isDuplicate ? 'active' : ''}`}
                  onClick={() => setIsDuplicate(true)}>
                  Duplicate Copy
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Invoice Details</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Invoice No.</label>
                  <input className="form-control" value={form.invoiceNo}
                    onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <CustomDateInput className="form-control" value={form.date} onChange={val => setForm({ ...form, date: val })} />
                </div>
                <div className="form-group">
                  <label>HSN Code</label>
                  <input className="form-control" value={form.hsnCode}
                    onChange={e => setForm({ ...form, hsnCode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Work Order No. (Optional)</label>
                  <input className="form-control" value={form.workOrderNo}
                    onChange={e => setForm({ ...form, workOrderNo: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Billing To</div>
              <div className="form-group">
                <label>Reference (Optional)</label>
                <input className="form-control" placeholder="e.g. Ref: Name"
                  value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="form-group autocomplete-wrapper">
                <label>Company Name</label>
                <input className="form-control" placeholder="Start typing to search..."
                  value={form.billingCompany}
                  onChange={e => handleCompanySearch(e.target.value)}
                  onBlur={() => { handleInternetFetch(form.billingCompany, 'company'); setTimeout(() => setShowSuggestions(false), 200); }}
                  onFocus={() => form.billingCompany.length >= 2 && handleCompanySearch(form.billingCompany)}
                />
                {showSuggestions && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map(c => (
                      <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                        <div className="company-name">{c.companyName || c.company_name}</div>
                        <div className="gstin-text">{c.gstin} | {c.address}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group autocomplete-wrapper">
                <label>GSTIN</label>
                <input className="form-control" placeholder="Enter GSTIN"
                  value={form.billingGstin}
                  onChange={e => handleGstinSearch(e.target.value)}
                  onBlur={() => { handleInternetFetch(form.billingGstin, 'gstin'); setTimeout(() => setShowSuggestions(false), 200); }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map(c => (
                      <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                        <div className="company-name">{c.companyName}</div>
                        <div className="gstin-text">{c.gstin}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showNewCustomerPrompt && (
                <div className="new-customer-prompt">
                  <span>New customer? Add to database?</span>
                  <button className="btn btn-sm btn-primary" onClick={addAsNewCustomer}>Add Customer</button>
                </div>
              )}

              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" rows={3} placeholder="Billing address"
                  value={form.billingAddress} onChange={e => setForm({ ...form, billingAddress: e.target.value })} />
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Mobile (Optional)</label>
                  <input className="form-control" placeholder="Phone number"
                    value={form.billingMobile} onChange={e => setForm({ ...form, billingMobile: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Website (Optional)</label>
                  <input className="form-control" placeholder="Website"
                    value={form.billingWebsite} onChange={e => setForm({ ...form, billingWebsite: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Vendor Code (Optional)</label>
                  <input className="form-control" placeholder="Enter vendor code"
                    value={form.vendorCode} onChange={e => setForm({ ...form, vendorCode: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div className="card-title" style={{ margin: 0 }}>Invoice Items</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-input)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Display in Preview:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <input type="checkbox" checked={!!form.showQty} onChange={e => setForm({ ...form, showQty: e.target.checked })} style={{ accentColor: 'var(--accent-gold)' }} />
                    Qty Column
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <input type="checkbox" checked={!!form.showRate} onChange={e => setForm({ ...form, showRate: e.target.checked })} style={{ accentColor: 'var(--accent-gold)' }} />
                    Rate Column
                  </label>
                </div>
              </div>
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>S.No</th>
                      <th>Description</th>
                      <th style={{ width: '100px' }}>Rate</th>
                      <th style={{ width: '110px' }}>Type</th>
                      <th style={{ width: '80px' }}>Qty</th>
                      <th style={{ width: '100px' }}>Amount</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <textarea className="form-control" placeholder="Description" rows={2}
                            value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="Optional"
                            value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} />
                        </td>
                        <td>
                          <select className="form-control" value={item.unitType}
                            onChange={e => updateItem(i, 'unitType', e.target.value)}>
                            <option value="shifts">Shifts</option>
                            <option value="hours">Hours</option>
                          </select>
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0"
                            value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', marginRight: '4px', fontWeight: 600 }}>Rs.</span>
                            <input className="form-control" type="number" placeholder="0"
                              style={{ minWidth: '80px', flex: 1, fontWeight: 600 }}
                              value={item.amount !== undefined ? item.amount : calcAmount(item)}
                              onChange={e => updateItem(i, 'amount', e.target.value)} />
                          </div>
                        </td>
                        <td>
                          <button className="btn-icon" onClick={() => removeItem(i)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={addItem}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">GST Type</div>
              <div className="gst-selector">
                <button className={`gst-option ${form.gstType === 'cgst_sgst' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, gstType: 'cgst_sgst' })}>
                  CGST 9% + SGST 9%
                </button>
                <button className={`gst-option ${form.gstType === 'igst' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, gstType: 'igst' })}>
                  IGST 18%
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Terms & Conditions</div>
              <div className="form-group mb-0">
                <textarea className="form-control" rows={3} placeholder="Add terms and conditions..."
                  value={form.termsAndConditions} onChange={e => setForm({ ...form, termsAndConditions: e.target.value })} />
              </div>
            </div>

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', marginBottom: '10px', background: 'var(--bg-card)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Preview Columns:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                <input type="checkbox" checked={!!form.showQty} onChange={e => setForm({ ...form, showQty: e.target.checked })} style={{ accentColor: 'var(--accent-gold)' }} />
                Qty Column
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                <input type="checkbox" checked={!!form.showRate} onChange={e => setForm({ ...form, showRate: e.target.checked })} style={{ accentColor: 'var(--accent-gold)' }} />
                Rate Column
              </label>
            </div>
            <div className="doc-preview-container">
              <div ref={previewRef} className="print-capture-wrap">
                <div className="doc-preview">
                  <div className="doc-preview-inner">
                    {/* Header matching provided image */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 16px 0' }}>
                      <div style={{ width: '220px', textAlign: 'left' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
                      </div>
                      
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                        Tax Invoice
                      </div>
                      
                      <div style={{ width: '220px', textAlign: 'right', fontSize: '1rem', fontWeight: 600, lineHeight: '1.6' }}>
                        {isDuplicate && <div style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', color: '#444' }}>DUPLICATE COPY</div>}
                        <div style={{ display: 'block' }}>Date: {formatDate(form.date)}</div>
                        <div style={{ display: 'block', textTransform: 'uppercase' }}>INVOICE NO. {form.invoiceNo}</div>
                      </div>
                    </div>

                    {/* Two-column: From | Billing To Using Table for strict PDF rendering */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #333', borderBottom: '1px solid #333', marginBottom: '8px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '50%', verticalAlign: 'top', padding: '8px 10px 8px 0', borderRight: '1px solid #333' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '6px', fontWeight: 800, textTransform: 'uppercase' }}>{companyProfile.name}</h4>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', lineHeight: '1.4' }}>
                              {companyProfile.address}
                            </div>
                            <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>GSTIN : {companyProfile.gstin}</div>
                            <div style={{ fontSize: '0.9rem' }}>Mobile: {companyProfile.mobile}</div>
                            <div style={{ fontSize: '0.9rem' }}>Email: {companyProfile.email}</div>
                            <div style={{ fontSize: '0.9rem' }}>Website: {companyProfile.website}</div>
                            {form.workOrderNo && <div style={{ fontSize: '0.9rem', marginTop: '4px', fontWeight: 600 }}>Work Order No: {form.workOrderNo}</div>}
                          </td>
                          <td style={{ width: '50%', verticalAlign: 'top', padding: '8px 0 8px 10px' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '6px', fontWeight: 800 }}>Billing To:</h4>
                            {form.reference && <div style={{ fontSize: '0.95rem', marginBottom: '2px', fontWeight: 600 }}>Ref: {form.reference}</div>}
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase' }}>{form.billingCompany || '—'}</div>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', marginTop: '3px', lineHeight: '1.4', textTransform: 'uppercase' }}>{form.billingAddress}</div>
                            {form.billingGstin && <div style={{ fontSize: '0.9rem', marginTop: '4px', textTransform: 'uppercase' }}>GSTIN: {form.billingGstin}</div>}
                            {form.billingMobile && <div style={{ fontSize: '0.9rem' }}>Mobile: {form.billingMobile}</div>}
                            {form.vendorCode && <div style={{ fontSize: '0.9rem', color: '#0066cc', fontWeight: 700 }}>Vendor Code: {form.vendorCode}</div>}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* HSN Code */}
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '8px' }}>
                      HSN CODE: {form.hsnCode}
                    </div>

                    {/* Items Table */}
                    {(() => {
                      const showQty = !!form.showQty;
                      const showRate = !!form.showRate;
                      // Base columns before total: S.NO (1) + DESCRIPTION (1) + (showQty ? 1 : 0) + (showRate ? 1 : 0) = labelColSpan
                      const labelColSpan = 2 + (showQty ? 1 : 0) + (showRate ? 1 : 0);

                      const formatQty = (item) => {
                        if (!item.quantity) return '—';
                        const unitStr = item.unitType === 'hours' ? 'Hrs' : item.unitType === 'shifts' ? 'Shift(s)' : item.unitType || '';
                        return `${item.quantity} ${unitStr}`.trim();
                      };

                      return (
                        <table className="doc-table" style={{ fontSize: '0.92rem', tableLayout: 'fixed', width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '45px', fontSize: '0.88rem', textAlign: 'center' }}>S.NO</th>
                              <th style={{ fontSize: '0.88rem', textAlign: 'left' }}>DESCRIPTION</th>
                              {showQty && <th style={{ textAlign: 'center', fontSize: '0.88rem', width: '100px' }}>QTY</th>}
                              {showRate && <th style={{ textAlign: 'right', fontSize: '0.88rem', width: '130px' }}>RATE</th>}
                              <th style={{ textAlign: 'right', fontSize: '0.88rem', width: '140px' }}>AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={i}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td style={{ textAlign: 'left' }}>
                                  {item.description || '—'}
                                  {!showQty && !showRate && item.quantity && item.unitType ? (
                                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                      {item.unitType === 'hours' ? `Hours - ${item.quantity} hours` : `${item.quantity} shift(s)`}
                                      {item.rate && ` @ Rs. ${formatCurrency(item.rate)}`}
                                    </div>
                                  ) : null}
                                </td>
                                {showQty && (
                                  <td style={{ textAlign: 'center', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                    {formatQty(item)}
                                  </td>
                                )}
                                {showRate && (
                                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                    {item.rate ? (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: 400 }}>Rs.</span>
                                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>{formatCurrency(item.rate)}</span>
                                      </div>
                                    ) : '—'}
                                  </td>
                                )}
                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: 400 }}>Rs.</span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>{formatCurrency(calcAmount(item))}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}

                            {/* Totals integrated into the main doc-table using colSpan */}
                            <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                              <td colSpan={labelColSpan} style={{ textAlign: 'right', paddingRight: '16px' }}>SUBTOTAL</td>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Rs.</span>
                                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                                </div>
                              </td>
                            </tr>
                            {form.gstType === 'cgst_sgst' ? (
                              <>
                                <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                                  <td colSpan={labelColSpan} style={{ textAlign: 'right', paddingRight: '16px' }}>CGST 09%</td>
                                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                      <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Rs.</span>
                                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(cgst)}</span>
                                    </div>
                                  </td>
                                </tr>
                                <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                                  <td colSpan={labelColSpan} style={{ textAlign: 'right', paddingRight: '16px' }}>SGST 09%</td>
                                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                      <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Rs.</span>
                                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(sgst)}</span>
                                    </div>
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                                <td colSpan={labelColSpan} style={{ textAlign: 'right', paddingRight: '16px' }}>IGST 18%</td>
                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Rs.</span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(igst)}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr style={{ fontWeight: 800, background: '#f0f0f0' }}>
                              <td colSpan={labelColSpan} style={{ textAlign: 'right', paddingRight: '16px', fontSize: '1rem' }}>GRAND TOTAL</td>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                  <span style={{ fontSize: '0.95rem', color: '#111', fontWeight: 800 }}>Rs.</span>
                                  <span style={{ fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{formatCurrency(grandTotal)}</span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}

                    {/* Payment & Signature */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', border: '1px solid #ccc', borderRadius: '4px', padding: '10px', marginTop: '10px', fontSize: '0.85rem' }}>
                      <div style={{ flex: '1' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px', textDecoration: 'underline' }}>PAYMENT INFORMATION</h4>
                        <p>Account No: {companyProfile.bankAccount}</p>
                        <p>Account Name: {companyProfile.bankName}</p>
                        <p>IFSC: {companyProfile.bankIFSC}</p>
                        <p>Branch: {companyProfile.bankBranch}</p>
                      </div>
                      {form.termsAndConditions && (
                        <div style={{ flex: '1', padding: '0 12px', borderLeft: '1px solid #eee' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px', textDecoration: 'underline' }}>TERMS & CONDITIONS</h4>
                          <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-line', lineHeight: '1.4', color: '#444' }}>
                            {form.termsAndConditions}
                          </div>
                        </div>
                      )}
                      <div style={{ textAlign: 'center', minWidth: '140px' }}>
                        {signature && (
                          <>
                            <img src={signature} alt="Signature" className="signature-img" />
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#555', borderTop: '1px solid #aaa', paddingTop: '4px', minWidth: '140px' }}>SIGNATURE</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ExportButtons targetRef={previewRef} filename={form.docName || `Tax_Invoice_${form.invoiceNo}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
          </div>

          {/* === STORAGE === */}
          {activeTab === 'storage' && (
            <div className="doc-storage-panel fade-in">
              <div className="card">
                <div className="card-title">Saved Tax Invoices</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Doc Name</th>
                        <th>Invoice No</th>
                        <th>Client</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>{formatDate(inv.date)}</td>
                          <td><strong>{inv.docName}</strong></td>
                          <td>{inv.invoiceNo}</td>
                          <td>{inv.clientCompany}</td>
                          <td>₹{formatCurrency(inv.grandTotal)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => loadInvoice(inv)}>Edit / View</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inv.id)}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {savedInvoices.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No saved invoices found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>



      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
          z-index: 2000; backdrop-filter: blur(4px);
        }
        .modal-content { 
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
        }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

      `}</style>
      </div>
    </>
  );
}
