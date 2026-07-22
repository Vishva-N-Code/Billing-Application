import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Car, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getAllVehicleSections,
  saveVehicleSection,
  updateVehicleSection,
  deleteVehicleSection,
  initSettings
} from '../db';

const emptyVehicle = () => ({ name: '', regNo: '', chassisNo: '', value: '' });

export default function VehicleDetails() {
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState({}); // sectionId -> bool
  const [collapsed, setCollapsed] = useState({}); // sectionId -> bool
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadSections = useCallback(async () => {
    await initSettings(); // ensures seed runs
    const data = await getAllVehicleSections();
    setSections(data);
  }, []);

  useEffect(() => {
    loadSections();
    const handleSyncComplete = () => loadSections();
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sync-complete', handleSyncComplete);
  }, [loadSections]);

  // ── Section-level actions ─────────────────────────────────────
  const handleAddSection = async () => {
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.order || 0), 0);
    const newSection = {
      sectionName: 'NEW SECTION',
      order: maxOrder + 1,
      vehicles: [emptyVehicle()]
    };
    const newId = await saveVehicleSection(newSection);
    setSections(prev => [...prev, { ...newSection, id: newId }]);
    setCollapsed(prev => ({ ...prev, [newId]: false }));
    showToast('New section added.');
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this entire section and all its vehicle entries?')) return;
    await deleteVehicleSection(id);
    setSections(prev => prev.filter(s => s.id !== id));
    showToast('Section deleted.', 'info');
  };

  const handleSectionNameChange = (id, value) => {
    setSections(prev =>
      prev.map(s => s.id === id ? { ...s, sectionName: value } : s)
    );
  };

  const toggleCollapse = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Vehicle-row-level actions ────────────────────────────────
  const handleVehicleChange = (sectionId, vIdx, field, value) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s;
        const vehicles = s.vehicles.map((v, i) =>
          i === vIdx ? { ...v, [field]: value } : v
        );
        return { ...s, vehicles };
      })
    );
  };

  const handleAddVehicle = (sectionId) => {
    setSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, vehicles: [...s.vehicles, emptyVehicle()] }
          : s
      )
    );
  };

  const handleRemoveVehicle = (sectionId, vIdx) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s;
        const vehicles = s.vehicles.filter((_, i) => i !== vIdx);
        return { ...s, vehicles: vehicles.length === 0 ? [emptyVehicle()] : vehicles };
      })
    );
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSaveSection = async (section) => {
    setSaving(prev => ({ ...prev, [section.id]: true }));
    await updateVehicleSection(section.id, {
      sectionName: section.sectionName,
      order: section.order,
      vehicles: section.vehicles
    });
    setSaving(prev => ({ ...prev, [section.id]: false }));
    showToast(`"${section.sectionName}" saved!`);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`toast fade-in ${toast.type || 'success'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h1>Vehicle Fleet Management</h1>
        <p>Centrally manage your cranes, forklifts, and transportation vehicles for quick auto-fill.</p>
      </div>

      <div className="page-body">
        {/* Top actions */}
        <div className="toolbar fade-in">
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary" onClick={handleAddSection}>
            <Plus size={18} /> ADD NEW SECTION
          </button>
        </div>

        {sections.length === 0 && (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Car size={48} style={{ marginBottom: '20px', opacity: 0.2, color: 'var(--accent-gold)' }} />
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Vehicle Sections</h3>
            <p style={{ color: 'var(--text-muted)' }}>Click "Add New Section" to start building your fleet database.</p>
          </div>
        )}

        {sections.map(section => (
          <div
            key={section.id}
            className="card fade-in"
            style={{ marginBottom: '24px' }}
          >
            {/* Section header */}
            <div className="section-header-compact">
              <div className="section-icon">
                <Car size={18} />
              </div>
              
              <input
                className="form-control"
                value={section.sectionName}
                onChange={e => handleSectionNameChange(section.id, e.target.value)}
                placeholder="SECTION NAME"
                style={{
                  flex: 1, minWidth: '200px', fontWeight: 800, fontSize: '1.1rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  border: 'none', background: 'transparent', padding: '4px 0'
                }}
              />
              
              <div className="btn-group" style={{ marginLeft: 'auto' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleSaveSection(section)}
                  disabled={saving[section.id]}
                >
                  {saving[section.id]
                    ? <span className="spin" style={{ display: 'inline-block' }}>◌</span>
                    : <><Save size={14} /> SAVE</>}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => toggleCollapse(section.id)}
                >
                  {collapsed[section.id] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteSection(section.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Section body */}
            {!collapsed[section.id] && (
              <div className="slide-in">
                <div className="table-wrapper" style={{ marginBottom: '20px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '160px' }}>VEHICLE NAME / BRAND</th>
                        <th style={{ minWidth: '140px' }}>REG. NUMBER</th>
                        <th style={{ minWidth: '160px' }}>CHASSIS NUMBER</th>
                        <th style={{ minWidth: '140px' }}>FC EXPIRY</th>
                        <th style={{ minWidth: '140px' }}>INSURANCE EXPIRY</th>
                        <th style={{ minWidth: '140px' }}>SAFETY CERT EXPIRY</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(section.vehicles || []).map((v, vIdx) => {
                        const checkExpiryStatus = (dateStr) => {
                          if (!dateStr) return null;
                          const exp = new Date(dateStr);
                          const now = new Date();
                          const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                          if (diffDays < 0) return { label: 'EXPIRED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
                          if (diffDays <= 30) return { label: `${diffDays}d left`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
                          return { label: 'VALID', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
                        };

                        const fcStatus = checkExpiryStatus(v.fcExpiry);
                        const insStatus = checkExpiryStatus(v.insuranceExpiry);
                        const safetyStatus = checkExpiryStatus(v.safetyCertExpiry);

                        return (
                          <tr key={vIdx}>
                            <td>
                              <input
                                className="form-control"
                                placeholder="e.g. Unit 1 / Baoli"
                                value={v.name}
                                onChange={e => handleVehicleChange(section.id, vIdx, 'name', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="form-control"
                                placeholder="e.g. TN 88 F 0907"
                                value={v.regNo}
                                onChange={e => handleVehicleChange(section.id, vIdx, 'regNo', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="form-control"
                                placeholder="e.g. CLG2000XYZ123"
                                value={v.chassisNo}
                                onChange={e => handleVehicleChange(section.id, vIdx, 'chassisNo', e.target.value)}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="date"
                                  className="form-control"
                                  value={v.fcExpiry || ''}
                                  onChange={e => handleVehicleChange(section.id, vIdx, 'fcExpiry', e.target.value)}
                                />
                                {fcStatus && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: fcStatus.color, background: fcStatus.bg, padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                    FC: {fcStatus.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="date"
                                  className="form-control"
                                  value={v.insuranceExpiry || ''}
                                  onChange={e => handleVehicleChange(section.id, vIdx, 'insuranceExpiry', e.target.value)}
                                />
                                {insStatus && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: insStatus.color, background: insStatus.bg, padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                    INS: {insStatus.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="date"
                                  className="form-control"
                                  value={v.safetyCertExpiry || ''}
                                  onChange={e => handleVehicleChange(section.id, vIdx, 'safetyCertExpiry', e.target.value)}
                                />
                                {safetyStatus && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: safetyStatus.color, background: safetyStatus.bg, padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                    CERT: {safetyStatus.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn-icon"
                                onClick={() => handleRemoveVehicle(section.id, vIdx)}
                                title="Remove this vehicle row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="btn-group" style={{ marginTop: '12px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleAddVehicle(section.id)}>
                    <Plus size={14} /> ADD VEHICLE ROW
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
