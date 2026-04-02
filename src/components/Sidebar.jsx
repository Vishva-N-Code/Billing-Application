import { NavLink } from 'react-router-dom';
import { FileText, Receipt, ClipboardList, Users, Banknote, Menu, X, Truck, Database } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: '/', icon: <FileText />, label: 'Quotation' },
    { to: '/tax-invoice', icon: <Receipt />, label: 'Tax Invoice' },
    { to: '/proforma-invoice', icon: <ClipboardList />, label: 'Proforma Invoice' },
    { to: '/cash-bill', icon: <Banknote />, label: 'Cash Bill' },
    { to: '/delivery-chellan', icon: <Truck />, label: 'Delivery Challan' },
    { to: '/customers', icon: <Users />, label: 'Customers' },
    { to: '/storage', icon: <Database />, label: 'Saved Documents' },
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
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="OM Saravana Cranes Logo" />
          <div>
            <h2>OM Saravana Cranes</h2>
            <span>Lifting Partner Since 2004</span>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setOpen(false)}
            style={{ marginLeft: 'auto', display: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          © 2004–2026 Om Saravana Cranes
        </div>
      </aside>
    </>
  );
}
