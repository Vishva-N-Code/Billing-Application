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

db.version(11).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website, vendorCode',
  settings: 'key',
  invoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  cashbills: '++id, billNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  deliveryChellans: '++id, dcNo, docName, date, clientCompany, data',
  quotations: '++id, docName, date, clientCompany, data',
  proformaInvoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  vehicleDetails: '++id, sectionName, order',
  mediaLibrary: '++id, name, type, category, uploadedAt',
  experienceCertificates: '++id, docName, driverName, date, data',
  purchaseBills: '++id, name, date, monthYear, dataUrl, type, uploadedAt'
});

// Version 12: Guaranteed one-time seed migration. Every browser on an older
// DB version will run this upgrade EXACTLY ONCE, populating documents immediately.
import seedData from './data/seedInvoices.json';
db.version(12).stores({
  customers: '++id, companyName, gstin, address, mobile, email, website, vendorCode',
  settings: 'key',
  invoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  cashbills: '++id, billNo, docName, date, clientCompany, grandTotal, paymentStatus, data',
  deliveryChellans: '++id, dcNo, docName, date, clientCompany, data',
  quotations: '++id, docName, date, clientCompany, data',
  proformaInvoices: '++id, invoiceNo, docName, date, clientCompany, grandTotal, data',
  vehicleDetails: '++id, sectionName, order',
  mediaLibrary: '++id, name, type, category, uploadedAt',
  experienceCertificates: '++id, docName, driverName, date, data',
  purchaseBills: '++id, name, date, monthYear, dataUrl, type, uploadedAt'
}).upgrade(async tx => {
  try {
    const existingInvoices = await tx.table('invoices').toArray();
    const hasRealInvoices = existingInvoices.some(i => i.clientCompany && i.clientCompany.trim() !== '' && i.grandTotal > 0);
    if (!hasRealInvoices && seedData && seedData.invoices && seedData.invoices.length > 0) {
      console.log(`[DB v12 upgrade] Seeding ${seedData.invoices.length} invoices...`);
      // Clear any empty/draft stubs first
      const emptyIds = existingInvoices.filter(i => !i.clientCompany || i.grandTotal === 0).map(i => i.id);
      if (emptyIds.length > 0) await tx.table('invoices').bulkDelete(emptyIds);
      // Seed real documents (strip id so auto-increment assigns fresh keys)
      const strip = arr => arr.map(({ id, ...rest }) => rest);
      await tx.table('invoices').bulkAdd(strip(seedData.invoices));
      if (seedData.cashbills && seedData.cashbills.length > 0) {
        await tx.table('cashbills').bulkAdd(strip(seedData.cashbills));
      }
      if (seedData.dcs && seedData.dcs.length > 0) {
        await tx.table('deliveryChellans').bulkAdd(strip(seedData.dcs));
      }
    }
  } catch (e) {
    console.error('[DB v12 upgrade] Seed error:', e);
  }
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

import seedInvoices from './data/seedInvoices.json';

export function notifyLocalChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-complete'));
  }
}

export async function initSettings() {
  try {
    // 1. Immediate Seed Check & Fast Sync: Ensures documents display instantly on any device/browser
    try {
      const allInvoices = await db.invoices.toArray();
      const localInvoiceNos = new Set(allInvoices.map(i => normKey(i.invoiceNo)));
      const missingSeedInvoices = (seedInvoices.invoices || []).filter(i => !localInvoiceNos.has(normKey(i.invoiceNo)));
      if (missingSeedInvoices.length > 0) {
        console.log(`[Fast Init] Populating ${missingSeedInvoices.length} missing seed invoices into Dexie...`);
        const cleanWithId = missingSeedInvoices.map(({ id, ...rest }) => rest);
        await db.invoices.bulkAdd(cleanWithId);
      }

      const allCashbills = await db.cashbills.toArray();
      const localBillNos = new Set(allCashbills.map(b => normKey(b.billNo)));
      const missingSeedBills = (seedInvoices.cashbills || []).filter(b => !localBillNos.has(normKey(b.billNo)));
      if (missingSeedBills.length > 0) {
        const cleanWithId = missingSeedBills.map(({ id, ...rest }) => rest);
        await db.cashbills.bulkAdd(cleanWithId);
      }

      const allCust = await db.customers.toArray();
      const localCustNames = new Set(allCust.map(c => normKey(c.companyName)));
      const missingSeedCusts = (seedInvoices.customers || []).filter(c => !localCustNames.has(normKey(c.companyName)));
      if (missingSeedCusts.length > 0) {
        const cleanWithId = missingSeedCusts.map(({ id, ...rest }) => rest);
        await db.customers.bulkAdd(cleanWithId);
      }

      if (seedInvoices.dcs && seedInvoices.dcs.length > 0) {
        const allDcs = await db.deliveryChellans.toArray();
        const localDcNos = new Set(allDcs.map(d => normKey(d.dcNo)));
        const missingDcs = seedInvoices.dcs.filter(d => !localDcNos.has(normKey(d.dcNo)));
        if (missingDcs.length > 0) {
          await db.deliveryChellans.bulkAdd(missingDcs.map(({ id, ...rest }) => rest));
        }
      }

      let missingQuotations = [];
      if (seedInvoices.quotations && seedInvoices.quotations.length > 0) {
        const allQuotations = await db.quotations.toArray();
        const localQuotationNames = new Set(allQuotations.map(q => normKey(q.docName)));
        missingQuotations = seedInvoices.quotations.filter(q => q.docName && !localQuotationNames.has(normKey(q.docName)));
        if (missingQuotations.length > 0) {
          console.log(`[Fast Init] Populating ${missingQuotations.length} missing seed quotations into Dexie...`);
          await db.quotations.bulkAdd(missingQuotations.map(({ id, ...rest }) => rest));
        }
      }

      if (missingSeedInvoices.length > 0 || missingSeedBills.length > 0 || missingSeedCusts.length > 0 || (missingDcs && missingDcs.length > 0) || missingQuotations.length > 0) {
        notifyLocalChange();
      }
    } catch (seedErr) {
      console.error('Initial seed error:', seedErr);
    }

    const [invoiceCounter, cashBillCounter, dcCounter, vehicleSectionCount, existingProfile, didSweep] = await Promise.all([
      db.settings.get('invoiceCounter'),
      db.settings.get('cashBillCounter'),
      db.settings.get('dcCounter'),
      db.vehicleDetails.count(),
      db.settings.get('companyProfile'),
      db.settings.get('cleanUpPerformed_v1')
    ]);

    const operations = [];

    if (!invoiceCounter) operations.push(db.settings.put({ key: 'invoiceCounter', value: 46 }));
    if (!cashBillCounter) operations.push(db.settings.put({ key: 'cashBillCounter', value: 1 }));
    if (!dcCounter) operations.push(db.settings.put({ key: 'dcCounter', value: 1 }));

    if (vehicleSectionCount === 0) {
      for (const section of DEFAULT_VEHICLE_SECTIONS) {
        operations.push(db.vehicleDetails.add(section));
      }
    }

    if (!existingProfile) {
      operations.push(db.settings.put({ key: 'companyProfile', value: COMPANY }));
    }

    if (!didSweep) {
      operations.push(db.settings.put({ key: 'cleanUpPerformed_v1', value: true }));
    }

    await Promise.all(operations);

    const allCust = await db.customers.toArray();
    const custUpdateOps = [];
    for (const c of allCust) {
      if (c.company_name && !c.companyName) {
        custUpdateOps.push(db.customers.update(c.id, { companyName: c.company_name }));
      }
    }
    // Purge local blank drafts (zero total AND empty client company)
    // Note: quotations have no grandTotal — use docName as the validity check for those
    const tablesWithTotal = [db.invoices, db.cashbills, db.deliveryChellans, db.proformaInvoices];
    for (const table of tablesWithTotal) {
      const items = await table.toArray();
      const emptyIds = items.filter(item => {
        const isClientEmpty = !item.clientCompany || item.clientCompany.trim() === '';
        const isZeroTotal = item.grandTotal === 0 || item.grandTotal == null;
        return isClientEmpty && isZeroTotal;
      }).map(item => item.id);
      if (emptyIds.length > 0) {
        await table.bulkDelete(emptyIds);
      }
    }
    // Quotations: only purge if BOTH docName and clientCompany are empty/blank
    {
      const items = await db.quotations.toArray();
      const emptyIds = items.filter(item => {
        const isClientEmpty = !item.clientCompany || item.clientCompany.trim() === '';
        const isDocNameEmpty = !item.docName || item.docName.trim() === '';
        return isClientEmpty && isDocNameEmpty;
      }).map(item => item.id);
      if (emptyIds.length > 0) {
        await db.quotations.bulkDelete(emptyIds);
      }
    }

    if (custUpdateOps.length > 0) {
      await Promise.all(custUpdateOps);
    }

  } catch (e) {
    console.error('Init settings error:', e);
  }
}

