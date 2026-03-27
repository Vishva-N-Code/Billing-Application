import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getNextCashBillNumber, updateCashBillCounter, initSettings, saveCashBill } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';

export default function CashBill() {
  const previewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('form');

  const [form, setForm] = useState({
    billNo: '',
    clientCompany: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState([
    { date: '', description: '', rate: '', amount: '' }
  ]);

  const [signature, setSignature] = useState(null);

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextCashBillNumber();
      setForm(f => ({ ...f, billNo: num }));
    };
    init();
  }, []);

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

  const handleExport = async () => {
    const billData = {
      billNo: form.billNo,
      date: form.date,
      clientCompany: form.clientCompany,
      grandTotal: grandTotal,
      data: { form, items }
    };
    await saveCashBill(billData);
    
    await updateCashBillCounter(form.billNo);
    const nextNum = await getNextCashBillNumber();
    setForm(f => ({ ...f, billNo: nextNum }));
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
        </div>

        <div className="doc-preview-wrapper">
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' ? 'none' : undefined }}>
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
          <div className="doc-preview-panel" style={{ display: activeTab === 'form' ? 'none' : undefined }}>
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

            <ExportButtons targetRef={previewRef} filename={`Cash_Bill_${form.clientCompany || 'draft'}`} onExport={handleExport} />
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
