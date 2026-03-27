import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Quotation from './pages/Quotation';
import TaxInvoice from './pages/TaxInvoice';
import ProformaInvoice from './pages/ProformaInvoice';
import CashBill from './pages/CashBill';
import DeliveryChellan from './pages/DeliveryChellan';
import Customers from './pages/Customers';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Quotation />} />
          <Route path="/tax-invoice" element={<TaxInvoice />} />
          <Route path="/proforma-invoice" element={<ProformaInvoice />} />
          <Route path="/cash-bill" element={<CashBill />} />
          <Route path="/delivery-chellan" element={<DeliveryChellan />} />
          <Route path="/customers" element={<Customers />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