export function extractInvoiceNumber(str) {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  const lastMatch = matches[matches.length - 1];
  const parsed = parseInt(lastMatch, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export async function getNextInvoiceNumber() {
  let maxInDb = 0;
  let maxPadLength = 3;
  try {
    const allInvoices = await db.invoices.toArray();
    if (Array.isArray(allInvoices)) {
      for (const inv of allInvoices) {
        const rawNo = inv.invoiceNo || inv.data?.form?.invoiceNo;
        if (rawNo) {
          const num = extractInvoiceNumber(rawNo);
          if (num > maxInDb) {
            maxInDb = num;
          }
          if (typeof rawNo === 'string' && /^\d+$/.test(rawNo.trim())) {
            maxPadLength = Math.max(maxPadLength, rawNo.trim().length);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading db.invoices in getNextInvoiceNumber:', err);
  }

  const counterSetting = await db.settings.get('invoiceCounter');
  const counterVal = counterSetting ? Number(counterSetting.value) : 46;

  const nextNum = Math.max(maxInDb + 1, counterVal);

  try {
    await db.settings.put({ key: 'invoiceCounter', value: nextNum });
  } catch (err) {
    console.warn('Failed to update invoiceCounter setting:', err);
  }

  return String(nextNum).padStart(maxPadLength, '0');
}

export async function updateInvoiceCounter(newNumberStr) {
  const num = extractInvoiceNumber(newNumberStr);
  if (num > 0) {
    const counterSetting = await db.settings.get('invoiceCounter');
    const currentVal = counterSetting ? Number(counterSetting.value) || 0 : 0;
    const targetVal = Math.max(num + 1, currentVal);
    await db.settings.put({ key: 'invoiceCounter', value: targetVal });
  }
}

export async function getNextProformaInvoiceNumber(companyName) {
  const cleanName = (companyName || '').trim();
  const firstLetterMatch = cleanName.match(/[a-zA-Z]/);
  const defaultPrefix = firstLetterMatch ? firstLetterMatch[0].toUpperCase() : 'P';
  
  let prefix = defaultPrefix;
  let maxNum = 0;
  let padLen = 3;
  let separator = '';

  try {
    const allProformas = await db.proformaInvoices.toArray();
    if (Array.isArray(allProformas)) {
      // 1. Look for existing proformas matching this specific company name
      const matchingCompanyProformas = cleanName 
        ? allProformas.filter(p => p.clientCompany && p.clientCompany.trim().toLowerCase() === cleanName.toLowerCase())
        : [];

      for (const p of matchingCompanyProformas) {
        const rawNo = p.invoiceNo || p.data?.form?.invoiceNo;
        if (rawNo && typeof rawNo === 'string') {
          const match = rawNo.trim().match(/^([a-zA-Z]+)([-/_]?\s*)(\d+)$/);
          if (match) {
            prefix = match[1].toUpperCase();
            separator = match[2] || '';
            const num = parseInt(match[3], 10);
            if (num > maxNum) {
              maxNum = num;
              padLen = Math.max(padLen, match[3].length);
            }
          }
        }
      }

      // 2. If no numbers found for this exact company, check all proformas starting with this prefix
      if (maxNum === 0) {
        for (const p of allProformas) {
          const rawNo = p.invoiceNo || p.data?.form?.invoiceNo;
          if (rawNo && typeof rawNo === 'string') {
            const match = rawNo.trim().match(/^([a-zA-Z]+)([-/_]?\s*)(\d+)$/);
            if (match && match[1].toUpperCase() === defaultPrefix) {
              separator = match[2] || '';
              const num = parseInt(match[3], 10);
              if (num > maxNum) {
                maxNum = num;
                padLen = Math.max(padLen, match[3].length);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error in getNextProformaInvoiceNumber:', err);
  }

  const nextNum = maxNum + 1;
  return `${prefix}${separator}${String(nextNum).padStart(padLen, '0')}`;
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
  driverName: 'driver_name',
  monthYear: 'month_year',
  vendorCode: 'vendor_code',
  type: 'type'
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
  purchase_bills: 'business_id, name',
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
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.log(`[Offline] ${tableName} saved locally. Will sync when online.`);
    return;
  }
  try {
    const cloudData = mapToCloud(data);
    delete cloudData.id;
    delete cloudData.originalFileName;
    const onConflict = TABLE_CONFLICT_COLS[tableName] || 'business_id';
    let { error } = await supabase.from(tableName).upsert({ ...cloudData, business_id: BUSINESS_ID }, { onConflict });
    const needsFallback = error && (
      error.code === '57014' || error.code === '23505' ||
      error.message?.includes('timeout') || error.message?.includes('duplicate key') ||
      error.message?.includes('unique constraint')
    );
    if (needsFallback) {
      console.warn(`Upsert failed for ${tableName} (${error.code}). Retrying with direct update/insert...`);
      const keyCol = TABLE_CONFLICT_COLS[tableName]?.split(',')[1]?.trim() || 'id';
      const keyValue = cloudData[keyCol];
      if (keyValue) {
        const { data: existing } = await supabase.from(tableName).select(keyCol).eq('business_id', BUSINESS_ID).eq(keyCol, keyValue).limit(1);
        if (existing && existing.length > 0) {
          const res = await supabase.from(tableName).update({ ...cloudData, business_id: BUSINESS_ID }).eq('business_id', BUSINESS_ID).eq(keyCol, keyValue);
          error = res.error;
        } else {
          const res = await supabase.from(tableName).insert({ ...cloudData, business_id: BUSINESS_ID });
          error = res.error;
        }
      }
    }
    if (error) {
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.warn(`Cloud sync warning: Column missing in Supabase. (${error.message})`);
        return;
      }
      console.error(`Sync error (${tableName}):`, error.message);
      // Only show user-facing error if it's a meaningful server error (not a transient network hiccup)
      const isTransient = error.message?.includes('Failed to fetch') || error.message?.includes('timeout') || error.message?.includes('NetworkError');
      if (!isTransient) {
        window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: `Sync failed (${tableName}): ${error.message}` } }));
      }
    }
  } catch (err) {
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      // Suppress 'Failed to fetch' — transient network or SW issue, not a real error for the user
      const isTransient = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('timeout');
      if (!isTransient) {
        console.error(`Supabase push exception (${tableName}):`, err);
        window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: `Push failed (${tableName}): ${err.message}` } }));
      } else {
        console.warn(`[Sync] Transient network error (${tableName}), will retry:`, err.message);
      }
    }
  }
}

export async function removeFromCloud(tableName, query) {
  if (typeof window !== 'undefined' && !window.navigator.onLine) return;
  try {
    const cloudQuery = mapToCloud(query);
    await supabase.from(tableName).delete().match({ ...cloudQuery, business_id: BUSINESS_ID });
  } catch (err) {
    console.error('Supabase delete exception:', err);
  }
}

async function fetchWithRetry(queryFn, maxRetries = 2, delayMs = 300, timeoutMs = 12000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
      );
      const res = await Promise.race([queryFn(), timeoutPromise]);
      if (res && !res.error) return res;
      if (i === maxRetries - 1) return res || { data: null, error: new Error('Empty response') };
    } catch (err) {
      if (i === maxRetries - 1) return { data: null, error: err };
    }
    await new Promise(r => setTimeout(r, delayMs * (i + 1)));
  }
  return { data: null, error: new Error('Max retries exceeded') };
}

