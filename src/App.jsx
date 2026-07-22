import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SecurityLock from './components/SecurityLock';
import { securitySettings } from './utils/security';
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
import PurchaseBill from './pages/PurchaseBill';
import UpdatePrompt from './components/UpdatePrompt';
import { syncFromCloud, initSettings } from './db';
import './index.css';


function App() {
  const [isLocked, setIsLocked] = useState(false);

  // Security check on mount and inactivity timer
  useEffect(() => {
    let activityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

    const checkLockStatus = () => {
      if (securitySettings.isLockEnabled && securitySettings.appPin && securitySettings.appPin.length === 4) {
        const sessionUnlocked = sessionStorage.getItem('isUnlocked') === 'true';
        const lastActivity = localStorage.getItem('lastActivity');
        const now = Date.now();
        
        if (!sessionUnlocked) {
          setIsLocked(true);
        } else if (lastActivity && now - parseInt(lastActivity, 10) > INACTIVITY_LIMIT) {
          setIsLocked(true);
          sessionStorage.removeItem('isUnlocked');
        }
      }
    };

    const updateActivity = () => {
      if (securitySettings.isLockEnabled && sessionStorage.getItem('isUnlocked') === 'true') {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    };

    // Initial check
    checkLockStatus();

    // Set up activity listeners
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Timer to periodically check inactivity
    activityTimer = setInterval(checkLockStatus, 10000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(activityTimer);
    };
  }, []);

  const handleUnlock = () => {
    setIsLocked(false);
    sessionStorage.setItem('isUnlocked', 'true');
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  useEffect(() => {
    async function initSync() {
      await initSettings();
      await syncFromCloud();
    }
    initSync();
  }, []);

  return (
    <>
      {isLocked && <SecurityLock onUnlock={handleUnlock} />}
      {!isLocked && (
        <div className="app-root-container">
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
              <Route path="/purchase-bill" element={<PurchaseBill />} />
            </Routes>
          </main>
          </BrowserRouter>
        </div>
      )}
    </>
  );
}

export default App;
