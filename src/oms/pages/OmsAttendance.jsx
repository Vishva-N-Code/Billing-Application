import { useState, useEffect } from 'react';
import { getOperators, getWorkLogs } from '../db';
import { CalendarCheck, RefreshCw, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const currentMonthStr = new Date().toISOString().slice(0, 7);

export default function OmsAttendance() {
  const [operators, setOperators] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [ops, logs] = await Promise.all([
        getOperators(),
        getWorkLogs({ month: monthFilter })
      ]);
      setOperators(ops.filter(o => o.status === 'ACTIVE' && !['No Operator', 'Acting'].includes(o.full_name)));
      setWorkLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [monthFilter]);

  const getAttendanceStats = (opId) => {
    // getWorkLogs might not filter by month correctly if not supported in backend, so we filter locally
    const logs = workLogs.filter(l => l.operator_id === opId && l.work_date?.startsWith(monthFilter));
    const presentDays = new Set(logs.filter(l => l.work_status === 'PRESENT').map(l => l.work_date)).size;
    const absentDays = new Set(logs.filter(l => l.work_status === 'ABSENT').map(l => l.work_date)).size;
    const totalShifts = logs.reduce((s, l) => s + parseFloat(l.shift_count || 0), 0);
    const otHours = logs.reduce((s, l) => s + parseFloat(l.ot_hours || 0), 0);
    
    // Calculate total days up to today if current month, else total days in month
    const [y, m] = monthFilter.split('-');
    const endOfMonth = new Date(y, m, 0).getDate();
    const isCurrentMonth = monthFilter === currentMonthStr;
    const totalDaysToCount = isCurrentMonth ? new Date().getDate() : endOfMonth;

    return { presentDays, absentDays, totalShifts, otHours, totalDaysToCount };
  };

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#10b981', marginBottom: 4 }}>ATTENDANCE</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCog size={28} color="#10b981" /> Operator Attendance
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>Track operator presence, absence, and total billed shifts.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="month" 
            value={monthFilter} 
            onChange={e => setMonthFilter(e.target.value)}
            style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', outline: 'none', fontSize: '0.88rem' }} 
          />
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading attendance...</div>
        ) : operators.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No active operators found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>OPERATOR</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>DAYS PRESENT</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>DAYS ABSENT</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>TOTAL SHIFTS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em' }}>TOTAL OT HRS</th>
                </tr>
              </thead>
              <tbody>
                {operators.map(op => {
                  const stats = getAttendanceStats(op.id);
                  const isLowAttendance = stats.presentDays < (stats.totalDaysToCount * 0.5); // Just a simple threshold for UI highlighting
                  
                  return (
                    <tr 
                      key={op.id} 
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => navigate(`/oms/operators/${op.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{op.full_name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>{op.operator_code}</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ color: isLowAttendance ? '#f59e0b' : '#10b981', fontWeight: 800, fontSize: '1rem' }}>
                          {stats.presentDays}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>out of {stats.totalDaysToCount} days</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ color: stats.absentDays > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '1rem' }}>
                          {stats.absentDays > 0 ? stats.absentDays : '-'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ color: '#3b82f6', fontWeight: 800, fontSize: '1rem' }}>
                          {stats.totalShifts}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '1rem' }}>
                          {stats.otHours > 0 ? `${stats.otHours}h` : '-'}
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