const normKey = (val) => {
  if (val == null) return '';
  const s = String(val).trim().toLowerCase();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
};

export async function syncFromCloud() {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.log('--- Sync system PAUSED (Offline) ---');
    return;
  }
  
  try {
    const tableMappings = [
      { local: db.customers, remote: 'customers', key: 'companyName' },
      { local: db.invoices, remote: 'invoices', key: 'invoiceNo' },
      { local: db.cashbills, remote: 'cashbills', key: 'billNo' },
      { local: db.deliveryChellans, remote: 'delivery_chellans', key: 'dcNo' },
      { local: db.quotations, remote: 'quotations', key: 'docName' },
      { local: db.proformaInvoices, remote: 'proforma_invoices', key: 'invoiceNo' },
      { local: db.mediaLibrary, remote: 'media_library', key: 'name' },
      { local: db.experienceCertificates, remote: 'experience_certificates', key: 'docName' },
    ];

    // --- PRE-SYNC LOCAL DEDUPLICATION PASS ---
    console.log('--- Running Local Duplicate Cleanup ---');
    for (const mapping of tableMappings) {
      try {
        const items = await mapping.local.toArray();
        const seen = new Map();
        const toDelete = [];
        for (const item of items) {
          const rawKey = item[mapping.key];
          if (!rawKey) continue;
          
          // Use a strict lowercase string comparison for deduplication to preserve things like leading zeros
          const k = String(rawKey).trim().toLowerCase();
          
          if (seen.has(k)) {
            const existing = seen.get(k);
            const eScore = (existing.data ? 10 : 0) + (existing.grandTotal ? 5 : 0) + (existing.id || 0);
            const cScore = (item.data ? 10 : 0) + (item.grandTotal ? 5 : 0) + (item.id || 0);
            if (cScore > eScore) {
              toDelete.push(existing.id);
              seen.set(k, item);
            } else {
              toDelete.push(item.id);
            }
          } else {
            seen.set(k, item);
          }
        }
        if (toDelete.length > 0) {
          console.log(`Cleaned up ${toDelete.length} local duplicates in ${mapping.remote}`);
          await mapping.local.bulkDelete(toDelete);
        }
      } catch (err) {
        console.error(`Deduplication error for ${mapping.remote}:`, err);
      }
    }
    // ----------------------------------------

    // Helper to determine if a local record needs to be updated with fresh details from cloud
    const shouldUpdateLocal = (localItem, cloudItem) => {
      if (!localItem.data || typeof localItem.data !== 'object' || Object.keys(localItem.data).length === 0) {
        return true;
      }
      
      // Check if nested data objects differ
      if (cloudItem.data) {
        try {
          if (JSON.stringify(localItem.data) !== JSON.stringify(cloudItem.data)) {
            return true;
          }
        } catch (e) {
          // Fallback if stringify fails
        }
      }

      const fieldsToCompare = [
        'date', 'grandTotal', 'paymentStatus', 'paidAmount', 'clientCompany', 
        'docName', 'dcNo', 'invoiceNo', 'billNo', 'driverName', 'companyName', 'name'
      ];
      for (const field of fieldsToCompare) {
        if (cloudItem[field] !== undefined && localItem[field] !== cloudItem[field]) {
          const v1 = localItem[field];
          const v2 = cloudItem[field];
          if (v1 === v2) continue;
          if (Number(v1) === Number(v2) && v1 !== null && v2 !== null) continue;
          if ((v1 === '' || v1 === null || v1 === undefined) && (v2 === '' || v2 === null || v2 === undefined)) continue;
          return true;
        }
      }
      return false;
    };

    const TABLE_METADATA_COLS = {
      invoices: 'id, invoice_no, doc_name, date, client_company, grand_total, payment_status, paid_amount, created_at',
      cashbills: 'id, bill_no, doc_name, date, client_company, grand_total, payment_status, paid_amount, created_at',
      delivery_chellans: 'id, dc_no, doc_name, date, client_company, created_at',
      quotations: 'id, doc_name, date, client_company, created_at',
      proforma_invoices: 'id, invoice_no, doc_name, date, client_company, grand_total, created_at',
      media_library: 'id, name, type, category, uploaded_at',
      // Lightweight metadata only — data blobs fetched on-demand for new records only
      customers: 'id, company_name, gstin, address, mobile, email, website, vendor_code, business_id, created_at',
      experience_certificates: 'id, doc_name, date, client_company, business_id, created_at',
      settings: 'id, business_id, business_name, address, phone, email, gstin, created_at'
    };

    async function fetchRemoteTable(remote) {
      const selectCols = TABLE_METADATA_COLS[remote] || '*';
      let res = await fetchWithRetry(() =>
        supabase.from(remote).select(selectCols).eq('business_id', BUSINESS_ID)
      );
      if (res.error && (res.error.code === '57014' || res.error.message?.includes('timeout'))) {
        console.warn(`[Sync] Timeout fetching ${remote}, retrying in chunks...`);
        const { data: metaList } = await fetchWithRetry(() =>
          supabase.from(remote).select('id').eq('business_id', BUSINESS_ID)
        );
        if (metaList && metaList.length > 0) {
          const allRecords = [];
          for (let i = 0; i < metaList.length; i += 10) {
            const chunkIds = metaList.slice(i, i + 10).map(r => r.id);
            const chunkRes = await fetchWithRetry(() =>
              supabase.from(remote).select(selectCols).eq('business_id', BUSINESS_ID).in('id', chunkIds)
            );
            if (chunkRes && chunkRes.data) allRecords.push(...chunkRes.data);
          }
          return { data: allRecords, error: null };
        }
      }
      return res;
    }

    // Fetch all tables and settings from Supabase in parallel in 1 round trip
    const [syncResults, settsResult] = await Promise.all([
      Promise.all(tableMappings.map(async (mapping) => {
        const { data, error } = await fetchRemoteTable(mapping.remote);
        return { mapping, data, error };
      })),
      fetchWithRetry(() => supabase.from('settings').select('*').eq('business_id', BUSINESS_ID))
    ]);

    // Process each table concurrently
    let anyTableUpdated = false;
    await Promise.all(syncResults.map(async ({ mapping, data: remoteRecords, error }) => {
      if (error) {
        console.error(`Sync fetch error for ${mapping.remote}:`, error.message || error);
        return;
      }
      try {
        const localItems = await mapping.local.toArray();
        
        // Automatically purge duplicate local items matching the same key
        const seenKeys = new Map();
        const duplicateLocalIds = [];

        for (const item of localItems) {
          const k = normKey(item[mapping.key]);
          if (!k) continue;
          if (seenKeys.has(k)) {
            const existing = seenKeys.get(k);
            const existingScore = (existing.data && existing.data.items ? 10 : 0) + (existing.grandTotal ? 5 : 0) + (existing.id || 0);
            const currentScore = (item.data && item.data.items ? 10 : 0) + (item.grandTotal ? 5 : 0) + (item.id || 0);
            if (currentScore > existingScore) {
              duplicateLocalIds.push(existing.id);
              seenKeys.set(k, item);
            } else {
              duplicateLocalIds.push(item.id);
            }
          } else {
            seenKeys.set(k, item);
          }
        }

        if (duplicateLocalIds.length > 0) {
          await mapping.local.bulkDelete(duplicateLocalIds);
        }

        const localMap = seenKeys;
        const itemsToPut = [];
        const itemsToAdd = [];
        const missingIdsToFetch = [];
        
        if (remoteRecords && remoteRecords.length > 0) {
          for (const remoteItem of remoteRecords) {
            const cloudItem = mapFromCloud(remoteItem);
            const keyValue = normKey(cloudItem[mapping.key]);
            if (keyValue) {
              const exists = localMap.get(keyValue);
              if (exists) {
                if (shouldUpdateLocal(exists, cloudItem)) {
                  // Merge updated metadata (payment status, amounts, date), preserving existing local data blob
                  const mergedData = (cloudItem.data && Object.keys(cloudItem.data).length > 0)
                    ? cloudItem.data
                    : exists.data;
                  itemsToPut.push({ ...exists, ...cloudItem, id: exists.id, data: mergedData });
                }
              } else {
                // Completely new document from cloud
                if (!cloudItem.data && remoteItem.id && mapping.remote !== 'customers' && mapping.remote !== 'settings') {
                  missingIdsToFetch.push(remoteItem.id);
                } else {
                  const { id, ...newItem } = cloudItem;
                  itemsToAdd.push(newItem);
                }
              }
            }
          }
        }

        // Fetch full records (with data) only for genuinely new items missing local data
        if (missingIdsToFetch.length > 0) {
          for (let i = 0; i < missingIdsToFetch.length; i += 5) {
            const chunkIds = missingIdsToFetch.slice(i, i + 5);
            const chunkRes = await fetchWithRetry(() =>
              supabase.from(mapping.remote).select('*').eq('business_id', BUSINESS_ID).in('id', chunkIds)
            );
            if (chunkRes && chunkRes.data) {
              for (const r of chunkRes.data) {
                const cloudFull = mapFromCloud(r);
                const { id, ...newItem } = cloudFull;
                itemsToAdd.push(newItem);
              }
            }
          }
        }

        if (itemsToPut.length > 0) {
          await mapping.local.bulkPut(itemsToPut);
          anyTableUpdated = true;
        }
        if (itemsToAdd.length > 0) {
          await mapping.local.bulkAdd(itemsToAdd);
          anyTableUpdated = true;
        }

        // Push local changes to cloud if they don't exist in cloud
        const remoteKeys = new Set(remoteRecords ? remoteRecords.map(d => normKey(mapFromCloud(d)[mapping.key])) : []);
        const pushPromises = [];
        for (const localItem of localItems) {
          const localKey = localItem[mapping.key];
          const isValidDoc = (localItem.clientCompany && localItem.clientCompany.trim() !== '') || 
                             (localItem.companyName && localItem.companyName.trim() !== '') ||
                             (localItem.name && localItem.name.trim() !== '') ||
                             (localItem.driverName && localItem.driverName.trim() !== '');
          if (localKey && !remoteKeys.has(normKey(localKey)) && isValidDoc) {
            pushPromises.push(pushToCloud(mapping.remote, localItem));
          }
        }
        if (pushPromises.length > 0) {
          await Promise.all(pushPromises);
        }
      } catch (tableErr) {
        console.error(`Table sync failed for ${mapping.remote}:`, tableErr);
      }
    }));

    const { data: setts } = settsResult;
    if (setts && setts.length > 0) {
      await Promise.all(setts.map(s => {
        let val = s.value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (e) { console.error('Parse err:', e); }
        }
        return db.settings.put({ key: s.key, value: val });
      }));
    }

    console.log('--- Sync system STANDBY ---');
    notifyLocalChange();
  } catch (err) {
    console.error('Core sync error:', err);
  }
}

