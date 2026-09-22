import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, db, saveQuotation, deleteQuotation, updateQuotation, getCompanyProfile, initSettings } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function Quotation({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedQuotations, setSavedQuotations] = useState([]);

  const [form, setForm] = useState({
    docName: '',
    personInCharge: '',
    toCompany: '',
    toAddress: '',
    date: new Date().toISOString().split('T')[0],
    introText: 'We submit our lowest quotation for 3 ton Forklift for shift basis.',
    notes: ['GST 18% EXTRA.', 'Work will be initiated once PO Received.'],
    termsAndConditions: '',
    showPaymentInfo: false,
  });

  const [items, setItems] = useState([
    { description: '', quantity: '', rate: '', price: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addItem = () => setItems([...items, { description: '', quantity: '', rate: '', price: '' }]);

  const removeItem = (i) => {
    if (items.length > 1) setItems(items.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const calcAmount = (item) => {
    if (item.price !== undefined && item.price !== '' && item.price !== null && item.price !== 0 && item.price !== '0') {
      const p = parseFloat(item.price);
      if (!isNaN(p)) return p;
    }
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return rate * qty;
  };

  const addNote = () => setForm({ ...form, notes: [...form.notes, ''] });
  const removeNote = (i) => setForm({ ...form, notes: form.notes.filter((_, idx) => idx !== i) });
  const updateNote = (i, val) => {
    const updated = [...form.notes];
    updated[i] = val;
    setForm({ ...form, notes: updated });
  };

  const fetchSaved = async () => {
    const data = await db.quotations.toArray();
    const validData = data.filter(q => {
      const docName = q.docName || q.data?.form?.docName || '';
      const client = q.clientCompany || q.toCompany || q.data?.form?.toCompany || q.data?.form?.billingCompany || '';
      return docName.trim() !== '' || client.trim() !== '';
    });
    setSavedQuotations(validData.reverse());
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        const q = itemToLoad;
        setForm({ ...q.data.form, id: q.id });
        setItems(q.data.items);
        if (q.data.signature) setSignature(q.data.signature);
        setActiveTab('preview');
        
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      const allCust = await db.customers.toArray();
      setCustomers(allCust);
      fetchSaved();
      
      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ ...f, termsAndConditions: '' }));
    };
    init();

    const handleSyncComplete = async () => {
      fetchSaved();
      const allCust = await db.customers.toArray();
      setCustomers(allCust);
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [location.state, exportItem]);

  const loadQuotation = (q) => {
    setForm({ ...q.data.form, id: q.id });
    setItems(q.data.items);
    if (q.data.signature) setSignature(q.data.signature);
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation from storage?')) {
      await deleteQuotation(id);
      await fetchSaved();
    }
  };

  const handleCompanySearch = (val) => {
    setForm(f => ({ ...f, toCompany: val }));
    if (val.length >= 2) {
      const matches = customers.filter(c => {
        const name = (c.companyName || c.company_name || '').toLowerCase();
        return name.includes(val.toLowerCase());
      });
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer) => {
    setForm(f => ({
      ...f,
      toCompany: customer.companyName || customer.company_name || '',
      toAddress: customer.address || '',
    }));
    setShowSuggestions(false);
  };

  const handleSaveOnly = async () => {
    const qData = {
      docName: form.docName || `Quotation - ${form.toCompany || 'Draft'}`,
      date: form.date,
      clientCompany: form.toCompany,
      data: { form, items, signature }
    };
    if (form.id) {
      await updateQuotation(form.id, qData);
      alert('Quotation updated successfully!');
    } else {
      const newId = await saveQuotation(qData);
      setForm(f => ({ ...f, id: newId }));
      alert('Document saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    const qData = {
      docName: form.docName || `Quotation - ${form.toCompany || 'Draft'}`,
      date: form.date,
      clientCompany: form.toCompany,
      data: { form, items, signature }
    };
    if (form.id) {
      await updateQuotation(form.id, qData);
    } else {
      const newId = await saveQuotation(qData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    alert('Quotation saved to storage successfully!');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) || calcAmount(item) || 0), 0);

  // Dynamic line-weight aware pagination partitioning for Quotations
  const paginateQuotationItems = (allItems) => {
    if (!allItems || allItems.length === 0) return [[]];

    const getItemWeight = (item) => {
      if (!item) return 1;
      const desc = item.description || '';
      const lines = desc.split('\n').filter(Boolean).length || 1;
      const charLines = Math.ceil(desc.length / 42) || 1;
      return Math.max(1, Math.max(lines, charLines));
    };

    const totalWeight = allItems.reduce((sum, item) => sum + getItemWeight(item), 0);

    // If total weight fits on single page with full header and full footer
    if (totalWeight <= 7 && allItems.length <= 6) {
      return [allItems];
    }

    const pages = [];
    let currentIndex = 0;

    while (currentIndex < allItems.length) {
      const isFirst = pages.length === 0;
      const remainingItems = allItems.slice(currentIndex);
      const remainingWeight = remainingItems.reduce((sum, item) => sum + getItemWeight(item), 0);

      // Check if all remaining items can fit on the last page with footer
      if (!isFirst && remainingWeight <= 8) {
        pages.push(remainingItems);
        break;
      }

      const maxWeightForThisPage = isFirst ? 12 : 16;
      let pageItems = [];
      let currentWeight = 0;

      for (let i = currentIndex; i < allItems.length; i++) {
        const item = allItems[i];
        const w = getItemWeight(item);

        // If adding this item exceeds page weight and we already have at least 1 item
        if (pageItems.length > 0 && (currentWeight + w > maxWeightForThisPage)) {
          break;
        }

        // Also avoid leaving only 1 tiny item on the subsequent last page
        const afterThisRemainingWeight = allItems.slice(i + 1).reduce((s, it) => s + getItemWeight(it), 0);
        if (pageItems.length >= 3 && afterThisRemainingWeight > 0 && afterThisRemainingWeight <= 2) {
          break;
        }

        pageItems.push(item);
        currentWeight += w;
      }

      pages.push(pageItems);
      currentIndex += pageItems.length;
    }

    return pages;
  };

  return (
    <>
      <div className="page-header">
        <h1>Quotation</h1>
        <p>Create and export quotations for your clients</p>
      </div>
      <div className="page-body">
        <div className={`tab-bar ${activeTab === 'storage' ? 'storage-active' : ''}`}>
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Details</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        </div>

        <div className="doc-preview-wrapper" style={{ display: activeTab === 'storage' ? 'none' : undefined }}>
          {/* === FORM PANEL === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'form' ? 'block' : 'none' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Document Options</div>
              <div className="form-group mb-0">
                <label>Document Name (For Storage)</label>
                <input className="form-control" placeholder="E.g. XYZ Corp Quotation"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Recipient Details</div>
              <div className="form-group">
                <label>Person in Charge (Optional)</label>
                <input className="form-control" placeholder="e.g. Mr. John Doe"
                  value={form.personInCharge} onChange={e => setForm({ ...form, personInCharge: e.target.value })} />
              </div>
              <div className="form-group autocomplete-wrapper">
                <label>To (Company Name)</label>
                <input 
                  className="form-control" 
                  placeholder="Client company name"
                  value={form.toCompany} 
                  onChange={e => handleCompanySearch(e.target.value)}
                  onFocus={() => form.toCompany.length >= 2 && handleCompanySearch(form.toCompany)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map(c => (
                      <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                        <div className="company-name">{c.companyName || c.company_name}</div>
                        <div className="gstin-text">{c.gstin ? `${c.gstin} | ` : ''}{c.address}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" placeholder="Client full address" rows={3}
                  value={form.toAddress} onChange={e => setForm({ ...form, toAddress: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <CustomDateInput className="form-control" value={form.date} onChange={val => setForm({ ...form, date: val })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Quotation Content</div>
              <div className="form-group">
                <label>Introduction Text</label>
                <input className="form-control" placeholder="We submit our lowest quotation for..."
                  value={form.introText} onChange={e => setForm({ ...form, introText: e.target.value })} />
              </div>

              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Items</label>
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                      <th>Description</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '120px' }}>Rate</th>
                      <th style={{ width: '140px' }}>Amount (Rs.)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td>
                          <textarea className="form-control" placeholder="Description" rows={2}
                            value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0" style={{ textAlign: 'center' }}
                            value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0.00"
                            value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0.00"
                            value={item.price || (item.quantity && item.rate ? calcAmount(item) : '')}
                            onChange={e => updateItem(i, 'price', e.target.value)} />
                        </td>
                        <td>
                          <button className="btn-icon" onClick={() => removeItem(i)} title="Remove">
                            <Trash2 size={14} />
                          </button>
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
              <div className="card-title">Notes</div>
              {form.notes.map((note, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input className="form-control" value={note}
                    onChange={e => updateNote(i, e.target.value)} placeholder="Note..." />
                  <button className="btn-icon" onClick={() => removeNote(i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button className="btn btn-sm btn-secondary" onClick={addNote}>
                <Plus size={14} /> Add Note
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Terms & Conditions</div>
              <div className="form-group mb-0">
                <textarea className="form-control" rows={3} placeholder="Add terms and conditions..."
                  value={form.termsAndConditions} onChange={e => setForm({ ...form, termsAndConditions: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Payment Information (Optional)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  id="showPaymentInfo"
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                  checked={form.showPaymentInfo || false}
                  onChange={e => setForm({ ...form, showPaymentInfo: e.target.checked })}
                />
                <label htmlFor="showPaymentInfo" style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, margin: 0 }}>
                  Include bank / payment details in the quotation
                </label>
              </div>
              {form.showPaymentInfo && (
                <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Preview — details pulled from company profile:</div>
                  <div>Account Name: <strong>{companyProfile.bankName || '—'}</strong></div>
                  <div>Account No: <strong>{companyProfile.bankAccount || '—'}</strong></div>
                  <div>IFSC: <strong>{companyProfile.bankIFSC || '—'}</strong></div>
                  <div>Branch: <strong>{companyProfile.bankBranch || '—'}</strong></div>
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>To update these details, go to Settings → Bank Information.</div>
                </div>
              )}
            </div>

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW PANEL === */}
          <div className="doc-preview-panel" style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
            <div className="doc-preview-container">
              <div ref={previewRef} className="print-capture-wrap">
                {(() => {
                  const pages = paginateQuotationItems(items);
                  const totalPages = pages.length;
                  let globalItemIndex = 0;
                  
                  return pages.map((pageItems, pageIndex) => {
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === totalPages - 1;
                    const pageStartOffset = globalItemIndex;
                    globalItemIndex += pageItems.length;

                    return (
                      <div key={pageIndex} className="doc-preview">
                        <div className="doc-preview-inner">
                          {/* Header - Always on every page */}
                          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                            <div className="doc-header">
                              <img src="/logo.png" alt="Logo" className="logo-img" />
                              <span className="company-title" style={{ fontSize: '1.5rem' }}>{companyProfile.name}</span>
                            </div>
                            <div className="doc-subheader">{companyProfile.tagline}</div>
                            <div className="doc-company-contacts">
                              Email: {companyProfile.email} &nbsp;&nbsp; mobile: {companyProfile.mobile}
                            </div>
                            <div className="doc-company-contacts">
                              GST NUMBER: {companyProfile.gstin} &nbsp;&nbsp;&nbsp;&nbsp; Website: {companyProfile.website}
                            </div>
                          </div>

                          <div style={{ height: '2px', background: '#c8952e', margin: '8px 0', width: '100%' }}></div>

                          {/* QUOTATION title */}
                          <div className="invoice-title" style={{ margin: '10px 0', fontSize: '1.15rem' }}>
                            QUOTATION {totalPages > 1 && `(Page ${pageIndex + 1} of ${totalPages})`}
                          </div>

                          {/* To & Date - FULL ON FIRST PAGE */}
                          {isFirstPage && (
                            <>
                              <div className="quote-to-section" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>TO:</div>
                                  <div style={{ paddingLeft: '20px', fontSize: '0.85rem' }}>
                                    {form.personInCharge && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{form.personInCharge}</div>}
                                    <strong>{form.toCompany || '_______________'}</strong>
                                    <br />
                                    {(form.toAddress || '').split('\n').map((line, i) => (
                                      <span key={i}>{line}<br /></span>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                                  <strong>Date: {formatDate(form.date)}</strong>
                                </div>
                              </div>
                              <hr className="doc-divider-thin" />
                              {/* Intro */}
                              {form.introText && (
                                <div className="quote-intro" style={{ fontSize: '0.85rem', fontStyle: 'italic', margin: '6px 0 10px 0' }}>
                                  {form.introText}
                                </div>
                              )}
                            </>
                          )}

                          {/* Subsequent pages compact reference banner */}
                          {!isFirstPage && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              fontSize: '0.82rem', 
                              color: '#333', 
                              marginBottom: '8px', 
                              padding: '5px 10px', 
                              background: '#f9f9f9', 
                              border: '1px solid #ddd', 
                              borderRadius: '4px' 
                            }}>
                              <div><strong>TO:</strong> {form.toCompany || '—'} {form.personInCharge ? `(Attn: ${form.personInCharge})` : ''}</div>
                              <div><strong>Date:</strong> {formatDate(form.date)}</div>
                            </div>
                          )}

                          {/* Items Table - Sliced for current page */}
                          <table className="doc-table" style={{ tableLayout: 'fixed', width: '100%', marginTop: isFirstPage ? '8px' : '4px' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                                <th>Description</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Rate</th>
                                <th style={{ width: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageItems.map((item, i) => {
                                const amount = item.price || calcAmount(item);
                                return (
                                  <tr key={i}>
                                    <td style={{ textAlign: 'center' }}>{pageStartOffset + i + 1}</td>
                                    <td>{item.description || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity || '—'}</td>
                                    <td className="amount-col" style={{ padding: '8px 10px', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                                      {item.rate ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                          <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>Rs.</span>
                                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(item.rate)}</span>
                                        </div>
                                      ) : '—'}
                                    </td>
                                    <td className="amount-col" style={{ padding: '8px 10px', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                                      {amount ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                                          <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>Rs.</span>
                                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(amount)}</span>
                                        </div>
                                      ) : '—'}
                                    </td>
                                  </tr>
                                );
                              })}

                            </tbody>
                          </table>

                          {/* Footer Sections - ONLY ON LAST PAGE */}
                          {isLastPage && (
                            <>
                              <hr className="doc-divider-thin" />

                              {/* Notes */}
                              {form.notes.length > 0 && (
                                <div className="quote-note">
                                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '3px' }}>NOTE:</h4>
                                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem' }}>
                                    {form.notes.filter(n => n).map((n, i) => (
                                      <li key={i} style={{ fontWeight: 600 }}>{n}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Terms and Conditions */}
                              {form.termsAndConditions && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '6px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '3px', textDecoration: 'underline' }}>TERMS & CONDITIONS:</div>
                                  <div style={{ fontSize: '0.75rem', color: '#444', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                    {form.termsAndConditions}
                                  </div>
                                </div>
                              )}

                              {/* Payment / Bank Info (Optional) */}
                              {form.showPaymentInfo && (companyProfile.bankAccount || companyProfile.bankName) && (
                                <div style={{ marginTop: '12px', borderTop: '2px solid #c8952e', paddingTop: '8px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', color: '#c8952e', letterSpacing: '0.5px' }}>PAYMENT INFORMATION:</div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <tbody>
                                      {companyProfile.bankName && (
                                        <tr>
                                          <td style={{ padding: '2px 8px 2px 0', fontWeight: 600, color: '#555', width: '38%' }}>Account Name</td>
                                          <td style={{ padding: '2px 0', color: '#222' }}>: {companyProfile.bankName}</td>
                                        </tr>
                                      )}
                                      {companyProfile.bankAccount && (
                                        <tr>
                                          <td style={{ padding: '2px 8px 2px 0', fontWeight: 600, color: '#555' }}>Account Number</td>
                                          <td style={{ padding: '2px 0', color: '#222', fontWeight: 700, letterSpacing: '1px' }}>: {companyProfile.bankAccount}</td>
                                        </tr>
                                      )}
                                      {companyProfile.bankIFSC && (
                                        <tr>
                                          <td style={{ padding: '2px 8px 2px 0', fontWeight: 600, color: '#555' }}>IFSC Code</td>
                                          <td style={{ padding: '2px 0', color: '#222' }}>: {companyProfile.bankIFSC}</td>
                                        </tr>
                                      )}
                                      {companyProfile.bankBranch && (
                                        <tr>
                                          <td style={{ padding: '2px 8px 2px 0', fontWeight: 600, color: '#555' }}>Branch</td>
                                          <td style={{ padding: '2px 0', color: '#222' }}>: {companyProfile.bankBranch}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              <hr className="doc-divider-thin" />

                              {/* Closing */}
                              <div className="quote-closing" style={{ fontSize: '0.82rem', fontStyle: 'italic', margin: '8px 0' }}>
                                Kindly Consider our lowest Quotation for your valuable work
                              </div>

                              {/* Regards & Signature */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '14px' }}>
                                <div className="quote-regards">
                                  <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '0.85rem' }}>Thank you &amp; Regards</h4>
                                  <p style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.82rem' }}>{companyProfile.owner}</p>
                                  <p style={{ fontWeight: 700, fontSize: '0.82rem' }}>{companyProfile.name}</p>
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
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <ExportButtons targetRef={previewRef} filename={form.docName || "Quotation"} onExport={handleExport} onSaveOnly={handleSaveOnly} />
          </div>

          {/* === STORAGE === */}
          {activeTab === 'storage' && (
            <div className="doc-storage-panel fade-in">
              <div className="card">
                <div className="card-title">Saved Quotations</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Doc Name</th>
                        <th>Client</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedQuotations.map(q => (
                        <tr key={q.id}>
                          <td>{formatDate(q.date)}</td>
                          <td><strong>{q.docName}</strong></td>
                          <td>{q.toCompany || q.clientCompany}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => loadQuotation(q)}>Edit / View</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id)}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {savedQuotations.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>No saved quotations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Control Styles */}
        <style>{`
        `}</style>
      </div>
    </>
  );
}
