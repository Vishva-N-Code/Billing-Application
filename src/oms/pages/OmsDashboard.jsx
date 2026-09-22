import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, Wrench, Building2, CalendarCheck, TrendingUp, AlertTriangle, Clock, CheckCircle, Plus, ArrowRight, Search, X } from 'lucide-react';
import { getDashboardStats, getWorkLogs, getSettings } from '../db';

const today = new Date().toISOString().split('T')[0];
const todayDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function StatCard({ icon, label, value, sub, color = '#3b82f6', onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-card, #1a1d27)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      padding: '20px 22px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 0.2s, transform 0.1s',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PRESENT: { bg: '#10b98120', color: '#10b981', label: 'Present' },
    ABSENT: { bg: '#ef444420', color: '#ef4444', label: 'Absent' },
    ACTIVE: { bg: '#10b98120', color: '#10b981', label: 'Active' },
    INACTIVE: { bg: '#6b728020', color: '#6b7280', label: 'Inactive' },
  };
  const s = map[status] || { bg: '#3b82f620', color: '#3b82f6', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function DocExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span style={{ background: '#ef444420', color: '#ef4444', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Expired</span>;
  if (diff <= 30) return <span style={{ background: '#f59e0b20', color: '#f59e0b', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{diff}d left</span>;
  return <span style={{ background: '#10b98120', color: '#10b981', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Valid</span>;
}

export default function OmsDashboard() {
  const [stats, setStats] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalLogs, setGlobalLogs] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [s, logs] = await Promise.all([
          getDashboardStats(today),
          getWorkLogs({ date: today, limit: 50 }),
        ]);
        setStats(s);
        setTodayLogs(logs);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (searchQuery && !globalLogs) {
      getWorkLogs({ limit: 1000 }).then(setGlobalLogs).catch(console.error);
    }
  }, [searchQuery, globalLogs]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(59,130,246,0.3)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Loading dashboard...</span>
    </div>
  );

  const todaySummary = stats?.todaySummary || {};
  const isCompleted = todaySummary.count > 0;
  const expiringDocs = stats?.expiringDocs || [];

  const filteredSearchLogs = searchQuery && globalLogs ? globalLogs.filter(log => {
    const term = searchQuery.toLowerCase();
    return (
      (log.customer?.company_name || '').toLowerCase().includes(term) ||
      (log.vehicle?.model || log.vehicle?.vehicle_code || log.vehicle?.vehicle_type || '').toLowerCase().includes(term) ||
      (log.operator?.full_name || log.operator?.operator_code || '').toLowerCase().includes(term) ||
      (log.work_date || '').toLowerCase().includes(term)
    );
  }) : null;

  return (
    <div style={{ padding: '24px', maxWidth: 1400 }}>
      {/* Header & Search */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', marginBottom: 4 }}>
            OMS DASHBOARD
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {todayDisplay}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            Operator Management System — OM Saravana Cranes
          </p>
        </div>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, vehicle, operator, date..."
            style={{
              width: '100%', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: '12px 16px 12px 42px', color: '#fff', outline: 'none',
              fontSize: '0.9rem', boxSizing: 'border-box',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results View */}
      {searchQuery ? (
        <div style={{ background: 'var(--bg-card, #1a1d27)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Search Results</h3>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>Found {filteredSearchLogs ? filteredSearchLogs.length : '...'} work entries matching "{searchQuery}"</p>
            </div>
            <button onClick={() => navigate('/oms/work-log')} style={{ background: '#3b82f610', color: '#3b82f6', border: '1px solid #3b82f630', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={14} /> View Work Log
            </button>
          </div>
          {!filteredSearchLogs ? (
             <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Searching global logs...</div>
          ) : filteredSearchLogs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No matching work entries found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Date', 'Operator', 'Vehicle', 'Customer', 'Type', 'Status', 'Shift', 'OT Hrs', 'OT Amt'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSearchLogs.map((log, i) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{log.work_date ? new Date(log.work_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{log.operator?.full_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{log.vehicle?.vehicle_code || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customer?.company_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: log.rental_type === 'MONTHLY' ? '#3b82f620' : '#8b5cf620', color: log.rental_type === 'MONTHLY' ? '#3b82f6' : '#8b5cf6', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{log.rental_type || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={log.work_status} /></td>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{log.shift_count}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{log.ot_hours}h</td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(log.ot_amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Today's Update Status Banner */}
          <div style={{
            background: isCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isCompleted ? '#10b98130' : '#f59e0b30'}`,
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isCompleted
            ? <CheckCircle size={22} color="#10b981" />
            : <AlertTriangle size={22} color="#f59e0b" />}
          <div>
            <div style={{ fontWeight: 800, color: isCompleted ? '#10b981' : '#f59e0b', fontSize: '0.95rem' }}>
              {isCompleted ? `Today's Work Log — ${todaySummary.count} Entries Recorded` : "Today's Work Log — Pending"}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 2 }}>
              {isCompleted
                ? `${todaySummary.presentEntries?.length || 0} Present · ${todaySummary.absentEntries?.length || 0} Absent · ${todaySummary.totalShifts} Shifts · ${todaySummary.totalOTHours}h OT`
                : 'No work entries recorded yet for today.'}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/oms/work-log')}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={16} />
          {isCompleted ? 'Add More Entries' : "Complete Today's Work"}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          icon={<HardHat size={22} color="#3b82f6" />}
          label="TOTAL OPERATORS"
          value={stats?.totalOperators ?? '—'}
          sub="Active operators"
          color="#3b82f6"
          onClick={() => navigate('/oms/operators')}
        />
        <StatCard
          icon={<Wrench size={22} color="#f59e0b" />}
          label="TOTAL VEHICLES"
          value={stats?.totalVehicles ?? '—'}
          sub="Forklifts & cranes"
          color="#f59e0b"
          onClick={() => navigate('/oms/vehicles')}
        />
        <StatCard
          icon={<Building2 size={22} color="#8b5cf6" />}
          label="ACTIVE RENTALS"
          value={stats?.activeRentals ?? '—'}
          sub="Live assignments"
          color="#8b5cf6"
          onClick={() => navigate('/oms/rentals')}
        />
        <StatCard
          icon={<CalendarCheck size={22} color="#10b981" />}
          label="TODAY'S ENTRIES"
          value={todaySummary.count ?? 0}
          sub={`${todaySummary.presentEntries?.length || 0} Present · ${todaySummary.absentEntries?.length || 0} Absent`}
          color="#10b981"
        />
        <StatCard
          icon={<TrendingUp size={22} color="#06b6d4" />}
          label="TODAY'S SHIFTS"
          value={todaySummary.totalShifts ?? 0}
          sub="Total shift count"
          color="#06b6d4"
        />
        <StatCard
          icon={<Clock size={22} color="#f43f5e" />}
          label="TODAY'S OT"
          value={`${todaySummary.totalOTHours ?? 0}h`}
          sub={`₹${(todaySummary.totalOTAmount || 0).toLocaleString('en-IN')}`}
          color="#f43f5e"
        />
      </div>

      {/* Today's Work Log Table */}
      <div style={{ display: 'grid', gridTemplateColumns: expiringDocs.length ? '1fr 380px' : '1fr', gap: 20 }}>
        <div style={{ background: 'var(--bg-card, #1a1d27)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Today's Work Entries</h3>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{today}</p>
            </div>
            <button onClick={() => navigate('/oms/work-log')} style={{ background: '#3b82f610', color: '#3b82f6', border: '1px solid #3b82f630', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={14} /> View All
            </button>
          </div>
          {todayLogs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <CalendarCheck size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No work entries for today yet.</p>
              <button onClick={() => navigate('/oms/work-log')} style={{ marginTop: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>+ Add Work Entry</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Operator', 'Vehicle', 'Customer', 'Type', 'Status', 'Shift', 'OT Hrs', 'OT Amt'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayLogs.map((log, i) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{log.operator?.full_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{log.vehicle?.vehicle_code || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customer?.company_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: log.rental_type === 'MONTHLY' ? '#3b82f620' : '#8b5cf620', color: log.rental_type === 'MONTHLY' ? '#3b82f6' : '#8b5cf6', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{log.rental_type || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={log.work_status} /></td>
                      <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{log.shift_count}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{log.ot_hours}h</td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>₹{parseFloat(log.ot_amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Expiry Alerts */}
        {expiringDocs.length > 0 && (
          <div style={{ background: 'var(--bg-card, #1a1d27)', border: '1px solid #f59e0b30', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f59e0b20', background: '#f59e0b08' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#f59e0b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> Document Alerts
              </h3>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{expiringDocs.length} document(s) need attention</p>
            </div>
            <div style={{ padding: '8px 0', maxHeight: 380, overflowY: 'auto' }}>
              {expiringDocs.map(doc => {
                const today = new Date();
                const expiry = new Date(doc.expiry_date);
                const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                return (
                  <div key={doc.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.operator?.full_name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 2 }}>
                        {doc.document_type.replace('_', ' ')}
                      </div>
                    </div>
                    <DocExpiryBadge expiryDate={doc.expiry_date} />
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => navigate('/oms/documents')} style={{ width: '100%', background: '#f59e0b10', color: '#f59e0b', border: '1px solid #f59e0b30', borderRadius: 8, padding: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                View All Documents →
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
