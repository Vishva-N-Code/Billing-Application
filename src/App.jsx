import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Smartphone, Monitor } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Quotation from './pages/Quotation';
import TaxInvoice from './pages/TaxInvoice';
import ProformaInvoice from './pages/ProformaInvoice';
import CashBill from './pages/CashBill';
import DeliveryChellan from './pages/DeliveryChellan';
import Customers from './pages/Customers';
import Storage from './pages/Storage';
import VehicleDetails from './pages/VehicleDetails';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ExperienceCertificate from './pages/ExperienceCertificate';
import UpdatePrompt from './components/UpdatePrompt';
import { syncFromCloud } from './db';
import './index.css';


function App() {
  const [viewMode, setViewMode] = useState('system'); // 'system' | 'mobile'

  useEffect(() => {
    async function initSync() {
      await syncFromCloud();
    }
    initSync();
  }, []);

  return (
    <>
      {/* View Switcher Button */}
      <div className="view-switcher-wrapper">
        <button 
          className="view-switcher-btn"
          onClick={() => setViewMode(v => v === 'system' ? 'mobile' : 'system')}
        >
          {viewMode === 'system' ? <Smartphone size={16} /> : <Monitor size={16} />}
          <span>{viewMode === 'system' ? 'Mobile View' : 'System View'}</span>
        </button>
      </div>

      <div className={`app-root-container ${viewMode === 'mobile' ? 'mobile-simulator' : ''}`}>
        <BrowserRouter>
          <UpdatePrompt />
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quotation" element={<Quotation />} />
              <Route path="/tax-invoice" element={<TaxInvoice />} />
              <Route path="/proforma-invoice" element={<ProformaInvoice />} />
              <Route path="/cash-bill" element={<CashBill />} />
              <Route path="/delivery-chellan" element={<DeliveryChellan />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/storage" element={<Storage />} />
              <Route path="/vehicle-details" element={<VehicleDetails />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/experience-certificate" element={<ExperienceCertificate />} />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
