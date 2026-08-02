import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Award, Trash2 } from 'lucide-react';
import { COMPANY, getCompanyProfile, initSettings, saveExperienceCertificate, deleteExperienceCertificate, updateExperienceCertificate, db } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function ExperienceCertificate({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedCerts, setSavedCerts] = useState([]);

  const defaultForm = {
    docName: '',
    driverName: '',
    fatherName: '',
    address: '',
    dlNo: '',
    designation: 'CRANE OPERATOR',
    fromMonth: '',
    fromYear: '',
    toMonth: 'till date',
    toYear: '',
    issueDate: new Date().toISOString().split('T')[0],
  };

  const [form, setForm] = useState(defaultForm);

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const fetchSaved = async () => {
    const data = await db.experienceCertificates.toArray();
    setSavedCerts(data.reverse());
  };

  const extractCertForm = (cert) => {
    if (!cert) return defaultForm;
    const dataForm = cert.data?.form || (cert.data && !Array.isArray(cert.data) ? cert.data : null);

    return {
      ...defaultForm,
      docName: cert.docName || dataForm?.docName || '',
      driverName: cert.driverName || dataForm?.driverName || '',
      issueDate: cert.date || dataForm?.issueDate || dataForm?.date || defaultForm.issueDate,
      ...(dataForm || {}),
      id: cert.id || (dataForm && dataForm.id),
    };
  };

  const applyLoadedCert = (cert) => {
    setForm(extractCertForm(cert));
    const sig = cert.data?.signature || cert.signature || null;
    if (sig) setSignature(sig);
    setActiveTab('preview');
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        applyLoadedCert(itemToLoad);
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      await fetchSaved();

      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
    };
    init();
  }, [location.state, exportItem]);

  const loadCert = (cert) => {
    applyLoadedCert(cert);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this certificate from storage?')) {
      await deleteExperienceCertificate(id);
      await fetchSaved();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveOnly = async () => {
    const certData = {
      docName: form.docName || `Experience_${form.driverName || 'draft'}`,
      driverName: form.driverName,
      date: form.issueDate,
      data: { form, signature }
    };
    if (form.id) {
      await updateExperienceCertificate(form.id, certData);
      alert('Certificate updated successfully!');
    } else {
      const newId = await saveExperienceCertificate(certData);
      setForm(f => ({ ...f, id: newId }));
      alert('Certificate saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    const certData = {
      docName: form.docName || `Experience_${form.driverName || 'draft'}`,
      driverName: form.driverName,
      date: form.issueDate,
      data: { form, signature }
    };
    if (form.id) {
      await updateExperienceCertificate(form.id, certData);
    } else {
      const newId = await saveExperienceCertificate(certData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    alert('Certificate saved successfully!');
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  return (
    <>
      <div className="page-header">
        <h1>Experience Certificate</h1>
        <p>Generate professional experience certificates for your employees</p>
      </div>
      <div className="page-body">
        <div className={`tab-bar ${activeTab === 'storage' ? 'storage-active' : ''}`}>
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Details</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
          <button className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}>Storage</button>
        </div>

        <div className="doc-preview-wrapper" style={{ display: activeTab === 'storage' ? 'none' : undefined }}>
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'form' ? 'block' : 'none' }}>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Document Options</div>
              <div className="form-group mb-0">
                <label>Document Name (For Storage)</label>
                <input className="form-control" placeholder="E.g. Experience Certificate - Baban Prasad"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Driver Details</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Name of Driver</label>
                  <input className="form-control" placeholder="Enter driver name"
                    value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>S/O (Son of)</label>
                  <input className="form-control" placeholder="Enter father's name"
                    value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" placeholder="Enter full address" rows={3}
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Driver License Number</label>
                  <input className="form-control" placeholder="E.g. BR03 20050025468"
                    value={form.dlNo} onChange={e => setForm({ ...form, dlNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input className="form-control" placeholder="E.g. CRANE OPERATOR"
                    value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Period of Employment</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>From Month</label>
                  <select className="form-control" value={form.fromMonth} onChange={e => setForm({ ...form, fromMonth: e.target.value })}>
                    <option value="">Select Month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>From Year</label>
                  <select className="form-control" value={form.fromYear} onChange={e => setForm({ ...form, fromYear: e.target.value })}>
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>To Month</label>
                  <select className="form-control" value={form.toMonth} onChange={e => setForm({ ...form, toMonth: e.target.value })}>
                    <option value="till date">Till Date</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>To Year (Optional)</label>
                  <select className="form-control" value={form.toYear} onChange={e => setForm({ ...form, toYear: e.target.value })}>
                    <option value="">None / Optional</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Issue Date</label>
                <CustomDateInput className="form-control" value={form.issueDate} onChange={val => setForm({ ...form, issueDate: val })} />
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
                <div className="doc-preview">
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

                    <div className="invoice-title" style={{ margin: '20px 0', textDecoration: 'underline' }}>EXPERIENCE CERTIFICATE</div>

                    <div style={{ textAlign: 'right', marginBottom: '30px', fontWeight: 600 }}>
                      Date: {formatDate(form.issueDate)}
                    </div>

                    <div style={{ fontSize: '1.1rem', lineHeight: '1.8', textAlign: 'justify', color: '#1a1a1a', padding: '0 10px' }}>
                      <p style={{ marginBottom: '20px' }}>
                        I hereby declare that Mr. <strong style={{ textTransform: 'uppercase' }}>{form.driverName || '_______________'}</strong> s/o Mr. <strong>{form.fatherName || '_______________'}</strong> residing at <strong>{form.address || '_______________'}</strong>.
                      </p>

                      <p style={{ marginBottom: '20px' }}>
                        He is employed as a <strong>{form.designation || 'CRANE OPERATOR'}</strong> in our company with DL No: <strong>{form.dlNo || '_______________'}</strong> in the period from <strong>{form.fromMonth || '____'} {form.fromYear || '____'}</strong> to <strong>{form.toMonth === 'till date' ? 'Till Date' : form.toMonth} {form.toYear}</strong>.
                      </p>

                      <p>
                        During his tenure, he has shown good character, consistent performance, and professional manners. We wish him all the best for his future endeavors.
                      </p>
                    </div>

                    {/* Thank you & Regards + Signature */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '80px' }}>
                      <div>
                        <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '0.9rem' }}>Thank you &amp; Regards</h4>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '6px' }}>{companyProfile.owner}</p>
                        <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{companyProfile.name}</p>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        {signature && (
                          <>
                            <img src={signature} alt="Signature" className="signature-img" />
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', borderTop: '1px solid #aaa', paddingTop: '4px' }}>SIGNATURE</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ExportButtons targetRef={previewRef} filename={form.docName || `Experience_Certificate_${form.driverName || 'draft'}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
        </div>

        {/* === STORAGE === */}
        {activeTab === 'storage' && (
          <div className="doc-storage-panel fade-in" style={{ width: '100%', flex: 1 }}>
            <div className="card">
              <div className="card-title">Saved Experience Certificates</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Issue Date</th>
                      <th>Doc Name</th>
                      <th>Driver Name</th>
                      <th>DL Number</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedCerts.map(cert => (
                      <tr key={cert.id}>
                        <td>{formatDate(cert.date)}</td>
                        <td><strong>{cert.docName}</strong></td>
                        <td>{cert.driverName}</td>
                        <td>{cert.data.form.dlNo}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => loadCert(cert)}>Edit / View</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cert.id)}><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {savedCerts.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No saved experience certificates found.</td></tr>
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
