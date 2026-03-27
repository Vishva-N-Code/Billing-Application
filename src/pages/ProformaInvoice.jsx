import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getNextInvoiceNumber, updateInvoiceCounter, initSettings, saveInvoice } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';

export default function ProformaInvoice() {
  const previewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('form');

  const [form, setForm] = useState({
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

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextInvoiceNumber();
      setForm(f => ({ ...f, invoiceNo: num }));
    };
    init();
  }, []);

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

  const handleExport = async () => {
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, items: form.configs.flatMap(c => c.items) }
    };
    await saveInvoice(invoiceData);
    
    await updateInvoiceCounter(form.invoiceNo);
    const nextNum = await getNextInvoiceNumber();
    setForm(f => ({ ...f, invoiceNo: nextNum }));
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
        </div>

        <div className="doc-preview-wrapper">
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' ? 'none' : undefined }}>
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
          <div className="doc-preview-panel" style={{ display: activeTab === 'form' ? 'none' : undefined }}>
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

            <ExportButtons targetRef={previewRef} filename={`Proforma_Invoice_${form.clientCompany || 'draft'}`} onExport={handleExport} />
          </div>
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
