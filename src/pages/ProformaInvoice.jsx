import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getNextInvoiceNumber, updateInvoiceCounter, initSettings, saveProformaInvoice, deleteProformaInvoice, db } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';

export default function ProformaInvoice() {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedProformas, setSavedProformas] = useState([]);

  const [form, setForm] = useState({
    docName: '',
    invoiceNo: '',
    clientCompany: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    configs: [{
      tonType: '3 Ton',
      unitType: 'shifts',
      items: [{ date: '', description: '', timesheetNo: '', quantity: '', rate: '' }]
    }]
  });

  const [signature, setSignature] = useState(null);

  const fetchSaved = async () => {
    const data = await db.proformaInvoices.toArray();
    setSavedProformas(data.reverse());
  };

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextInvoiceNumber();
      setForm(f => ({ ...f, invoiceNo: num }));
      await fetchSaved();

      if (location.state?.loadItem) {
        const pf = location.state.loadItem;
        setForm({ ...pf.data.form, id: pf.id });
        if (pf.data.signature) setSignature(pf.data.signature);
        setActiveTab('preview');
      }
    };
    init();
  }, [location.state]);

  const loadProforma = (pf) => {
    setForm({ ...pf.data.form, id: pf.id });
    if (pf.data.signature) setSignature(pf.data.signature);
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this proforma invoice from storage?')) {
      await deleteProformaInvoice(id);
      await fetchSaved();
    }
  };

  const addItem = (cfgIndex) => {
    const newConfigs = [...form.configs];
    newConfigs[cfgIndex].items.push({ date: '', description: '', timesheetNo: '', quantity: '', rate: '' });
    setForm({ ...form, configs: newConfigs });
  };
  const removeItem = (cfgIndex, itemIndex) => {
    const newConfigs = [...form.configs];
    if (newConfigs[cfgIndex].items.length > 1) {
      newConfigs[cfgIndex].items = newConfigs[cfgIndex].items.filter((_, idx) => idx !== itemIndex);
      setForm({ ...form, configs: newConfigs });
    }
  };
  const updateItem = (cfgIndex, itemIndex, field, value) => {
    const newConfigs = [...form.configs];
    const item = newConfigs[cfgIndex].items[itemIndex];
    item[field] = value;
    if (field === 'rate' || field === 'quantity') {
      const rate = parseFloat(item.rate);
      const qty = parseFloat(item.quantity);
      if (!isNaN(rate) && !isNaN(qty)) {
        item.amount = (rate * qty).toString();
      }
    }
    setForm({ ...form, configs: newConfigs });
  };

  const calcAmount = (item) => {
    if (item.amount !== undefined && item.amount !== '') {
      return parseFloat(item.amount) || 0;
    }
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return rate * qty;
  };

  const grandTotal = form.configs?.reduce((sum, cfg) => {
    return sum + cfg.items.reduce((s, item) => s + calcAmount(item), 0);
  }, 0) || 0;

  const hasShifts = form.configs?.some(c => c.unitType === 'shifts');
  const hasHours = form.configs?.some(c => c.unitType === 'hours');
  const unitLabel = (hasShifts && hasHours) ? 'Shifts / Hours' : hasHours ? 'Hours' : 'Shifts';

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveOnly = async () => {
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      docName: form.docName || `Proforma ${form.invoiceNo}`,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, signature, items: form.configs.flatMap(c => c.items) }
    };
    if (form.id) {
      await updateProformaInvoice(form.id, invoiceData);
      alert('Document updated successfully!');
    } else {
      const newId = await saveProformaInvoice(invoiceData);
      setForm(f => ({ ...f, id: newId }));
      alert('Document saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      docName: form.docName || `Proforma ${form.invoiceNo}`,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, signature, items: form.configs.flatMap(c => c.items) }
    };
    if (form.id) {
      await updateProformaInvoice(form.id, invoiceData);
    } else {
      const newId = await saveProformaInvoice(invoiceData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    
    await updateInvoiceCounter(form.invoiceNo);
    const nextNum = await getNextInvoiceNumber();
    setForm(f => ({ ...f, invoiceNo: nextNum, id: undefined }));
    alert('Invoice saved and number auto-incremented based on your entry!');
  };

  return (
    <>
      <div className="page-header">
        <h1>Proforma Invoice</h1>
        <p>Create ton-based proforma invoices for your clients</p>
      </div>
      <div className="page-body fade-in">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Edit Form</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
          <button className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}>Saved Docs</button>
        </div>

        <div className="doc-preview-wrapper" style={{ alignItems: 'flex-start' }}>
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' || activeTab === 'storage' ? 'none' : undefined }}>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Document Options</div>
              <div className="form-group mb-0">
                <label>Document Name (For Storage)</label>
                <input className="form-control" placeholder="E.g. XYZ Corp Initial Estimate"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Client Details</div>
              <div className="form-group">
                <label>To (Company Name)</label>
                <input className="form-control" placeholder="Client company name"
                  value={form.clientCompany} onChange={e => setForm({ ...form, clientCompany: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" placeholder="Client address" rows={2}
                  value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input className="form-control" type="date"
                  value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Invoice No.</label>
                <input className="form-control" placeholder="Invoice Number"
                  value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Invoice Configuration & Items</div>
              {form.configs?.map((config, cfgIdx) => (
                <div key={cfgIdx} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: cfgIdx < form.configs.length - 1 ? '1px dashed #ccc' : 'none' }}>
                  <div className="form-row form-row-2" style={{ marginBottom: '12px', alignItems: 'flex-end', display: 'flex', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Ton Type</label>
                      <input 
                        type="text"
                        list="tonTypes"
                        className="form-control" 
                        value={config.tonType}
                        placeholder="Select or type..."
                        onChange={e => {
                          const newConfigs = [...form.configs];
                          newConfigs[cfgIdx].tonType = e.target.value;
                          setForm({ ...form, configs: newConfigs });
                        }}
                      />
                      <datalist id="tonTypes">
                        <option value="3 Ton" />
                        <option value="5 Ton" />
                        <option value="7 Ton" />
                        <option value="10 Ton" />
                        <option value="12 Ton" />
                        <option value="15 Ton" />
                        <option value="20 Ton" />
                        <option value="25 Ton" />
                        <option value="30 Ton" />
                        <option value="35 Ton" />
                        <option value="40 Ton" />
                        <option value="50 Ton" />
                      </datalist>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Unit Type</label>
                      <select className="form-control" value={config.unitType}
                        onChange={e => {
                          const newConfigs = [...form.configs];
                          newConfigs[cfgIdx].unitType = e.target.value;
                          setForm({ ...form, configs: newConfigs });
                        }}>
                        <option value="shifts">Shifts</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                    {form.configs.length > 1 && (
                      <button className="btn-icon" style={{ marginBottom: '8px' }} onClick={() => {
                        const newConfigs = form.configs.filter((_, i) => i !== cfgIdx);
                        setForm({ ...form, configs: newConfigs });
                      }}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>S.No</th>
                          <th style={{ width: '120px' }}>Date</th>
                          <th>Description</th>
                          <th>Timesheet No</th>
                          <th style={{ width: '80px' }}>{config.unitType === 'shifts' ? 'Shifts' : 'Hours'}</th>
                          <th style={{ width: '100px' }}>Rate</th>
                          <th style={{ width: '100px' }}>Amount</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.items.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td>{itemIdx + 1}</td>
                            <td>
                              <input className="form-control" type="date"
                                value={item.date} onChange={e => updateItem(cfgIdx, itemIdx, 'date', e.target.value)} />
                            </td>
                            <td>
                              <textarea className="form-control" placeholder="Description" rows={2}
                                value={item.description} onChange={e => updateItem(cfgIdx, itemIdx, 'description', e.target.value)} />
                            </td>
                            <td>
                              <textarea className="form-control" placeholder="Optional" rows={2}
                                value={item.timesheetNo} onChange={e => updateItem(cfgIdx, itemIdx, 'timesheetNo', e.target.value)} />
                            </td>
                            <td>
                              <input className="form-control" type="number" placeholder="0"
                                value={item.quantity} onChange={e => updateItem(cfgIdx, itemIdx, 'quantity', e.target.value)} />
                            </td>
                            <td>
                              <input className="form-control" type="number" placeholder="0"
                                value={item.rate} onChange={e => updateItem(cfgIdx, itemIdx, 'rate', e.target.value)} />
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', marginRight: '4px', fontWeight: 600 }}>Rs.</span>
                                <input className="form-control" type="number" placeholder="0"
                                  style={{ minWidth: '80px', flex: 1, fontWeight: 600 }}
                                  value={item.amount !== undefined ? item.amount : calcAmount(item)}
                                  onChange={e => updateItem(cfgIdx, itemIdx, 'amount', e.target.value)} />
                              </div>
                            </td>
                            <td>
                              <button className="btn-icon" onClick={() => removeItem(cfgIdx, itemIdx)}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => addItem(cfgIdx)}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              ))}
              <div style={{ marginTop: '12px', borderTop: '2px solid #ddd', paddingTop: '16px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => {
                  setForm({ 
                    ...form, 
                    configs: [...form.configs, { 
                      tonType: '3 Ton', 
                      unitType: 'shifts', 
                      items: [{ date: '', description: '', timesheetNo: '', quantity: '', rate: '' }] 
                    }] 
                  });
                }}>
                  <Plus size={14} /> Add Configuration Block
                </button>
              </div>
            </div>

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab !== 'preview' ? 'none' : undefined }}>
            <div ref={previewRef}>
              {(() => {
                const printRows = [];
                let globalItemIndex = 0;
                form.configs?.forEach((config) => {
                  printRows.push({ isHeader: true, config });
                  config.items.forEach(item => {
                    globalItemIndex++;
                    printRows.push({ isItem: true, item, config, sno: globalItemIndex });
                  });
                });
                const PAGES = Math.ceil(Math.max(1, printRows.length) / 12);
                
                return Array.from({ length: PAGES }, (_, pageIndex) => {
                  const pageRows = printRows.slice(pageIndex * 12, (pageIndex + 1) * 12);
                  const isLastPage = pageIndex === PAGES - 1;
                  return (
            <div key={pageIndex} className="doc-preview" style={{ width: '794px', maxWidth: '100%', margin: '4px auto', padding: '4px', marginBottom: '20px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', pageBreakAfter: 'always' }}>
              <div className="doc-preview-inner">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <div className="doc-header">
                    <img src="/logo.png" alt="Logo" className="logo-img" />
                    <span className="company-title" style={{ fontSize: '1.5rem' }}>Om Saravana Cranes</span>
                  </div>
                  <div className="doc-subheader">{COMPANY.tagline}</div>
                  <div className="doc-company-contacts">
                    Email: {COMPANY.email} &nbsp;&nbsp; mobile: {COMPANY.mobile}
                  </div>
                  <div className="doc-company-contacts">
                    GST NUMBER: {COMPANY.gstin} &nbsp;&nbsp;&nbsp;&nbsp; Website: {COMPANY.website}
                  </div>
                </div>

                <hr className="doc-divider" />

                <div className="invoice-title">PROFORMA INVOICE</div>

                {/* Client details & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>TO:</div>
                    <div style={{ paddingLeft: '20px', fontSize: '0.85rem' }}>
                      <strong>{form.clientCompany || '_______________'}</strong>
                      {form.clientAddress && (
                        <div style={{ fontSize: '0.8rem', color: '#555', whiteSpace: 'pre-line' }}>{form.clientAddress}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                    <strong>Date: {formatDate(form.date)}</strong><br />
                    <strong style={{ display: 'inline-block', marginTop: '4px' }}>Invoice No: {form.invoiceNo}</strong>
                  </div>
                </div>

                {/* Table */}
                <table className="doc-table" style={{ marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>S.No</th>
                      <th style={{ width: '90px' }}>Date</th>
                      <th>Description</th>
                      <th>Timesheet No</th>
                      <th style={{ width: '70px' }}>Qty</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Rate</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, localIndex) => {
                      if (row.isHeader) {
                        return (
                          <tr key={`h-${pageIndex}-${localIndex}`} style={{ background: '#f0f0f0' }}>
                            <td colSpan={7} style={{ textAlign: 'center', fontWeight: 700, padding: '6px', fontSize: '0.85rem' }}>
                              {row.config.tonType} Proforma Invoice — {row.config.unitType === 'shifts' ? 'Shift' : 'Hour'} Basis
                            </td>
                          </tr>
                        );
                      }
                      
                      const item = row.item;
                      return (
                      <tr key={`i-${pageIndex}-${localIndex}`}>
                        <td>{row.sno}</td>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.description || '—'}</td>
                        <td>{item.timesheetNo || '—'}</td>
                        <td>{item.quantity || '—'}</td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(item.rate)}</span></div></td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(calcAmount(item))}</span></div></td>
                      </tr>
                    )})}
                    {isLastPage && (
                      <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                        <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                        <td className="amount-col" style={{ fontWeight: 800 }}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(grandTotal)}</span></div></td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                  * For Tax Invoice, applicable GST will be charged additionally.
                </div>

                {/* Thank you & Regards + Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px' }}>
                  <div>
                    <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '0.85rem' }}>Thank you &amp; Regards</h4>
                    <p style={{ fontWeight: 600, fontSize: '0.82rem', marginTop: '6px' }}>{COMPANY.owner}</p>
                    <p style={{ fontWeight: 700, fontSize: '0.82rem' }}>{COMPANY.name}</p>
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
              );
              })})()}
            </div>

            <ExportButtons targetRef={previewRef} filename={form.docName || `Proforma_Invoice_${form.clientCompany || 'draft'}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
          </div>

          {/* === STORAGE === */}
          {activeTab === 'storage' && (
            <div className="doc-storage-panel fade-in" style={{ width: '100%', flex: 1 }}>
              <div className="card">
                <div className="card-title">Saved Proforma Invoices</div>
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
                      {savedProformas.map(pf => (
                        <tr key={pf.id}>
                          <td>{formatDate(pf.date)}</td>
                          <td><strong>{pf.docName}</strong></td>
                          <td>{pf.invoiceNo}</td>
                          <td>{pf.clientCompany}</td>
                          <td>₹{formatCurrency(pf.grandTotal)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => loadProforma(pf)}>Edit / View</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pf.id)}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {savedProformas.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No saved proforma invoices found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @media (min-width: 769px) {
            .doc-form-panel, .doc-preview-panel { display: block !important; }
          }
        `}</style>
      </div>
    </>
  );
}
