import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle } from 'lucide-react';
import { getSettings, updateSettings } from '../db';

export default function OmsSettings() {
  const [form, setForm] = useState({
    business_name: 'OM Saravana Cranes (OMS)',
    default_ot_rate: 500,
    allowed_shift_values: '0.5,1,1.5,2',
    payroll_generation_day: 1
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getSettings().then(s => setForm(s || form));
  }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      showToast('Settings saved successfully!');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const inp = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>CONFIGURATION</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>OMS Settings</h1>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={lbl}>OMS MODULE NAME</label>
            <input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={lbl}>DEFAULT OT RATE (₹/hr)</label>
            <input type="number" value={form.default_ot_rate} onChange={e => setForm({ ...form, default_ot_rate: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={lbl}>ALLOWED SHIFT VALUES (Comma separated)</label>
            <input value={form.allowed_shift_values} onChange={e => setForm({ ...form, allowed_shift_values: e.target.value })} style={inp} placeholder="e.g. 0.5,1,1.5,2" />
          </div>
          <div>
            <label style={lbl}>PAYROLL AUTO-GENERATION DAY (1-28)</label>
            <input type="number" min="1" max="28" value={form.payroll_generation_day} onChange={e => setForm({ ...form, payroll_generation_day: e.target.value })} style={inp} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ marginTop: 24, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
