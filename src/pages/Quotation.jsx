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
  });

  const [items, setItems] = useState([
    { description: '', price: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const addItem = () => setItems([...items, { description: '', price: '' }]);

  const removeItem = (i) => {
    if (items.length > 1) setItems(items.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
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
      fetchSaved();
      
      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ ...f, termsAndConditions: '' }));
    };
    init();
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

              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Items</label>
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>S.No</th>
                      <th>Description</th>
                      <th style={{ width: '140px' }}>Price (Rs.)</th>
                      <th style={{ width: '50px' }}></th>
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
                          <input className="form-control" type="number" placeholder="0.00"
                            value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} />
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
                                <th style={{ width: '50px' }}>S.No</th>
                                <th>Description</th>
                                <th style={{ width: '160px', textAlign: 'right' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageItems.map((item, i) => (
                                <tr key={i}>
                                  <td>{pageIndex * itemsPerPage + i + 1}</td>
                                  <td>{item.description || '—'}</td>
                                  <td className="amount-col" style={{ boxSizing: 'border-box' }}>
                                    {item.price ? (
                                      <>
                                        <span style={{ float: 'left' }}>Rs.</span>
                                        <span style={{ float: 'right' }}>{formatCurrency(item.price)}</span>
                                        <div style={{ clear: 'both' }} />
                                      </>
                                    ) : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Footer Sections - ONLY ON LAST PAGE */}
                          {isLastPage && (
                            <>
                              <hr className="doc-divider-thin" />

                              {/* Notes */}
                              {form.notes.length > 0 && (
                                <div className="quote-note">
                                  <h4>NOTE:</h4>
                                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                    {form.notes.filter(n => n).map((n, i) => (
                                      <li key={i} style={{ fontWeight: 600 }}>{n}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Terms and Conditions */}
                              {form.termsAndConditions && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px', textDecoration: 'underline' }}>TERMS & CONDITIONS:</div>
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
