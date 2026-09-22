import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
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
import UpdatePrompt from './components/UpdatePrompt';
import { syncFromCloud, initSettings } from './db';
import './index.css';

// ── Lazy-load OMS pages for performance ──
const OmsDashboard        = lazy(() => import('./oms/pages/OmsDashboard'));
const OmsWorkLog          = lazy(() => import('./oms/pages/OmsWorkLog'));
const OmsOperators        = lazy(() => import('./oms/pages/OmsOperators'));
const OmsOperatorProfile  = lazy(() => import('./oms/pages/OmsOperatorProfile'));
const OmsAttendance       = lazy(() => import('./oms/pages/OmsAttendance'));
const OmsVehicles         = lazy(() => import('./oms/pages/OmsVehicles'));
const OmsCustomers        = lazy(() => import('./oms/pages/OmsCustomers'));
const OmsRentals          = lazy(() => import('./oms/pages/OmsRentals'));
const OmsAdvances         = lazy(() => import('./oms/pages/OmsAdvances'));
const OmsPayroll          = lazy(() => import('./oms/pages/OmsPayroll'));
const OmsDocuments        = lazy(() => import('./oms/pages/OmsDocuments'));
const OmsReports          = lazy(() => import('./oms/pages/OmsReports'));
const OmsNotifications    = lazy(() => import('./oms/pages/OmsNotifications'));
const OmsSettings         = lazy(() => import('./oms/pages/OmsSettings'));
const OmsAuditLog         = lazy(() => import('./oms/pages/OmsAuditLog'));

function OmsLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid rgba(59,130,246,0.3)',
        borderTop: '3px solid #3b82f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading OMS...</span>
    </div>
  );
}

function App() {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    let activityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;

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

    checkLockStatus();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
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
      window.dispatchEvent(new CustomEvent('sync-complete'));
      setTimeout(() => {
        syncFromCloud().catch(e => console.warn('Background cloud sync skipped:', e.message));
      }, 50);
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
              <Suspense fallback={<OmsLoader />}>
                <Routes>
                  {/* ── BILLING ROUTES (existing) ── */}
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

                  {/* ── OMS ROUTES (new) ── */}
                  <Route path="/oms" element={<OmsDashboard />} />
                  <Route path="/oms/work-log" element={<OmsWorkLog />} />
                  <Route path="/oms/operators" element={<OmsOperators />} />
                  <Route path="/oms/operators/:id" element={<OmsOperatorProfile />} />
                  <Route path="/oms/attendance" element={<OmsAttendance />} />
                  <Route path="/oms/vehicles" element={<OmsVehicles />} />
                  <Route path="/oms/customers" element={<OmsCustomers />} />
                  <Route path="/oms/rentals" element={<OmsRentals />} />
                  <Route path="/oms/advances" element={<OmsAdvances />} />
                  <Route path="/oms/payroll" element={<OmsPayroll />} />
                  <Route path="/oms/documents" element={<OmsDocuments />} />
                  <Route path="/oms/reports" element={<OmsReports />} />
                  <Route path="/oms/notifications" element={<OmsNotifications />} />
                  <Route path="/oms/settings" element={<OmsSettings />} />
                  <Route path="/oms/audit" element={<OmsAuditLog />} />
                </Routes>
              </Suspense>
            </main>
          </BrowserRouter>
        </div>
      )}
    </>
  );
}

export default App;
