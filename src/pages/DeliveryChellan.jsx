import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { COMPANY, getNextDcNumber, updateDcCounter, initSettings, saveDc } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';

export default function DeliveryChellan() {
  const previewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('form');

  const [form, setForm] = useState({
    dcNo: '',
    date: new Date().toISOString().split('T')[0],
    deliveryType: 'Send',
    basis: 'Monthly rental',
    fromName: COMPANY.name,
    fromAddress: 'Thandalam, Sriperumbur, Kanchipuram, Tamil Nadu - 602105',
    toName: '',
    toAddress: '',
    through: '',
    transportRegNo: '',
    vehicles: [{ type: 'Forklift', capacity: '5 Ton', regNo: '', value: '' }]
  });

  const [signature, setSignature] = useState(null);

  useEffect(() => {
    const init = async () => {
      await initSettings();
      const num = await getNextDcNumber();
      // Ensure it starts with OSC and is padded to 4 digits (e.g. OSC0029)
      const formattedNum = `OSC${String(num).padStart(4, '0')}`;
      setForm(f => ({ ...f, dcNo: formattedNum }));
    };
    init();
  }, []);

  const addVehicle = () => {
    setForm({
      ...form,
      vehicles: [...form.vehicles, { type: 'Forklift', capacity: '5 Ton', regNo: '', value: '' }]
    });
  };

  const removeVehicle = (index) => {
    if (form.vehicles.length > 1) {
      const newVehicles = form.vehicles.filter((_, idx) => idx !== index);
      setForm({ ...form, vehicles: newVehicles });
    }
  };

  const updateVehicle = (index, field, value) => {
    const newVehicles = [...form.vehicles];
    newVehicles[index][field] = value;
    setForm({ ...form, vehicles: newVehicles });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const handleExport = async () => {
    const dcData = {
      dcNo: form.dcNo,
      date: form.date,
      clientCompany: form.toName,
      data: form
    };
    await saveDc(dcData);
    
    // Auto-increment logic
    const numericPart = form.dcNo.replace(/\D/g, '');
    const incVal = parseInt(numericPart, 10) || 0;
    await updateDcCounter(incVal.toString());
    
    const nextNum = await getNextDcNumber();
    const formattedNum = `OSC${String(nextNum).padStart(4, '0')}`;
    setForm(f => ({ ...f, dcNo: formattedNum }));
    alert('Delivery challan saved and number auto-incremented!');
  };

  // Generate the vehicles text
  const vehiclesText = form.vehicles.map((v, i) => {
    let text = `${v.capacity} ${v.type}`;
    if (v.regNo) text += ` (Chassis Number: ${v.regNo})`;
    if (v.value) text += `, valued ₹${v.value}`;
    return text;
  }).join(' and ');

  return (
    <>
      <div className="page-header">
        <h1>Delivery Challan</h1>
        <p>Generate material and vehicle movement records</p>
      </div>
      <div className="page-body fade-in">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Edit Form</button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        </div>

        <div className="doc-preview-wrapper" style={{ alignItems: 'flex-start' }}>
          {/* === FORM === */}
          <div className="doc-form-panel" style={{ display: activeTab === 'preview' ? 'none' : undefined }}>
            
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Basic Details</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Date</label>
                  <input className="form-control" type="date"
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>DC No.</label>
                  <input className="form-control" placeholder="e.g. OSC0029"
                    value={form.dcNo} onChange={e => setForm({ ...form, dcNo: e.target.value })} />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label>Movement Type</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" value="Send" checked={form.deliveryType === 'Send'} 
                        onChange={() => setForm({ ...form, deliveryType: 'Send' })} />
                      Send
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" value="Return" checked={form.deliveryType === 'Return'} 
                        onChange={() => setForm({ ...form, deliveryType: 'Return' })} />
                      Return
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Rental / Transport Basis</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" value="Monthly rental" checked={form.basis === 'Monthly rental'} 
                        onChange={() => setForm({ ...form, basis: 'Monthly rental' })} />
                      Monthly rental
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" value="Daily basis" checked={form.basis === 'Daily basis'} 
                        onChange={() => setForm({ ...form, basis: 'Daily basis' })} />
                      Daily basis
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" value="Shift basis" checked={form.basis === 'Shift basis'} 
                        onChange={() => setForm({ ...form, basis: 'Shift basis' })} />
                      Shift basis
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Subjects</div>
              
              <div className="form-row form-row-2" style={{ marginBottom: '16px' }}>
                <div className="form-group mb-0">
                  <label>From (Name)</label>
                  <input className="form-control" placeholder="Sender Name"
                    value={form.fromName} onChange={e => setForm({ ...form, fromName: e.target.value })} />
                </div>
                <div className="form-group mb-0">
                  <label>From (Address)</label>
                  <textarea className="form-control" placeholder="Sender Address" rows={2} style={{ marginBottom: 0 }}
                    value={form.fromAddress} onChange={e => setForm({ ...form, fromAddress: e.target.value })} />
                </div>
              </div>
              
              <div className="form-row form-row-2" style={{ borderTop: '1px dashed #ddd', paddingTop: '16px', marginBottom: '16px' }}>
                <div className="form-group mb-0">
                  <label>To (Name)</label>
                  <input className="form-control" placeholder="Receiver Name (e.g. INDOSOL SOLAR PVT LTD)"
                    value={form.toName} onChange={e => setForm({ ...form, toName: e.target.value })} />
                </div>
                <div className="form-group mb-0">
                  <label>To (Address)</label>
                  <textarea className="form-control" placeholder="Receiver Address" rows={2} style={{ marginBottom: 0 }}
                    value={form.toAddress} onChange={e => setForm({ ...form, toAddress: e.target.value })} />
                </div>
              </div>

              <div className="form-group mb-0" style={{ borderTop: '1px dashed #ddd', paddingTop: '16px' }}>
                <label>Through Details (Optional)</label>
                <textarea className="form-control" placeholder="e.g. ALPHA CARGO CARE, Chennai - 600001" rows={2} style={{ marginBottom: 0 }}
                  value={form.through} onChange={e => setForm({ ...form, through: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Transport Vehicle Info</div>
              <div className="form-group mb-0">
                <label>Vehicle Responsible For Transportation (Registration Number)</label>
                <input className="form-control" placeholder="e.g. TN 88 F 0907" style={{ marginBottom: 0 }}
                  value={form.transportRegNo} onChange={e => setForm({ ...form, transportRegNo: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Transported Items / Vehicles</div>
              
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Type</th>
                      <th style={{ width: '130px' }}>Capacity/Ton</th>
                      <th>Chassis Number</th>
                      <th>Value (in ₹)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.vehicles.map((v, idx) => (
                      <tr key={idx}>
                        <td>
                          <input 
                            list="vehicleTypes"
                            className="form-control" 
                            placeholder="e.g. Forklift, Crane"
                            value={v.type} onChange={e => updateVehicle(idx, 'type', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" placeholder="e.g. 5 Ton"
                            value={v.capacity} onChange={e => updateVehicle(idx, 'capacity', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" placeholder="e.g. CLG2000..."
                            value={v.regNo} onChange={e => updateVehicle(idx, 'regNo', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" placeholder="e.g. 5,00,000"
                            value={v.value} onChange={e => updateVehicle(idx, 'value', e.target.value)} />
                        </td>
                        <td>
                          <button className="btn-icon" onClick={() => removeVehicle(idx)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <datalist id="vehicleTypes">
                <option value="Forklift" />
                <option value="Crane" />
                <option value="Trailer" />
                <option value="Truck" />
              </datalist>

              <button className="btn btn-sm btn-secondary" onClick={addVehicle}>
                <Plus size={14} /> Add Transported Item
              </button>
            </div>

            <div className="card">
              <SignatureUpload signature={signature} onSignatureChange={setSignature} />
            </div>
          </div>

          {/* === PREVIEW === */}
          <div className="doc-preview-panel" style={{ display: activeTab === 'form' ? 'none' : undefined }}>
            <div ref={previewRef}>
              <div className="doc-preview" style={{ width: '794px', maxWidth: '100%', margin: '4px auto', padding: '4px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
                <div className="doc-preview-inner" style={{ minHeight: '900px', display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div className="doc-header">
                      <img src="/logo.png" alt="Logo" className="logo-img" style={{ height: '70px', marginRight: '16px' }} />
                      <span className="company-title" style={{ fontSize: '2.4rem', color: '#ff3d00', letterSpacing: '1px' }}>Om Saravana Cranes</span>
                    </div>
                    <div className="doc-subheader" style={{ fontSize: '1.2rem', marginTop: '4px' }}>{COMPANY.tagline}</div>
                    <div className="doc-company-contacts" style={{ fontSize: '1rem', marginTop: '6px' }}>
                      Email: {COMPANY.email} &nbsp;&nbsp; mobile: {COMPANY.mobile}
                    </div>
                    <div className="doc-company-contacts" style={{ fontSize: '1rem', marginTop: '4px' }}>
                      GST NUMBER: {COMPANY.gstin}. &nbsp;&nbsp;&nbsp;&nbsp; Website: {COMPANY.website}
                    </div>
                  </div>

                  <hr className="doc-divider" style={{ borderTop: '2px solid #555', margin: '16px 0' }} />

                  {/* Title Row with Date and DC No */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '20px 0 40px 0' }}>
                    {/* Invisible spacer to perfectly center the title via flexbox */}
                    <div style={{ width: '220px' }}></div>
                    
                    {/* Centered Title */}
                    <div className="invoice-title" style={{ margin: 0, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Delivery challan
                    </div>

                    {/* Right-aligned Date and DC No */}
                    <div style={{ width: '220px', fontSize: '1.2rem', fontWeight: 600, textAlign: 'right', lineHeight: '1.6' }}>
                      <div style={{ display: 'block' }}>Date: {formatDate(form.date)}</div>
                      <div style={{ display: 'block' }}>DC No: {form.dcNo}</div>
                    </div>
                  </div>

                  {/* Text Paragraphs (Elaborated Size) */}
                  <div style={{ flex: 1, padding: '10px 0' }}>
                    <p style={{ marginBottom: '32px', textAlign: 'justify', fontSize: '1.3rem', lineHeight: '2.2' }}>
                      The {vehiclesText ? vehiclesText + ' ' : ''}
                      Is Being <strong>{form.deliveryType === 'Send' ? 'sent' : 'returned'}</strong> for <strong>{form.basis}</strong> 
                      &nbsp;from <strong>{form.fromName}</strong>, {form.fromAddress} to <strong>{form.toName}</strong>, {form.toAddress}
                      {form.through ? ` through ${form.through}` : ''}.
                    </p>

                    <p style={{ marginBottom: '32px', textAlign: 'justify', fontSize: '1.3rem', lineHeight: '2.2' }}>
                      Vehicle Responsible For Transportation with Registration number: <strong>{form.transportRegNo}</strong>.
                    </p>
                  </div>

                  {/* Footer / Signatures */}
                  <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '32px' }}>
                      NOTE: "NOT FOR SALE"
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '1.2rem', margin: '0 0 8px 0' }}>Thank you &amp; Regards</h4>
                        <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px 0' }}>{COMPANY.owner}</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{COMPANY.name}</p>
                      </div>
                      
                      <div style={{ textAlign: 'center', minWidth: '180px' }}>
                        {signature && (
                          <>
                            <img src={signature} alt="Signature" className="signature-img" style={{ marginBottom: '8px', maxHeight: '80px', objectFit: 'contain' }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#222', borderTop: '2px solid #555', paddingTop: '8px' }}>Authorized Signature</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <ExportButtons targetRef={previewRef} filename={`Delivery_Challan_${form.dcNo}`} onExport={handleExport} />
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
