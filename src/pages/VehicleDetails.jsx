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
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: toast.type === 'info' ? 'var(--accent-gold)' : '#22c55e',
          color: '#fff', padding: '10px 20px', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          animation: 'fadeInDown 0.2s ease'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h1>Vehicle Details</h1>
        <p>Store your company's vehicle registration &amp; chassis numbers for use in Delivery Challans</p>
      </div>

      <div className="page-body fade-in">
        {/* Top actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={handleAddSection}>
            <Plus size={16} /> Add New Section
          </button>
        </div>

        {sections.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Car size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p>No vehicle sections yet. Click <strong>Add New Section</strong> to begin.</p>
          </div>
        )}

        {sections.map(section => (
          <div
            key={section.id}
            className="card"
            style={{ marginBottom: '20px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
          >
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: collapsed[section.id] ? 0 : '16px',
              flexWrap: 'wrap'
            }}>
              {/* Section name editable */}
              <Car size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
              <input
                className="form-control"
                value={section.sectionName}
                onChange={e => handleSectionNameChange(section.id, e.target.value)}
                style={{
                  flex: 1, minWidth: '180px', fontWeight: 700, fontSize: '1rem',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  border: '1.5px dashed var(--border-color)', background: 'transparent',
                  marginBottom: 0
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleSaveSection(section)}
                  disabled={saving[section.id]}
                  title="Save this section"
                >
                  {saving[section.id]
                    ? <span style={{ fontSize: '0.8rem' }}>Saving…</span>
                    : <><Save size={14} /> Save</>}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => toggleCollapse(section.id)}
                  title="Collapse / Expand"
                >
                  {collapsed[section.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteSection(section.id)}
                  title="Delete section"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Section body */}
            {!collapsed[section.id] && (
              <>
                <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '130px' }}>Name / Label</th>
                        <th style={{ minWidth: '150px' }}>Registration Number</th>
                        <th style={{ minWidth: '180px' }}>Chassis Number</th>
                        <th style={{ minWidth: '120px' }}>Value (₹)</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(section.vehicles || []).map((v, vIdx) => (
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
                            <input
                              className="form-control"
                              placeholder="e.g. 5,00,000"
                              value={v.value}
                              onChange={e => handleVehicleChange(section.id, vIdx, 'value', e.target.value)}
                            />
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
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleAddVehicle(section.id)}>
                    <Plus size={14} /> Add Vehicle Row
                  </button>
                </div>
              </>
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
