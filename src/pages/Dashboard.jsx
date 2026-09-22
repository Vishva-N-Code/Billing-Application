import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Receipt, Banknote, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, Zap, DollarSign, 
  BarChart3, Award, Clock, Plus, ExternalLink, ShieldCheck, AlertTriangle, 
  FileText, CheckCircle2, CircleDashed, ChevronRight, Layers, Eye, Sparkles,
  Search, X
} from 'lucide-react';
import { db } from '../db';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalTax: 0,
    totalDocs: 0,
    avgBillValue: 0,
    cashBillTotal: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    collectionRate: 0,
    momGrowth: 0
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [docDistribution, setDocDistribution] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [vehicleAlerts, setVehicleAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [chartMode, setChartMode] = useState('bars'); // 'bars' | 'area'
  const isFetchingRef = useRef(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allDocs, setAllDocs] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchDashboardData(false);
  }, [selectedYear]);

  // Listen for background sync completion to refresh dashboard automatically (debounced)
  useEffect(() => {
    let timer;
    const handleSyncComplete = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetchDashboardData(false);
      }, 150);
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [selectedYear]);

  const fetchDashboardData = async (showLoadingSpinner = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoadingSpinner) setLoading(true);

    try {
      // Parallel fast fetch from local Dexie database
      const [invoices, cashbills, vehicleSections, quotations, deliveryChellans, proformaInvoices] = await Promise.all([
        db.invoices.toArray(),
        db.cashbills.toArray(),
        db.vehicleDetails.toArray(),
        db.quotations.toArray().catch(() => []),
        db.deliveryChellans.toArray().catch(() => []),
        db.proformaInvoices.toArray().catch(() => [])
      ]);

      // Build a unified all-docs list for global search
      const unifiedDocs = [
        ...invoices.map(d => ({ id: d.id, docName: d.docName || d.invoiceNo || '', clientCompany: d.clientCompany || '', date: d.date, type: 'Tax Invoice', routePath: '/tax-invoice', loadItem: d })),
        ...cashbills.map(d => ({ id: d.id, docName: d.docName || d.billNo || '', clientCompany: d.clientCompany || '', date: d.date, type: 'Cash Bill', routePath: '/cash-bill', loadItem: d })),
        ...quotations.map(d => ({ id: d.id, docName: d.docName || '', clientCompany: d.clientCompany || d.toCompany || d.data?.form?.toCompany || '', date: d.date, type: 'Quotation', routePath: '/quotation', loadItem: d })),
        ...deliveryChellans.map(d => ({ id: d.id, docName: d.docName || d.dcNo || '', clientCompany: d.clientCompany || '', date: d.date, type: 'Delivery Chellan', routePath: '/delivery-chellan', loadItem: d })),
        ...proformaInvoices.map(d => ({ id: d.id, docName: d.docName || d.piNo || '', clientCompany: d.clientCompany || '', date: d.date, type: 'Proforma Invoice', routePath: '/proforma-invoice', loadItem: d }))
      ].filter(d => d.docName.trim() !== '' || d.clientCompany.trim() !== '')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setAllDocs(unifiedDocs);
      
      // 1. Calculate vehicle document expiry alerts
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
        ...invoices.map(i => ({ 
          id: i.id, 
          invoiceNo: i.invoiceNo, 
          docName: i.docName, 
          date: i.date, 
          clientCompany: i.clientCompany, 
          grandTotal: i.grandTotal, 
          paymentStatus: i.paymentStatus, 
          paidAmount: i.paidAmount, 
          type: 'Tax Invoice', 
          routePath: '/tax-invoice' 
        })), 
        ...cashbills.map(c => ({ 
          id: c.id, 
          billNo: c.billNo, 
          docName: c.docName, 
          date: c.date, 
          clientCompany: c.clientCompany, 
          grandTotal: c.grandTotal, 
          paymentStatus: c.paymentStatus, 
          paidAmount: c.paidAmount, 
          type: 'Cash Bill', 
          routePath: '/cash-bill' 
        }))
      ];
      
      // Get all available years for filtering
      const years = [...new Set(allBillingDocs.map(d => {
        if (!d.date) return null;
        const dt = new Date(d.date);
        return isNaN(dt.getTime()) ? null : dt.getFullYear();
      }))].filter(Boolean).sort((a, b) => b - a);
      setAvailableYears(years);

      // Filter docs according to selected year
      const filteredDocs = selectedYear === 'all' 
        ? allBillingDocs 
        : allBillingDocs.filter(d => {
            if (!d.date) return false;
            const dt = new Date(d.date);
            return !isNaN(dt.getTime()) && dt.getFullYear() === selectedYear;
          });

      const taxInvoicesOnly = filteredDocs.filter(d => d.type === 'Tax Invoice');
      const cashBillsOnly = filteredDocs.filter(d => d.type === 'Cash Bill');

      // 2. Financial KPIs & Collection Metrics
      const totalBilled = taxInvoicesOnly.reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);
      const cashBillTotal = cashBillsOnly.reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);
      const totalTax = taxInvoicesOnly.reduce((sum, d) => {
        const val = Number(d.grandTotal) || 0;
        const subtotal = val / 1.18;
        return sum + (val - subtotal);
      }, 0);

      // Payments breakdown
      let paidTotal = 0;
      filteredDocs.forEach(d => {
        if (d.paymentStatus === 'paid') {
          paidTotal += Number(d.grandTotal) || 0;
        } else if (Number(d.paidAmount) > 0) {
          paidTotal += Number(d.paidAmount) || 0;
        }
      });
      const combinedTotal = totalBilled + cashBillTotal;
      const unpaidTotal = Math.max(0, combinedTotal - paidTotal);
      const collectionRate = combinedTotal > 0 ? Math.round((paidTotal / combinedTotal) * 100) : 100;

      // Month-over-Month growth calculation
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentMonthIncome = taxInvoicesOnly
        .filter(d => {
          if (!d.date) return false;
          const dt = new Date(d.date);
          return !isNaN(dt.getTime()) && dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);

      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthIncome = taxInvoicesOnly
        .filter(d => {
          if (!d.date) return false;
          const dt = new Date(d.date);
          return !isNaN(dt.getTime()) && dt.getMonth() === prevMonth && dt.getFullYear() === prevMonthYear;
        })
        .reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);

      let momGrowth = 0;
      if (currentMonthIncome === 0) {
        momGrowth = 0;
      } else if (prevMonthIncome > 0) {
        momGrowth = Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100);
      } else if (currentMonthIncome > 0) {
        momGrowth = 100;
      }
      
      setStats({
        totalBilled,
        totalTax,
        cashBillTotal,
        paidAmount: paidTotal,
        unpaidAmount: unpaidTotal,
        collectionRate,
        momGrowth,
        totalDocs: taxInvoicesOnly.length,
        avgBillValue: taxInvoicesOnly.length ? totalBilled / taxInvoicesOnly.length : 0
      });

      // 3. Trend Data - Income Generated (Month-wise)
      if (selectedYear === 'all' && years.length > 1) {
        const yearlyAgg = years.slice().reverse().map(y => {
          const docs = invoices.filter(d => {
            if (!d.date) return false;
            const dt = new Date(d.date);
            return !isNaN(dt.getTime()) && dt.getFullYear() === y;
          });
          const income = docs.reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);
          const tax = docs.reduce((sum, d) => {
            const val = Number(d.grandTotal) || 0;
            const subtotal = val / 1.18;
            return sum + (val - subtotal);
          }, 0);
          return { name: y.toString(), income: Math.round(income), tax: Math.round(tax) };
        });
        setMonthlyData(yearlyAgg);
      } else {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyAgg = months.map((m, idx) => {
          const docs = taxInvoicesOnly.filter(d => {
            if (!d.date) return false;
            const dt = new Date(d.date);
            return !isNaN(dt.getTime()) && dt.getMonth() === idx;
          });
          const income = docs.reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0);
          const tax = docs.reduce((sum, d) => {
            const val = Number(d.grandTotal) || 0;
            const subtotal = val / 1.18;
            return sum + (val - subtotal);
          }, 0);
          return { name: m, income: Math.round(income), tax: Math.round(tax) };
        });
        setMonthlyData(monthlyAgg);
      }

      // 4. Document Distribution
      setDocDistribution([
        { name: 'Tax Invoices', value: taxInvoicesOnly.length, count: taxInvoicesOnly.length },
        { name: 'Cash Bills', value: cashBillsOnly.length, count: cashBillsOnly.length }
      ]);

      // 5. Top Clients with Revenue Share percentage
      const clientMap = {};
      taxInvoicesOnly.forEach(d => {
        const client = (d.clientCompany || 'Unknown').trim();
        clientMap[client] = (clientMap[client] || 0) + (Number(d.grandTotal) || 0);
      });
      const top5 = Object.entries(clientMap)
        .map(([name, total]) => ({
          name,
          total,
          percent: totalBilled > 0 ? Math.round((total / totalBilled) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopClients(top5);

      // 6. Recent Documents Feed (Last 6 documents)
      const sortedRecent = allBillingDocs
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 6);
      setRecentDocs(sortedRecent);

    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const COLORS = ['#ffb700', '#00b0ff', '#00e676', '#ff4d4d'];

  // Global search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const q = query.toLowerCase();
    const results = allDocs.filter(d =>
      d.docName.toLowerCase().includes(q) ||
      d.clientCompany.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
    ).slice(0, 10);
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const openDoc = (doc) => {
    clearSearch();
    navigate(doc.routePath, { state: { loadItem: doc.loadItem } });
  };

  const DOC_TYPE_COLORS = {
    'Tax Invoice': 'gold',
    'Cash Bill': 'blue',
    'Quotation': 'purple',
    'Delivery Chellan': 'cyan',
    'Proforma Invoice': 'green'
  };


  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader-pulse"></div>
        <p>Syncing Financial Data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper fade-in">
      {/* Top Executive Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="greeting-badge">
            <Sparkles size={14} className="sparkle-icon" /> <span>Enterprise Operations Control</span>
          </div>
          <h1>Financial Dashboard</h1>
          <p>Real-time analytics, revenue intelligence &amp; fleet compliance overview.</p>
        </div>

        <div className="header-actions">
          {/* Global Search Bar */}
          <div className="global-search-wrap" ref={searchRef}>
            <div className="global-search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                className="global-search-input"
                type="text"
                placeholder="Search documents, clients..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                autoComplete="off"
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={clearSearch}><X size={14} /></button>
              )}
            </div>
            {showSearchResults && (
              <div className="search-results-dropdown">
                {searchResults.length === 0 ? (
                  <div className="search-no-results">No documents found for "{searchQuery}"</div>
                ) : (
                  searchResults.map((doc, i) => (
                    <div key={i} className="search-result-item" onMouseDown={() => openDoc(doc)}>
                      <span className={`search-doc-tag ${DOC_TYPE_COLORS[doc.type] || 'gold'}`}>
                        {doc.type === 'Tax Invoice' ? 'TAX' : doc.type === 'Cash Bill' ? 'CASH' : doc.type === 'Quotation' ? 'QUOT' : doc.type === 'Delivery Chellan' ? 'DC' : 'PI'}
                      </span>
                      <div className="search-result-info">
                        <span className="search-result-name">{doc.docName || doc.clientCompany || 'Unnamed'}</span>
                        {doc.clientCompany && <span className="search-result-client">{doc.clientCompany}</span>}
                      </div>
                      <span className="search-result-date">{formatDate(doc.date)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Create Buttons */}
          <div className="quick-actions-bar">
            <button className="quick-btn gold" onClick={() => navigate('/tax-invoice')}>
              <Plus size={15} /> <span>Invoice</span>
            </button>
            <button className="quick-btn blue" onClick={() => navigate('/cash-bill')}>
              <Plus size={15} /> <span>Cash Bill</span>
            </button>
            <button className="quick-btn cyan" onClick={() => navigate('/delivery-chellan')}>
              <Plus size={15} /> <span>DC</span>
            </button>
            <button className="quick-btn purple" onClick={() => navigate('/quotation')}>
              <Plus size={15} /> <span>Quote</span>
            </button>
          </div>

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
        {/* KPI Row - 4 Dynamic Glow Cards */}
        <div className="kpi-row">
          {/* 1. Tax Invoices Revenue */}
          <div className="kpi-card gold-glow">
            <div className="kpi-icon-wrap">
              <DollarSign size={26} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Tax Invoice Turnover</span>
              <h2 className="kpi-value">{formatCurrency(stats.totalBilled)}</h2>
              <div className="kpi-footer">
                {stats.momGrowth >= 0 ? (
                  <span className="kpi-tag positive">
                    <TrendingUp size={13} /> +{stats.momGrowth}% MoM
                  </span>
                ) : (
                  <span className="kpi-tag negative">
                    <TrendingDown size={13} /> {stats.momGrowth}% MoM
                  </span>
                )}
                <span className="kpi-subtext">{stats.totalDocs} Invoices</span>
              </div>
            </div>
          </div>

          {/* 2. Cash Bill Revenue */}
          <div className="kpi-card blue-glow">
            <div className="kpi-icon-wrap">
              <Banknote size={26} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Cash Bill Revenue</span>
              <h2 className="kpi-value">{formatCurrency(stats.cashBillTotal)}</h2>
              <div className="kpi-footer">
                <span className="kpi-tag neutral">
                  <Activity size={13} /> Non-Taxable
                </span>
                <span className="kpi-subtext">Direct Cash Receipts</span>
              </div>
            </div>
          </div>

          {/* 3. GST Tax Collected */}
          <div className="kpi-card green-glow">
            <div className="kpi-icon-wrap">
              <BarChart3 size={26} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Total GST Collected</span>
              <h2 className="kpi-value">{formatCurrency(stats.totalTax)}</h2>
              <div className="kpi-footer">
                <span className="kpi-tag positive">
                  <ArrowUpRight size={13} /> 18% GST Compliant
                </span>
                <span className="kpi-subtext">CGST + SGST / IGST</span>
              </div>
            </div>
          </div>

          {/* 4. Payment Collection Rate */}
          <div className="kpi-card purple-glow">
            <div className="kpi-icon-wrap">
              <Receipt size={26} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Collection Efficiency</span>
              <h2 className="kpi-value">{stats.collectionRate}%</h2>
              <div className="kpi-footer">
                <span className="kpi-tag purple">
                  <CheckCircle2 size={13} /> {formatCurrency(stats.paidAmount)} Paid
                </span>
                <span className="kpi-subtext">₹{formatCurrency(stats.unpaidAmount)} Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Progress Bar Banner */}
        <div className="collection-banner glass-panel">
          <div className="collection-info">
            <div className="collection-title-wrap">
              <ShieldCheck size={20} color="var(--accent-gold)" />
              <div>
                <h4>Accounts Receivable &amp; Cash Flow Health</h4>
                <p>Track realized receipts vs outstanding dues across all generated billing documents</p>
              </div>
            </div>
            <div className="collection-stats-group">
              <div className="c-stat">
                <span className="c-dot green"></span>
                <span>Collected: <strong>{formatCurrency(stats.paidAmount)}</strong></span>
              </div>
              <div className="c-stat">
                <span className="c-dot amber"></span>
                <span>Outstanding: <strong>{formatCurrency(stats.unpaidAmount)}</strong></span>
              </div>
              <div className="c-stat">
                <span className="c-dot gold"></span>
                <span>Total Volume: <strong>{formatCurrency(stats.totalBilled + stats.cashBillTotal)}</strong></span>
              </div>
            </div>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, Math.max(5, stats.collectionRate))}%` }}
            ></div>
          </div>
        </div>

        {/* Equipment & Vehicle Document Expiry Alerts */}
        {vehicleAlerts.length > 0 && (
          <div className="vehicle-alert-card glass-panel fade-in">
            <div className="alert-header">
              <div className="alert-title-wrap">
                <AlertTriangle size={20} className="alert-icon-pulse" />
                <h3>Fleet Compliance &amp; Document Expiry Alerts ({vehicleAlerts.length})</h3>
              </div>
              <button className="btn-link" onClick={() => navigate('/vehicle-details')}>
                Manage Fleet <ChevronRight size={14} />
              </button>
            </div>
            <div className="alert-scroll-row">
              {vehicleAlerts.map((item, idx) => (
                <div key={idx} className={`alert-chip ${item.isExpired ? 'expired' : 'warning'}`}>
                  <div className="chip-name">{item.vehicleName}</div>
                  <div className="chip-reg">Reg: {item.regNo}</div>
                  <div className="chip-status">
                    {item.docType}: {item.isExpired ? `EXPIRED (${Math.abs(item.diffDays)}d ago)` : `${item.diffDays} days remaining`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chart Section with View Mode Switcher */}
        <div className="chart-section">
          <div className="glass-panel main-chart-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>Income Analytics &amp; Revenue Flow</h3>
                <span className="panel-subtitle">Month-by-month billing vs GST collection</span>
              </div>
              
              <div className="chart-controls">
                {/* Chart Mode Switcher */}
                <div className="chart-mode-tabs">
                  <button 
                    className={`mode-btn ${chartMode === 'bars' ? 'active' : ''}`}
                    onClick={() => setChartMode('bars')}
                  >
                    <BarChart3 size={14} /> Grouped Bars
                  </button>
                  <button 
                    className={`mode-btn ${chartMode === 'area' ? 'active' : ''}`}
                    onClick={() => setChartMode('area')}
                  >
                    <Activity size={14} /> Flow Area
                  </button>
                </div>

                <div className="legend-pills">
                  <span className="pill pill-gold">Turnover (₹)</span>
                  <span className="pill pill-green">GST (₹)</span>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb700" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#ffb700" stopOpacity={0.25}/>
                    </linearGradient>
                    <linearGradient id="greenBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e676" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#00e676" stopOpacity={0.25}/>
                    </linearGradient>
                    <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb700" stopOpacity={0.45}/>
                      <stop offset="100%" stopColor="#ffb700" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e676" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#00e676" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    tickFormatter={(val) => val >= 100000 ? `₹${(val/100000).toFixed(val % 100000 === 0 ? 0 : 1)}L` : `₹${(val/1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    contentStyle={{ 
                      background: 'rgba(10, 12, 18, 0.95)', 
                      backdropFilter: 'blur(12px)',
                      borderRadius: '14px', 
                      border: '1px solid rgba(255, 183, 0, 0.25)', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
                      color: '#fff',
                      padding: '14px 18px'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(value) => formatCurrency(value)}
                  />

                  {chartMode === 'bars' ? (
                    <>
                      <Bar dataKey="income" fill="url(#goldBarGrad)" radius={[6, 6, 0, 0]} barSize={22} name="Turnover" />
                      <Bar dataKey="tax" fill="url(#greenBarGrad)" radius={[6, 6, 0, 0]} barSize={22} name="GST Collected" />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="income" stroke="#ffb700" strokeWidth={3} fill="url(#goldAreaGrad)" name="Turnover" />
                      <Area type="monotone" dataKey="tax" stroke="#00e676" strokeWidth={2} fill="url(#greenAreaGrad)" name="GST Collected" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Split Section: Recent Activity & Top Clients */}
        <div className="bottom-split">
          {/* Recent Invoices & Transactions Table */}
          <div className="glass-panel recent-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>Recent Billing Activity</h3>
                <span className="panel-subtitle">Latest invoices &amp; receipts issued</span>
              </div>
              <button className="btn-link" onClick={() => navigate('/storage')}>
                View Storage <ExternalLink size={14} />
              </button>
            </div>

            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Client / Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc, idx) => (
                    <tr key={idx} className="recent-tr">
                      <td>
                        <div className="doc-type-badge">
                          <span className={`doc-tag ${doc.type === 'Tax Invoice' ? 'gold' : 'blue'}`}>
                            {doc.type === 'Tax Invoice' ? 'TAX' : 'CASH'}
                          </span>
                          <span className="doc-num">#{doc.invoiceNo || doc.billNo || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="client-cell" title={doc.clientCompany}>
                          {doc.clientCompany || 'Direct Client'}
                        </div>
                      </td>
                      <td className="date-cell">{formatDate(doc.date)}</td>
                      <td>
                        <span className={`status-pill ${doc.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                          {doc.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="amount-cell">
                        {formatCurrency(doc.grandTotal)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-icon-action" 
                          title="Open Document"
                          onClick={() => navigate(doc.routePath, { state: { loadItem: doc } })}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No billing documents found. Click "+ Invoice" to create your first bill.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Top Clients & Document Distribution */}
          <div className="right-panels-col">
            {/* Top 5 Premium Clients Leaderboard */}
            <div className="glass-panel client-leaderboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <h3>Top Enterprise Clients</h3>
                  <span className="panel-subtitle">Revenue volume by account</span>
                </div>
                <Award size={18} color="var(--accent-gold)" />
              </div>

              <div className="client-list">
                {topClients.map((client, i) => (
                  <div key={i} className="client-card-row">
                    <div className="client-avatar">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="client-card-info">
                      <div className="client-card-top">
                        <span className="client-card-name" title={client.name}>{client.name}</span>
                        <span className="client-card-val">{formatCurrency(client.total)}</span>
                      </div>
                      <div className="client-meter-track">
                        <div 
                          className="client-meter-fill" 
                          style={{ width: `${Math.max(8, client.percent)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {topClients.length === 0 && (
                  <div className="empty-state">No client revenue recorded yet.</div>
                )}
              </div>
            </div>

            {/* Document Distribution Pie / Donut */}
            <div className="glass-panel distribution-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <h3>Document Share</h3>
                  <span className="panel-subtitle">Tax vs Cash breakdown</span>
                </div>
                <Layers size={18} color="var(--accent-blue)" />
              </div>
              <div className="donut-container">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={docDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {docDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(10, 12, 18, 0.95)', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255,255,255,0.1)' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-legend-custom">
                  {docDistribution.map((d, i) => (
                    <div key={i} className="donut-legend-item">
                      <span className="dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                      <span className="label">{d.name}:</span>
                      <strong className="val">{d.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Dashboard Container */
        .dashboard-wrapper {
          min-height: 100vh;
        }

        .dashboard-header {
          padding: 40px 48px 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
          background: linear-gradient(180deg, rgba(20, 24, 38, 0.6) 0%, transparent 100%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .header-content h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
          margin: 6px 0 4px;
          text-shadow: 0 0 30px rgba(255, 183, 0, 0.15);
        }

        .header-content p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin: 0;
        }

        .greeting-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(255, 183, 0, 0.1);
          border: 1px solid rgba(255, 183, 0, 0.25);
          border-radius: 20px;
          color: var(--accent-gold);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* Quick Action Buttons */
        .quick-actions-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .quick-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-btn.gold { background: rgba(255, 183, 0, 0.12); color: var(--accent-gold); }
        .quick-btn.gold:hover { background: var(--accent-gold); color: #000; }
        
        .quick-btn.blue { background: rgba(0, 176, 255, 0.12); color: var(--accent-blue); }
        .quick-btn.blue:hover { background: var(--accent-blue); color: #000; }

        .quick-btn.cyan { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
        .quick-btn.cyan:hover { background: #06b6d4; color: #000; }

        .quick-btn.purple { background: rgba(179, 136, 255, 0.12); color: #b388ff; }
        .quick-btn.purple:hover { background: #b388ff; color: #000; }

        .year-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-elevated);
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-secondary);
        }

        .year-selector select {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          outline: none;
        }

        .dashboard-body {
          padding: 28px 48px 48px;
        }

        /* KPI Row */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 18px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .kpi-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3);
        }

        .kpi-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }

        .gold-glow .kpi-icon-wrap { color: var(--accent-gold); background: rgba(255, 183, 0, 0.08); border-color: rgba(255, 183, 0, 0.2); }
        .blue-glow .kpi-icon-wrap { color: var(--accent-blue); background: rgba(0, 176, 255, 0.08); border-color: rgba(0, 176, 255, 0.2); }
        .green-glow .kpi-icon-wrap { color: var(--accent-success); background: rgba(0, 230, 118, 0.08); border-color: rgba(0, 230, 118, 0.2); }
        .purple-glow .kpi-icon-wrap { color: #b388ff; background: rgba(179, 136, 255, 0.08); border-color: rgba(179, 136, 255, 0.2); }

        .kpi-details { flex: 1; min-width: 0; }
        
        .kpi-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .kpi-value {
          font-family: 'Outfit', sans-serif;
          font-size: 1.65rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
        }

        .kpi-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .kpi-tag.positive { background: rgba(0, 230, 118, 0.12); color: var(--accent-success); }
        .kpi-tag.negative { background: rgba(255, 77, 77, 0.12); color: #ff4d4d; }
        .kpi-tag.neutral { background: rgba(255, 255, 255, 0.06); color: var(--text-muted); }
        .kpi-tag.purple { background: rgba(179, 136, 255, 0.12); color: #b388ff; }
        .kpi-subtext { color: var(--text-muted); font-size: 0.72rem; }

        /* Glass Panels */
        .glass-panel {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 24px;
        }

        /* Collection Progress Banner */
        .collection-banner {
          margin-bottom: 24px;
          background: linear-gradient(135deg, rgba(25, 30, 45, 0.7) 0%, rgba(18, 22, 34, 0.9) 100%);
        }

        .collection-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 14px;
        }

        .collection-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .collection-title-wrap h4 {
          margin: 0 0 2px;
          font-size: 0.98rem;
          font-weight: 700;
          color: #fff;
        }

        .collection-title-wrap p {
          margin: 0;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .collection-stats-group {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .c-stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .c-stat strong { color: #fff; }
        .c-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .c-dot.green { background: #00e676; }
        .c-dot.amber { background: #f59e0b; }
        .c-dot.gold { background: var(--accent-gold); }

        .progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffb700 0%, #00e676 100%);
          border-radius: 10px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Vehicle Expiry Alerts */
        .vehicle-alert-card {
          margin-bottom: 24px;
          border-left: 4px solid #ef4444;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .alert-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .alert-title-wrap h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }

        .alert-icon-pulse { color: #ef4444; animation: pulse 2s infinite; }

        .btn-link {
          background: transparent;
          border: none;
          color: var(--accent-gold);
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .btn-link:hover { text-decoration: underline; }

        .alert-scroll-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .alert-chip {
          min-width: 220px;
          padding: 10px 14px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .alert-chip.expired {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .alert-chip.warning {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .chip-name { font-weight: 700; font-size: 0.82rem; color: #fff; }
        .chip-reg { font-size: 0.72rem; color: var(--text-muted); }
        .chip-status {
          font-size: 0.72rem;
          font-weight: 700;
          margin-top: 4px;
        }
        .alert-chip.expired .chip-status { color: #ef4444; }
        .alert-chip.warning .chip-status { color: #f59e0b; }

        /* Chart Section */
        .chart-section {
          margin-bottom: 24px;
        }

        .main-chart-panel {
          height: 440px;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 16px;
        }

        .panel-title-group h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 2px;
        }

        .panel-subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .chart-controls {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .chart-mode-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.04);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn.active {
          background: var(--accent-gold);
          color: #000;
        }

        .legend-pills {
          display: flex;
          gap: 10px;
        }

        .pill {
          padding: 3px 10px;
          border-radius: 16px;
          font-size: 0.72rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .pill::before { content: ''; width: 7px; height: 7px; border-radius: 50%; }
        .pill-gold { background: rgba(255, 183, 0, 0.1); color: var(--accent-gold); border: 1px solid rgba(255, 183, 0, 0.2); }
        .pill-gold::before { background: var(--accent-gold); }
        .pill-green { background: rgba(0, 230, 118, 0.1); color: var(--accent-success); border: 1px solid rgba(0, 230, 118, 0.2); }
        .pill-green::before { background: var(--accent-success); }

        .chart-container {
          flex: 1;
          width: 100%;
          min-height: 0;
        }

        /* Bottom Split */
        .bottom-split {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
        }

        /* Recent Activity Table */
        .recent-panel {
          display: flex;
          flex-direction: column;
        }

        .recent-table-wrap {
          overflow-x: auto;
          flex: 1;
        }

        .recent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .recent-table th {
          text-align: left;
          padding: 10px 12px;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .recent-tr {
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }

        .recent-tr:hover {
          background: rgba(255, 183, 0, 0.03);
        }

        .recent-table td {
          padding: 12px;
          vertical-align: middle;
        }

        .doc-type-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .doc-tag {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .doc-tag.gold { background: rgba(255, 183, 0, 0.15); color: var(--accent-gold); }
        .doc-tag.blue { background: rgba(0, 176, 255, 0.15); color: var(--accent-blue); }

        .doc-num {
          font-weight: 700;
          color: #fff;
        }

        .client-cell {
          font-weight: 600;
          color: var(--text-primary);
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .date-cell {
          color: var(--text-secondary);
          font-size: 0.78rem;
          white-space: nowrap;
        }

        .status-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: capitalize;
        }

        .status-pill.paid { background: rgba(0, 230, 118, 0.12); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.25); }
        .status-pill.unpaid { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); }

        .amount-cell {
          text-align: right;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          color: #fff;
        }

        .btn-icon-action {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-icon-action:hover {
          background: var(--accent-gold);
          color: #000;
          border-color: var(--accent-gold);
        }

        /* Right Column Panels */
        .right-panels-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Client Leaderboard */
        .client-leaderboard-panel .client-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .client-card-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .client-card-row:hover {
          background: rgba(255, 183, 0, 0.04);
          border-color: rgba(255, 183, 0, 0.2);
        }

        .client-avatar {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(255, 183, 0, 0.2) 0%, rgba(255, 183, 0, 0.05) 100%);
          border: 1px solid rgba(255, 183, 0, 0.3);
          color: var(--accent-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .client-card-info {
          flex: 1;
          min-width: 0;
        }

        .client-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .client-card-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .client-card-val {
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--accent-gold);
        }

        .client-meter-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          overflow: hidden;
        }

        .client-meter-fill {
          height: 100%;
          background: var(--accent-gold);
          border-radius: 4px;
        }

        /* Document Distribution Donut */
        .distribution-panel .donut-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .donut-legend-custom {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.78rem;
        }

        .donut-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .donut-legend-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .donut-legend-item .label { color: var(--text-secondary); }
        .donut-legend-item .val { color: #fff; }

        .empty-state {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        /* Global Search Bar */
        .global-search-wrap {
          position: relative;
          z-index: 200;
        }

        .global-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px 14px;
          transition: all 0.2s ease;
          min-width: 260px;
        }

        .global-search-input-wrap:focus-within {
          border-color: rgba(255, 183, 0, 0.5);
          background: rgba(255, 183, 0, 0.04);
          box-shadow: 0 0 0 3px rgba(255, 183, 0, 0.08);
        }

        .search-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .global-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 500;
          flex: 1;
          min-width: 0;
        }

        .global-search-input::placeholder {
          color: var(--text-muted);
        }

        .search-clear-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .search-clear-btn:hover { color: #fff; }

        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: rgba(15, 18, 28, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 183, 0, 0.2);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04);
          min-width: 360px;
          max-height: 400px;
          overflow-y: auto;
        }

        .search-no-results {
          padding: 18px 16px;
          color: var(--text-muted);
          font-size: 0.82rem;
          text-align: center;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: background 0.15s ease;
        }

        .search-result-item:last-child { border-bottom: none; }

        .search-result-item:hover {
          background: rgba(255, 183, 0, 0.07);
        }

        .search-doc-tag {
          font-size: 0.62rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .search-doc-tag.gold { background: rgba(255, 183, 0, 0.15); color: var(--accent-gold); }
        .search-doc-tag.blue { background: rgba(0, 176, 255, 0.15); color: var(--accent-blue); }
        .search-doc-tag.purple { background: rgba(179, 136, 255, 0.15); color: #b388ff; }
        .search-doc-tag.cyan { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
        .search-doc-tag.green { background: rgba(0, 230, 118, 0.15); color: var(--accent-success); }

        .search-result-info {
          flex: 1;
          min-width: 0;
        }

        .search-result-name {
          display: block;
          font-weight: 600;
          font-size: 0.82rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result-client {
          display: block;
          font-size: 0.72rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result-date {
          font-size: 0.72rem;
          color: var(--text-secondary);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1100px) {
          .bottom-split {
            grid-template-columns: 1fr;
          }
          .dashboard-header {
            padding: 32px 24px 20px;
          }
          .dashboard-body {
            padding: 20px 24px 32px;
          }
        }

        @media (max-width: 768px) {
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          .quick-actions-bar {
            width: 100%;
            justify-content: space-between;
          }
          .quick-btn {
            flex: 1;
            justify-content: center;
            padding: 6px 8px;
            font-size: 0.75rem;
          }
          .kpi-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
