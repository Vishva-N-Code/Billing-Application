import Dexie from 'dexie';
import { supabase, BUSINESS_ID } from './supabase';

export const db = new Dexie('OmSaravanaCranesDB');

db.version(1).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key'
});

db.version(2).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, date, clientCompany, grandTotal, data'
});

db.version(3).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, date, clientCompany, grandTotal, data',
  cashbills: '++id, billNo, date, clientCompany, grandTotal, data'
});

db.version(4).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, date, clientCompany, grandTotal, data',
  cashbills: '++id, billNo, date, clientCompany, grandTotal, data',
  deliveryChellans: '++id, dcNo, date, clientCompany, data'
});

db.version(5).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  cashbills: '++id, billNo, docName, date, clientCompany, grandTotal, data',
  deliveryChellans: '++id, dcNo, docName, date, clientCompany, data',
  quotations: '++id, docName, date, clientCompany, data',
  proformaInvoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data'
});

db.version(6).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  cashbills: '++id, billNo, docName, date, clientCompany, grandTotal, data',
  deliveryChellans: '++id, dcNo, docName, date, clientCompany, data',
  quotations: '++id, docName, date, clientCompany, data',
  proformaInvoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  vehicleDetails: '++id, sectionName, order'
});

db.version(9).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website',
  settings: 'key',
  invoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  cashbills: '++id, billNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  deliveryChellans: '++id, dcNo, docName, date, clientCompany, data',
  quotations: '++id, docName, date, clientCompany, data',
  proformaInvoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  vehicleDetails: '++id, sectionName, order',
  mediaLibrary: '++id, name, type, category, uploadedAt',
  experienceCertificates: '++id, docName, driverName, date, data'
});

// Company info constant
export const COMPANY = {
  name: 'OM SARAVANA CRANES',
  displayName: 'Om Saravana Cranes',
  tagline: 'All Kinds of crane, Forklift, Heavy Operator - 24 Hrs. Service',
  address: 'NO.18, P.S. Complex, 55-Thandalam,\nSriperumbudur (TK) - 602105',
  gstin: '33AOVPN6372D1ZM',
  mobile: '9551076305 / 9551070705',
  email: 'omsaravanacranes@gmail.com',
  website: 'omsaravanacranes.in',
  bankAccount: '145202000001200',
  bankName: 'OM SARAVANA CRANES',
  bankIFSC: 'IOBA0001452',
  bankBranch: 'Irungattukottai (Large Advances)',
  owner: 'K. Nanda Kumar',
  termsAndConditions: '1. Subject to Chennai Jurisdiction.\n2. Goods once sold cannot be taken back.\n3. Interest will be charged @ 24% p.a. on delayed payments.'
};

const DEFAULT_VEHICLE_SECTIONS = [
  { sectionName: '3 TON FORKLIFT – BAOLI', order: 1, vehicles: [{ name: 'Baoli Unit 1', regNo: '', chassisNo: '', value: '' }] },
  { sectionName: '3 TON FORKLIFT – TAILIFT', order: 2, vehicles: [{ name: 'Tailift Unit 1', regNo: '', chassisNo: '', value: '' }] },
  { sectionName: '5 TON FORKLIFT', order: 3, vehicles: [{ name: 'Unit 1', regNo: '', chassisNo: '', value: '' }] },
  { sectionName: 'NEW 5 TON FORKLIFT', order: 4, vehicles: [{ name: 'Unit 1', regNo: '', chassisNo: '', value: '' }] },
  { sectionName: 'FARANA F-20 CRANE', order: 5, vehicles: [{ name: 'Unit 1', regNo: '', chassisNo: '', value: '' }] },
  { sectionName: 'TRANSPORT', order: 6, vehicles: [{ name: 'Vehicle 1', regNo: '', chassisNo: '', value: '' }] }
];

