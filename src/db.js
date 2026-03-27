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
  await db.invoices.add(invoiceData);
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
  await db.cashbills.add(billData);
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
  await db.deliveryChellans.add(dcData);
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