// CRUD Functions
export async function getAllCustomers() { return await db.customers.toArray(); }
export async function saveCustomer(data) { 
  const id = await db.customers.add(data); 
  notifyLocalChange();
  pushToCloud('customers', data); 
  return id; 
}
export async function updateCustomer(id, data) { 
  const numericId = Number(id); 
  await db.customers.update(numericId, data); 
  notifyLocalChange();
  pushToCloud('customers', data); 
}
export async function deleteCustomer(id) { 
  const numericId = Number(id);
  const item = await db.customers.get(numericId); 
  if (item) removeFromCloud('customers', { companyName: item.companyName });
  const result = await db.customers.delete(numericId); 
  notifyLocalChange();
  return result;
}

export async function saveInvoice(data) {
  const id = await db.invoices.add(data);
  if (data && data.invoiceNo) {
    await updateInvoiceCounter(data.invoiceNo);
  }
  notifyLocalChange();
  pushToCloud('invoices', data);
  return id;
}

export async function updateInvoice(id, data) {
  const numericId = Number(id);
  const existing = await db.invoices.get(numericId);
  const merged = { ...existing, ...data };
  await db.invoices.update(numericId, data);
  if (data && data.invoiceNo) {
    await updateInvoiceCounter(data.invoiceNo);
  }
  notifyLocalChange();
  pushToCloud('invoices', merged);
}
export async function deleteInvoice(id) {
  const numericId = Number(id);
  const item = await db.invoices.get(numericId);
  if (item) removeFromCloud('invoices', { invoiceNo: item.invoiceNo });
  const result = await db.invoices.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function saveCashBill(data) { 
  const id = await db.cashbills.add(data); 
  notifyLocalChange();
  pushToCloud('cashbills', data); 
  return id; 
}
export async function updateCashBill(id, data) { 
  const numericId = Number(id); 
  const existing = await db.cashbills.get(numericId);
  const merged = { ...existing, ...data };
  await db.cashbills.update(numericId, data); 
  notifyLocalChange();
  pushToCloud('cashbills', merged); 
}
export async function deleteCashBill(id) {
  const numericId = Number(id);
  const item = await db.cashbills.get(numericId);
  if (item) removeFromCloud('cashbills', { billNo: item.billNo });
  const result = await db.cashbills.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function saveDc(data) { 
  const id = await db.deliveryChellans.add(data); 
  if (data && data.dcNo) {
    await updateDcCounter(data.dcNo);
  }
  notifyLocalChange();
  pushToCloud('delivery_chellans', data); 
  return id; 
}
export async function updateDc(id, data) { 
  const numericId = Number(id); 
  await db.deliveryChellans.update(numericId, data); 
  if (data && data.dcNo) {
    await updateDcCounter(data.dcNo);
  }
  notifyLocalChange();
  pushToCloud('delivery_chellans', data); 
}
export async function deleteDc(id) {
  const numericId = Number(id);
  const item = await db.deliveryChellans.get(numericId);
  if (item) removeFromCloud('delivery_chellans', { dcNo: item.dcNo });
  const result = await db.deliveryChellans.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function saveQuotation(data) { 
  const id = await db.quotations.add(data); 
  notifyLocalChange();
  pushToCloud('quotations', data); 
  return id; 
}
export async function updateQuotation(id, data) { 
  const numericId = Number(id); 
  await db.quotations.update(numericId, data); 
  notifyLocalChange();
  pushToCloud('quotations', data); 
}
export async function deleteQuotation(id) {
  const numericId = Number(id);
  const item = await db.quotations.get(numericId);
  if (item) removeFromCloud('quotations', { docName: item.docName });
  const result = await db.quotations.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function saveProformaInvoice(data) { 
  const id = await db.proformaInvoices.add(data); 
  notifyLocalChange();
  pushToCloud('proforma_invoices', data); 
  return id; 
}
export async function updateProformaInvoice(id, data) { 
  const numericId = Number(id); 
  await db.proformaInvoices.update(numericId, data); 
  notifyLocalChange();
  pushToCloud('proforma_invoices', data); 
}
export async function deleteProformaInvoice(id) {
  const numericId = Number(id);
  const item = await db.proformaInvoices.get(numericId);
  if (item) removeFromCloud('proforma_invoices', { invoiceNo: item.invoiceNo });
  const result = await db.proformaInvoices.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function saveExperienceCertificate(data) { 
  const id = await db.experienceCertificates.add(data); 
  notifyLocalChange();
  pushToCloud('experience_certificates', data); 
  return id; 
}
export async function updateExperienceCertificate(id, data) { 
  const numericId = Number(id); 
  await db.experienceCertificates.update(numericId, data); 
  notifyLocalChange();
  pushToCloud('experience_certificates', data); 
}
export async function deleteExperienceCertificate(id) {
  const numericId = Number(id);
  const item = await db.experienceCertificates.get(numericId);
  if (item) removeFromCloud('experience_certificates', { docName: item.docName });
  const result = await db.experienceCertificates.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function getNextCashBillNumber() { const counter = await db.settings.get('cashBillCounter'); return String(counter ? counter.value : 1).padStart(3, '0'); }
export async function updateCashBillCounter(n) { const num = parseInt(n); if (!isNaN(num)) await db.settings.put({ key: 'cashBillCounter', value: num + 1 }); }
export async function getNextDcNumber() {
  let maxInDb = 0;
  let maxPadLength = 3;
  try {
    const allDcs = await db.deliveryChellans.toArray();
    if (Array.isArray(allDcs)) {
      for (const dc of allDcs) {
        const rawNo = dc.dcNo || dc.data?.form?.dcNo;
        if (rawNo) {
          const num = extractInvoiceNumber(rawNo);
          if (num > maxInDb) {
            maxInDb = num;
          }
          const digits = String(rawNo).replace(/\D/g, '');
          if (digits.length > maxPadLength) {
            maxPadLength = digits.length;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading db.deliveryChellans in getNextDcNumber:', err);
  }

  const counterSetting = await db.settings.get('dcCounter');
  const counterVal = counterSetting ? Number(counterSetting.value) || 0 : 0;
  const nextNum = Math.max(maxInDb + 1, counterVal);

  try {
    await db.settings.put({ key: 'dcCounter', value: nextNum });
  } catch (err) {
    console.warn('Failed to update dcCounter setting:', err);
  }

  return String(nextNum).padStart(maxPadLength, '0');
}

export async function updateDcCounter(newNumberStr) {
  const num = extractInvoiceNumber(newNumberStr);
  if (num > 0) {
    const counterSetting = await db.settings.get('dcCounter');
    const currentVal = counterSetting ? Number(counterSetting.value) || 0 : 0;
    const targetVal = Math.max(num + 1, currentVal);
    await db.settings.put({ key: 'dcCounter', value: targetVal });
  }
}

export async function getAllMediaItems() { return (await db.mediaLibrary.toArray()).sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); }
export async function saveMediaItem(data) { const id = await db.mediaLibrary.add(data); notifyLocalChange(); pushToCloud('media_library', data); return id; }
export async function updateMediaItem(id, data) { const numericId = Number(id); await db.mediaLibrary.update(numericId, data); const item = await db.mediaLibrary.get(numericId); notifyLocalChange(); if (item) pushToCloud('media_library', item); }
export async function deleteMediaItem(id) {
  const numericId = Number(id);
  const item = await db.mediaLibrary.get(numericId);
  if (item) removeFromCloud('media_library', { name: item.name });
  const result = await db.mediaLibrary.delete(numericId);
  notifyLocalChange();
  return result;
}

export async function getAllVehicleSections() { return (await db.vehicleDetails.toArray()).sort((a,b) => (a.order||0) - (b.order||0)); }
export async function saveVehicleSection(data) { const res = await db.vehicleDetails.add(data); notifyLocalChange(); return res; }
export async function updateVehicleSection(id, data) { const numericId = Number(id); const res = await db.vehicleDetails.update(numericId, data); notifyLocalChange(); return res; }
export async function deleteVehicleSection(id) { const numericId = Number(id); const res = await db.vehicleDetails.delete(numericId); notifyLocalChange(); return res; }

export async function updatePaymentStatus(id, type, paidAmount, status) {
  const numericId = Number(id);
  const table = type === 'invoice' ? db.invoices : db.cashbills;
  const remoteTable = type === 'invoice' ? 'invoices' : 'cashbills';
  const keyCol = type === 'invoice' ? 'invoice_no' : 'bill_no';
  const localKeyField = type === 'invoice' ? 'invoiceNo' : 'billNo';

  // 1. Update local IndexedDB
  await table.update(numericId, { paidAmount, paymentStatus: status });
  notifyLocalChange();

  // 2. Push to Supabase with robust key matching
  if (typeof window !== 'undefined' && !window.navigator.onLine) return;
  try {
    const updatedItem = await table.get(numericId);
    if (!updatedItem || !updatedItem[localKeyField]) return;

    const rawVal = updatedItem[localKeyField];
    const strVal = String(rawVal).trim();
    const numVal = parseInt(strVal, 10);
    const paddedVal = !isNaN(numVal) ? String(numVal).padStart(3, '0') : strVal;
    const unpaddedVal = !isNaN(numVal) ? String(numVal) : strVal;

    // Direct update with .select('id') to confirm rows actually matched!
    let { data: updatedRows, error } = await supabase
      .from(remoteTable)
      .update({ payment_status: status, paid_amount: paidAmount })
      .eq('business_id', BUSINESS_ID)
      .eq(keyCol, strVal)
      .select('id');

    // If 0 rows updated and it's a numeric key, try padded or unpadded key
    if (!error && (!updatedRows || updatedRows.length === 0) && !isNaN(numVal)) {
      const altKey = strVal === paddedVal ? unpaddedVal : paddedVal;
      const res = await supabase
        .from(remoteTable)
        .update({ payment_status: status, paid_amount: paidAmount })
        .eq('business_id', BUSINESS_ID)
        .eq(keyCol, altKey)
        .select('id');
      updatedRows = res.data;
      error = res.error;
    }

    // Fall back to full pushToCloud if no rows matched or error occurred
    if (error || !updatedRows || updatedRows.length === 0) {
      console.warn(`[Payment sync] Direct update matched 0 rows, pushing to cloud...`);
      await pushToCloud(remoteTable, updatedItem);
    } else {
      console.log(`[Payment sync] Payment status synced for ${remoteTable} ${strVal} (${status})`);
    }
  } catch (err) {
    console.error('[Payment sync] Exception:', err);
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: `Payment sync failed: ${err.message}` } }));
    }
  }
}

/**
 * Instantly applies a realtime billing change (from Supabase Realtime) directly to IndexedDB.
 * Returns true if the target item was found and updated locally, false otherwise.
 */
export async function applyRealtimeBillingUpdate(tableName, record) {
  if (!record) return false;
  try {
    const isInvoice = tableName === 'invoices';
    const isCashbill = tableName === 'cashbills';
    if (!isInvoice && !isCashbill) return false;

    const table = isInvoice ? db.invoices : db.cashbills;
    const keyField = isInvoice ? 'invoiceNo' : 'billNo';
    const remoteKey = isInvoice ? record.invoice_no : record.bill_no;
    if (!remoteKey) return false;

    const allItems = await table.toArray();
    const target = allItems.find(item => normKey(item[keyField]) === normKey(remoteKey));

    if (target) {
      const updates = {};
      if (record.payment_status !== undefined) updates.paymentStatus = record.payment_status;
      if (record.paid_amount !== undefined) updates.paidAmount = Number(record.paid_amount) || 0;
      if (record.grand_total !== undefined) updates.grandTotal = Number(record.grand_total) || 0;
      if (record.date !== undefined) updates.date = record.date;
      if (record.client_company !== undefined) updates.clientCompany = record.client_company;
      if (record.doc_name !== undefined) updates.docName = record.doc_name;

      await table.update(target.id, updates);
      notifyLocalChange();
      console.log(`[Realtime sync] Instantly applied payment update for ${tableName} ${remoteKey} (${updates.paymentStatus || ''})`);
      return true;
    }
  } catch (err) {
    console.warn(`[Realtime sync] Failed to apply instant update for ${tableName}:`, err);
  }
  return false;
}

export async function getCompanyProfile() {
  const p = await db.settings.get('companyProfile');
  if (!p) return COMPANY;
  let val = p.value;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch (e) { return COMPANY; }
    // Fix the stale string in Dexie for future reads
    await db.settings.put({ key: 'companyProfile', value: val });
  }
  return val;
}
export async function updateCompanyProfile(data) { await db.settings.put({ key: 'companyProfile', value: data }); pushToCloud('settings', { key: 'companyProfile', value: data }); }

/**
 * Ensures a document record has its complete `data` field (containing form, items, signature).
 * If the local record in Dexie is missing or only has metadata, it fetches the full record
 * from Supabase on-demand, updates Dexie so future reads are instantaneous, and returns
 * the complete document.
 */
export async function getFullDocument(typeOrTable, docOrId) {
  if (!docOrId) return null;

  const typeTableConfig = {
    invoice: { table: db.invoices, remote: 'invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },
    invoices: { table: db.invoices, remote: 'invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },
    'Tax Invoice': { table: db.invoices, remote: 'invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },

    cashbill: { table: db.cashbills, remote: 'cashbills', keyCol: 'bill_no', localKey: 'billNo' },
    cashbills: { table: db.cashbills, remote: 'cashbills', keyCol: 'bill_no', localKey: 'billNo' },
    'Cash Bill': { table: db.cashbills, remote: 'cashbills', keyCol: 'bill_no', localKey: 'billNo' },

    quotation: { table: db.quotations, remote: 'quotations', keyCol: 'doc_name', localKey: 'docName' },
    quotations: { table: db.quotations, remote: 'quotations', keyCol: 'doc_name', localKey: 'docName' },
    'Quotation': { table: db.quotations, remote: 'quotations', keyCol: 'doc_name', localKey: 'docName' },

    dc: { table: db.deliveryChellans, remote: 'delivery_chellans', keyCol: 'dc_no', localKey: 'dcNo' },
    deliveryChellans: { table: db.deliveryChellans, remote: 'delivery_chellans', keyCol: 'dc_no', localKey: 'dcNo' },
    'Delivery Chellan': { table: db.deliveryChellans, remote: 'delivery_chellans', keyCol: 'dc_no', localKey: 'dcNo' },

    proforma: { table: db.proformaInvoices, remote: 'proforma_invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },
    proformaInvoices: { table: db.proformaInvoices, remote: 'proforma_invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },
    'Proforma Invoice': { table: db.proformaInvoices, remote: 'proforma_invoices', keyCol: 'invoice_no', localKey: 'invoiceNo' },

    experience: { table: db.experienceCertificates, remote: 'experience_certificates', keyCol: 'doc_name', localKey: 'docName' },
    experienceCertificates: { table: db.experienceCertificates, remote: 'experience_certificates', keyCol: 'doc_name', localKey: 'docName' },
    'Experience Certificate': { table: db.experienceCertificates, remote: 'experience_certificates', keyCol: 'doc_name', localKey: 'docName' }
  };

  const cfg = typeTableConfig[typeOrTable];
  if (!cfg) return docOrId;

  let localDoc = null;
  const isDocObject = typeof docOrId === 'object' && docOrId !== null;

  if (isDocObject && docOrId.id) {
    localDoc = await cfg.table.get(docOrId.id);
  } else if (!isDocObject) {
    localDoc = await cfg.table.get(docOrId);
  }

  // Fallback to the object passed in if not found by id in Dexie
  let currentDoc = localDoc || (isDocObject ? docOrId : null);

  // Check if current document already has valid, non-empty data
  const hasValidData = currentDoc && currentDoc.data && typeof currentDoc.data === 'object' && (
    (currentDoc.data.form && Object.keys(currentDoc.data.form).length > 0) ||
    (Array.isArray(currentDoc.data.items) && currentDoc.data.items.length > 0) ||
    (currentDoc.data.deliveryType !== undefined)
  );

  if (hasValidData) {
    return currentDoc;
  }

  // If local data is missing or empty, fetch the full record from Supabase
  try {
    const keyVal = currentDoc ? (currentDoc[cfg.localKey] || currentDoc.docName || currentDoc.id) : docOrId;
    if (keyVal) {
      let query = supabase.from(cfg.remote).select('*').eq('business_id', BUSINESS_ID);
      
      // Try by key column first (e.g. invoice_no, bill_no, dc_no, doc_name)
      let { data, error } = await query.eq(cfg.keyCol, keyVal).limit(1);
      
      // If not found and keyVal is numeric or has leading zeros, try zero-padded / unpadded variants
      if ((!data || data.length === 0) && /^\d+$/.test(String(keyVal).trim())) {
        const numInt = parseInt(String(keyVal).trim(), 10);
        const padded = String(numInt).padStart(3, '0');
        const unpadded = String(numInt);
        const { data: altData } = await supabase.from(cfg.remote).select('*')
          .eq('business_id', BUSINESS_ID)
          .in(cfg.keyCol, [padded, unpadded, `OSC${String(numInt).padStart(4, '0')}`])
          .limit(1);
        data = altData;
      }

      // If still not found and currentDoc has cloud ID, try querying by ID
      if ((!data || data.length === 0) && currentDoc?.id && typeof currentDoc.id === 'number') {
        const { data: idData } = await supabase.from(cfg.remote).select('*')
          .eq('business_id', BUSINESS_ID)
          .eq('id', currentDoc.id)
          .limit(1);
        data = idData;
      }

      if (data && data.length > 0 && data[0].data) {
        const cloudRecord = mapFromCloud(data[0]);
        const fullDoc = {
          ...(currentDoc || {}),
          ...cloudRecord,
          id: currentDoc?.id || cloudRecord.id,
          data: cloudRecord.data
        };
        // Cache full document into Dexie permanently so future opens are instant
        try {
          if (fullDoc.id) {
            await cfg.table.put(fullDoc);
          }
        } catch (dexieErr) {
          console.warn(`[getFullDocument] Failed to cache full doc to Dexie:`, dexieErr);
        }
        return fullDoc;
      }
    }
  } catch (cloudErr) {
    console.warn(`[getFullDocument] Could not fetch full document from cloud:`, cloudErr);
  }

  // Synthesize a fallback data object if neither local nor cloud had data
  // so that the editor does not crash on undefined inv.data.form and populates customer details
  if (currentDoc) {
    // Find customer details from local DB to enrich missing address, gstin, mobile
    let customerInfo = null;
    const targetCompany = (currentDoc.clientCompany || currentDoc.companyName || currentDoc.data?.form?.billingCompany || '').trim().toLowerCase();
    if (targetCompany) {
      try {
        const allCust = await db.customers?.toArray?.();
        if (Array.isArray(allCust)) {
          customerInfo = allCust.find(c => {
            const cName = (c.companyName || c.company_name || '').trim().toLowerCase();
            return cName && (cName === targetCompany || targetCompany.includes(cName) || cName.includes(targetCompany));
          });
        }
      } catch (err) {
        console.warn('[getFullDocument] Customer lookup error:', err);
      }
    }

    const fallbackForm = {
      id: currentDoc.id,
      invoiceNo: currentDoc.invoiceNo || currentDoc.billNo || currentDoc.dcNo || '',
      date: currentDoc.date || '',
      billingCompany: currentDoc.clientCompany || customerInfo?.companyName || customerInfo?.company_name || '',
      toCompany: currentDoc.clientCompany || customerInfo?.companyName || customerInfo?.company_name || '',
      toName: currentDoc.clientCompany || customerInfo?.companyName || customerInfo?.company_name || '',
      billingAddress: customerInfo?.address || '',
      toAddress: customerInfo?.address || '',
      billingGstin: customerInfo?.gstin || '',
      billingMobile: customerInfo?.mobile || '',
      billingWebsite: customerInfo?.website || '',
      vendorCode: customerInfo?.vendorCode || customerInfo?.vendor_code || '',
      docName: currentDoc.docName || '',
      grandTotal: currentDoc.grandTotal || 0,
      gstType: 'cgst_sgst',
      hsnCode: '996719',
      vehicles: [{ type: 'Forklift', capacity: '5 Ton', regNo: '', value: '' }]
    };

    if (!currentDoc.data) {
      currentDoc = {
        ...currentDoc,
        data: {
          form: fallbackForm,
          items: currentDoc.grandTotal ? [{
            description: currentDoc.docName || 'Crane Service Charges',
            amount: currentDoc.grandTotal,
            rate: currentDoc.grandTotal,
            quantity: 1,
            unitType: 'shifts'
          }] : []
        }
      };
    } else if (!currentDoc.data.form) {
      currentDoc.data.form = fallbackForm;
    } else {
      // If form exists but has empty address/gstin, enrich from customer profile
      if (customerInfo) {
        if (!currentDoc.data.form.billingAddress && customerInfo.address) {
          currentDoc.data.form.billingAddress = customerInfo.address;
        }
        if (!currentDoc.data.form.toAddress && customerInfo.address) {
          currentDoc.data.form.toAddress = customerInfo.address;
        }
        if (!currentDoc.data.form.billingGstin && customerInfo.gstin) {
          currentDoc.data.form.billingGstin = customerInfo.gstin;
        }
        if (!currentDoc.data.form.billingMobile && customerInfo.mobile) {
          currentDoc.data.form.billingMobile = customerInfo.mobile;
        }
        if (!currentDoc.data.form.vendorCode && (customerInfo.vendorCode || customerInfo.vendor_code)) {
          currentDoc.data.form.vendorCode = customerInfo.vendorCode || customerInfo.vendor_code;
        }
      }
    }
    if (!currentDoc.data.items) {
      currentDoc.data.items = currentDoc.grandTotal ? [{
        description: currentDoc.docName || 'Crane Service Charges',
        amount: currentDoc.grandTotal,
        rate: currentDoc.grandTotal,
        quantity: 1,
        unitType: 'shifts'
      }] : [];
    }
  }

  return currentDoc;
}

