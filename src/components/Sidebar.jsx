import { NavLink } from 'react-router-dom';
import { FileText, Receipt, ClipboardList, Users, Banknote, Menu, X, Truck, Database, Car, Settings, LayoutDashboard, BarChart3, ChevronLeft, ChevronRight, Award, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { syncFromCloud } from '../db';

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebar-collapsed') === 'true');
  const [syncError, setSyncError] = useState(null);

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

  const navItems = [
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
    { to: '/experience-certificate', icon: <Award size={20} />, label: 'Experience Certificate' },
    { to: '/purchase-bill', icon: <ShoppingCart size={20} />, label: 'Purchase Bill' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

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
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="sidebar-sync-section" style={{ padding: isCollapsed ? '16px 0' : '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="sync-status" onClick={async () => {
            try { 
              setSyncError(null);
              await syncFromCloud();
              alert('Cloud Sync Refreshed Successfully!');
            } catch (e) {
              setSyncError(e.message);
            }
          }} style={{ cursor: 'pointer', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="sync-dot" style={{ background: syncError ? '#ff4d4d' : '#00e676', boxShadow: `0 0 10px ${syncError ? '#ff4d4d' : '#00e676'}` }}></div>
            {!isCollapsed && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CLOUD SYNC ACTIVE</span>}
          </div>
          {!isCollapsed && (
            syncError ? (
              <div style={{ fontSize: '0.65rem', color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center' }}>
                {syncError}
              </div>
            ) : (
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: '0.1em' }}>
                v1.5.0 • SECURE CONNECTION
              </div>
            )
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
