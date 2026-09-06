import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { 
  COMPANY, 
  getCompanyProfile, 
  getNextProformaInvoiceNumber, 
  initSettings, 
  saveProformaInvoice, 
  deleteProformaInvoice, 
  updateProformaInvoice, 
  db 
} from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function ProformaInvoice({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedProformas, setSavedProformas] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    docName: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    clientCompany: '',
    clientAddress: '',
    showParty: false,
    configs: [{
      tonType: '3 Ton',
      unitType: 'shifts',
      items: [{ date: '', party: '', description: '', timesheetNo: '', quantity: '', rate: '' }]
    }],
    termsAndConditions: '',
  });

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const fetchSaved = async () => {
    const data = await db.proformaInvoices.toArray();
    setSavedProformas(data.reverse());
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        const pf = itemToLoad;
        const loadedForm = pf.data?.form || {};
        const hasPartyInItems = loadedForm.configs?.some(c => c.items?.some(i => i.party && i.party.trim().length > 0));
        setForm({
          ...loadedForm,
          id: pf.id,
          showParty: loadedForm.showParty !== undefined ? loadedForm.showParty : (hasPartyInItems || false)
        });
        if (pf.data?.signature) setSignature(pf.data.signature);
        setActiveTab('preview');
        
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      const allCust = await db.customers.toArray();
      setCustomers(allCust);
      await fetchSaved();

      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ ...f, termsAndConditions: '' }));
    };
    init();

    const handleSyncComplete = async () => {
      await fetchSaved();
      const allCust = await db.customers.toArray();
      setCustomers(allCust);
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sync-complete', handleSyncComplete);
  }, [location.state, exportItem]);

  const loadProforma = (pf) => {
    const loadedForm = pf.data?.form || {};
    const hasPartyInItems = loadedForm.configs?.some(c => c.items?.some(i => i.party && i.party.trim().length > 0));
    setForm({
      ...loadedForm,
      id: pf.id,
      showParty: loadedForm.showParty !== undefined ? loadedForm.showParty : (hasPartyInItems || false)
    });
    if (pf.data?.signature) setSignature(pf.data.signature);
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this proforma invoice from storage?')) {
      await deleteProformaInvoice(id);
      await fetchSaved();
    }
  };

  const handleCompanySearch = async (val) => {
    setForm(f => ({ ...f, clientCompany: val }));
    
    if (val.trim().length >= 1) {
      const nextNum = await getNextProformaInvoiceNumber(val);
      setForm(f => ({ ...f, clientCompany: val, invoiceNo: nextNum }));
    }

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

  const selectCustomer = async (customer) => {
    const compName = customer.companyName || customer.company_name || '';
    const nextNum = await getNextProformaInvoiceNumber(compName);
    setForm(f => ({
      ...f,
      clientCompany: compName,
      clientAddress: customer.address || '',
      invoiceNo: nextNum
    }));
    setShowSuggestions(false);
  };

  const addItem = (cfgIndex) => {
    const newConfigs = [...form.configs];
    newConfigs[cfgIndex].items.push({ date: '', party: '', description: '', timesheetNo: '', quantity: '', rate: '' });
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

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveOnly = async () => {
    const invoiceData = {
      invoiceNo: form.invoiceNo,
      docName: form.docName || `Proforma ${form.invoiceNo || form.clientCompany}`,
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
      docName: form.docName || `Proforma ${form.invoiceNo || form.clientCompany}`,
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
    
    // Auto-increment the proforma invoice number for this company prefix
    const nextNum = await getNextProformaInvoiceNumber(form.clientCompany);
    setForm(f => ({ ...f, invoiceNo: nextNum, id: undefined }));
    alert('Proforma invoice saved successfully!');
  };

  // Helper for dynamic page capacity partitioning
  const paginateProformaRows = (printRows) => {
    const total = printRows.length;
    if (total <= 16) {
      return [printRows];
    }
    
    const pages = [];
    let offset = 0;
    
    while (offset < total) {
      const isFirst = pages.length === 0;
      const remaining = total - offset;
      
      if (isFirst) {
        // Page 1 takes up to 18 items with full TO header
        const take = Math.min(18, remaining);
        pages.push(printRows.slice(offset, offset + take));
        offset += take;
      } else {
        // If remaining items fit comfortably on the last page with footer (<= 16 items)
        if (remaining <= 16) {
          pages.push(printRows.slice(offset));
          offset = total;
        } else {
          // Middle page: take up to 22, but make sure at least 2 items remain for the final page
          const take = Math.min(remaining - 2, 22);
          pages.push(printRows.slice(offset, offset + take));
          offset += take;
        }
      }
    }
    return pages;
  };

  return (
    <>
      <div className="page-header">
        <h1>Proforma Invoice</h1>
        <p>Create ton-based proforma invoices for your clients</p>
      </div>
      <div className="page-body">
        <div className={`tab-bar ${activeTab === 'storage' ? 'storage-active' : ''}`}>
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Details</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        </div>

        <div className="doc-preview-wrapper" style={{ display: activeTab === 'storage' ? 'none' : undefined }}>
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'form' ? 'block' : 'none' }}>
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
              <div className="form-group autocomplete-wrapper">
                <label>To (Company Name)</label>
                <input 
                  className="form-control" 
                  placeholder="Client company name (e.g. Kotec, Fuso...)"
                  value={form.clientCompany} 
                  onChange={e => handleCompanySearch(e.target.value)}
                  onFocus={() => form.clientCompany.length >= 2 && handleCompanySearch(form.clientCompany)}
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
                <textarea className="form-control" placeholder="Client address" rows={2}
                  value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} />
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Date</label>
                  <CustomDateInput className="form-control" value={form.date} onChange={val => setForm({ ...form, date: val })} />
                </div>
                <div className="form-group">
                  <label>Invoice No. (Auto-allocated per company)</label>
                  <input className="form-control" placeholder="e.g. K001, F001..."
                    value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div className="card-title" style={{ margin: 0 }}>Invoice Configuration &amp; Items</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-input)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Display in Preview:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <input 
                      type="checkbox" 
                      checked={!!form.showParty} 
                      onChange={e => setForm({ ...form, showParty: e.target.checked })} 
                      style={{ accentColor: 'var(--accent-gold)' }} 
                    />
                    Party Column
                  </label>
                </div>
              </div>

              {/* Datalist for party autocompletion / suggestions */}
              <datalist id="customerPartyList">
                {customers.map(c => (
                  <option key={c.id} value={c.companyName || c.company_name} />
                ))}
              </datalist>

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
                          <th style={{ width: '130px' }}>Party</th>
                          <th>Description</th>
                          <th style={{ width: '110px' }}>Timesheet No</th>
                          <th style={{ width: '90px' }}>{config.unitType === 'shifts' ? 'Shifts' : 'Hours'}</th>
                          <th style={{ width: '130px' }}>Rate</th>
                          <th style={{ width: '100px' }}>Amount</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.items.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td>{itemIdx + 1}</td>
                            <td>
                              <CustomDateInput className="form-control" value={item.date} onChange={val => updateItem(cfgIdx, itemIdx, 'date', val)} />
                            </td>
                            <td>
                              <input 
                                className="form-control" 
                                placeholder="Party (Optional)" 
                                list="customerPartyList"
                                value={item.party || ''} 
                                onChange={e => updateItem(cfgIdx, itemIdx, 'party', e.target.value)} 
                              />
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
                      items: [{ date: '', party: '', description: '', timesheetNo: '', quantity: '', rate: '' }] 
                    }] 
                  });
                }}>
                  <Plus size={14} /> Add Configuration Block
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
            <div className="doc-preview-container">
              <div ref={previewRef} className="print-capture-wrap">
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

                  const paginatedPages = paginateProformaRows(printRows);
                  const PAGES = paginatedPages.length;
                  const showParty = !!form.showParty;
                  const colCount = showParty ? 8 : 7;
                  const totalLabelColSpan = colCount - 1;
                  
                  return paginatedPages.map((pageRows, pageIndex) => {
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === PAGES - 1;
                    
                    return (
                      <div key={pageIndex} className="doc-preview" style={{ marginBottom: pageIndex < PAGES - 1 ? '20px' : '0' }}>
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

                          <div className="invoice-title" style={{ margin: '10px 0', fontSize: '1.15rem' }}>
                            PROFORMA INVOICE {PAGES > 1 && `(Page ${pageIndex + 1} of ${PAGES})`}
                          </div>

                          {/* Client details & Date - FULL ON FIRST PAGE */}
                          {isFirstPage && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>TO:</div>
                                <div style={{ paddingLeft: '20px', fontSize: '0.85rem' }}>
                                  <strong>{form.clientCompany || '_______________'}</strong>
                                  {form.clientAddress && (
                                    <div style={{ fontSize: '0.8rem', color: '#555', whiteSpace: 'pre-line', marginTop: '4px' }}>{form.clientAddress}</div>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                                <strong>Date: {formatDate(form.date)}</strong><br />
                                <strong style={{ display: 'inline-block', marginTop: '6px' }}>Invoice No: {form.invoiceNo}</strong>
                              </div>
                            </div>
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
                              <div><strong>TO:</strong> {form.clientCompany || '—'}</div>
                              <div><strong>Invoice No:</strong> {form.invoiceNo} &nbsp;|&nbsp; <strong>Date:</strong> {formatDate(form.date)}</div>
                            </div>
                          )}

                          {/* Table */}
                          <table className="doc-table" style={{ marginTop: isFirstPage ? '8px' : '4px', tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '38px', textAlign: 'center' }}>S.No</th>
                                <th style={{ width: '82px', textAlign: 'center', whiteSpace: 'nowrap' }}>Date</th>
                                {showParty && <th style={{ width: '105px', textAlign: 'left' }}>Party</th>}
                                <th style={{ textAlign: 'left' }}>Description</th>
                                <th style={{ width: '85px', textAlign: 'center' }}>Timesheet No</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>
                                  {(() => {
                                    const hasHours = form.configs?.some(c => c.unitType === 'hours');
                                    const hasShifts = form.configs?.some(c => c.unitType === 'shifts');
                                    if (hasHours && hasShifts) return 'Shift/Hrs';
                                    if (hasHours) return 'Hours';
                                    return 'Shift';
                                  })()}
                                </th>
                                <th style={{ width: '95px', textAlign: 'right' }}>Rate</th>
                                <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageRows.map((row, localIndex) => {
                                if (row.isHeader) {
                                  return (
                                    <tr key={`h-${pageIndex}-${localIndex}`} style={{ background: '#f0f0f0' }}>
                                      <td colSpan={colCount} style={{ textAlign: 'center', fontWeight: 700, padding: '5px', fontSize: '0.85rem' }}>
                                        {row.config.tonType} Proforma Invoice — {row.config.unitType === 'shifts' ? 'Shift' : 'Hour'} Basis
                                      </td>
                                    </tr>
                                  );
                                }
                                
                                const item = row.item;
                                return (
                                  <tr key={`i-${pageIndex}-${localIndex}`}>
                                    <td style={{ textAlign: 'center' }}>{row.sno}</td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
                                    {showParty && <td style={{ textAlign: 'left', wordBreak: 'break-word' }}>{item.party || '—'}</td>}
                                    <td style={{ textAlign: 'left', wordBreak: 'break-word' }}>{item.description || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.timesheetNo || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity || '—'}</td>
                                    <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(item.rate)}</span></div></td>
                                    <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(calcAmount(item))}</span></div></td>
                                  </tr>
                                );
                              })}
                              {isLastPage && (
                                <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                                  <td colSpan={totalLabelColSpan} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                  <td className="amount-col" style={{ fontWeight: 800 }}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(grandTotal)}</span></div></td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {isLastPage && (
                            <>
                              <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                                * For Tax Invoice, applicable GST will be charged additionally.
                              </div>

                              {/* Terms and Conditions */}
                              {form.termsAndConditions && (
                                <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '6px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '3px', textDecoration: 'underline' }}>TERMS & CONDITIONS:</div>
                                  <div style={{ fontSize: '0.75rem', color: '#444', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                    {form.termsAndConditions}
                                  </div>
                                </div>
                              )}

                              {/* Thank you & Regards + Signature */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                                <div>
                                  <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '0.85rem' }}>Thank you &amp; Regards</h4>
                                  <p style={{ fontWeight: 600, fontSize: '0.82rem', marginTop: '4px' }}>{companyProfile.owner}</p>
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
          </div>
          <ExportButtons targetRef={previewRef} filename={form.docName || `Proforma_Invoice_${form.invoiceNo || form.clientCompany || 'draft'}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
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
    </>
  );
}