export async function initSettings() {
  try {
    const invoiceCounter = await db.settings.get('invoiceCounter');
    if (!invoiceCounter) await db.settings.put({ key: 'invoiceCounter', value: 46 });
    const cashBillCounter = await db.settings.get('cashBillCounter');
    if (!cashBillCounter) await db.settings.put({ key: 'cashBillCounter', value: 1 });
    const dcCounter = await db.settings.get('dcCounter');
    if (!dcCounter) await db.settings.put({ key: 'dcCounter', value: 1 });

    const vehicleSectionCount = await db.vehicleDetails.count();
    if (vehicleSectionCount === 0) {
      for (const section of DEFAULT_VEHICLE_SECTIONS) await db.vehicleDetails.add(section);
    }

    const existingProfile = await db.settings.get('companyProfile');
    if (!existingProfile) await db.settings.put({ key: 'companyProfile', value: COMPANY });

    const allCust = await db.customers.toArray();
    for (const c of allCust) {
      if (c.company_name && !c.companyName) await db.customers.update(c.id, { companyName: c.company_name });
    }

    // One-time aggressive local sweep of test documents
    const didSweep = await db.settings.get('cleanUpPerformed_v1');
    if (!didSweep) {
      console.log('Running one-time local database cleanup for unwanted docs...');
      const isUnwanted = (item) => {
        const cname = (item.clientCompany || '').trim().toLowerCase();
        const dname = (item.docName || '').toLowerCase();
        return cname === '' || cname === 'test corp' || dname.includes('draft') || dname.includes('test') || (cname === '' && (item.grandTotal === 0 || item.grandTotal == null));
      };
      
      const tables = [db.invoices, db.cashbills, db.quotations, db.deliveryChellans, db.proformaInvoices];
      for (const table of tables) {
        const records = await table.toArray();
        for (const r of records) {
          if (isUnwanted(r)) {
            await table.delete(r.id);
          }
        }
      }
      await db.settings.put({ key: 'cleanUpPerformed_v1', value: true });
      console.log('Local sweep completed safely.');
    }

  } catch (e) {
    console.error('Init settings error:', e);
  }
}

export async function getNextInvoiceNumber() {
  const counter = await db.settings.get('invoiceCounter');
  return String(counter ? counter.value : 46).padStart(3, '0');
}

export async function updateInvoiceCounter(newNumberStr) {
  const num = parseInt(newNumberStr, 10);
  if (!isNaN(num)) await db.settings.put({ key: 'invoiceCounter', value: num + 1 });
}

export const COLUMN_MAP = {
  companyName: 'company_name',
  invoiceNo: 'invoice_no',
  docName: 'doc_name',
  billNo: 'bill_no',
  dcNo: 'dc_no',
  clientCompany: 'client_company',
  grandTotal: 'grand_total',
  uploadedAt: 'uploaded_at',
  dataUrl: 'data_url',
  paymentStatus: 'payment_status',
  paidAmount: 'paid_amount',
  driverName: 'driver_name'
};

const TABLE_CONFLICT_COLS = {
  customers: 'business_id, company_name',
  invoices: 'business_id, invoice_no',
  cashbills: 'business_id, bill_no',
  delivery_chellans: 'business_id, dc_no',
  quotations: 'business_id, doc_name',
  proforma_invoices: 'business_id, invoice_no',
  media_library: 'business_id, name',
  experience_certificates: 'business_id, doc_name',
  settings: 'business_id, key'
};

function mapToCloud(data) {
  if (!data) return data;
  const mapped = {};
  for (const key in data) {
    const cloudKey = COLUMN_MAP[key] || key;
    mapped[cloudKey] = data[key];
  }
  return mapped;
}

function mapFromCloud(data) {
  if (!data) return data;
  const mapped = {};
  const inverseMap = Object.fromEntries(Object.entries(COLUMN_MAP).map(([k, v]) => [v, k]));
  for (const key in data) {
    const localKey = inverseMap[key] || key;
    mapped[localKey] = data[key];
  }
  return mapped;
}

