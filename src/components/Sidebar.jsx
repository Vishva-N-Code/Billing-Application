import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Receipt, ClipboardList, Users, Banknote, Menu, X, Truck,
  Database, Car, Settings, LayoutDashboard, BarChart3, ChevronLeft,
  ChevronRight, Award, HardHat, Layers, Building2, CalendarCheck,
  CreditCard, FileBox, Bell, BookOpen, UserCog, ScrollText, Wrench
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { syncFromCloud } from '../db';

const BILLING_NAV = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/quotation', icon: <FileText size={20} />, label: 'Quotation' },
  { to: '/tax-invoice', icon: <Receipt size={20} />, label: 'Tax Invoice' },
  { to: '/proforma-invoice', icon: <ClipboardList size={20} />, label: 'Proforma Invoice' },
  { to: '/cash-bill', icon: <Banknote size={20} />, label: 'Cash Bill' },
  { to: '/delivery-chellan', icon: <Truck size={20} />, label: 'Delivery Challan' },
  { to: '/customers', icon: <Users size={20} />, label: 'Customers' },
  { to: '/storage', icon: <Database size={20} />, label: 'Saved Documents' },
  { to: '/vehicle-details', icon: <Car size={20} />, label: 'Vehicle Details' },
  { to: '/reports', icon: <BarChart3 size={20} />, label: 'Financial Reports' },
  { to: '/experience-certificate', icon: <Award size={20} />, label: 'Experience Cert.' },
  { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

const OMS_NAV = [
  { to: '/oms', icon: <LayoutDashboard size={20} />, label: 'OMS Dashboard', end: true },
  { to: '/oms/work-log', icon: <CalendarCheck size={20} />, label: 'Work Log' },
  { to: '/oms/operators', icon: <HardHat size={20} />, label: 'Operators' },
  { to: '/oms/attendance', icon: <UserCog size={20} />, label: 'Attendance' },
  { to: '/oms/vehicles', icon: <Wrench size={20} />, label: 'Vehicles' },
  { to: '/oms/customers', icon: <Building2 size={20} />, label: 'Customers' },
  { to: '/oms/rentals', icon: <Layers size={20} />, label: 'Rentals' },
  { to: '/oms/advances', icon: <CreditCard size={20} />, label: 'Advances' },
  { to: '/oms/payroll', icon: <FileBox size={20} />, label: 'Payroll' },
  { to: '/oms/documents', icon: <BookOpen size={20} />, label: 'Documents' },
  { to: '/oms/reports', icon: <BarChart3 size={20} />, label: 'Reports' },
  { to: '/oms/notifications', icon: <Bell size={20} />, label: 'Notifications' },
  { to: '/oms/settings', icon: <Settings size={20} />, label: 'OMS Settings' },
  { to: '/oms/audit', icon: <ScrollText size={20} />, label: 'Audit Log' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebar-collapsed') === 'true');
  const [syncError, setSyncError] = useState(null);
  const [activeModule, setActiveModule] = useState(localStorage.getItem('active-module') || 'billing');

  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeModule with current route
  useEffect(() => {
    if (location.pathname.startsWith('/oms')) {
      setActiveModule('oms');
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed);
    if (isCollapsed) {
      document.documentElement.classList.add('sidebar-collapsed');
    } else {
      document.documentElement.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleError = (e) => setSyncError(e.detail.message);
    window.addEventListener('sync-error', handleError);
    return () => window.removeEventListener('sync-error', handleError);
  }, []);

  const switchModule = (mod) => {
    setActiveModule(mod);
    localStorage.setItem('active-module', mod);
    if (mod === 'billing') {
      navigate('/');
    } else {
      navigate('/oms');
    }
    setOpen(false);
  };

  const navItems = activeModule === 'oms' ? OMS_NAV : BILLING_NAV;

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setOpen(true)}>
          <Menu size={24} />
        </button>
        <img src="/logo.png" alt="Logo" />
        <h2>OM Saravana Cranes</h2>
      </div>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${open ? 'visible' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="OM Saravana Cranes Logo" />
          <div className="logo-text">
            <h2 style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.05em' }}>OM SARAVANA CRANES</h2>
            <span style={{ color: 'var(--accent-gold)', opacity: 0.8 }}>LIFTING PARTNER SINCE 2004</span>
          </div>
          <button
            className="hamburger-btn mobile-only"
            onClick={() => setOpen(false)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Collapse Toggle Button (Desktop) */}
        <button
          className="collapse-toggle-btn desktop-only"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* ── MODULE SWITCHER ── */}
        <div className="oms-module-switcher" style={{
          padding: isCollapsed ? '10px 6px' : '12px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '6px',
          justifyContent: isCollapsed ? 'center' : 'stretch',
          flexDirection: isCollapsed ? 'column' : 'row',
        }}>
          <button
            onClick={() => switchModule('billing')}
            title="Billing System"
            style={{
              flex: 1,
              padding: isCollapsed ? '6px' : '7px 6px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              background: activeModule === 'billing'
                ? 'var(--accent-gold)'
                : 'rgba(255,255,255,0.07)',
              color: activeModule === 'billing' ? '#0f1117' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Receipt size={13} />
            {!isCollapsed && 'BILLING'}
          </button>
          <button
            onClick={() => switchModule('oms')}
            title="Operator Management"
            style={{
              flex: 1,
              padding: isCollapsed ? '6px' : '7px 6px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              background: activeModule === 'oms'
                ? 'var(--oms-accent, #3b82f6)'
                : 'rgba(255,255,255,0.07)',
              color: activeModule === 'oms' ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            <HardHat size={13} />
            {!isCollapsed && 'OMS'}
          </button>
        </div>

        {/* Sync status — show only for billing module */}
        {activeModule === 'billing' && (
          <div className="sidebar-sync-section" style={{
            padding: isCollapsed ? '12px 0' : '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div className="sync-status" onClick={async () => {
              try {
                setSyncError(null);
                await syncFromCloud();
                alert('Cloud Sync Refreshed Successfully!');
              } catch (e) {
                setSyncError(e.message);
              }
            }} style={{ cursor: 'pointer', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="sync-dot" style={{
                background: syncError ? '#ff4d4d' : '#00e676',
                boxShadow: `0 0 10px ${syncError ? '#ff4d4d' : '#00e676'}`
              }} />
              {!isCollapsed && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BILLING SYNC</span>}
            </div>
          </div>
        )}

        {/* OMS module label */}
        {activeModule === 'oms' && !isCollapsed && (
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'var(--oms-accent, #3b82f6)',
          }}>
            OPERATOR MANAGEMENT
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end || item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
              title={isCollapsed ? item.label : ''}
            >
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ marginBottom: '4px', opacity: 0.5, fontSize: '0.7rem' }}>ESTABLISHED 2004</div>
            <div style={{ fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.05em', fontSize: '0.8rem' }}>OM SARAVANA CRANES</div>
          </div>
        )}
      </aside>
    </>
  );
}
