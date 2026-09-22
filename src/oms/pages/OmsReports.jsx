import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { getDashboardStats } from '../db';

export default function OmsReports() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    getDashboardStats(new Date().toISOString().split('T')[0]).then(setStats);
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8b5cf6', marginBottom: 4 }}>REPORTS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Business Reports</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Advanced reporting module (Phase D)</p>
      </div>

      <div style={{ background: '#1a1d27', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, padding: 60, textAlign: 'center' }}>
        <BarChart3 size={48} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 16 }} />
        <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>Reports Engine is under construction</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.9rem', maxWidth: 400, marginInline: 'auto' }}>
          Custom reporting, date-range analytics, and Excel exports will be available in the upcoming update.
        </p>
      </div>
    </div>
  );
}
