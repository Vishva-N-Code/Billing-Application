import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Calendar, ChevronDown, Save, X, AlertCircle, CheckCircle, Clock, Edit, Trash2, RefreshCw } from 'lucide-react';
import { getWorkLogs, addWorkLog, updateWorkLog, deleteWorkLog, getOperators, getVehicles, getCustomers, getSettings, getWorkLogsByOperatorDate } from '../db';

const todayStr = new Date().toISOString().split('T')[0];

// OT hours dropdown options (0, 0.5, 1 ... 12)
const OT_HOUR_OPTIONS = [];
for (let h = 0; h <= 12; h += 0.5) OT_HOUR_OPTIONS.push(h);

// ─── Sunday OT helpers ───────────────────────────────────────
// Returns true if the given date string (YYYY-MM-DD) falls on a Sunday.
// Uses local midnight so there's no timezone ambiguity.
function isSunday(dateStr) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0; // 0 = Sunday
}

const SUNDAY_REMARKS_TAG = '[SUNDAY OT]';

function StatusBadge({ status }) {
  const s = status === 'PRESENT'
    ? { bg: '#10b98120', color: '#10b981' }
    : { bg: '#ef444420', color: '#ef4444' };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
      {status}
    </span>
  );
}

function SearchSelect({ options, value, onChange, placeholder, displayKey, valueKey = 'id', onCreate, createLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    (typeof displayKey === 'function' ? displayKey(o) : o[displayKey])
      .toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(o => o[valueKey] === value);
  const displayLabel = selected ? (typeof displayKey === 'function' ? displayKey(selected) : selected[displayKey]) : '';

  const showCreate = onCreate && search.trim().length > 0 && !options.some(o => (typeof displayKey === 'function' ? displayKey(o) : o[displayKey]).toLowerCase() === search.trim().toLowerCase());

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          background: '#0f1117',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: displayLabel ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: '0.88rem',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel || placeholder}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, marginLeft: 6, opacity: 0.5 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 999,
          background: '#1a1d27',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          marginTop: 4,
          maxHeight: 260,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            <div
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ padding: '10px 14px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem' }}
            >
              — None —
            </div>
            {filtered.map(opt => (
              <div
                key={opt[valueKey]}
                onClick={() => { onChange(opt[valueKey]); setOpen(false); setSearch(''); }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '0.85rem',
                  background: opt[valueKey] === value ? 'rgba(59,130,246,0.12)' : 'transparent',
                  borderLeft: opt[valueKey] === value ? '2px solid #3b82f6' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (opt[valueKey] !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (opt[valueKey] !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {typeof displayKey === 'function' ? displayKey(opt) : opt[displayKey]}
              </div>
            ))}
            {filtered.length === 0 && !showCreate && <div style={{ padding: 16, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: '0.83rem' }}>No results</div>}
            {showCreate && (
              <div
                onClick={async () => {
                  const val = search.trim();
                  setSearch('');
                  setOpen(false);
                  await onCreate(val);
                }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  color: '#10b981',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderTop: filtered.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                + {createLabel || 'Add'} "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkLogForm({ onSave, onCancel, onRefresh, operators, vehicles, customers, settings, defaultDate, initialData }) {
  const [form, setForm] = useState({
    work_date: defaultDate || todayStr,
    operator_id: '',
    vehicle_id: '',
    customer_id: '',
    rental_type: 'MONTHLY',
    work_status: 'PRESENT',
    shift_count: 1,
    ot_hours: 0,
    ot_rate: parseFloat(settings?.ot_rate_per_hour || 500),
    remarks: '',
    start_time: '',
    end_time: '',
    ...(initialData || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [workMeasurement, setWorkMeasurement] = useState(
    initialData?.shift_count === 0 && initialData?.ot_hours > 0 ? 'HOURLY' : 'SHIFT'
  );

  const isEdit = !!initialData?.id;
  const isSundayWork = isSunday(form.work_date);
  const otAmount = parseFloat(form.ot_hours || 0) * parseFloat(form.ot_rate || 0);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-tag remarks with [SUNDAY OT] when date changes to a Sunday
  useEffect(() => {
    if (!form.work_date || isEdit) return;
    if (isSunday(form.work_date)) {
      setForm(f => ({
        ...f,
        remarks: f.remarks.includes(SUNDAY_REMARKS_TAG)
          ? f.remarks
          : (f.remarks ? `${SUNDAY_REMARKS_TAG} ${f.remarks}` : SUNDAY_REMARKS_TAG),
      }));
    } else {
      // Remove Sunday tag when date is changed away from Sunday
      setForm(f => ({
        ...f,
        remarks: f.remarks.replace(SUNDAY_REMARKS_TAG, '').trim(),
      }));
    }
  }, [form.work_date]);

  const handleCreateCustomer = async (name) => {
    try {
      const { addCustomer } = await import('../db');
      const newCust = await addCustomer({ company_name: name, status: 'ACTIVE' });
      if (onRefresh) await onRefresh();
      set('customer_id', newCust.id);
    } catch (e) {
      alert('Error creating customer: ' + e.message);
    }
  };

  const setStatus = (status) => {
    if (status === 'ABSENT') {
      setForm(f => ({ ...f, work_status: 'ABSENT', shift_count: 0, ot_hours: 0 }));
    } else {
      setForm(f => ({ ...f, work_status: 'PRESENT', shift_count: workMeasurement === 'SHIFT' ? 1 : 0 }));
    }
  };

  const handleMeasurementChange = (type) => {
    setWorkMeasurement(type);
    if (type === 'HOURLY') {
      setForm(f => ({ ...f, shift_count: 0 }));
    } else {
      setForm(f => ({ ...f, shift_count: 1 }));
    }
  };

  // Check duplicate (only when operator is selected)
  useEffect(() => {
    async function check() {
      if (!form.operator_id || !form.work_date || isEdit) return;
      const existing = await getWorkLogsByOperatorDate(form.operator_id, form.work_date);
      if (existing.length > 0) {
        const op = operators.find(o => o.id === form.operator_id);
        setDuplicateWarning(`${op?.full_name || 'Operator'} already has ${existing.length} work entry(s) for this date. You can still add another.`);
      } else {
        setDuplicateWarning('');
      }
    }
    check();
  }, [form.operator_id, form.work_date]);

  const validate = () => {
    if (!form.work_date) return 'Please select a date.';
    if (form.work_status === 'PRESENT' && parseFloat(form.shift_count) < 1 && workMeasurement === 'SHIFT') return 'Present work must have at least 1 shift.';
    if (form.work_status === 'ABSENT' && parseFloat(form.ot_hours) > 0) return 'OT cannot be added for an absent work entry.';
    return '';
  };

  const handleSave = async (andAnother = false) => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');

    const payload = { ...form, ot_amount: otAmount };
    delete payload.operator;
    delete payload.vehicle;
    delete payload.customer;

    if (!payload.start_time) payload.start_time = null;
    if (!payload.end_time) payload.end_time = null;
    if (!payload.vehicle_id) payload.vehicle_id = null;
    if (!payload.customer_id) payload.customer_id = null;
    if (!payload.operator_id) payload.operator_id = null;

    try {
      await onSave(payload, andAnother);
      if (!andAnother) onCancel();
      else setForm(f => ({ ...f, operator_id: '', vehicle_id: '', customer_id: '', ot_hours: 0, remarks: '', start_time: '', end_time: '' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  const allowedShifts = (settings?.allowed_shift_values || '1,1.5,2').split(',').map(Number);

  return (
    <div style={{
      background: 'var(--bg-card, #1a1d27)',
      border: isSundayWork ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(59,130,246,0.3)',
      borderRadius: 12, padding: 24, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEdit ? '✏️ Edit Work Entry' : '+ New Work Entry'}
          {isSundayWork && (
            <span style={{ background: '#f97316', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              ☀️ SUNDAY OT
            </span>
          )}
        </h3>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={20} /></button>
      </div>

      {/* Sunday OT Banner */}
      {isSundayWork && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))',
          border: '1px solid rgba(249,115,22,0.4)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>☀️</span>
          <div>
            <div style={{ color: '#f97316', fontWeight: 800, fontSize: '0.88rem', marginBottom: 2 }}>Sunday — Full OT Day</div>
            <div style={{ color: 'rgba(249,115,22,0.75)', fontSize: '0.78rem', lineHeight: 1.5 }}>
              Work done on Sunday is automatically treated as Overtime (OT) for both the operator and the company.
              All shifts today count as OT shifts. Please set the OT hours accordingly.
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f59e0b', fontSize: '0.83rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {duplicateWarning}
        </div>
      )}
      {error && (
        <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.83rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <label style={lbl}>DATE *</label>
          <input type="date" value={form.work_date} onChange={e => set('work_date', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>OPERATOR (Optional)</label>
          <SearchSelect
            options={operators}
            value={form.operator_id}
            onChange={v => set('operator_id', v)}
            placeholder="— No operator —"
            displayKey={o => `${o.full_name} (${o.operator_code})`}
          />
        </div>
        <div>
          <label style={lbl}>VEHICLE</label>
          <SearchSelect
            options={vehicles}
            value={form.vehicle_id}
            onChange={v => set('vehicle_id', v)}
            placeholder="Select vehicle..."
            displayKey={o => o.model ? `${o.model} (${o.vehicle_code})` : `${o.vehicle_code} — ${o.vehicle_type}`}
          />
        </div>
        <div>
          <label style={lbl}>CUSTOMER</label>
          <SearchSelect
            options={customers}
            value={form.customer_id}
            onChange={v => set('customer_id', v)}
            placeholder="Select customer..."
            displayKey={o => o.company_name}
            onCreate={handleCreateCustomer}
            createLabel="Add new customer"
          />
        </div>
        <div>
          <label style={lbl}>RENTAL TYPE</label>
          <select value={form.rental_type} onChange={e => set('rental_type', e.target.value)} style={inp}>
            <option value="MONTHLY">Monthly</option>
            <option value="DAILY">Daily</option>
          </select>
        </div>
        <div>
          <label style={lbl}>WORK STATUS *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setStatus('PRESENT')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 800, fontSize: '0.83rem', transition: 'all 0.15s', background: form.work_status === 'PRESENT' ? '#10b981' : 'transparent', borderColor: form.work_status === 'PRESENT' ? '#10b981' : 'rgba(16,185,129,0.3)', color: form.work_status === 'PRESENT' ? '#fff' : '#10b981' }}
            >PRESENT</button>
            <button
              onClick={() => setStatus('ABSENT')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 800, fontSize: '0.83rem', transition: 'all 0.15s', background: form.work_status === 'ABSENT' ? '#ef4444' : 'transparent', borderColor: form.work_status === 'ABSENT' ? '#ef4444' : 'rgba(239,68,68,0.3)', color: form.work_status === 'ABSENT' ? '#fff' : '#ef4444' }}
            >ABSENT</button>
          </div>
        </div>
        <div>
          <label style={lbl}>WORK MEASUREMENT</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleMeasurementChange('SHIFT')}
              disabled={form.work_status === 'ABSENT'}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 800, fontSize: '0.83rem', transition: 'all 0.15s', opacity: form.work_status === 'ABSENT' ? 0.4 : 1, background: workMeasurement === 'SHIFT' ? '#3b82f6' : 'transparent', borderColor: workMeasurement === 'SHIFT' ? '#3b82f6' : 'rgba(59,130,246,0.3)', color: workMeasurement === 'SHIFT' ? '#fff' : '#3b82f6' }}
            >SHIFT</button>
            <button
              onClick={() => handleMeasurementChange('HOURLY')}
              disabled={form.work_status === 'ABSENT'}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 800, fontSize: '0.83rem', transition: 'all 0.15s', opacity: form.work_status === 'ABSENT' ? 0.4 : 1, background: workMeasurement === 'HOURLY' ? '#8b5cf6' : 'transparent', borderColor: workMeasurement === 'HOURLY' ? '#8b5cf6' : 'rgba(139,92,246,0.3)', color: workMeasurement === 'HOURLY' ? '#fff' : '#8b5cf6' }}
            >HOURLY</button>
          </div>
        </div>
        {workMeasurement === 'SHIFT' && (
          <div>
            <label style={lbl}>TOTAL SHIFTS</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.work_status === 'ABSENT' ? 0 : (form.shift_count === 0 ? '' : form.shift_count)}
              onChange={e => set('shift_count', e.target.value)}
              placeholder="0"
              disabled={form.work_status === 'ABSENT'}
              style={{ ...inp, opacity: form.work_status === 'ABSENT' ? 0.4 : 1 }}
            />
          </div>
        )}
        <div>
          <label style={lbl}>{workMeasurement === 'HOURLY' ? 'TOTAL HOURS' : 'OT HOURS'}</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.work_status === 'ABSENT' ? 0 : (form.ot_hours === 0 ? '' : form.ot_hours)}
            onChange={e => set('ot_hours', e.target.value)}
            placeholder="0"
            disabled={form.work_status === 'ABSENT'}
            style={{ ...inp, opacity: form.work_status === 'ABSENT' ? 0.4 : 1 }}
          />
        </div>
        <div>
          <label style={lbl}>START TIME (Optional)</label>
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} disabled={form.work_status === 'ABSENT'} style={{ ...inp, opacity: form.work_status === 'ABSENT' ? 0.4 : 1 }} />
        </div>
        <div>
          <label style={lbl}>END TIME (Optional)</label>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} disabled={form.work_status === 'ABSENT'} style={{ ...inp, opacity: form.work_status === 'ABSENT' ? 0.4 : 1 }} />
        </div>
        <div>
          <label style={lbl}>{workMeasurement === 'HOURLY' ? 'HOURLY RATE (₹/hr)' : 'OT RATE (₹/hr)'}</label>
          <input type="number" value={form.ot_rate} onChange={e => set('ot_rate', parseFloat(e.target.value) || 0)} style={{ ...inp }} />
        </div>
        <div>
          <label style={lbl}>{workMeasurement === 'HOURLY' ? 'TOTAL AMOUNT (Auto)' : 'OT AMOUNT (Auto)'}</label>
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', color: '#f59e0b', fontWeight: 800, fontSize: '0.95rem' }}>
            ₹{otAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={lbl}>REMARKS (Optional)</label>
        <input
          type="text"
          value={form.remarks}
          onChange={e => set('remarks', e.target.value)}
          placeholder="Any notes..."
          style={inp}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Entry'}
        </button>
        {!isEdit && (
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140', borderRadius: 8, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Save & Add Another
          </button>
        )}
        <button
          onClick={onCancel}
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 18px', fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function OmsWorkLog() {
  // '' = All dates (no filter), otherwise a specific date string
  const [date, setDate] = useState('');
  const [logs, setLogs] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [filterOp, setFilterOp] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (date) filters.date = date;

      let [l, ops, vehs, custs, s] = await Promise.all([
        getWorkLogs(filters),
        getOperators(),
        getVehicles(),
        getCustomers(),
        getSettings(),
      ]);

      setLogs(l);
      setOperators(ops);
      setVehicles(vehs);
      setCustomers(custs);
      setSettings(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  const handleSave = async (formData) => {
    if (editLog) {
      await updateWorkLog(editLog.id, formData);
      showToast('Work entry updated!');
      setEditLog(null);
    } else {
      await addWorkLog(formData);
      showToast('Work entry saved!');
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this work entry?')) return;
    await deleteWorkLog(id);
    showToast('Entry deleted.');
    await load();
  };

  const filteredLogs = filterOp ? logs.filter(l => l.operator_id === filterOp) : logs;
  const totalShifts = filteredLogs.reduce((s, l) => s + parseFloat(l.shift_count || 0), 0);
  const totalOT = filteredLogs.reduce((s, l) => s + parseFloat(l.ot_hours || 0), 0);
  const totalOTAmt = filteredLogs.reduce((s, l) => s + parseFloat(l.ot_amount || 0), 0);
  const presentCount = filteredLogs.filter(l => l.work_status === 'PRESENT').length;
  const absentCount = filteredLogs.filter(l => l.work_status === 'ABSENT').length;
  const sundayOTCount = filteredLogs.filter(l => isSunday(l.work_date) && l.work_status === 'PRESENT').length;

  return (
    <div style={{ padding: '24px', maxWidth: 1400 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', marginBottom: 4 }}>WORK LOG</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Daily Work Entry</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Record operator work, shifts, and overtime</p>
      </div>

      {/* Date Selector + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* All / Specific Date toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px' }}>
          <button
            onClick={() => setDate('')}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              background: !date ? '#3b82f6' : 'transparent',
              color: !date ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}
          >All</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="rgba(255,255,255,0.4)" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: date ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '0.85rem', outline: 'none', cursor: 'pointer', padding: '6px 0',
              }}
            />
          </div>
        </div>

        <select
          value={filterOp}
          onChange={e => setFilterOp(e.target.value)}
          style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', color: filterOp ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '0.88rem', outline: 'none' }}
        >
          <option value="">All Operators</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <RefreshCw size={16} />
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => { setShowForm(!showForm); setEditLog(null); }}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Add Work Entry
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      {filteredLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Entries', value: filteredLogs.length, color: '#3b82f6' },
            { label: 'Present', value: presentCount, color: '#10b981' },
            { label: 'Absent', value: absentCount, color: '#ef4444' },
            { label: 'Total Shifts', value: totalShifts, color: '#f59e0b' },
            { label: 'OT Hours', value: `${totalOT}h`, color: '#06b6d4' },
            { label: 'OT Amount', value: `₹${totalOTAmt.toLocaleString('en-IN')}`, color: '#8b5cf6' },
            ...(sundayOTCount > 0 ? [{ label: '☀️ Sunday OT', value: `${sundayOTCount} entries`, color: '#f97316' }] : []),
          ].map(s => (
            <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700 }}>{s.label}:</span>
              <span style={{ color: s.color, fontWeight: 800, fontSize: '0.88rem' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Form */}
      {showForm && !editLog && (
        <WorkLogForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          onRefresh={load}
          operators={operators}
          vehicles={vehicles}
          customers={customers}
          settings={settings}
          defaultDate={date || todayStr}
        />
      )}

      {/* Edit Form */}
      {editLog && (
        <WorkLogForm
          onSave={handleSave}
          onCancel={() => setEditLog(null)}
          onRefresh={load}
          operators={operators}
          vehicles={vehicles}
          customers={customers}
          settings={settings}
          defaultDate={editLog.work_date}
          initialData={editLog}
        />
      )}

      {/* Work Log Table */}
      <div style={{ background: 'var(--bg-card, #1a1d27)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
            {filteredLogs.length} Work {filteredLogs.length === 1 ? 'Entry' : 'Entries'}
            {date ? ` — ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` : ' — All Dates'}
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Clock size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No work entries{date ? ' for this date' : ''}.</p>
            <button onClick={() => setShowForm(true)} style={{ marginTop: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>+ Add First Entry</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['#', 'Date', 'Operator', 'Vehicle', 'Customer', 'Type', 'Status', 'Shift', 'OT Hrs', 'OT Rate', 'OT Amount', 'Remarks', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => {
                  const logIsSunday = isSunday(log.work_date);
                  return (
                  <tr key={log.id} style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: logIsSunday
                      ? 'rgba(249,115,22,0.06)'
                      : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'),
                    borderLeft: logIsSunday ? '3px solid rgba(249,115,22,0.5)' : '3px solid transparent',
                  }}>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: logIsSunday ? '#f97316' : 'rgba(255,255,255,0.6)', fontWeight: logIsSunday ? 700 : 400 }}>
                          {log.work_date ? new Date(log.work_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                        {logIsSunday && (
                          <span style={{ background: '#f9731620', color: '#f97316', borderRadius: 4, padding: '1px 5px', fontSize: '0.62rem', fontWeight: 800 }}>SUN OT</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 700 }}>
                      <div>{log.operator?.full_name || <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontWeight: 400 }}>No operator</span>}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>{log.operator?.operator_code}</div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#fff' }}>
                      <div style={{ fontWeight: 700 }}>{log.vehicle?.model || log.vehicle?.vehicle_type || '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>{log.vehicle?.vehicle_code}</div>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customer?.company_name || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: log.rental_type === 'MONTHLY' ? '#3b82f620' : '#8b5cf620', color: log.rental_type === 'MONTHLY' ? '#3b82f6' : '#8b5cf6', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {log.rental_type || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: log.work_status === 'PRESENT' ? '#10b98120' : '#ef444420', color: log.work_status === 'PRESENT' ? '#10b981' : '#ef4444', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {log.work_status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#f59e0b', fontWeight: 800, textAlign: 'center' }}>{log.shift_count}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{log.ot_hours}h</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)' }}>₹{parseFloat(log.ot_rate || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(log.ot_amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.remarks || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditLog(log); setShowForm(false); }}
                          style={{ background: '#3b82f610', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#3b82f6' }}
                        ><Edit size={14} /></button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          style={{ background: '#ef444410', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#ef4444' }}
                        ><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
