import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db, COMPANY, getNextInvoiceNumber, updateInvoiceCounter, initSettings, saveInvoice } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import { createWorker } from 'tesseract.js';

export default function TaxInvoice() {
  const previewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('form');
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewCustomerPrompt, setShowNewCustomerPrompt] = useState(false);

  const [form, setForm] = useState({
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    hsnCode: '996719',
    billingCompany: '',
    billingGstin: '',
    billingAddress: '',
    billingMobile: '',
    billingWebsite: '',
    gstType: 'cgst_sgst', // 'cgst_sgst' or 'igst'
  });

  const [items, setItems] = useState([
    { description: '', rate: '', unitType: 'shifts', quantity: '', amount: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [captchaImg, setCaptchaImg] = useState(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const [pendingGstin, setPendingGstin] = useState('');
  const [fetchSource, setFetchSource] = useState(''); // 'official' or 'express'

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

  const loadCaptcha = async (source) => {
    setIsFetchingInfo(true);
    setFetchSource(source || 'official');
    setCaptchaImg(null);
    setCaptchaInput('');
    try {
      // Official portal captcha endpoint
      const url = 'https://services.gst.gov.in/services/captcha';
      
      // Use proxy to get image data
      // We add a timestamp to prevent caching and force a refresh
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url + '?t=' + Date.now())}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      
      if (data.contents) {
        let imgData = data.contents;
        // Ensure it's a proper data URL for display and OCR
        if (!imgData.startsWith('data:image')) {
          imgData = `data:image/png;base64,${imgData}`;
        }
        setCaptchaImg(imgData); 
        setShowCaptchaDialog(true);
        
        // AUTO-SOLVE with Tesseract.js
        try {
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(imgData);
          await worker.terminate();
          // GST captchas are usually 6 digits or chars
          const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
          if (cleanText.length >= 4) {
             setCaptchaInput(cleanText);
          }
        } catch (ocrErr) {
          console.warn('OCR Auto-solve failed:', ocrErr);
        }
      } else {
        throw new Error('Captcha content missing from response.');
      }
    } catch (err) {
      console.error('Captcha Load Error:', err);
      alert('Failed to load CAPTCHA image. Please try the "Search" buttons above or try again in a moment.');
    }
    setIsFetchingInfo(false);
  };

  const handlePortalFetch = async () => {
    if (!pendingGstin || !captchaInput) return;
    setIsFetchingInfo(true);
    setShowCaptchaDialog(false);
    
    try {
      // Primary source: Jamku API via proxy
      const jamkuUrl = `https://gst.jamku.app/api/gstin/${pendingGstin}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(jamkuUrl)}`;
      
      const res = await fetch(proxyUrl);
      const proxyData = await res.json();
      
      if (proxyData.contents) {
        const result = JSON.parse(proxyData.contents);
        if (result.success && result.data) {
          const d = result.data;
          
          // PERFECT MAPPING:
          // Business Name: prioritized Trade Name, falls back to Legal Name
          const businessName = d.tradeName || d.lgnm || '';
          
          // Address: Use the pre-joined 'adr' field if available, otherwise join parts
          let fullAddress = d.adr || '';
          if (!fullAddress && d.pradr?.addr) {
            const a = d.pradr.addr;
            fullAddress = [a.bnm, a.flno, a.st, a.loc, a.city, a.dst, a.stcd, a.pncd].filter(Boolean).join(', ');
          }

          // AUTO GST-TYPE DETECTION:
          // Company state code is 33 (Tamil Nadu).
          // If fetched GSTIN starts with 33, it's local (CGST+SGST). 
          // Otherwise, it's interstate (IGST).
          const stateCode = pendingGstin.substring(0, 2);
          const autoGstType = stateCode === COMPANY.gstin.substring(0, 2) ? 'cgst_sgst' : 'igst';

          setForm(f => ({
            ...f,
            billingCompany: businessName,
            billingAddress: fullAddress,
            billingGstin: pendingGstin.toUpperCase(),
            gstType: autoGstType
          }));
          
          alert(`Success! Found "${businessName}" (${autoGstType === 'igst' ? 'Interstate - IGST 18%' : 'Intrastate - CGST+SGST 18%'})`);
        } else {
          alert('GSTIN found but no details available. Please check the number.');
        }
      } else {
        alert('Could not reach the database. Please check your internet connection.');
      }
    } catch (err) {
      console.error('Portal Fetch Error:', err);
      alert('Network error while fetching details. Please try again.');
    }
    
    setIsFetchingInfo(false);
    setCaptchaInput('');
    setCaptchaImg(null);
    setPendingGstin('');
  };

  // Modern internet fetch implementation for auto-fill
  const handleInternetFetch = async (query, type) => {
    if (!query || query.length < 3) return;
    
    // 1. First search in local DB
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
      }));
      return;
    }

    if (type === 'gstin' && query.length === 15) {
      setPendingGstin(query);
      loadCaptcha('official');
      return;
    }

    setIsFetchingInfo(true);
    try {
      if (type === 'company') {
        const [clearbitRes, locationRes] = await Promise.all([
          fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`).catch(() => null),
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1`).catch(() => null)
        ]);
        
        let newName = f => f.billingCompany;
        let newWeb = f => f.billingWebsite;
        let newAddress = f => f.billingAddress;

        if (clearbitRes && clearbitRes.ok) {
          const cbData = await clearbitRes.json();
          if (cbData && cbData.length > 0) {
            newName = f => f.billingCompany === query ? cbData[0].name : f.billingCompany;
            newWeb = f => f.billingWebsite || cbData[0].domain;
          }
        }
        
        if (locationRes && locationRes.ok) {
          const locData = await locationRes.json();
          if (locData && locData.length > 0) {
            newAddress = f => f.billingAddress || locData[0].display_name;
          }
        }
        
        setForm(f => ({
          ...f,
          billingCompany: newName(f) || f.billingCompany,
          billingWebsite: newWeb(f) || f.billingWebsite,
          billingAddress: newAddress(f) || f.billingAddress
        }));
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    }
    setIsFetchingInfo(false);
  };

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextInvoiceNumber();
      setForm(f => ({ ...f, invoiceNo: num }));
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);
    };
    init();
  }, []);

  const handleCompanySearch = (val) => {
    setForm({ ...form, billingCompany: val });
    if (val.length >= 2) {
      const matches = customers.filter(c =>
        c.companyName.toLowerCase().includes(val.toLowerCase())
      );
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
      billingCompany: customer.companyName,
      billingGstin: customer.gstin,
      billingAddress: customer.address,
      billingMobile: customer.mobile || '',
      billingWebsite: customer.website || '',
    });
    setShowSuggestions(false);
    setShowNewCustomerPrompt(false);
  };

  const addAsNewCustomer = async () => {
    await db.customers.add({
      companyName: form.billingCompany,
      gstin: form.billingGstin,
      address: form.billingAddress,
      mobile: form.billingMobile,
      email: '',
      website: form.billingWebsite,
    });
    const allCustomers = await db.customers.toArray();
    setCustomers(allCustomers);
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

  const handleExport = async () => {
    // Save to DB
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      date: form.date,
      clientCompany: form.billingCompany,
      grandTotal: grandTotal,
      data: { form, items }
    };
    await saveInvoice(invoiceData);
    
    // Auto-increment the invoice number from the CURRENT entered one
    await updateInvoiceCounter(form.invoiceNo);
    const nextNum = await getNextInvoiceNumber();
    setForm(f => ({ ...f, invoiceNo: nextNum }));
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
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Edit Form</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        </div>

        <div className="doc-preview-wrapper">
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' ? 'none' : undefined }}>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Invoice Details</div>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label>Invoice No.</label>
                  <input className="form-control" value={form.invoiceNo}
                    onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input className="form-control" type="date" value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>HSN Code</label>
                  <input className="form-control" value={form.hsnCode}
                    onChange={e => setForm({ ...form, hsnCode: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Billing To</div>
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
                        <div className="company-name">{c.companyName}</div>
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
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Invoice Items</div>
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

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab === 'form' ? 'none' : undefined }}>
            <div className="doc-preview" ref={previewRef} style={{ width: '794px', maxWidth: '100%', margin: '4px auto', padding: '4px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
              <div className="doc-preview-inner">
                {/* Header matching provided image */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 32px 0' }}>
                  <div style={{ width: '220px', textAlign: 'left' }}>
                    <img src="/logo.png" alt="Logo" style={{ height: '70px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                  </div>
                  
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                    Tax Invoice
                  </div>
                  
                  <div style={{ width: '220px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.6' }}>
                    <div style={{ display: 'block' }}>Date: {formatDate(form.date)}</div>
                    <div style={{ display: 'block', textTransform: 'uppercase' }}>INVOICE NO. {form.invoiceNo}</div>
                  </div>
                </div>

                {/* Two-column: From | Billing To Using Table for strict PDF rendering */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #333', borderBottom: '1px solid #333', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', verticalAlign: 'top', padding: '12px 12px 12px 0', borderRight: '1px solid #333' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '6px', fontWeight: 800, textTransform: 'uppercase' }}>{COMPANY.name}</h4>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.8rem', lineHeight: '1.5' }}>
                          {COMPANY.address}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>GSTIN : {COMPANY.gstin}</div>
                        <div style={{ fontSize: '0.8rem' }}>Mobile: {COMPANY.mobile}</div>
                        <div style={{ fontSize: '0.8rem' }}>Email: {COMPANY.email}</div>
                        <div style={{ fontSize: '0.8rem' }}>Website: {COMPANY.website}</div>
                      </td>
                      <td style={{ width: '50%', verticalAlign: 'top', padding: '12px 0 12px 12px' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '6px', fontWeight: 800 }}>Billing To:</h4>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>{form.billingCompany || '—'}</div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.8rem', marginTop: '4px', lineHeight: '1.5', textTransform: 'uppercase' }}>{form.billingAddress}</div>
                        {form.billingGstin && <div style={{ fontSize: '0.8rem', marginTop: '4px', textTransform: 'uppercase' }}>GSTIN: {form.billingGstin}</div>}
                        {form.billingMobile && <div style={{ fontSize: '0.8rem' }}>Mobile: {form.billingMobile}</div>}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* HSN Code */}
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '8px' }}>
                  HSN CODE: {form.hsnCode}
                </div>

                {/* Items Table */}
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>S.NO</th>
                      <th>DESCRIPTION</th>
                      <th style={{ textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          {item.description || '—'}
                          {item.quantity && item.unitType ? (
                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                              {item.unitType === 'hours' ? `Over time - ${item.quantity} hours` : `${item.quantity} shift(s)`}
                              {item.rate && ` @ Rs. ${formatCurrency(item.rate)}`}
                            </div>
                          ) : null}
                        </td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(calcAmount(item))}</span></div></td>
                      </tr>
                    ))}

                    {/* Totals integrated into the main doc-table using colSpan */}
                    <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                      <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px' }}>SUBTOTAL</td>
                      <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(subtotal)}</span></div></td>
                    </tr>
                    {form.gstType === 'cgst_sgst' ? (
                      <>
                        <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                          <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px' }}>CGST 09%</td>
                          <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(cgst)}</span></div></td>
                        </tr>
                        <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                          <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px' }}>SGST 09%</td>
                          <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(sgst)}</span></div></td>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ fontWeight: 600, background: '#f9f9f9' }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px' }}>IGST 18%</td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(igst)}</span></div></td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 800, background: '#f0f0f0' }}>
                      <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px', fontSize: '0.9rem' }}>GRAND TOTAL</td>
                      <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.9rem' }}><span>Rs.</span> <span>{formatCurrency(grandTotal)}</span></div></td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment & Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', border: '1px solid #ccc', borderRadius: '4px', padding: '12px', marginTop: '16px', fontSize: '0.78rem' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', textDecoration: 'underline' }}>PAYMENT INFORMATION</h4>
                    <p>Account No: {COMPANY.bankAccount}</p>
                    <p>Account Name: {COMPANY.bankName}</p>
                    <p>IFSC: {COMPANY.bankIFSC}</p>
                    <p>Branch: {COMPANY.bankBranch}</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '140px' }}>
                    {signature && (
                      <>
                        <img src={signature} alt="Signature" className="signature-img" />
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#555', borderTop: '1px solid #aaa', paddingTop: '4px', minWidth: '140px' }}>SIGNATURE</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <ExportButtons targetRef={previewRef} filename={`Tax_Invoice_${form.invoiceNo}`} onExport={handleExport} />
          </div>
        </div>

      {showCaptchaDialog && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ maxWidth: '300px', width: '90%', textAlign: 'center', padding: '24px' }}>
            <div className="card-title" style={{ marginBottom: '4px' }}>Verify Identity</div>
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '16px' }}>
              Solving CAPTCHA for official lookup
            </p>
            
            <div style={{ position: 'relative', background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #eee', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {captchaImg ? (
                <>
                  <img src={captchaImg} alt="Captcha" style={{ maxWidth: '100%', height: '40px', borderRadius: '4px' }} />
                  <button 
                    onClick={() => loadCaptcha(fetchSource)}
                    title="Refresh CAPTCHA"
                    style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                  >
                    🔄
                  </button>
                </>
              ) : (
                <div className="spinner-small" style={{ border: '2px solid #f3f3f3', borderTop: '2px solid #0066cc', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <input 
                className="form-control" 
                placeholder="6-character code"
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px', fontWeight: 'bold', textTransform: 'uppercase', height: '50px' }}
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>AI has auto-filled the code above. Edit if needed.</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} 
                onClick={() => { setShowCaptchaDialog(false); setPendingGstin(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} 
                onClick={handlePortalFetch} 
                disabled={!captchaInput || isFetchingInfo}>
                {isFetchingInfo ? 'Verifying...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        @media (min-width: 769px) {
          .doc-form-panel, .doc-preview-panel { display: block !important; }
        }
      `}</style>
      </div>
    </>
  );
}
