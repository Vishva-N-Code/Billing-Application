import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, deleteInvoice, deleteQuotation, deleteProformaInvoice, deleteCashBill, deleteDc } from '../db';
import { Trash2, ExternalLink, Search } from 'lucide-react';

export default function Storage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [cashbills, setCashbills] = useState([]);
  const [dcs, setDcs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);

  const fetchData = async () => {
    setInvoices((await db.invoices.toArray()).reverse());
    setQuotations((await db.quotations.toArray()).reverse());
    setProformas((await db.proformaInvoices.toArray()).reverse());
    setCashbills((await db.cashbills.toArray()).reverse());
    setDcs((await db.deliveryChellans.toArray()).reverse());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    }
    
    setSelectedDocs([]);
    await fetchData();
  };

  const filterDocs = (docs) => {
    if (!searchTerm) return docs;
    const term = searchTerm.toLowerCase();
    return docs.filter(item => {
      const nameMatch = (item.docName || '').toLowerCase().includes(term);
      const clientMatch = (item.clientCompany || '').toLowerCase().includes(term);
      const noMatch = (item.invoiceNo || item.billNo || item.dcNo || '').toLowerCase().includes(term);
      const amtMatch = (item.grandTotal || '').toString().includes(term);
      return nameMatch || clientMatch || noMatch || amtMatch;
    });
  };

  const filteredInvoices = filterDocs(invoices);
  const filteredQuotations = filterDocs(quotations);
  const filteredProformas = filterDocs(proformas);
  const filteredCashbills = filterDocs(cashbills);
  const filteredDcs = filterDocs(dcs);

  const renderTable = (data, type, path) => (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                checked={data.length > 0 && data.every(d => selectedDocs.some(s => s.id === d.id && s.type === type))}
                onChange={() => handleSelectAll(data, type)}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>Date</th>
            <th>Doc Name</th>
            {type !== 'quotation' && <th>Doc No.</th>}
            <th>Client</th>
            {type !== 'dc' && type !== 'quotation' && <th>Amount</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => {
            const isSelected = selectedDocs.some(s => s.id === item.id && s.type === type);
            return (
            <tr key={item.id} style={{ background: isSelected ? 'rgba(200, 149, 46, 0.08)' : '' }}>
              <td style={{ textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => handleToggleSelectId(item.id, type)}
                  style={{ cursor: 'pointer' }}
                />
              </td>
              <td>{formatDate(item.date)}</td>
              <td><strong>{item.docName || 'Unnamed Document'}</strong></td>
              {type !== 'quotation' && <td>{item.invoiceNo || item.billNo || item.dcNo}</td>}
              <td>{item.clientCompany}</td>
              {type !== 'dc' && type !== 'quotation' && <td>₹{formatCurrency(item.grandTotal)}</td>}
              <td>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleOpen(path, item)}>
                    <ExternalLink size={14} style={{ marginRight: '4px' }} /> Open
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(type, item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )})}
          {data.length === 0 && (
            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No documents found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h1>Saved Documents</h1>
        <p>Access and manage all your stored documents across the application</p>
      </div>
      <div className="page-body fade-in">
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
            <Search />
            <input 
              type="text" 
              placeholder="Search by doc name, client, number, or amount..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedDocs.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete}>
              <Trash2 size={16} /> Delete Selected ({selectedDocs.length})
            </button>
          )}
        </div>

        {(!searchTerm || filteredInvoices.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Tax Invoices ({filteredInvoices.length})</div>
            {renderTable(filteredInvoices, 'invoice', '/tax-invoice')}
          </div>
        )}
        
        {(!searchTerm || filteredQuotations.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Quotations ({filteredQuotations.length})</div>
            {renderTable(filteredQuotations, 'quotation', '/')}
          </div>
        )}

        {(!searchTerm || filteredProformas.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Proforma Invoices ({filteredProformas.length})</div>
            {renderTable(filteredProformas, 'proforma', '/proforma-invoice')}
          </div>
        )}

        {(!searchTerm || filteredCashbills.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Cash Bills ({filteredCashbills.length})</div>
            {renderTable(filteredCashbills, 'cashbill', '/cash-bill')}
          </div>
        )}

        {(!searchTerm || filteredDcs.length > 0) && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-title">Delivery Challans ({filteredDcs.length})</div>
            {renderTable(filteredDcs, 'dc', '/delivery-chellan')}
          </div>
        )}

        {searchTerm && 
         filteredInvoices.length === 0 && 
         filteredQuotations.length === 0 && 
         filteredProformas.length === 0 && 
         filteredCashbills.length === 0 && 
         filteredDcs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: 'var(--text-muted)' }}>No documents matched your search.</div>
          </div>
        )}
      </div>
    </>
  );
}
