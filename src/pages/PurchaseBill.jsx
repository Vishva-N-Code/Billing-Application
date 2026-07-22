import { useState, useEffect, useRef } from 'react';
import { db, savePurchaseBill, getAllPurchaseBills, deletePurchaseBill } from '../db';
import { Upload, Trash2, FileText, Calendar, Search, FolderOpen, Loader2, X, Eye, Download } from 'lucide-react';

export default function PurchaseBill() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileRef = useRef(null);

  const fetchBills = async () => {
    setLoading(true);
    const data = await getAllPurchaseBills();
    setBills(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
    window.addEventListener('sync-complete', fetchBills);
    return () => window.removeEventListener('sync-complete', fetchBills);
  }, []);

  const handleFiles = async (files) => {
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) continue;

      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = async (ev) => {
          const now = new Date();
          const billDate = now.toISOString().split('T')[0];
          const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
          
          await savePurchaseBill({
            name: file.name.replace(/\.[^.]+$/, ''),
            date: billDate,
            monthYear: monthYear,
            type: isPdf ? 'pdf' : 'image',
            dataUrl: ev.target.result,
            uploadedAt: now.toISOString(),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    await fetchBills();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase bill?')) {
      await deletePurchaseBill(id);
      await fetchBills();
    }
  };

  const groupBillsByMonth = (items) => {
    const groups = {};
    items.forEach(bill => {
      if (!groups[bill.monthYear]) {
        groups[bill.monthYear] = [];
      }
      groups[bill.monthYear].push(bill);
    });
    return groups;
  };

  const filteredBills = bills.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.monthYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBills = groupBillsByMonth(filteredBills);
  const sortedMonths = Object.keys(groupedBills).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  return (
    <>
      <div className="page-header">
        <h1>Purchase Bills</h1>
        <p>Upload and organize your purchase records for IT filing</p>
      </div>

      <div className="page-body">
        {/* Upload Section */}
        <div className="card fade-in" style={{ marginBottom: '24px', padding: '0' }}>
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles([...e.dataTransfer.files]); }}
            onClick={() => fileRef.current.click()}
          >
            <div className="upload-icon-wrap">
              <Upload size={32} />
            </div>
            <div className="upload-text">
              <h3>Drop your purchase bills here</h3>
              <p>Click to browse or drag & drop (Images or PDFs)</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files.length) handleFiles([...e.target.files]); e.target.value = ''; }}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container fade-in">
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Search by vendor name or month..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Month-wise List */}
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={40} />
            <p>Loading your bills...</p>
          </div>
        ) : sortedMonths.length === 0 ? (
          <div className="empty-state card">
            <FolderOpen size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>No purchase bills found</h3>
            <p>Upload your first purchase bill to get started.</p>
          </div>
        ) : (
          <div className="month-groups">
            {sortedMonths.map(month => (
              <div key={month} className="month-group-card card fade-in">
                <div className="month-header">
                  <div className="month-title">
                    <Calendar size={18} />
                    <span>{month}</span>
                  </div>
                  <div className="bill-count">{groupedBills[month].length} Bills</div>
                </div>
                <div className="bill-grid">
                  {groupedBills[month].map(bill => (
                    <div key={bill.id} className="bill-item-card">
                      <div className="bill-preview-mini" onClick={() => setPreviewDoc(bill)}>
                        {bill.type === 'pdf' ? (
                          <div className="pdf-placeholder">
                            <FileText size={32} />
                            <span>PDF BILL</span>
                          </div>
                        ) : (
                          <img src={bill.dataUrl} alt={bill.name} />
                        )}
                        <div className="bill-overlay">
                          <Eye size={20} />
                        </div>
                      </div>
                      <div className="bill-info">
                        <div className="bill-name" title={bill.name}>{bill.name}</div>
                        <div className="bill-meta">
                          <span>{new Date(bill.date).toLocaleDateString('en-IN')}</span>
                          <button className="delete-bill-btn" onClick={() => handleDelete(bill.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content bill-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewDoc.name}</h3>
              <div className="modal-actions">
                <a href={previewDoc.dataUrl} download={previewDoc.name} className="btn-icon-gold" title="Download">
                  <Download size={20} />
                </a>
                <button className="btn-icon" onClick={() => setPreviewDoc(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="modal-body">
              {previewDoc.type === 'pdf' ? (
                <iframe src={previewDoc.dataUrl} width="100%" height="100%" title="PDF Preview" />
              ) : (
                <img src={previewDoc.dataUrl} alt={previewDoc.name} />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .upload-zone {
          padding: 40px;
          border: 2px dashed rgba(200, 149, 46, 0.3);
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          background: rgba(200, 149, 46, 0.08);
          border-color: var(--accent-gold);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .upload-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(200, 149, 46, 0.1);
          color: var(--accent-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .upload-zone:hover .upload-icon-wrap {
          transform: scale(1.1) rotate(5deg);
          background: var(--accent-gold);
          color: #000;
        }
        .upload-text h3 {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          color: #f8fafc;
        }
        .upload-text p {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .month-group-card {
          margin-bottom: 24px;
          padding: 24px;
        }
        .month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .month-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--accent-gold);
        }
        .bill-count {
          font-size: 0.8rem;
          font-weight: 600;
          background: rgba(255,255,255,0.05);
          padding: 4px 12px;
          border-radius: 20px;
          color: var(--text-muted);
        }

        .bill-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }
        .bill-item-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .bill-item-card:hover {
          transform: translateY(-4px);
          border-color: rgba(200, 149, 46, 0.4);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .bill-preview-mini {
          height: 140px;
          position: relative;
          cursor: pointer;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bill-preview-mini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .bill-item-card:hover .bill-preview-mini img {
          opacity: 0.4;
        }
        .pdf-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #ef4444;
          opacity: 0.7;
        }
        .pdf-placeholder span {
          font-size: 0.7rem;
          font-weight: 900;
        }
        .bill-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          color: var(--accent-gold);
          transition: opacity 0.2s;
          background: rgba(0,0,0,0.4);
        }
        .bill-preview-mini:hover .bill-overlay {
          opacity: 1;
        }

        .bill-info {
          padding: 12px;
        }
        .bill-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 8px;
        }
        .bill-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .delete-bill-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .delete-bill-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .bill-preview-modal {
          width: 90%;
          height: 90vh;
          max-width: 1000px;
          display: flex;
          flex-direction: column;
          background: #0d1117;
        }
        .modal-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .modal-body img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .modal-body iframe {
          border: none;
          background: #fff;
        }
        .btn-icon-gold {
          background: transparent;
          border: none;
          color: var(--accent-gold);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon-gold:hover {
          background: rgba(200, 149, 46, 0.15);
          transform: translateY(-2px);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: var(--text-muted);
        }
        .loading-state p, .empty-state p {
          margin-top: 16px;
        }

        @media (max-width: 600px) {
          .bill-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .bill-preview-mini {
            height: 120px;
          }
        }
      `}</style>
    </>
  );
}
