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

  const defaultForm = {
    docName: '',
    personInCharge: '',
    toCompany: '',
    toAddress: '',
    date: new Date().toISOString().split('T')[0],
    introText: 'We submit our lowest quotation for 3 ton Forklift for shift basis.',
    notes: ['GST 18% EXTRA.', 'Work will be initiated once PO Received.'],
    showQtyCol: true,
    showRateCol: true,
    showPaymentInfo: true,
    bankName: COMPANY.bankName,
    bankAccount: COMPANY.bankAccount,
    bankIFSC: COMPANY.bankIFSC,
    bankBranch: COMPANY.bankBranch,
    showTerms: false,
    termsAndConditions: '',
  };

  const [form, setForm] = useState(defaultForm);

  const [items, setItems] = useState([
    { description: '', quantity: '', rate: '', price: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

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
    if (item.price !== undefined && item.price !== '' && item.price !== null) {
      const p = parseFloat(item.price);
      if (!isNaN(p)) return p;
    }
    const rate = parseFloat(item.rate);
    const qty = parseFloat(item.quantity);
    if (!isNaN(rate) && !isNaN(qty)) return rate * qty;
    if (!isNaN(rate) && isNaN(qty)) return rate;
    return '';
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
    setSavedQuotations(data.reverse());
  };

  const extractQuotationForm = (q, profile) => {
    const defaultObj = {
      ...defaultForm,
      bankName: profile?.bankName || COMPANY.bankName,
      bankAccount: profile?.bankAccount || COMPANY.bankAccount,
      bankIFSC: profile?.bankIFSC || COMPANY.bankIFSC,
      bankBranch: profile?.bankBranch || COMPANY.bankBranch,
    };
    if (!q) return defaultObj;

    const dataForm = q.data?.form || (q.data && !Array.isArray(q.data) && !q.data.items ? q.data : null);

    return {
      ...defaultObj,
      toCompany: q.clientCompany || q.toCompany || dataForm?.toCompany || dataForm?.clientCompany || '',
      toAddress: q.clientAddress || q.toAddress || dataForm?.toAddress || dataForm?.clientAddress || '',
      personInCharge: q.personInCharge || dataForm?.personInCharge || '',
      docName: q.docName || dataForm?.docName || '',
      date: q.date || dataForm?.date || defaultObj.date,
      introText: dataForm?.introText !== undefined ? dataForm.introText : (q.introText || defaultObj.introText),
      notes: dataForm?.notes || q.notes || defaultObj.notes,
      showQtyCol: dataForm?.showQtyCol !== undefined ? Boolean(dataForm.showQtyCol) : (q.showQtyCol !== undefined ? Boolean(q.showQtyCol) : true),
      showRateCol: dataForm?.showRateCol !== undefined ? Boolean(dataForm.showRateCol) : (q.showRateCol !== undefined ? Boolean(q.showRateCol) : true),
      showPaymentInfo: dataForm?.showPaymentInfo !== undefined ? Boolean(dataForm.showPaymentInfo) : (q.showPaymentInfo !== undefined ? Boolean(q.showPaymentInfo) : true),
      bankName: dataForm?.bankName || q.bankName || defaultObj.bankName,
      bankAccount: dataForm?.bankAccount || q.bankAccount || defaultObj.bankAccount,
      bankIFSC: dataForm?.bankIFSC || q.bankIFSC || defaultObj.bankIFSC,
      bankBranch: dataForm?.bankBranch || q.bankBranch || defaultObj.bankBranch,
      showTerms: dataForm?.showTerms !== undefined ? Boolean(dataForm.showTerms) : (q.showTerms !== undefined ? Boolean(q.showTerms) : Boolean(dataForm?.termsAndConditions || q.termsAndConditions)),
      termsAndConditions: dataForm?.termsAndConditions !== undefined ? dataForm.termsAndConditions : (q.termsAndConditions !== undefined ? q.termsAndConditions : ''),
      ...(dataForm || {}),
      id: q.id || (dataForm && dataForm.id),
    };
  };

  const extractQuotationItems = (q) => {
    if (!q) return [{ description: '', quantity: '', rate: '', price: '' }];
    if (Array.isArray(q.data?.items) && q.data.items.length > 0) return q.data.items;
    if (Array.isArray(q.items) && q.items.length > 0) return q.items;
    if (Array.isArray(q.data) && q.data.length > 0) return q.data;
    if (q.grandTotal || q.amount) {
      const amt = q.grandTotal || q.amount || 0;
      return [{ description: q.docName || q.clientCompany || 'Services', quantity: 1, rate: amt, price: amt }];
    }
    return [{ description: '', quantity: '', rate: '', price: '' }];
  };

  const applyLoadedQuotation = (q, profile) => {
    const parsedForm = extractQuotationForm(q, profile);
    const parsedItems = extractQuotationItems(q);
    const parsedSig = q?.data?.signature || q?.signature || null;
    
    setForm(parsedForm);
    setItems(parsedItems);
    if (parsedSig) setSignature(parsedSig);
    setActiveTab('preview');
  };

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const profile = await getCompanyProfile();
      if (profile) setCompanyProfile(profile);

      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        applyLoadedQuotation(itemToLoad, profile || COMPANY);
        return;
      }

      fetchSaved();
      setForm(f => ({
        ...f,
        bankName: profile?.bankName || COMPANY.bankName,
        bankAccount: profile?.bankAccount || COMPANY.bankAccount,
        bankIFSC: profile?.bankIFSC || COMPANY.bankIFSC,
        bankBranch: profile?.bankBranch || COMPANY.bankBranch,
      }));
    };
    init();
  }, [location.state, exportItem]);

  const loadQuotation = (q) => {
    applyLoadedQuotation(q, companyProfile);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation from storage?')) {
      await deleteQuotation(id);
      await fetchSaved();
    }
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
              <div className="form-group">
                <label>To (Company Name)</label>
                <input className="form-control" placeholder="Client company name"
                  value={form.toCompany} onChange={e => setForm({ ...form, toCompany: e.target.value })} />
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

              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.showQtyCol} onChange={e => setForm({ ...form, showQtyCol: e.target.checked })} />
                  <span>Show Quantity Column in Preview</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.showRateCol} onChange={e => setForm({ ...form, showRateCol: e.target.checked })} />
                  <span>Show Rate Column in Preview</span>
                </label>
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
                          <input className="form-control" type="number" placeholder="Opt" style={{ textAlign: 'center' }}
                            value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="Opt"
                            value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0.00"
                            value={item.price !== undefined && item.price !== '' ? item.price : calcAmount(item)}
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
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Payment Information (Optional)</span>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.showPaymentInfo}
                    onChange={e => setForm({ ...form, showPaymentInfo: e.target.checked })} />
                  <span>Display Payment Information in Quotation</span>
                </label>
              </div>
              {form.showPaymentInfo && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div className="form-group mb-0">
                    <label>Bank Name</label>
                    <input className="form-control" value={form.bankName}
                      onChange={e => setForm({ ...form, bankName: e.target.value })} />
                  </div>
                  <div className="form-group mb-0">
                    <label>Account Number</label>
                    <input className="form-control" value={form.bankAccount}
                      onChange={e => setForm({ ...form, bankAccount: e.target.value })} />
                  </div>
                  <div className="form-group mb-0">
                    <label>IFSC Code</label>
                    <input className="form-control" value={form.bankIFSC}
                      onChange={e => setForm({ ...form, bankIFSC: e.target.value })} />
                  </div>
                  <div className="form-group mb-0">
                    <label>Branch</label>
                    <input className="form-control" value={form.bankBranch}
                      onChange={e => setForm({ ...form, bankBranch: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Terms &amp; Conditions (Optional)</span>
              </div>
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.showTerms}
                    onChange={e => setForm({ ...form, showTerms: e.target.checked })} />
                  <span>Display Terms &amp; Conditions in Quotation</span>
                </label>
              </div>
              {form.showTerms && (
                <div className="form-group mb-0" style={{ marginTop: '8px' }}>
                  <textarea className="form-control" rows={3} placeholder="Add terms and conditions..."
                    value={form.termsAndConditions} onChange={e => setForm({ ...form, termsAndConditions: e.target.value })} />
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
                  const itemsPerPage = 15;
                  const totalPages = Math.ceil(Math.max(1, items.length) / itemsPerPage);
                  const hasQty = items.some(item => item.quantity && item.quantity.toString().trim() !== '');
                  const hasRate = items.some(item => item.rate && item.rate.toString().trim() !== '');
                  const displayQty = form.showQtyCol && hasQty;
                  const displayRate = form.showRateCol && hasRate;
                  
                  return Array.from({ length: totalPages }, (_, pageIndex) => {
                    const pageItems = items.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === totalPages - 1;

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

                          <hr className="doc-divider" />

                          {/* QUOTATION title */}
                          <div className="invoice-title">
                            QUOTATION {totalPages > 1 && `(Page ${pageIndex + 1})`}
                          </div>

                          {/* To & Date - ONLY ON FIRST PAGE */}
                          {isFirstPage && (
                            <>
                              <div className="quote-to-section">
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>TO:</div>
                                  <div style={{ paddingLeft: '20px', fontSize: '0.82rem' }}>
                                    {form.personInCharge && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{form.personInCharge}</div>}
                                    <strong>{form.toCompany || '_______________'}</strong>
                                    <br />
                                    {(form.toAddress || '').split('\n').map((line, i) => (
                                      <span key={i}>{line}<br /></span>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.82rem' }}>
                                  <strong>Date: {formatDate(form.date)}</strong>
                                </div>
                              </div>
                              <hr className="doc-divider-thin" />
                              {/* Intro */}
                              {form.introText && (
                                <div className="quote-intro">{form.introText}</div>
                              )}
                            </>
                          )}

                          {/* Items Table - Sliced for current page */}
                          <table className="doc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                                <th>Description</th>
                                {displayQty && <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>}
                                {displayRate && <th style={{ width: '100px', textAlign: 'right' }}>Rate</th>}
                                <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageItems.map((item, i) => {
                                const amount = item.price || calcAmount(item);
                                return (
                                  <tr key={i}>
                                    <td style={{ textAlign: 'center' }}>{pageIndex * itemsPerPage + i + 1}</td>
                                    <td>{item.description || ''}</td>
                                    {displayQty && <td style={{ textAlign: 'center' }}>{item.quantity || ''}</td>}
                                    {displayRate && (
                                      <td className="amount-col" style={{ padding: '8px', boxSizing: 'border-box' }}>
                                        {item.rate ? (
                                          <>
                                            <span style={{ float: 'left' }}>Rs.</span>
                                            <span style={{ float: 'right' }}>{formatCurrency(item.rate)}</span>
                                            <div style={{ clear: 'both' }} />
                                          </>
                                        ) : ''}
                                      </td>
                                    )}
                                    <td className="amount-col" style={{ padding: '8px', boxSizing: 'border-box' }}>
                                      {amount ? (
                                        <>
                                          <span style={{ float: 'left' }}>Rs.</span>
                                          <span style={{ float: 'right' }}>{formatCurrency(amount)}</span>
                                          <div style={{ clear: 'both' }} />
                                        </>
                                      ) : ''}
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
                              {form.notes && form.notes.filter(n => n).length > 0 && (
                                <div className="quote-note">
                                  <h4>NOTE:</h4>
                                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                    {form.notes.filter(n => n).map((n, i) => (
                                      <li key={i} style={{ fontWeight: 600 }}>{n}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Payment Information - Positioned below Notes */}
                              {form.showPaymentInfo && (
                                <div style={{ marginTop: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b', marginBottom: '6px', textDecoration: 'underline' }}>
                                    PAYMENT INFORMATION:
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.78rem', color: '#334155' }}>
                                    <div><strong>Bank Name:</strong> {form.bankName || companyProfile.bankName}</div>
                                    <div><strong>Account No:</strong> {form.bankAccount || companyProfile.bankAccount}</div>
                                    <div><strong>IFSC Code:</strong> {form.bankIFSC || companyProfile.bankIFSC}</div>
                                    <div><strong>Branch:</strong> {form.bankBranch || companyProfile.bankBranch}</div>
                                  </div>
                                </div>
                              )}

                              {/* Terms and Conditions - Positioned below Payment Information */}
                              {form.showTerms && form.termsAndConditions && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px', textDecoration: 'underline' }}>TERMS &amp; CONDITIONS:</div>
                                  <div style={{ fontSize: '0.75rem', color: '#444', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                    {form.termsAndConditions}
                                  </div>
                                </div>
                              )}

                              <hr className="doc-divider-thin" />

                              {/* Closing */}
                              <div className="quote-closing">
                                Kindly Consider our lowest Quotation for your valuable work
                              </div>

                              {/* Regards & Signature */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
                                <div className="quote-regards">
                                  <h4 style={{ color: '#c8952e', fontWeight: 700 }}>Thank you &amp; Regards</h4>
                                  <p style={{ marginTop: '6px', fontWeight: 600 }}>{companyProfile.owner}</p>
                                  <p style={{ fontWeight: 700 }}>{companyProfile.name}</p>
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
