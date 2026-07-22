import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, deleteInvoice, deleteQuotation, deleteProformaInvoice, deleteCashBill, deleteDc, updatePaymentStatus, deleteExperienceCertificate } from '../db';
import { Trash2, ExternalLink, Search, Download, Loader2, FolderOpen, Coins, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import TaxInvoice from './TaxInvoice';
import Quotation from './Quotation';
import ProformaInvoice from './ProformaInvoice';
import CashBill from './CashBill';
import DeliveryChellan from './DeliveryChellan';
import ExperienceCertificate from './ExperienceCertificate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MediaLibraryPanel from '../components/MediaLibraryPanel';

export default function Storage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [cashBills, setCashBills] = useState([]);
  const [dcs, setDcs] = useState([]);
  const [experienceCerts, setExperienceCerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [exportingDoc, setExportingDoc] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDoc, setPaymentDoc] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchData = async () => {
    const isClean = (doc) => {
      const isClientEmpty = !doc.clientCompany || doc.clientCompany.trim() === '';
      const isZeroTotal = doc.grandTotal === 0 || doc.grandTotal == null;
      const isDraftName = doc.docName && (doc.docName.toLowerCase().includes('draft') || doc.docName.toLowerCase().includes('test'));
      return !(isClientEmpty && isZeroTotal) && !isDraftName;
    };
    setInvoices((await db.invoices.toArray()).filter(isClean).reverse());
    setQuotations((await db.quotations.toArray()).filter(isClean).reverse());
    setProformas((await db.proformaInvoices.toArray()).filter(isClean).reverse());
    setCashBills((await db.cashbills.toArray()).filter(isClean).reverse());
    setDcs((await db.deliveryChellans.toArray()).reverse());
    setExperienceCerts((await db.experienceCertificates.toArray()).reverse());
  };

  useEffect(() => {
    // Initial fetch from local IndexedDB
    fetchData();

    // Retry polling: DB v12 upgrade seeds data asynchronously.
    // Poll every 500ms for up to 5s so we always catch the seeded docs,
    // even when Supabase is offline (paused/CORS error).
    let attempts = 0;
    const retryInterval = setInterval(async () => {
      attempts++;
      const count = await db.invoices.count();
      if (count > 0) {
        fetchData();
        clearInterval(retryInterval);
      } else if (attempts >= 10) {
        clearInterval(retryInterval);
      }
    }, 500);

    const handleSyncComplete = () => {
      fetchData();
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => {
      clearInterval(retryInterval);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getMonthYear = (dateStr) => {
    if (!dateStr) return 'Unknown Month';
    const d = new Date(dateStr);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const groupAndSortDocs = (docs) => {
    // 1. Sort by date first to get month order
    // 2. We want to group by month-year
    // 3. Within each group, sort by bill number ascending

    const groups = {};
    docs.forEach(doc => {
      const date = new Date(doc.date);
      const monthYear = getMonthYear(doc.date);
      const monthSortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthSortKey]) {
        groups[monthSortKey] = { label: monthYear, items: [] };
      }
      groups[monthSortKey].items.push(doc);
    });

    // Sort months ascending (Oldest first)
    const sortedMonthKeys = Object.keys(groups).sort();
    
    return sortedMonthKeys.map(key => {
      const group = groups[key];
      // Sort items within month by bill number (low to high)
      group.items.sort((a, b) => {
        const numA = parseInt(a.invoiceNo || a.billNo || a.dcNo || a.id, 10) || 0;
        const numB = parseInt(b.invoiceNo || b.billNo || b.dcNo || b.id, 10) || 0;
        return numA - numB;
      });
      return group;
    });
  };

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this document from storage permanently?')) return;
    if (type === 'invoice') await deleteInvoice(id);
    if (type === 'quotation') await deleteQuotation(id);
    if (type === 'proforma') await deleteProformaInvoice(id);
    if (type === 'cashbill') await deleteCashBill(id);
    if (type === 'dc') await deleteDc(id);
    if (type === 'experience') await deleteExperienceCertificate(id);
    await fetchData();
  };

  const handleOpen = (path, item) => {
    navigate(path, { state: { loadItem: item } });
  };

  const handleToggleSelectId = (id, type) => {
    setSelectedDocs(prev => {
      const exists = prev.find(item => item.id === id && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.id === id && item.type === type));
      } else {
        return [...prev, { id, type }];
      }
    });
  };

  const handleSelectAll = (data, type) => {
    setSelectedDocs(prev => {
      const withoutThisType = prev.filter(item => item.type !== type);
      const visibleIds = data.map(d => d.id);
      const selectedOfThisType = prev.filter(item => item.type === type).map(d => d.id);
      const allSelected = visibleIds.every(id => selectedOfThisType.includes(id)) && visibleIds.length > 0;
      
      if (allSelected) {
        return withoutThisType;
      } else {
        return [...withoutThisType, ...data.map(d => ({ id: d.id, type }))];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDocs.length} selected document(s) permanently?`)) return;
    
    for (const doc of selectedDocs) {
      if (doc.type === 'invoice') await deleteInvoice(doc.id);
      if (doc.type === 'quotation') await deleteQuotation(doc.id);
      if (doc.type === 'proforma') await deleteProformaInvoice(doc.id);
      if (doc.type === 'cashbill') await deleteCashBill(doc.id);
      if (doc.type === 'dc') await deleteDc(doc.id);
      if (doc.type === 'experience') await deleteExperienceCertificate(doc.id);
    }
    
    setSelectedDocs([]);
    await fetchData();
  };
  
  const handleUpdatePayment = async () => {
    if (!paymentDoc || paymentAmount === '') return;
    const paid = parseFloat(paymentAmount);
    const total = paymentDoc.grandTotal;
    let status = 'unpaid';
    if (paid >= total) status = 'paid';
    else if (paid > 0) status = 'partial';
    
    await updatePaymentStatus(paymentDoc.id, paymentDoc.type, paid, status);
    setShowPaymentModal(false);
    setPaymentDoc(null);
    setPaymentAmount('');
    await fetchData();
  };

  const handleToggleStatus = async (item, type) => {
    const currentStatus = item.paymentStatus || 'unpaid';
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const newAmount = newStatus === 'paid' ? item.grandTotal : 0;
    
    await updatePaymentStatus(item.id, type, newAmount, newStatus);
    await fetchData();
  };

  const generatePDF = async (element, docName) => {
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff', 
        logging: false,
        windowWidth: 2000
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const outputW = imgW * ratio;
      const outputH = imgH * ratio;
      const xOffset = (pdfW - outputW) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, 0, outputW, outputH);
      pdf.save(`${docName}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedDocs.length === 0) return;
    
    try {
      for (let i = 0; i < selectedDocs.length; i++) {
         const docInfo = selectedDocs[i];
         setExportProgress(`Generating PDF ${i+1}/${selectedDocs.length}...`);
         
         let fullDoc;
         let path = '';
         if (docInfo.type === 'invoice') { fullDoc = await db.invoices.get(docInfo.id); path = '/tax-invoice'; }
         if (docInfo.type === 'quotation') { fullDoc = await db.quotations.get(docInfo.id); path = '/quotation'; }
         if (docInfo.type === 'proforma') { fullDoc = await db.proformaInvoices.get(docInfo.id); path = '/proforma-invoice'; }
         if (docInfo.type === 'cashbill') { fullDoc = await db.cashbills.get(docInfo.id); path = '/cash-bill'; }
         if (docInfo.type === 'dc') { fullDoc = await db.deliveryChellans.get(docInfo.id); path = '/delivery-chellan'; }
         if (docInfo.type === 'experience') { fullDoc = await db.experienceCertificates.get(docInfo.id); path = '/experience-certificate'; }
         
         if (!fullDoc) continue;
         
         setExportingDoc({ fullDoc, path });
         
         // Give React enough time to mount and let images/fonts render
         await new Promise(r => setTimeout(r, 2500));

         const element = document.querySelector('.hidden-export-container .print-capture-wrap');
         if (element) {
           let docName = fullDoc.docName || `${docInfo.type} ${fullDoc.invoiceNo || fullDoc.billNo || fullDoc.dcNo || fullDoc.id}`;
           await generatePDF(element, docName);
         } else {
           console.error('Could not find document preview element for export.');
         }
      }
    } catch (err) {
      console.error('Batch export failed:', err);
    } finally {
      setExportingDoc(null);
      setExportProgress(null);
    }
  };

  const filterDocs = (docs) => {
    if (!searchTerm) return docs;
    const term = searchTerm.toLowerCase();
    return docs.filter(item => {
      const nameMatch = (item.docName || '').toLowerCase().includes(term);
      const clientMatch = (item.clientCompany || '').toLowerCase().includes(term);
      const noMatch = (item.invoiceNo || item.billNo || item.dcNo || '').toLowerCase().includes(term);
      const amtMatch = (item.grandTotal || '').toString().includes(term);
      const driverMatch = (item.driverName || '').toLowerCase().includes(term);
      return nameMatch || clientMatch || noMatch || amtMatch || driverMatch;
    });
  };

  const filteredInvoices = groupAndSortDocs(filterDocs(invoices));
  const filteredQuotations = groupAndSortDocs(filterDocs(quotations));
  const filteredProformas = groupAndSortDocs(filterDocs(proformas));
  const filteredCashBills = groupAndSortDocs(filterDocs(cashBills));
  const filteredDcs = groupAndSortDocs(filterDocs(dcs));
  const filteredExperienceCerts = groupAndSortDocs(filterDocs(experienceCerts));

  const renderTable = (groupedData, type, path, totalCount) => (
    <div className="table-wrapper storage-table-wrapper">
      <table className="table storage-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                checked={totalCount > 0 && groupedData.every(g => g.items.every(d => selectedDocs.some(s => s.id === d.id && s.type === type)))}
                onChange={() => {
                  const allDocsInType = groupedData.flatMap(g => g.items);
                  handleSelectAll(allDocsInType, type);
                }}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>Date</th>
            <th>Doc Name</th>
            {type !== 'quotation' && <th>Doc No.</th>}
            <th>Client</th>
            {type !== 'dc' && type !== 'quotation' && <th>Amount</th>}
            {(type === 'invoice' || type === 'cashbill') && <th>Status</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groupedData.map(group => (
            <React.Fragment key={group.label}>
              <tr className="month-row">
                <td colSpan={type === 'dc' || type === 'quotation' ? "6" : "7"}>
                  {group.label}
                </td>
              </tr>
              {group.items.map(item => {
                const isSelected = selectedDocs.some(s => s.id === item.id && s.type === type);
                const pStatus = item.paymentStatus || 'unpaid';
                const pAmount = item.paidAmount || 0;
                
                return (
                <tr key={item.id} style={{ background: isSelected ? 'var(--accent-gold-light)' : '' }}>
                  <td data-label="Select" style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleToggleSelectId(item.id, type)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td data-label="Date">{formatDate(item.date)}</td>
                  <td data-label="Doc Name"><strong>{item.docName || 'Unnamed Document'}</strong></td>
                  {type !== 'quotation' && <td data-label="Doc No.">{item.invoiceNo || item.billNo || item.dcNo}</td>}
                  <td data-label="Client">{item.clientCompany}</td>
                  {type !== 'dc' && type !== 'quotation' && <td data-label="Amount">₹{formatCurrency(item.grandTotal)}</td>}
                  {(type === 'invoice' || type === 'cashbill') && (
                    <td data-label="Status">
                      <div 
                        className={`status-badge ${pStatus} clickable`} 
                        onClick={() => handleToggleStatus(item, type)}
                        title="Click to toggle Paid/Unpaid"
                      >
                        {pStatus === 'paid' && <CheckCircle size={12} />}
                        {pStatus === 'partial' && <Clock size={12} />}
                        {pStatus === 'unpaid' && <AlertCircle size={12} />}
                        {pStatus.toUpperCase()}
                        {pStatus === 'partial' && <span style={{fontSize: '0.7rem', opacity: 0.8, marginLeft: '4px'}}>(₹{formatCurrency(pAmount)})</span>}
                      </div>
                    </td>
                  )}
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(type === 'invoice' || type === 'cashbill') && (
                        <button className="btn btn-sm btn-secondary" title="Record Payment" onClick={() => {
                          setPaymentDoc({ ...item, type });
                          setPaymentAmount(item.paidAmount || '');
                          setShowPaymentModal(true);
                        }}>
                          <Coins size={14} />
                        </button>
                      )}
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpen(path, item)}>
                        <ExternalLink size={14} style={{ marginRight: '4px' }} /> Open
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(type, item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </React.Fragment>
          ))}
          {groupedData.length === 0 && (
            <tr>
              <td 
                colSpan={
                  type === 'invoice' || type === 'cashbill' ? 8 : 
                  type === 'proforma' ? 7 :
                  type === 'dc' ? 6 :
                  5 // quotation
                } 
                style={{ textAlign: 'center', padding: '24px' }}
              >
                No documents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Saved Documents</h1>
            <p>Access and manage all your stored documents across the application</p>
          </div>
          {/* Official Documents button */}
          <button
            onClick={() => setShowLibrary(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #ffb700 0%, #ff8c00 100%)',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.82rem',
              color: '#000', letterSpacing: '0.02em',
              boxShadow: '0 4px 20px rgba(255,183,0,0.35)',
              transition: 'all 0.2s',
              marginTop: '4px' /* Align visually with the h1 */
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,183,0,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,183,0,0.35)'; }}
            title="Manage signatures, stamps and official documents"
          >
            <FolderOpen size={16} />
            Official Documents
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="search-bar-container fade-in">
          <div className="search-bar" style={{ flex: 1, minWidth: '300px' }}>
            <Search />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedDocs.length > 0 && (
            <div className="btn-group slide-in">
              <button className="btn btn-primary" onClick={handleDownloadSelected} disabled={!!exportProgress} style={{ background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
                {exportProgress ? <><Loader2 size={18} className="spin" /> {exportProgress}</> : <><Download size={18} /> DOWNLOAD PDF ({selectedDocs.length})</>}
              </button>
              <button className="btn btn-danger" onClick={handleBulkDelete}>
                <Trash2 size={18} /> DELETE ({selectedDocs.length})
              </button>
            </div>
          )}
        </div>

        {(!searchTerm || filteredInvoices.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Tax Invoices ({invoices.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredInvoices, 'invoice', '/tax-invoice', invoices.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}
        
        {(!searchTerm || filteredQuotations.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Quotations ({quotations.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredQuotations, 'quotation', '/quotation', quotations.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}

        {(!searchTerm || filteredProformas.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Proforma Invoices ({proformas.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredProformas, 'proforma', '/proforma-invoice', proformas.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}

        {(!searchTerm || filteredCashBills.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Cash Bills ({cashBills.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredCashBills, 'cashbill', '/cash-bill', cashBills.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}

        {(!searchTerm || filteredDcs.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Delivery Challans ({dcs.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredDcs, 'dc', '/delivery-chellan', dcs.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}

        {(!searchTerm || filteredExperienceCerts.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Experience Certificates ({experienceCerts.filter(i => filterDocs([i]).length > 0).length})</div>
            {renderTable(filteredExperienceCerts, 'experience', '/experience-certificate', experienceCerts.filter(i => filterDocs([i]).length > 0).length)}
          </div>
        )}

        {searchTerm && 
         filteredInvoices.length === 0 && 
         filteredQuotations.length === 0 && 
         filteredProformas.length === 0 &&
         filteredCashBills.length === 0 &&
         filteredDcs.length === 0 &&
         filteredExperienceCerts.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: 'var(--text-muted)' }}>No documents matched your search.</div>
          </div>
        )}
      </div>

      {exportingDoc && (
        <div className="hidden-export-container" style={{ position: 'absolute', top: 0, left: 0, width: '2000px', opacity: 0.01, pointerEvents: 'none', zIndex: -100 }}>
             {exportingDoc.path === '/tax-invoice' && <TaxInvoice exportItem={exportingDoc.fullDoc} />}
             {exportingDoc.path === '/quotation' && <Quotation exportItem={exportingDoc.fullDoc} />}
             {exportingDoc.path === '/proforma-invoice' && <ProformaInvoice exportItem={exportingDoc.fullDoc} />}
             {exportingDoc.path === '/cash-bill' && <CashBill exportItem={exportingDoc.fullDoc} />}
             {exportingDoc.path === '/delivery-chellan' && <DeliveryChellan exportItem={exportingDoc.fullDoc} />}
             {exportingDoc.path === '/experience-certificate' && <ExperienceCertificate exportItem={exportingDoc.fullDoc} />}
        </div>
      )}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Official Documents / Media Library Panel */}
      <MediaLibraryPanel open={showLibrary} onClose={() => setShowLibrary(false)} />

      {/* Payment Update Modal */}
      {showPaymentModal && paymentDoc && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Record Payment</h3>
              <button className="btn-icon" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Invoice No: {paymentDoc.invoiceNo || paymentDoc.billNo}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Amount: ₹{formatCurrency(paymentDoc.grandTotal)}</div>
            </div>

            <div className="form-group">
              <label>Amount Collected (₹)</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="Enter amount paid by customer"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdatePayment}>Update Status</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-badge.paid { background: #e8f5e9; color: #2e7d32; }
        .status-badge.partial { background: #fff8e1; color: #f57f17; }
        .status-badge.unpaid { background: #ffebee; color: #c62828; }
        .status-badge.clickable { cursor: pointer; transition: all 0.2s; position: relative; }
        .status-badge.clickable:hover { 
          filter: brightness(0.95); 
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .status-badge.clickable:active { transform: translateY(0); }
        .status-badge.partial::after {
          content: '✎';
          position: absolute;
          right: -10px;
          top: -2px;
          font-size: 0.7rem;
          opacity: 0.5;
        }
        
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
      `}</style>
    </>
  );
}
