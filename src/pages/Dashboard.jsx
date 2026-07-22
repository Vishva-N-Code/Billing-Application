import { useState, useEffect, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, Users, Receipt, Banknote, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, Zap, DollarSign, BarChart3, Award, Clock
} from 'lucide-react';
import { db } from '../db';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalTax: 0,
    totalDocs: 0,
    avgBillValue: 0,
    cashBillTotal: 0
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [docDistribution, setDocDistribution] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  // Listen for background sync completion to refresh dashboard automatically
  useEffect(() => {
    const handleSyncComplete = () => {
      fetchDashboardData();
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sync-complete', handleSyncComplete);
  }, []);

  const [vehicleAlerts, setVehicleAlerts] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Optimize fetching by parallelizing
      const [invoices, cashbills, vehicleSections] = await Promise.all([
        db.invoices.toArray(),
        db.cashbills.toArray(),
        db.vehicleDetails.toArray()
      ]);
      
      // Calculate vehicle document expiry alerts
      const alerts = [];
      const now = new Date();
      (vehicleSections || []).forEach(sec => {
        (sec.vehicles || []).forEach(v => {
          const checkDoc = (type, dateStr) => {
            if (!dateStr) return;
            const exp = new Date(dateStr);
            const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              alerts.push({
                vehicleName: `${sec.sectionName} - ${v.name || v.regNo || 'Unit'}`,
                regNo: v.regNo || 'N/A',
                docType: type,
                expiryDate: dateStr,
                diffDays,
                isExpired: diffDays < 0
              });
            }
          };
          checkDoc('Fitness Certificate (FC)', v.fcExpiry);
          checkDoc('Insurance Policy', v.insuranceExpiry);
          checkDoc('Safety Certificate', v.safetyCertExpiry);
        });
      });
      setVehicleAlerts(alerts.sort((a, b) => a.diffDays - b.diffDays));
      
      const allBillingDocs = [
        ...invoices.map(i => ({...i, type: 'Tax Invoice'})), 
        ...cashbills.map(c => ({...c, type: 'Cash Bill'}))
      ];
      
      // Get all years for filter
      const years = [...new Set(allBillingDocs.map(d => new Date(d.date).getFullYear()))].sort((a, b) => b - a);
      setAvailableYears(years);

      // Filter docs for stats
      const filteredDocs = selectedYear === 'all' ? allBillingDocs : allBillingDocs.filter(d => new Date(d.date).getFullYear() === selectedYear);
      const taxInvoicesOnly = filteredDocs.filter(d => d.type === 'Tax Invoice');
      const cashBillsOnly = filteredDocs.filter(d => d.type === 'Cash Bill');

      // 1. Basic Stats
      const totalBilled = taxInvoicesOnly.reduce((sum, d) => sum + (d.grandTotal || 0), 0);
      const cashBillTotal = cashBillsOnly.reduce((sum, d) => sum + (d.grandTotal || 0), 0);
      const totalTax = taxInvoicesOnly.reduce((sum, d) => {
        const subtotal = (d.grandTotal || 0) / 1.18;
        return sum + (d.grandTotal - subtotal);
      }, 0);
      
      setStats({
        totalBilled,
        totalTax,
        cashBillTotal,
        totalDocs: taxInvoicesOnly.length,
        avgBillValue: taxInvoicesOnly.length ? totalBilled / taxInvoicesOnly.length : 0
      });

      // 2. Trend Data - Income Generated (Month-wise)
      if (selectedYear === 'all' && years.length > 1) {
        // Multi-year view
        const yearlyAgg = years.sort().map(y => {
          const docs = invoices.filter(d => new Date(d.date).getFullYear() === y);
          const income = docs.reduce((sum, d) => sum + (d.grandTotal || 0), 0);
          const tax = docs.reduce((sum, d) => {
            const subtotal = (d.grandTotal || 0) / 1.18;
            return sum + (d.grandTotal - subtotal);
          }, 0);
          return { name: y.toString(), income, tax };
        });
        setMonthlyData(yearlyAgg);
      } else {
        // Single year (Jan-Dec)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyAgg = months.map((m, idx) => {
          const docs = taxInvoicesOnly.filter(d => new Date(d.date).getMonth() === idx);
          const income = docs.reduce((sum, d) => sum + (d.grandTotal || 0), 0);
          const tax = docs.reduce((sum, d) => {
            const subtotal = (d.grandTotal || 0) / 1.18;
            return sum + (d.grandTotal - subtotal);
          }, 0);
          return { name: m, income, tax };
        });
        setMonthlyData(monthlyAgg);
      }

      // 3. Document Distribution
      setDocDistribution([
        { name: 'Tax Invoices', value: taxInvoicesOnly.length },
        { name: 'Cash Bills', value: cashBillsOnly.length }
      ]);

      // 4. Top Clients
      const clientMap = {};
      taxInvoicesOnly.forEach(d => {
        const client = d.clientCompany || 'Unknown';
        clientMap[client] = (clientMap[client] || 0) + (d.grandTotal || 0);
      });
      const top5 = Object.entries(clientMap)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopClients(top5);

    } catch (error) {
      console.error("Dashboard error:", error);
    }
    setLoading(false);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const COLORS = ['#ffb700', '#00b0ff', '#00e676', '#ff4d4d'];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader-pulse"></div>
        <p>Syncing Financial Data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div className="header-content">
          <div className="greeting-badge">
            <Zap size={14} /> <span>Live Overview</span>
          </div>
          <h1>Financial Control Center</h1>
          <p>Track your income generation and tax collections in real-time.</p>
        </div>
        <div className="header-actions">
          <div className="year-selector">
            <Calendar size={16} />
            <select 
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === 'all' ? 'all' : parseInt(val));
              }}
            >
              <option value="all">All Time History</option>
              {availableYears.map(y => <option key={y} value={y}>{y} Financial Year</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        {/* KPI Row */}
        <div className="kpi-row">
          <div className="kpi-card gold-glow">
            <div className="kpi-icon-wrap">
              <DollarSign size={24} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Total Income Generated</span>
              <h2 className="kpi-value">{formatCurrency(stats.totalBilled)}</h2>
              <div className="kpi-footer positive">
                <TrendingUp size={14} /> <span>Tax Invoices Only</span>
              </div>
            </div>
          </div>

          <div className="kpi-card blue-glow">
            <div className="kpi-icon-wrap">
              <Banknote size={24} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Cash Bill Revenue</span>
              <h2 className="kpi-value">{formatCurrency(stats.cashBillTotal)}</h2>
              <div className="kpi-footer neutral">
                <Activity size={14} /> <span>Non-Taxable</span>
              </div>
            </div>
          </div>

          <div className="kpi-card green-glow">
            <div className="kpi-icon-wrap">
              <BarChart3 size={24} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Total GST Collected</span>
              <h2 className="kpi-value">{formatCurrency(stats.totalTax)}</h2>
              <div className="kpi-footer positive">
                <ArrowUpRight size={14} /> <span>18% Standard Rate</span>
              </div>
            </div>
          </div>

          <div className="kpi-card purple-glow">
            <div className="kpi-icon-wrap">
              <Receipt size={24} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Total Documents</span>
              <h2 className="kpi-value">{stats.totalDocs}</h2>
              <div className="kpi-footer neutral">
                <Clock size={14} /> <span>Avg: {formatCurrency(stats.avgBillValue)} / doc</span>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment & Vehicle Document Expiry Alerts */}
        {vehicleAlerts.length > 0 && (
          <div className="card fade-in" style={{ marginBottom: '24px', borderLeft: '4px solid #ef4444', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Clock size={18} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Equipment & Vehicle Document Expiry Alerts ({vehicleAlerts.length})
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {vehicleAlerts.map((item, idx) => (
                <div key={idx} style={{ minWidth: '220px', padding: '10px 14px', borderRadius: '8px', background: item.isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${item.isExpired ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.vehicleName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reg: {item.regNo}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: item.isExpired ? '#ef4444' : '#f59e0b', marginTop: '4px' }}>
                    {item.docType}: {item.isExpired ? `EXPIRED (${Math.abs(item.diffDays)}d ago)` : `${item.diffDays} days left`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chart Section */}
        <div className="chart-section">
          <div className="glass-panel main-chart-panel">
            <div className="panel-header">
              <h3>Income Generation (Month-wise)</h3>
              <div className="legend-pills">
                <span className="pill pill-gold">Turnover (₹)</span>
                <span className="pill pill-green">GST (₹)</span>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb700" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#ffb700" stopOpacity={0.3}/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#00e676' }} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    contentStyle={{ 
                      background: 'rgba(10, 12, 18, 0.95)', 
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px', 
                      border: '1px solid rgba(255, 183, 0, 0.2)', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)', 
                      color: '#fff',
                      padding: '12px 16px'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar yAxisId="left" dataKey="income" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} name="Turnover" />
                  <Line yAxisId="right" type="monotone" dataKey="tax" stroke="#00e676" strokeWidth={3} dot={{ r: 4, fill: '#00e676', strokeWidth: 2, stroke: '#050608' }} activeDot={{ r: 6, filter: 'url(#glow)' }} name="GST Collected" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Split */}
        <div className="bottom-split">
          <div className="glass-panel">
            <div className="panel-header">
              <h3>Top 5 Premium Clients</h3>
              <Award size={18} color="var(--accent-gold)" />
            </div>
            <div className="client-list">
              {topClients.map((client, i) => (
                <div key={i} className="client-row">
                  <div className="client-rank">0{i+1}</div>
                  <div className="client-name">{client.name}</div>
                  <div className="client-revenue">{formatCurrency(client.total)}</div>
                </div>
              ))}
              {topClients.length === 0 && <div className="empty-state">No revenue data available.</div>}
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h3>Document Distribution</h3>
              <PieChart size={18} color="var(--accent-blue)" />
            </div>
            <div className="donut-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={docDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {docDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.5))" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(10, 12, 18, 0.95)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255,255,255,0.1)' 
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Dashboard Container */
        .dashboard-header {
          padding: 48px 48px 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          background: linear-gradient(180deg, rgba(20, 24, 35, 0.4) 0%, transparent 100%);
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .header-content h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
          margin: 8px 0;
          text-shadow: 0 0 40px rgba(255, 183, 0, 0.1);
        }
        .header-content p {
          color: var(--text-secondary);
          font-size: 1.05rem;
        }
        .greeting-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 183, 0, 0.1);
          border: 1px solid rgba(255, 183, 0, 0.2);
          border-radius: 20px;
          color: var(--accent-gold);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .year-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-elevated);
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .year-selector:hover {
          border-color: rgba(255, 183, 0, 0.3);
          box-shadow: 0 0 20px rgba(255, 183, 0, 0.1);
        }
        .year-selector select {
          background: transparent;
          border: none;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          appearance: none;
          padding-right: 20px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23ffb700' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right center;
        }

        .dashboard-body {
          padding: 0 48px 48px;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* KPI Row */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .kpi-card {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s ease;
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: transparent;
          transition: all 0.4s ease;
        }
        .kpi-card:hover {
          transform: translateY(-4px);
          background: rgba(30, 35, 50, 0.6);
        }
        
        .kpi-card.gold-glow:hover::before { background: var(--accent-gold); box-shadow: 0 0 20px var(--accent-gold); }
        .kpi-card.blue-glow:hover::before { background: var(--accent-blue); box-shadow: 0 0 20px var(--accent-blue); }
        .kpi-card.green-glow:hover::before { background: var(--accent-success); box-shadow: 0 0 20px var(--accent-success); }
        .kpi-card.purple-glow:hover::before { background: #b388ff; box-shadow: 0 0 20px #b388ff; }

        .kpi-icon-wrap {
          width: 60px; height: 60px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .gold-glow .kpi-icon-wrap { color: var(--accent-gold); }
        .blue-glow .kpi-icon-wrap { color: var(--accent-blue); }
        .green-glow .kpi-icon-wrap { color: var(--accent-success); }
        .purple-glow .kpi-icon-wrap { color: #b388ff; }

        .kpi-details {
          flex: 1;
        }
        .kpi-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .kpi-value {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px 0;
          line-height: 1;
        }
        .kpi-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .kpi-footer.positive { color: var(--accent-success); }
        .kpi-footer.neutral { color: var(--text-muted); }

        /* Glass Panels */
        .glass-panel {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .panel-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
        }
        
        /* Chart Section */
        .chart-section {
          margin-bottom: 32px;
        }
        .main-chart-panel {
          height: 480px;
        }
        .legend-pills {
          display: flex;
          gap: 12px;
        }
        .pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex; align-items: center; gap: 6px;
        }
        .pill::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
        .pill-gold { background: rgba(255, 183, 0, 0.1); color: var(--accent-gold); border: 1px solid rgba(255, 183, 0, 0.2); }
        .pill-gold::before { background: var(--accent-gold); }
        .pill-green { background: rgba(0, 230, 118, 0.1); color: var(--accent-success); border: 1px solid rgba(0, 230, 118, 0.2); }
        .pill-green::before { background: var(--accent-success); }

        .chart-container {
          flex: 1;
          width: 100%;
        }

        /* Bottom Split */
        .bottom-split {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }

        /* Client List */
        .client-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .client-row {
          display: flex;
          align-items: center;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .client-row:hover {
          background: rgba(255, 183, 0, 0.05);
          border-color: rgba(255, 183, 0, 0.2);
          transform: translateX(4px);
        }
        .client-rank {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          color: rgba(255,255,255,0.2);
          font-size: 1.2rem;
          width: 40px;
        }
        .client-name {
          flex: 1;
          font-weight: 600;
          color: #fff;
          font-size: 0.95rem;
        }
        .client-revenue {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          color: var(--accent-gold);
          font-size: 1.1rem;
        }
        .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          background: rgba(255,255,255,0.01);
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.05);
        }

        .donut-container {
          height: 280px;
          position: relative;
        }
        
        /* Loading State */
        .dashboard-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .loader-pulse {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: var(--accent-gold);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 183, 0, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255, 183, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 183, 0, 0); }
        }
        .dashboard-loading p {
          color: var(--accent-gold);
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        @media (max-width: 1024px) {
          .bottom-split { grid-template-columns: 1fr; }
          .dashboard-header { flex-direction: column; align-items: flex-start; gap: 20px; }
        }
      `}</style>
    </>
  );
}
