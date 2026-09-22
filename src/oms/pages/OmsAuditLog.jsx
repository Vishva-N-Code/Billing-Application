import { useState, useEffect } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { supabaseOMS } from '../../supabaseOMS';

export default function OmsAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabaseOMS.from('oms_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
        if (data) setLogs(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#64748b', marginBottom: 4 }}>SYSTEM</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>Audit Logs</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Security and action tracking</p>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
             <ScrollText size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
             <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No audit logs recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Timestamp', 'User', 'Action', 'Table', 'Record ID', 'Details'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 14px', color: '#fff', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{l.user_id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: l.action === 'CREATE' ? '#10b98120' : l.action === 'UPDATE' ? '#f59e0b20' : '#ef444420', color: l.action === 'CREATE' ? '#10b981' : l.action === 'UPDATE' ? '#f59e0b' : '#ef4444', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 800 }}>{l.action}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.9)' }}>{l.table_name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{l.record_id}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(l.new_data)}>
                      {JSON.stringify(l.new_data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
