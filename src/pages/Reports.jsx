import React, { useState, useEffect, useRef } from 'react';
import { db, getCompanyProfile } from '../db';
import { 
  Download, FileSpreadsheet, Users, 
  Receipt, ArrowRight, Printer, Search,
  Calendar, Filter, ChevronRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('gst');
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  
  // GST Report State
  const [gstStartDate, setGstStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [gstEndDate, setGstEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Outstanding State
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [outstandingDocs, setOutstandingDocs] = useState([]);
  
  const reportRef = useRef(null);
  const gstReportRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const invs = await db.invoices.toArray();
      const custs = await db.customers.toArray();
      const profile = await getCompanyProfile();
      setInvoices(invs);
      setCustomers(custs);
      setCompanyProfile(profile);
    };
    init();
  }, []);

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // --- GST Exports Logic ---
  const getGstData = () => {
    return invoices.filter(inv => {
      const d = new Date(inv.date);
      return d >= new Date(gstStartDate) && d <= new Date(gstEndDate);
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const calculateGstBreakdown = (inv) => {
    const subtotal = (inv.grandTotal || 0) / 1.18;
    const totalTax = (inv.grandTotal || 0) - subtotal;
    const isIgst = inv.data?.form?.gstType === 'igst';
    
    return {
      taxableValue: subtotal,
      cgst: isIgst ? 0 : totalTax / 2,
      sgst: isIgst ? 0 : totalTax / 2,
      igst: isIgst ? totalTax : 0,
      total: inv.grandTotal
    };
  };

  const exportGstCsv = () => {
    const data = getGstData();
    const headers = [
      "Date", "Invoice No", "Customer Name", "Customer GSTIN", 
      "Taxable Value", "CGST", "SGST", "IGST", "Total Amount"
    ];
    
    const rows = data.map(inv => {
      const bk = calculateGstBreakdown(inv);
      const gstin = inv.data?.form?.billingGstin || '';
      return [
        formatDate(inv.date),
        inv.invoiceNo,
        inv.clientCompany,
        gstin,
        bk.taxableValue.toFixed(2),
        bk.cgst.toFixed(2),
        bk.sgst.toFixed(2),
        bk.igst.toFixed(2),
        bk.total.toFixed(2)
      ];
    });

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Sales_Register_${gstStartDate}_to_${gstEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGstPdf = async () => {
    if (!gstReportRef.current) return;
    try {
      const canvas = await html2canvas(gstReportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const outputW = imgW * ratio;
      const outputH = imgH * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, outputW, outputH);
      pdf.save(`GST_Sales_Register_${gstStartDate}_to_${gstEndDate}.pdf`);
    } catch (err) {
      console.error("PDF Failed:", err);
    }
  };

  // --- Outstanding Statements Logic ---
  useEffect(() => {
    const filtered = invoices.filter(inv => {
      const status = inv.paymentStatus || 'unpaid';
      const customerMatch = selectedCustomer === 'all' || inv.clientCompany === selectedCustomer;
      return status !== 'paid' && customerMatch;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    setOutstandingDocs(filtered);
  }, [selectedCustomer, invoices]);

  const downloadStatement = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const outputW = imgW * ratio;
      const outputH = imgH * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, outputW, outputH);
      pdf.save(`Outstanding_Statement_${selectedCustomer === 'all' ? 'All' : selectedCustomer.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Failed:", err);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Financial Reports</h1>
        <p>Analyze your business performance, GST records, and outstanding collections</p>
      </div>

      <div className="page-body">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'gst' ? 'active' : ''}`} onClick={() => setActiveTab('gst')}>
            <FileSpreadsheet size={18} /> GST Sales Register
          </button>
          <button className={`tab-btn ${activeTab === 'outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('outstanding')}>
            <Users size={18} /> Outstanding Balances
          </button>
        </div>

        {/* GST SALES REGISTER */}
        {activeTab === 'gst' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="form-row form-row-3" style={{ alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label><Calendar size={14} /> Start Date</label>
                  <input type="date" className="form-control" value={gstStartDate} onChange={e => setGstStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> End Date</label>
                  <input type="date" className="form-control" value={gstEndDate} onChange={e => setGstEndDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }} onClick={exportGstCsv}>
                      <Download size={18} /> Export CSV
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={downloadGstPdf}>
                      <Printer size={18} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div ref={gstReportRef} style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              {companyProfile && (
                <div style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ color: '#c8952e', margin: 0 }}>{companyProfile.name}</h2>
                      <div style={{ fontSize: '0.85rem', color: '#666', maxWidth: '400px' }}>{companyProfile.address}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: 0 }}>GST Sales Register</h3>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>Period: {formatDate(gstStartDate)} to {formatDate(gstEndDate)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>Generated on: {formatDate(new Date())}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Inv No.</th>
                      <th>Customer</th>
                      <th>Taxable Val.</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>IGST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGstData().map(inv => {
                      const bk = calculateGstBreakdown(inv);
                      return (
                        <tr key={inv.id}>
                          <td>{formatDate(inv.date)}</td>
                          <td>{inv.invoiceNo}</td>
                          <td>{inv.clientCompany}</td>
                          <td>₹{formatCurrency(bk.taxableValue)}</td>
                          <td>₹{formatCurrency(bk.cgst)}</td>
                          <td>₹{formatCurrency(bk.sgst)}</td>
                          <td>₹{formatCurrency(bk.igst)}</td>
                          <td><strong>₹{formatCurrency(bk.total)}</strong></td>
                        </tr>
                      );
                    })}
                    {getGstData().length === 0 && (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No tax invoices found in this period.</td></tr>
                    )}
                  </tbody>
                  {getGstData().length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#f8f9fa', fontWeight: 800 }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Totals:</td>
                        <td>₹{formatCurrency(getGstData().reduce((sum, inv) => sum + calculateGstBreakdown(inv).taxableValue, 0))}</td>
                        <td>₹{formatCurrency(getGstData().reduce((sum, inv) => sum + calculateGstBreakdown(inv).cgst, 0))}</td>
                        <td>₹{formatCurrency(getGstData().reduce((sum, inv) => sum + calculateGstBreakdown(inv).sgst, 0))}</td>
                        <td>₹{formatCurrency(getGstData().reduce((sum, inv) => sum + calculateGstBreakdown(inv).igst, 0))}</td>
                        <td>₹{formatCurrency(getGstData().reduce((sum, inv) => sum + calculateGstBreakdown(inv).total, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OUTSTANDING BALANCES */}
        {activeTab === 'outstanding' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="form-row" style={{ gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label><Filter size={14} /> Filter by Customer</label>
                  <select className="form-control" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="all">All Customers with Balances</option>
                    {[...new Set(invoices.map(i => i.clientCompany))].sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <button className="btn btn-secondary" onClick={downloadStatement}>
                    <Printer size={18} /> Download Statement
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Area */}
            <div ref={reportRef} style={{ background: '#fff', padding: selectedCustomer !== 'all' ? '40px' : '0' }}>
              {selectedCustomer !== 'all' && companyProfile && (
                <div style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ color: '#c8952e', margin: 0 }}>{companyProfile.name}</h2>
                      <div style={{ fontSize: '0.85rem', color: '#666', maxWidth: '300px' }}>{companyProfile.address}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: 0 }}>Outstanding Statement</h3>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>Date: {formatDate(new Date())}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888' }}>Statement For:</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedCustomer}</div>
                  </div>
                </div>
              )}

              <div className={selectedCustomer === 'all' ? 'card' : ''}>
                <div className="table-wrapper">
                  <table className="table" style={{ border: selectedCustomer !== 'all' ? '1px solid #eee' : 'none' }}>
                    <thead>
                      <tr style={{ background: selectedCustomer !== 'all' ? '#f8f9fa' : '' }}>
                        <th>Date</th>
                        <th>Doc No.</th>
                        {selectedCustomer === 'all' && <th>Customer</th>}
                        <th>Inv Amount</th>
                        <th>Paid</th>
                        <th>Balance Due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingDocs.map(inv => {
                        const balance = (inv.grandTotal || 0) - (inv.paidAmount || 0);
                        return (
                          <tr key={inv.id}>
                            <td>{formatDate(inv.date)}</td>
                            <td>{inv.invoiceNo}</td>
                            {selectedCustomer === 'all' && <td>{inv.clientCompany}</td>}
                            <td>₹{formatCurrency(inv.grandTotal)}</td>
                            <td>₹{formatCurrency(inv.paidAmount)}</td>
                            <td style={{ color: '#c62828', fontWeight: 700 }}>₹{formatCurrency(balance)}</td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                background: inv.paymentStatus === 'partial' ? '#fff8e1' : '#ffebee',
                                color: inv.paymentStatus === 'partial' ? '#f57f17' : '#c62828',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800
                              }}>
                                {inv.paymentStatus?.toUpperCase() || 'UNPAID'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0f0f0', fontWeight: 800 }}>
                        <td colSpan={selectedCustomer === 'all' ? 5 : 4} style={{ textAlign: 'right' }}>Total Outstanding Due:</td>
                        <td style={{ color: '#c62828', fontSize: '1.1rem' }}>
                          ₹{formatCurrency(outstandingDocs.reduce((sum, inv) => sum + (inv.grandTotal - (inv.paidAmount || 0)), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tab-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 2px;
        }
        .tab-btn {
          background: none;
          border: none;
          padding: 12px 20px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          border-radius: 8px 8px 0 0;
          position: relative;
        }
        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(200, 149, 46, 0.05);
        }
        .tab-btn.active {
          color: var(--accent-gold);
          background: rgba(200, 149, 46, 0.1);
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent-gold);
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}
