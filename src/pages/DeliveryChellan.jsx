import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { COMPANY, getNextDcNumber, updateDcCounter, initSettings, saveDc, deleteDc, updateDc, getAllVehicleSections, getCompanyProfile } from '../db';
import SignatureUpload from '../components/SignatureUpload';
import ExportButtons from '../components/ExportButtons';
import CustomDateInput from '../components/CustomDateInput';

export default function DeliveryChellan({ exportItem }) {
  const previewRef = useRef(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form');
  const [savedDcs, setSavedDcs] = useState([]);
  const [vehicleSections, setVehicleSections] = useState([]); // all sections from Vehicle Details
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCustomerField, setActiveCustomerField] = useState(null); // 'to' or 'from'

  // Autocomplete states
  const [transportSuggestions, setTransportSuggestions] = useState([]);
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState([]); // { label, capacity, chassisNo, value }
  const [activeItemDropdown, setActiveItemDropdown] = useState(null); // row index

  const [form, setForm] = useState({
    docName: '',
    dcNo: '',
    date: new Date().toISOString().split('T')[0],
    deliveryType: 'Send',
    basis: 'Monthly rental',
    fromName: COMPANY.name,
    fromAddress: COMPANY.address,
    toName: '',
    toAddress: '',
    through: '',
    transportRegNo: '',
    termsAndConditions: '',
    vehicles: [{ type: 'Forklift', capacity: '5 Ton', regNo: '', value: '' }]
  });

  const [signature, setSignature] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(COMPANY);

  const fetchSaved = async () => {
    const { db } = await import('../db');
    const data = await db.deliveryChellans.toArray();
    setSavedDcs(data.reverse());
  };

  // ── Load vehicle sections ─────────────────────────────────────
  const loadVehicleSections = async () => {
    const sections = await getAllVehicleSections();
    setVehicleSections(sections);
  };

  // ── Transport reg no suggestions (from TRANSPORT section) ────
  const getTransportSuggestions = (query = '') => {
    const transportSection = vehicleSections.find(
      s => s.sectionName.toUpperCase() === 'TRANSPORT'
    );
    if (!transportSection) return [];
    const q = query.toLowerCase();
    return (transportSection.vehicles || []).filter(
      v => v.regNo && (!q || v.regNo.toLowerCase().includes(q))
    );
  };

  const handleTransportRegNoChange = (value) => {
    setForm(f => ({ ...f, transportRegNo: value }));
    const suggestions = getTransportSuggestions(value);
    setTransportSuggestions(suggestions);
    setShowTransportDropdown(true);
  };

  const selectTransportSuggestion = (vehicle) => {
    setForm(f => ({ ...f, transportRegNo: vehicle.regNo }));
    setShowTransportDropdown(false);
    setTransportSuggestions([]);
  };

  const handleCompanySearch = (field, val) => {
    setActiveCustomerField(field);
    const nameKey = field === 'from' ? 'fromName' : 'toName';
    setForm({ ...form, [nameKey]: val });
    
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

  const selectCustomer = (customer) => {
    const isFrom = activeCustomerField === 'from';
    setForm({
      ...form,
      [isFrom ? 'fromName' : 'toName']: customer.companyName || customer.company_name,
      [isFrom ? 'fromAddress' : 'toAddress']: customer.address || '',
    });
    setShowSuggestions(false);
  };

  // ── Item/vehicle autocomplete (all sections except TRANSPORT) ─
  const getItemSuggestions = (query = '') => {
    const q = query.toLowerCase();
    const results = [];
    for (const section of vehicleSections) {
      if (section.sectionName.toUpperCase() === 'TRANSPORT') continue;
      const name = section.sectionName;
      // Extract capacity from section name (e.g. "3 TON", "5 TON")
      const tonMatch = name.match(/(\d+)\s*TON/i);
      const capacity = tonMatch ? `${tonMatch[1]} Ton` : '';
      
      // Simplify the inserted type based on section name
      let simpleType = name;
      const nameLower = name.toLowerCase();
      if (nameLower.includes('forklift')) simpleType = 'Forklift';
      else if (nameLower.includes('crane')) simpleType = 'Crane';
      else if (nameLower.includes('trailer')) simpleType = 'Trailer';
      else if (nameLower.includes('truck')) simpleType = 'Truck';

      for (const v of (section.vehicles || [])) {
        const labelParts = [name, v.name].filter(Boolean);
        const label = labelParts.join(' – ');
        if (
          !q ||
          name.toLowerCase().includes(q) ||
          (v.name && v.name.toLowerCase().includes(q)) ||
          label.toLowerCase().includes(q)
        ) {
          results.push({
            label,
            typeDisplay: simpleType,    // shown as the "Type" cell
            capacity,
            chassisNo: v.chassisNo || '',
            value: v.value || '',
            regNo: v.regNo || ''
          });
        }
      }
    }
    return results;
  };

  const handleItemTypeChange = (idx, value) => {
    updateVehicle(idx, 'type', value);
    const suggestions = getItemSuggestions(value);
    setItemSuggestions(suggestions);
    setActiveItemDropdown(idx);
  };

  const selectItemSuggestion = (idx, suggestion) => {
    const newVehicles = [...form.vehicles];
    newVehicles[idx] = {
      ...newVehicles[idx],
      type: suggestion.typeDisplay,
      capacity: suggestion.capacity,
      regNo: suggestion.chassisNo, // chassis no goes into the chassis column
      value: suggestion.value
    };
    setForm(f => ({ ...f, vehicles: newVehicles }));
    setActiveItemDropdown(null);
    setItemSuggestions([]);
  };

  useEffect(() => {
    const init = async () => {
      const itemToLoad = exportItem || location.state?.loadItem;
      if (itemToLoad) {
        const dc = itemToLoad;
        if (dc.data.form) {
          setForm({ ...dc.data.form, id: dc.id });
          if (dc.data.signature) setSignature(dc.data.signature);
        } else {
          setForm({ ...dc.data, id: dc.id });
        }
        setActiveTab('preview');
        
        const profile = await getCompanyProfile();
        if (profile) setCompanyProfile(profile);
        return;
      }

      await initSettings();
      const num = await getNextDcNumber();
      const formattedNum = `OSC${String(num).padStart(4, '0')}`;
      setForm(f => ({ ...f, dcNo: formattedNum }));
      
      const { db: database } = await import('../db');
      const allCustomers = await database.customers.toArray();
      setCustomers(allCustomers);
      
      await fetchSaved();
      await loadVehicleSections();

      const profile = await getCompanyProfile();
      setCompanyProfile(profile);
      setForm(f => ({ 
        ...f, 
        termsAndConditions: '',
        fromName: profile.name,
        fromAddress: profile.address
      }));
    };
    init();
  }, [location.state, exportItem]);

  const loadDc = (dc) => {
    if (dc.data.form) {
      setForm({ ...dc.data.form, id: dc.id });
      if (dc.data.signature) setSignature(dc.data.signature);
    } else {
      setForm({ ...dc.data, id: dc.id }); // Legacy format without signature
    }
    setActiveTab('preview');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this delivery challan from storage?')) {
      await deleteDc(id);
      await fetchSaved();
    }
  };

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

  const handleSaveOnly = async () => {
    const dcData = {
      dcNo: form.dcNo,
      docName: form.docName || `DC ${form.dcNo}`,
      date: form.date,
      clientCompany: form.toName,
      data: { form, signature }
    };
    if (form.id) {
      await updateDc(form.id, dcData);
      alert('Document updated successfully!');
    } else {
      const newId = await saveDc(dcData);
      setForm(f => ({ ...f, id: newId }));
      alert('Document saved to database successfully!');
    }
    await fetchSaved();
  };

  const handleExport = async () => {
    const dcData = {
      dcNo: form.dcNo,
      docName: form.docName || `DC ${form.dcNo}`,
      date: form.date,
      clientCompany: form.toName,
      data: { form, signature }
    };
    if (form.id) {
      await updateDc(form.id, dcData);
    } else {
      const newId = await saveDc(dcData);
      setForm(f => ({ ...f, id: newId }));
    }
    await fetchSaved();
    
    // Auto-increment logic
    const numericPart = form.dcNo.replace(/\D/g, '');
    const incVal = parseInt(numericPart, 10) || 0;
    await updateDcCounter(incVal.toString());
    
    const nextNum = await getNextDcNumber();
    const formattedNum = `OSC${String(nextNum).padStart(4, '0')}`;
    setForm(f => ({ ...f, dcNo: formattedNum, id: undefined }));
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
        <div style={{ marginTop: '8px' }}>
          <a href="https://ewaybillgst.gov.in/Login.aspx" target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>E-WAY LOGIN</a>
        </div>
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
                <input className="form-control" placeholder="E.g. XYZ Corp Machine Transfer"
                  value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Basic Details</div>
              <div className="form-row form-row-2" style={{ marginBottom: '16px' }}>
                <div className="form-group mb-0">
                  <label>Date</label>
                  <CustomDateInput className="form-control" value={form.date} onChange={val => setForm({ ...form, date: val })} />
                </div>
                <div className="form-group mb-0">
                  <label>DC No.</label>
                  <input className="form-control" placeholder="e.g. OSC0029"
                    value={form.dcNo} onChange={e => setForm({ ...form, dcNo: e.target.value })} />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group mb-0">
                  <label>Movement Type</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="radio" value="Send" checked={form.deliveryType === 'Send'} 
                        onChange={() => setForm({ ...form, deliveryType: 'Send' })} />
                      Send
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="radio" value="Return" checked={form.deliveryType === 'Return'} 
                        onChange={() => setForm({ ...form, deliveryType: 'Return' })} />
                      Return
                    </label>
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label>Rental / Transport Basis</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="radio" value="Monthly rental" checked={form.basis === 'Monthly rental'} 
                        onChange={() => setForm({ ...form, basis: 'Monthly rental' })} />
                      Monthly rental
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="radio" value="Daily basis" checked={form.basis === 'Daily basis'} 
                        onChange={() => setForm({ ...form, basis: 'Daily basis' })} />
                      Daily basis
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
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
                <div className="form-group mb-0 autocomplete-wrapper">
                  <label>From (Name)</label>
                  <input className="form-control" placeholder="Sender Name"
                    value={form.fromName} 
                    onChange={e => handleCompanySearch('from', e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => form.fromName.length >= 2 && handleCompanySearch('from', form.fromName)}
                  />
                  {showSuggestions && activeCustomerField === 'from' && (
                    <div className="autocomplete-dropdown">
                      {suggestions.map(c => (
                        <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                          <div className="company-name">{c.companyName || c.company_name}</div>
                          <div className="gstin-text">{c.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group mb-0">
                  <label>From (Address)</label>
                  <textarea className="form-control" placeholder="Sender Address" rows={2} style={{ marginBottom: 0 }}
                    value={form.fromAddress} onChange={e => setForm({ ...form, fromAddress: e.target.value })} />
                </div>
              </div>
              
              <div className="form-row form-row-2" style={{ borderTop: '1px dashed #ddd', paddingTop: '16px', marginBottom: '16px' }}>
                <div className="form-group mb-0 autocomplete-wrapper">
                  <label>To (Name)</label>
                  <input className="form-control" placeholder="Receiver Name (e.g. INDOSOL SOLAR PVT LTD)"
                    value={form.toName}
                    onChange={e => handleCompanySearch('to', e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => form.toName.length >= 2 && handleCompanySearch('to', form.toName)}
                  />
                  {showSuggestions && activeCustomerField === 'to' && (
                    <div className="autocomplete-dropdown">
                      {suggestions.map(c => (
                        <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                           <div className="company-name">{c.companyName || c.company_name}</div>
                           <div className="gstin-text">{c.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
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
              <div className="form-group mb-0" style={{ position: 'relative' }}>
                <label>Vehicle Responsible For Transportation (Registration Number)</label>
                <input
                  className="form-control"
                  placeholder="e.g. TN 88 F 0907 – type to search from Transport section"
                  style={{ marginBottom: 0 }}
                  value={form.transportRegNo}
                  onChange={e => handleTransportRegNoChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowTransportDropdown(false), 150)}
                  onFocus={() => {
                    const s = getTransportSuggestions(form.transportRegNo);
                    setTransportSuggestions(s);
                    setShowTransportDropdown(true);
                  }}
                  autoComplete="off"
                />
                {showTransportDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    overflow: 'hidden', marginTop: '2px'
                  }}>
                    {transportSuggestions.map((v, i) => (
                      <div
                        key={i}
                        onMouseDown={() => selectTransportSuggestion(v)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex', flexDirection: 'column', gap: '2px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.regNo}</span>
                        {v.name && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.name}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Transported Items / Vehicles</div>
              
              <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '200px' }}>Type / Vehicle</th>
                      <th style={{ width: '120px' }}>Capacity/Ton</th>
                      <th>Chassis Number</th>
                      <th>Value (in ₹)</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.vehicles.map((v, idx) => (
                      <tr key={idx}>
                        <td style={{ position: 'relative' }}>
                          <input
                            className="form-control"
                            placeholder="Type to search (e.g. forklift, crane, tailift…)"
                            value={v.type}
                            onChange={e => handleItemTypeChange(idx, e.target.value)}
                            onBlur={() => setTimeout(() => setActiveItemDropdown(null), 150)}
                            onFocus={() => {
                              const s = getItemSuggestions(v.type);
                              setItemSuggestions(s);
                              setActiveItemDropdown(idx);
                            }}
                            autoComplete="off"
                          />
                          {activeItemDropdown === idx && itemSuggestions.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                              borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                              overflow: 'hidden', marginTop: '2px', minWidth: '280px'
                            }}>
                              {itemSuggestions.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  onMouseDown={() => selectItemSuggestion(idx, s)}
                                  style={{
                                    padding: '10px 14px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex', flexDirection: 'column', gap: '2px'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.label}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {s.capacity && `Capacity: ${s.capacity}`}
                                    {s.chassisNo && ` · Chassis: ${s.chassisNo}`}
                                    {s.value && ` · ₹${s.value}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
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

              <button className="btn btn-sm btn-secondary" onClick={addVehicle}>
                <Plus size={14} /> Add Transported Item
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
                <div className="doc-preview">
                  <div className="doc-preview-inner" style={{ minHeight: '900px', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <div className="doc-header">
                        <img src="/logo.png" alt="Logo" className="logo-img" style={{ height: '70px', width: '70px', objectFit: 'contain', marginRight: '16px' }} />
                        <span className="company-title" style={{ fontSize: '2.4rem', color: '#ff3d00', letterSpacing: '1px' }}>{companyProfile.name}</span>
                      </div>
                      <div className="doc-subheader" style={{ fontSize: '1.2rem', marginTop: '4px' }}>{companyProfile.tagline}</div>
                      <div className="doc-company-contacts" style={{ fontSize: '1rem', marginTop: '6px' }}>
                        Email: {companyProfile.email} &nbsp;&nbsp; mobile: {companyProfile.mobile}
                      </div>
                      <div className="doc-company-contacts" style={{ fontSize: '1rem', marginTop: '4px' }}>
                        GST NUMBER: {companyProfile.gstin}. &nbsp;&nbsp;&nbsp;&nbsp; Website: {companyProfile.website}
                      </div>
                    </div>

                    <hr className="doc-divider" style={{ borderTop: '2px solid #555', margin: '16px 0' }} />

                    {/* Title Row with Date and DC No */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 40px 0' }}>
                      <div style={{ width: '220px' }}></div>
                      
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>
                        Delivery Challan
                      </div>
                      
                      <div style={{ width: '220px', fontSize: '0.95rem', fontWeight: 600, textAlign: 'right', lineHeight: '1.6' }}>
                        <div>Date: {formatDate(form.date)}</div>
                        <div>DC No: {form.dcNo}</div>
                      </div>
                    </div>

                    {/* Text Paragraphs */}
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
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '16px' }}>
                        NOTE: "NOT FOR SALE"
                      </div>

                      {form.termsAndConditions && (
                        <div style={{ marginBottom: '24px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', textDecoration: 'underline' }}>TERMS & CONDITIONS:</div>
                          <div style={{ fontSize: '0.85rem', color: '#444', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                            {form.termsAndConditions}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <h4 style={{ color: '#c8952e', fontWeight: 700, fontSize: '1.2rem', margin: '0 0 8px 0' }}>Thank you &amp; Regards</h4>
                          <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px 0' }}>{companyProfile.owner}</p>
                          <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{companyProfile.name}</p>
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
            </div>
            <ExportButtons targetRef={previewRef} filename={form.docName || `Delivery_Challan_${form.dcNo}`} onExport={handleExport} onSaveOnly={handleSaveOnly} />
          </div>

          {/* === STORAGE === */}
          {activeTab === 'storage' && (
            <div className="doc-storage-panel fade-in" style={{ width: '100%', flex: 1 }}>
              <div className="card">
                <div className="card-title">Saved Delivery Challans</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Doc Name</th>
                        <th>DC No</th>
                        <th>Client</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedDcs.map(dc => (
                        <tr key={dc.id}>
                          <td>{formatDate(dc.date)}</td>
                          <td><strong>{dc.docName}</strong></td>
                          <td>{dc.dcNo}</td>
                          <td>{dc.clientCompany}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => loadDc(dc)}>Edit / View</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(dc.id)}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {savedDcs.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No saved delivery challans found.</td></tr>
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
