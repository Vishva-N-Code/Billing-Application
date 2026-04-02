import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getNextCashBillNumber, updateCashBillCounter, initSettings, saveCashBill, deleteCashBill, db } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';

export default function CashBill() {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedCashBills, setSavedCashBills] = useState([]);

  const [form, setForm] = useState({
    docName: '',
    billNo: '',
    clientCompany: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState([
    { date: '', description: '', rate: '', amount: '' }
  ]);

  const [signature, setSignature] = useState(null);

  const fetchSaved = async () => {
    const data = await db.cashbills.toArray();
    setSavedCashBills(data.reverse());
  };

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextCashBillNumber();
      setForm(f => ({ ...f, billNo: num }));
      await fetchSaved();

      if (location.state?.loadItem) {
        const bill = location.state.loadItem;
        setForm({ ...bill.data.form, id: bill.id });
        setItems(bill.data.items);
        if (bill.data.signature) setSignature(bill.data.signature);
        setActiveTab('preview');
      }
    };
    init();
  }, [location.state]);

  const loadBill = (bill) => {
    setForm({ ...bill.data.form, id: bill.id });
    setItems(bill.data.items);
    if (bill.data.signature) setSignature(bill.data.signature);
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cash bill from storage?')) {
      await deleteCashBill(id);
      await fetchSaved();
    }
  };

  const addItem = () => setItems([...items, { date: '', description: '', rate: '', amount: '' }]);
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const calcAmount = (item) => {
    if (item.amount !== undefined && item.amount !== '') {
      return parseFloat(item.amount) || 0;
    }
    const rate = parseFloat(item.rate) || 0;
    return rate;
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
      <div className="page-body fade-in">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Edit Form</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
          <button className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}>Saved Docs</button>
        </div>

        <div className="doc-preview-wrapper">
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' || activeTab === 'storage' ? 'none' : undefined }}>
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
                <input className="form-control" type="date"
                  value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
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
                      <th style={{ width: '40px' }}>S.No</th>
                      <th style={{ width: '120px' }}>Date</th>
                      <th>Description</th>
                      <th style={{ width: '100px' }}>Rate</th>
                      <th style={{ width: '100px' }}>Amount</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <input className="form-control" type="date"
                            value={item.date} onChange={e => updateItem(i, 'date', e.target.value)} />
                        </td>
                        <td>
                          <textarea className="form-control" placeholder="Description" rows={2}
                            value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
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
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab !== 'preview' ? 'none' : undefined }}>
            <div ref={previewRef}>
              {Array.from({ length: Math.ceil(Math.max(1, items.length) / 12) }, (_, pageIndex) => {
                const pageItems = items.slice(pageIndex * 12, (pageIndex + 1) * 12);
                const isLastPage = pageIndex === Math.ceil(Math.max(1, items.length) / 12) - 1;
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
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>S.No</th>
                      <th style={{ width: '90px' }}>Date</th>
                      <th>Description</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Rate</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, localIndex) => {
                      const absoluteIndex = pageIndex * 12 + localIndex;
                      return (
                      <tr key={absoluteIndex}>
                        <td>{absoluteIndex + 1}</td>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.description || '—'}</td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(item.rate)}</span></div></td>
                        <td className="amount-col"><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(calcAmount(item))}</span></div></td>
                      </tr>
                    )})}
                    {isLastPage && (
                      <tr style={{ fontWeight: 700, background: '#f9f9f9' }}>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                        <td className="amount-col" style={{ fontWeight: 800 }}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Rs.</span> <span>{formatCurrency(grandTotal)}</span></div></td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Thank you & Regards + Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '32px' }}>
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
              )})}
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
          @media (min-width: 769px) {
            .doc-form-panel, .doc-preview-panel { display: block !important; }
          }
        `}</style>
      </div>
    </>
  );
}
