import { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { getDashboardStats } from '../db';

export default function OmsNotifications() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    getDashboardStats(new Date().toISOString().split('T')[0]).then(setStats);
  }, []);

  const expiringDocs = stats?.expiringDocs || [];

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 4 }}>NOTIFICATIONS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Alerts & Notifications</h1>
      </div>

      {expiringDocs.length === 0 ? (
         <div style={{ padding: 48, textAlign: 'center', background: '#1a1d27', borderRadius: 12 }}>
          <Bell size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>All caught up! No active alerts.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {expiringDocs.map(doc => (
            <div key={doc.id} style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <AlertTriangle size={24} color="#f59e0b" />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Document Expiring: {doc.operator?.full_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 4 }}>
                  {doc.document_type.replace('_', ' ')} expires on {new Date(doc.expiry_date).toLocaleDateString('en-IN')}.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
