import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getCompanyProfile, getNextCashBillNumber, updateCashBillCounter, initSettings, saveCashBill, deleteCashBill, updateCashBill, db } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function CashBill({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedCashBills, setSavedCashBills] = useState([]);

  const defaultForm = {
    docName: '',
    billNo: '',
    clientCompany: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    termsAndConditions: '',
  };

  const [form, setForm] = useState(defaultForm);

  const [items, setItems] = useState([
    { date: '', description: '', quantity: '', rate: '', amount: '' }
  ]);

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const fetchSaved = async () => {
    const data = await db.cashbills.toArray();
    setSavedCashBills(data.reverse());
  };

  const extractCashBillForm = (bill) => {
    if (!bill) return defaultForm;
    const dataForm = bill.data?.form || (bill.data && !Array.isArray(bill.data) && !bill.data.items ? bill.data : null);

    return {
      ...defaultForm,
      docName: bill.docName || dataForm?.docName || '',
      billNo: bill.billNo || dataForm?.billNo || '',
      date: bill.date || dataForm?.date || defaultForm.date,
      clientCompany: bill.clientCompany || dataForm?.clientCompany || '',
      clientAddress: bill.clientAddress || dataForm?.clientAddress || '',
      ...(dataForm || {}),
      id: bill.id || (dataForm && dataForm.id),
    };
  };

  const extractCashBillItems = (bill) => {
    if (!bill) return [{ date: '', description: '', quantity: '', rate: '', amount: '' }];
    if (Array.isArray(bill.data?.items) && bill.data.items.length > 0) return bill.data.items;
    if (Array.isArray(bill.items) && bill.items.length > 0) return bill.items;
    if (Array.isArray(bill.data) && bill.data.length > 0) return bill.data;
    if (bill.grandTotal || bill.amount) {
      const amt = bill.grandTotal || bill.amount || 0;
      return [{ date: bill.date || '', description: bill.docName || bill.clientCompany || 'Services', quantity: 1, rate: amt, amount: amt }];
    }
    return [{ date: '', description: '', quantity: '', rate: '', amount: '' }];
  };

  const applyLoadedBill = (bill) => {
    setForm(extractCashBillForm(bill));
    setItems(extractCashBillItems(bill));
    const sig = bill.data?.signature || bill.signature || null;
    if (sig) setSignature(sig);
    setActiveTab('preview');
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        applyLoadedBill(itemToLoad);
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      const num = await getNextCashBillNumber();
      setForm(f => ({ ...f, billNo: num }));
      await fetchSaved();

      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ ...f, termsAndConditions: '' }));
    };
    init();

    window.addEventListener('sync-complete', fetchSaved);
    return () => window.removeEventListener('sync-complete', fetchSaved);
  }, [location.state, exportItem]);

  const loadBill = (bill) => {
    applyLoadedBill(bill);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cash bill from storage?')) {
      await deleteCashBill(id);
      await fetchSaved();
    }
  };

  const addItem = () => setItems([...items, { date: '', description: '', quantity: '', rate: '', amount: '' }]);
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const calcAmount = (item) => {
    if (item.amount !== undefined && item.amount !== '' && item.amount !== 0) {
      return parseFloat(item.amount) || 0;
    }
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return rate * qty;
  };

  const grandTotal = items.reduce((sum, item) => sum + calcAmount(item), 0);

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveOnly = async () => {
    const billData = {
      billNo: form.billNo,
      docName: form.docName || `Cash Bill ${form.billNo}`,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, items, signature }
    };
    if (form.id) {
      await updateCashBill(form.id, billData);
      alert('Document updated successfully!');
    } else {
      const newId = await saveCashBill(billData);
      setForm(f => ({ ...f, id: newId }));
      alert('Document saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    const billData = {
      billNo: form.billNo,
      docName: form.docName || `Cash Bill ${form.billNo}`,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, items, signature }
    };
    if (form.id) {
      await updateCashBill(form.id, billData);
    } else {
      const newId = await saveCashBill(billData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    
    await updateCashBillCounter(form.billNo);
    const nextNum = await getNextCashBillNumber();
    setForm(f => ({ ...f, billNo: nextNum, id: undefined }));
    alert('Cash Bill saved and number auto-incremented based on your entry!');
  };

  return (
    <>
      <div className="page-header">
        <h1>Cash Bill</h1>
        <p>Create and print cash bills for immediate payments</p>
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
                <input className="form-control" placeholder="E.g. XYZ Corp Service Bill"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Client & Details</div>
              <div className="form-group">
                <label>To (Company / Individual Name)</label>
                <input className="form-control" placeholder="Client name"
                  value={form.clientCompany} onChange={e => setForm({ ...form, clientCompany: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" placeholder="Client address" rows={2}
                  value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <CustomDateInput className="form-control" value={form.date} onChange={val => setForm({ ...form, date: val })} />
              </div>
              <div className="form-group">
                <label>Cash Bill No.</label>
                <input className="form-control" placeholder="Bill Number"
                  value={form.billNo} onChange={e => setForm({ ...form, billNo: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Bill Items</div>
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                      <th style={{ width: '120px' }}>Date</th>
                      <th>Description</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '120px' }}>Rate</th>
                      <th style={{ width: '110px' }}>Amount</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td>
                          <CustomDateInput className="form-control" value={item.date} onChange={val => updateItem(i, 'date', val)} />
                        </td>
                        <td>
                          <textarea className="form-control" placeholder="Description" rows={2}
                            value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0" style={{ textAlign: 'center' }}
                            value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" placeholder="0"
                            value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', marginRight: '4px', fontWeight: 600 }}>Rs.</span>
                            <input className="form-control" type="number" placeholder="0"
                              style={{ minWidth: '80px', flex: 1, fontWeight: 600 }}
                              value={item.amount || calcAmount(item)}
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
                <Plus size={14} /> Add Row
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

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
            <div className="doc-preview-container">
              <div ref={previewRef} className="print-capture-wrap">
                {Array.from({ length: Math.ceil(Math.max(1, items.length) / 12) }, (_, pageIndex) => {
                const pageItems = items.slice(pageIndex * 12, (pageIndex + 1) * 12);
                const isLastPage = pageIndex === Math.ceil(Math.max(1, items.length) / 12) - 1;
                return (
            <div key={pageIndex} className="doc-preview">
              <div className="doc-preview-inner">
                {/* Header */}
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

                <div className="invoice-title">CASH BILL</div>

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
                    <strong style={{ display: 'inline-block', marginTop: '4px' }}>Bill No: {form.billNo}</strong>
                  </div>
                </div>

                {/* Table */}
                <table className="doc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                      <th style={{ width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Date</th>
                      <th>Description</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Rate</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, localIndex) => {
                      const absoluteIndex = pageIndex * 12 + localIndex;
                      return (
                      <tr key={absoluteIndex}>
                        <td style={{ textAlign: 'center' }}>{absoluteIndex + 1}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
                        <td>{item.description || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity || '—'}</td>
                        <td className="amount-col" style={{ padding: '8px', boxSizing: 'border-box' }}>
                          <span style={{ float: 'left' }}>Rs.</span>
                          <span style={{ float: 'right' }}>{formatCurrency(item.rate)}</span>
                          <div style={{ clear: 'both' }} />
                        </td>
                        <td className="amount-col" style={{ padding: '8px', boxSizing: 'border-box' }}>
                          <span style={{ float: 'left' }}>Rs.</span>
                          <span style={{ float: 'right' }}>{formatCurrency(calcAmount(item))}</span>
                          <div style={{ clear: 'both' }} />
                        </td>
                      </tr>
                    )})}
                    {isLastPage && (
                      <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, padding: '8px' }}>TOTAL</td>
                        <td className="amount-col" style={{ fontWeight: 800, padding: '8px', boxSizing: 'border-box' }}>
                          <span style={{ float: 'left' }}>Rs.</span>
                          <span style={{ float: 'right' }}>{formatCurrency(grandTotal)}</span>
                          <div style={{ clear: 'both' }} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Terms and Conditions */}
                {form.termsAndConditions && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px', textDecoration: 'underline' }}>TERMS & CONDITIONS:</div>
                    <div style={{ fontSize: '0.75rem', color: '#444', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                      {form.termsAndConditions}
                    </div>
                  </div>
                )}

                {/* Thank you & Regards + Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '32px' }}>
                  <div>
                    <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '0.85rem' }}>Thank you &amp; Regards</h4>
                    <p style={{ fontWeight: 600, fontSize: '0.82rem', marginTop: '6px' }}>{companyProfile.owner}</p>
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
              </div>
            </div>
              )})}
            </div>
          </div>
          <ExportButtons targetRef={previewRef} filename={form.docName || `Cash_Bill_${form.billNo || 'draft'}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
        </div>

          {/* === STORAGE === */}
          {activeTab === 'storage' && (
            <div className="doc-storage-panel fade-in" style={{ width: '100%', flex: 1 }}>
              <div className="card">
                <div className="card-title">Saved Cash Bills</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Doc Name</th>
                        <th>Bill No</th>
                        <th>Client</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedCashBills.map(bill => (
                        <tr key={bill.id}>
                          <td>{formatDate(bill.date)}</td>
                          <td><strong>{bill.docName}</strong></td>
                          <td>{bill.billNo}</td>
                          <td>{bill.clientCompany}</td>
                          <td>₹{formatCurrency(bill.grandTotal)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => loadBill(bill)}>Edit / View</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bill.id)}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {savedCashBills.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No saved cash bills found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
        `}</style>
      </div>
    </>
  );
}