export async function pushToCloud(tableName, data) {
  try {
    const cloudData = mapToCloud(data);
    delete cloudData.id;
    delete cloudData.originalFileName; // Sanitize missing cloud column
    const onConflict = TABLE_CONFLICT_COLS[tableName] || 'business_id';
    const { error } = await supabase.from(tableName).upsert({ ...cloudData, business_id: BUSINESS_ID }, { onConflict });
    if (error) {
      console.error(`Sync error (${tableName}):`, error.message);
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: error.message } }));
    }
  } catch (err) {
    console.error('Supabase push exception:', err);
    window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: err.message } }));
  }
}

export async function removeFromCloud(tableName, query) {
  try {
    const cloudQuery = mapToCloud(query);
    await supabase.from(tableName).delete().match({ ...cloudQuery, business_id: BUSINESS_ID });
  } catch (err) {
    console.error('Supabase delete exception:', err);
  }
}

export async function syncFromCloud() {
  try {
    const tableMappings = [
      { local: db.customers, remote: 'customers', key: 'companyName' },
      { local: db.invoices, remote: 'invoices', key: 'invoiceNo' },
      { local: db.cashbills, remote: 'cashbills', key: 'billNo' },
      { local: db.deliveryChellans, remote: 'delivery_chellans', key: 'dcNo' },
      { local: db.quotations, remote: 'quotations', key: 'docName' },
      { local: db.proformaInvoices, remote: 'proforma_invoices', key: 'invoiceNo' },
      { local: db.mediaLibrary, remote: 'media_library', key: 'uploadedAt' },
      { local: db.experienceCertificates, remote: 'experience_certificates', key: 'docName' },
    ];

    for (const mapping of tableMappings) {
      const { data, error } = await supabase.from(mapping.remote).select('*').eq('business_id', BUSINESS_ID);
      if (error) continue;
      if (data) {
        for (const remoteItem of data) {
          const cloudItem = mapFromCloud(remoteItem);
          const exists = await mapping.local.get({ [mapping.key]: cloudItem[mapping.key] });
          if (!exists) await mapping.local.add({ ...cloudItem, id: undefined });
        }
        const localItems = await mapping.local.toArray();
        for (const localItem of localItems) {
          const inCloud = data.find(d => mapFromCloud(d)[mapping.key] === localItem[mapping.key]);
          if (!inCloud) await pushToCloud(mapping.remote, localItem);
        }
      }
    }

    const { data: setts } = await supabase.from('settings').select('*').eq('business_id', BUSINESS_ID);
    if (setts) {
      for (const s of setts) await db.settings.put({ key: s.key, value: s.value });
    }
    console.log('--- Sync system STANDBY ---');
    window.dispatchEvent(new CustomEvent('sync-complete'));
  } catch (err) {
    console.error('Core sync error:', err);
  }
}

// CRUD Functions
export async function getAllCustomers() { return await db.customers.toArray(); }
export async function saveCustomer(data) { const id = await db.customers.add(data); pushToCloud('customers', data); return id; }
export async function updateCustomer(id, data) { await db.customers.update(id, data); pushToCloud('customers', data); }
export async function deleteCustomer(id) { 
  const item = await db.customers.get(id); 
  if (item) removeFromCloud('customers', { companyName: item.companyName });
  return await db.customers.delete(id); 
}

export async function saveInvoice(data) { const id = await db.invoices.add(data); pushToCloud('invoices', data); return id; }
export async function updateInvoice(id, data) { await db.invoices.update(id, data); pushToCloud('invoices', data); }
export async function deleteInvoice(id) {
  const item = await db.invoices.get(id);
  if (item) removeFromCloud('invoices', { invoiceNo: item.invoiceNo });
  return await db.invoices.delete(id);
}

export async function saveCashBill(data) { const id = await db.cashbills.add(data); pushToCloud('cashbills', data); return id; }
export async function updateCashBill(id, data) { await db.cashbills.update(id, data); pushToCloud('cashbills', data); }
export async function deleteCashBill(id) {
  const item = await db.cashbills.get(id);
  if (item) removeFromCloud('cashbills', { billNo: item.billNo });
  return await db.cashbills.delete(id);
}

