import Dexie from 'dexie';

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

const DEFAULT_VEHICLE_SECTIONS = [
  {
    sectionName: '3 TON FORKLIFT – BAOLI',
    order: 1,
    vehicles: [
      { name: 'Baoli Unit 1', regNo: '', chassisNo: '', value: '' }
    ]
  },
  {
    sectionName: '3 TON FORKLIFT – TAILIFT',
    order: 2,
    vehicles: [
      { name: 'Tailift Unit 1', regNo: '', chassisNo: '', value: '' }
    ]
  },
  {
    sectionName: '5 TON FORKLIFT',
    order: 3,
    vehicles: [
      { name: 'Unit 1', regNo: '', chassisNo: '', value: '' }
    ]
  },
  {
    sectionName: 'NEW 5 TON FORKLIFT',
    order: 4,
    vehicles: [
      { name: 'Unit 1', regNo: '', chassisNo: '', value: '' }
    ]
  },
  {
    sectionName: 'FARANA F-20 CRANE',
    order: 5,
    vehicles: [
      { name: 'Unit 1', regNo: '', chassisNo: '', value: '' }
    ]
  },
  {
    sectionName: 'TRANSPORT',
    order: 6,
    vehicles: [
      { name: 'Vehicle 1', regNo: '', chassisNo: '', value: '' }
    ]
  }
];

export async function initSettings() {
  const invoiceCounter = await db.settings.get('invoiceCounter');
  if (!invoiceCounter) {
    await db.settings.put({ key: 'invoiceCounter', value: 46 }); // Starting after sample 045
  }
  const cashBillCounter = await db.settings.get('cashBillCounter');
  if (!cashBillCounter) {
    await db.settings.put({ key: 'cashBillCounter', value: 1 });
  }
  const dcCounter = await db.settings.get('dcCounter');
  if (!dcCounter) {
    await db.settings.put({ key: 'dcCounter', value: 1 });
  }

  // Seed default vehicle sections if none exist
  const vehicleSectionCount = await db.vehicleDetails.count();
  if (vehicleSectionCount === 0) {
    for (const section of DEFAULT_VEHICLE_SECTIONS) {
      await db.vehicleDetails.add(section);
    }
  }
}

export async function getNextInvoiceNumber() {
  const counter = await db.settings.get('invoiceCounter');
  const num = counter ? counter.value : 46;
  return String(num).padStart(3, '0');
}

export async function incrementInvoiceNumber() {
  const counter = await db.settings.get('invoiceCounter');
  const current = counter ? counter.value : 46;
  await db.settings.put({ key: 'invoiceCounter', value: current + 1 });
}

export async function updateInvoiceCounter(newNumberStr) {
  const num = parseInt(newNumberStr, 10);
  if (!isNaN(num)) {
    await db.settings.put({ key: 'invoiceCounter', value: num + 1 });
  }
}

export async function saveInvoice(invoiceData) {
  return await db.invoices.add(invoiceData);
}

export async function getNextCashBillNumber() {
  const counter = await db.settings.get('cashBillCounter');
  const num = counter ? counter.value : 1;
  return String(num).padStart(3, '0');
}

export async function updateCashBillCounter(newNumberStr) {
  const num = parseInt(newNumberStr, 10);
  if (!isNaN(num)) {
    await db.settings.put({ key: 'cashBillCounter', value: num + 1 });
  }
}

export async function saveCashBill(billData) {
  return await db.cashbills.add(billData);
}

export async function getNextDcNumber() {
  const counter = await db.settings.get('dcCounter');
  const num = counter ? counter.value : 1;
  return String(num).padStart(3, '0');
}

export async function updateDcCounter(newNumberStr) {
  const num = parseInt(newNumberStr, 10);
  if (!isNaN(num)) {
    await db.settings.put({ key: 'dcCounter', value: num + 1 });
  }
}

export async function saveDc(dcData) {
  return await db.deliveryChellans.add(dcData);
}

export async function updateDc(id, dcData) {
  return await db.deliveryChellans.update(id, dcData);
}

export async function deleteDc(id) {
  return await db.deliveryChellans.delete(id);
}

// Quotations
export async function saveQuotation(qData) {
  return await db.quotations.add(qData);
}
export async function updateQuotation(id, qData) {
  return await db.quotations.update(id, qData);
}
export async function deleteQuotation(id) {
  return await db.quotations.delete(id);
}

// Proforma Invoices
export async function saveProformaInvoice(pData) {
  return await db.proformaInvoices.add(pData);
}
export async function updateProformaInvoice(id, pData) {
  return await db.proformaInvoices.update(id, pData);
}
export async function deleteProformaInvoice(id) {
  return await db.proformaInvoices.delete(id);
}

export async function updateInvoice(id, data) {
  return await db.invoices.update(id, data);
}
export async function deleteInvoice(id) {
  return await db.invoices.delete(id);
}

export async function updateCashBill(id, data) {
  return await db.cashbills.update(id, data);
}
export async function deleteCashBill(id) {
  return await db.cashbills.delete(id);
}

// Vehicle Details CRUD
export async function getAllVehicleSections() {
  const sections = await db.vehicleDetails.toArray();
  return sections.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function saveVehicleSection(sectionData) {
  return await db.vehicleDetails.add(sectionData);
}

export async function updateVehicleSection(id, sectionData) {
  return await db.vehicleDetails.update(id, sectionData);
}

export async function deleteVehicleSection(id) {
  return await db.vehicleDetails.delete(id);
}

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
  owner: 'K. Nanda Kumar'
};