export async function saveDc(data) { const id = await db.deliveryChellans.add(data); pushToCloud('delivery_chellans', data); return id; }
export async function updateDc(id, data) { await db.deliveryChellans.update(id, data); pushToCloud('delivery_chellans', data); }
export async function deleteDc(id) {
  const item = await db.deliveryChellans.get(id);
  if (item) removeFromCloud('delivery_chellans', { dcNo: item.dcNo });
  return await db.deliveryChellans.delete(id);
}

export async function saveQuotation(data) { const id = await db.quotations.add(data); pushToCloud('quotations', data); return id; }
export async function updateQuotation(id, data) { await db.quotations.update(id, data); pushToCloud('quotations', data); }
export async function deleteQuotation(id) {
  const item = await db.quotations.get(id);
  if (item) removeFromCloud('quotations', { docName: item.docName });
  return await db.quotations.delete(id);
}

export async function saveProformaInvoice(data) { const id = await db.proformaInvoices.add(data); pushToCloud('proforma_invoices', data); return id; }
export async function updateProformaInvoice(id, data) { await db.proformaInvoices.update(id, data); pushToCloud('proforma_invoices', data); }
export async function deleteProformaInvoice(id) {
  const item = await db.proformaInvoices.get(id);
  if (item) removeFromCloud('proforma_invoices', { invoiceNo: item.invoiceNo });
  return await db.proformaInvoices.delete(id);
}

export async function saveExperienceCertificate(data) { const id = await db.experienceCertificates.add(data); pushToCloud('experience_certificates', data); return id; }
export async function updateExperienceCertificate(id, data) { await db.experienceCertificates.update(id, data); pushToCloud('experience_certificates', data); }
export async function deleteExperienceCertificate(id) {
  const item = await db.experienceCertificates.get(id);
  if (item) removeFromCloud('experience_certificates', { docName: item.docName });
  return await db.experienceCertificates.delete(id);
}

export async function getNextCashBillNumber() { const counter = await db.settings.get('cashBillCounter'); return String(counter ? counter.value : 1).padStart(3, '0'); }
export async function updateCashBillCounter(n) { const num = parseInt(n); if (!isNaN(num)) await db.settings.put({ key: 'cashBillCounter', value: num + 1 }); }
export async function getNextDcNumber() { const counter = await db.settings.get('dcCounter'); return String(counter ? counter.value : 1).padStart(3, '0'); }
export async function updateDcCounter(n) { const num = parseInt(n); if (!isNaN(num)) await db.settings.put({ key: 'dcCounter', value: num + 1 }); }

export async function getAllMediaItems() { return (await db.mediaLibrary.toArray()).sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); }
export async function saveMediaItem(data) { const id = await db.mediaLibrary.add(data); pushToCloud('media_library', data); return id; }
export async function updateMediaItem(id, data) { await db.mediaLibrary.update(id, data); const item = await db.mediaLibrary.get(id); if (item) pushToCloud('media_library', item); }
export async function deleteMediaItem(id) {
  const item = await db.mediaLibrary.get(id);
  if (item) removeFromCloud('media_library', { name: item.name });
  return await db.mediaLibrary.delete(id);
}

export async function getAllVehicleSections() { return (await db.vehicleDetails.toArray()).sort((a,b) => (a.order||0) - (b.order||0)); }
export async function saveVehicleSection(data) { return await db.vehicleDetails.add(data); }
export async function updateVehicleSection(id, data) { return await db.vehicleDetails.update(id, data); }
export async function deleteVehicleSection(id) { return await db.vehicleDetails.delete(id); }

export async function updatePaymentStatus(id, type, paidAmount, status) {
  const table = type === 'invoice' ? db.invoices : db.cashbills;
  const remoteTable = type === 'invoice' ? 'invoices' : 'cashbills';
  
  await table.update(id, { paidAmount, paymentStatus: status });
  const updatedItem = await table.get(id);
  if (updatedItem) pushToCloud(remoteTable, updatedItem);
}

export async function getCompanyProfile() { const p = await db.settings.get('companyProfile'); return p ? p.value : COMPANY; }
export async function updateCompanyProfile(data) { await db.settings.put({ key: 'companyProfile', value: data }); pushToCloud('settings', { key: 'companyProfile', value: data }); }
