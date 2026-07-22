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

export async function initSettings() {
  try {
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

    // Initial fallback seed so documents immediately display on any new browser/device
    const localInvoiceCount = await db.invoices.count();
    if (localInvoiceCount === 0 && seedInvoices) {
      console.log('Seeding initial documents into local database...');
      try {
        const clean = (arr) => arr ? arr.map(({ id, ...rest }) => rest) : [];
        if (seedInvoices.invoices && seedInvoices.invoices.length > 0) {
          await db.invoices.bulkPut(clean(seedInvoices.invoices));
        }
        if (seedInvoices.cashbills && seedInvoices.cashbills.length > 0) {
          await db.cashbills.bulkPut(clean(seedInvoices.cashbills));
        }
        if (seedInvoices.dcs && seedInvoices.dcs.length > 0) {
          await db.deliveryChellans.bulkPut(clean(seedInvoices.dcs));
        }
      } catch (seedErr) {
        console.error('Seeding exception:', seedErr);
      }
    }

    const allCust = await db.customers.toArray();
    const custUpdateOps = [];
    for (const c of allCust) {
      if (c.company_name && !c.companyName) {
        custUpdateOps.push(db.customers.update(c.id, { companyName: c.company_name }));
      }
    }
    // Purge local blank drafts (zero total AND empty client company)
    const tablesToClean = [db.invoices, db.cashbills, db.quotations, db.deliveryChellans, db.proformaInvoices];
    for (const table of tablesToClean) {
      const items = await table.toArray();
      const emptyIds = items.filter(item => {
        const isClientEmpty = !item.clientCompany || item.clientCompany.trim() === '';
        const isZeroTotal = item.grandTotal === 0 || item.grandTotal == null;
        const isTest = item.docName && (item.docName.toLowerCase().includes('draft') || item.docName.toLowerCase().includes('test'));
        return (isClientEmpty && isZeroTotal) || isTest;
      }).map(item => item.id);
      if (emptyIds.length > 0) {
        await table.bulkDelete(emptyIds);
      }
    }

    if (custUpdateOps.length > 0) {
      await Promise.all(custUpdateOps);
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
  // Skip cloud operations if offline to prevent UI hangs and unnecessary errors
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.log(`[Offline] ${tableName} saved locally. Will sync when online.`);
    return;
  }

  try {
    const cloudData = mapToCloud(data);
    delete cloudData.id;
    delete cloudData.originalFileName; // Sanitize missing cloud column
    
    const onConflict = TABLE_CONFLICT_COLS[tableName] || 'business_id';
    let { error } = await supabase.from(tableName).upsert({ ...cloudData, business_id: BUSINESS_ID }, { onConflict });
    
    // If upsert fails due to statement timeout (57014), fallback to direct check & write
    if (error && (error.code === '57014' || error.message.includes('timeout'))) {
      console.warn(`Upsert timeout for ${tableName}. Retrying with direct update/insert...`);
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
      // If the error is about a missing column, log it specifically and don't halt
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn(`Cloud sync warning: Column missing in Supabase. (${error.message})`);
        return; 
      }
      console.error(`Sync error (${tableName}):`, error.message);
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: `Sync failed (${tableName}): ${error.message}` } }));
    }
  } catch (err) {
    // Only dispatch error if we are actually online (otherwise it's expected)
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      console.error(`Supabase push exception (${tableName}):`, err);
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { message: `Push failed (${tableName}): ${err.message}` } }));
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

async function fetchWithRetry(queryFn, maxRetries = 3, delayMs = 1500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await queryFn();
      if (!res.error) return res;
      if (i === maxRetries - 1) return res;
    } catch (err) {
      if (i === maxRetries - 1) return { data: null, error: err };
    }
    await new Promise(r => setTimeout(r, delayMs * (i + 1)));
  }
  return { data: null, error: new Error('Max retries exceeded') };
}

export async function syncFromCloud() {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.log('--- Sync system PAUSED (Offline) ---');
    return;
  }
  try {
    const tableMappings = [
      { local: db.customers, remote: 'customers', key: 'companyName', selectFields: '*' },
      { local: db.invoices, remote: 'invoices', key: 'invoiceNo', selectFields: 'id, invoice_no, doc_name, date, client_company, grand_total, payment_status, paid_amount' },
      { local: db.cashbills, remote: 'cashbills', key: 'billNo', selectFields: 'id, bill_no, doc_name, date, client_company, grand_total, payment_status, paid_amount' },
      { local: db.deliveryChellans, remote: 'delivery_chellans', key: 'dcNo', selectFields: 'id, dc_no, doc_name, date, client_company' },
      { local: db.quotations, remote: 'quotations', key: 'docName', selectFields: 'id, doc_name, date, client_company' },
      { local: db.proformaInvoices, remote: 'proforma_invoices', key: 'invoiceNo', selectFields: 'id, invoice_no, doc_name, date, client_company, grand_total' },
      { local: db.mediaLibrary, remote: 'media_library', key: 'name', selectFields: '*' },
      { local: db.experienceCertificates, remote: 'experience_certificates', key: 'docName', selectFields: 'id, doc_name, driver_name, date' },
      { local: db.purchaseBills, remote: 'purchase_bills', key: 'name', selectFields: '*' },
    ];

    // Helper to determine if a local record needs to be updated with fresh details from cloud
    const shouldUpdateLocal = (localItem, cloudMetadata) => {
      const fieldsToCompare = [
        'date', 'grandTotal', 'paymentStatus', 'paidAmount', 'clientCompany', 
        'docName', 'dcNo', 'invoiceNo', 'billNo', 'driverName', 'companyName', 'name'
      ];
      for (const field of fieldsToCompare) {
        if (cloudMetadata[field] !== undefined && localItem[field] !== cloudMetadata[field]) {
          const v1 = localItem[field];
          const v2 = cloudMetadata[field];
          if (v1 === v2) continue;
          // Handle loose equivalences (e.g. number 15000 vs string "15000", or empty fields)
          if (Number(v1) === Number(v2) && v1 !== null && v2 !== null) continue;
          if ((v1 === '' || v1 === null || v1 === undefined) && (v2 === '' || v2 === null || v2 === undefined)) continue;
          return true;
        }
      }
      return false;
    };

    // Fetch all tables metadata and settings from Supabase in parallel with automatic retries
    const [syncResults, settsResult] = await Promise.all([
      Promise.all(tableMappings.map(async (mapping) => {
        const { data, error } = await fetchWithRetry(() =>
          supabase
            .from(mapping.remote)
            .select(mapping.selectFields)
            .eq('business_id', BUSINESS_ID)
        );
        return { mapping, data, error };
      })),
      fetchWithRetry(() => supabase.from('settings').select('*').eq('business_id', BUSINESS_ID))
    ]);

    // Process all sync mappings concurrently
    await Promise.all(syncResults.map(async ({ mapping, data: remoteMetadataList, error }) => {
      if (error) {
        console.error(`Sync fetch metadata error for ${mapping.remote}:`, error.message || error);
        return;
      }
      try {
        const localItems = await mapping.local.toArray();
        const localMap = new Map(localItems.map(item => [item[mapping.key], item]));

        const idsToFetchFull = [];
        
        if (remoteMetadataList && remoteMetadataList.length > 0) {
          for (const remoteMeta of remoteMetadataList) {
            const cloudMeta = mapFromCloud(remoteMeta);
            const keyValue = cloudMeta[mapping.key];
            if (keyValue) {
              const exists = localMap.get(keyValue);
              if (!exists || shouldUpdateLocal(exists, cloudMeta)) {
                if (remoteMeta.id) {
                  idsToFetchFull.push(remoteMeta.id);
                }
              }
            }
          }
        }

        // Fetch full records in batches of 5 using Primary Key ID index (lightning fast, < 800ms) with retries
        const fullRemoteRecords = [];
        if (idsToFetchFull.length > 0 && mapping.selectFields !== '*') {
          console.log(`Fetching ${idsToFetchFull.length} full records for ${mapping.remote} by primary key...`);
          const batchSize = 5;
          
          for (let i = 0; i < idsToFetchFull.length; i += batchSize) {
            const batchIds = idsToFetchFull.slice(i, i + batchSize);
            const { data: batchData, error: batchErr } = await fetchWithRetry(() =>
              supabase
                .from(mapping.remote)
                .select('*')
                .eq('business_id', BUSINESS_ID)
                .in('id', batchIds)
            );
              
            if (batchErr) {
              console.error(`Error fetching batch of full records for ${mapping.remote}:`, batchErr);
            } else if (batchData) {
              fullRemoteRecords.push(...batchData);
            }
          }
        } else if (mapping.selectFields === '*') {
          // If selectFields was '*', we already retrieved the full records in the metadata fetch
          fullRemoteRecords.push(...(remoteMetadataList || []));
        }

        // Update local Dexie DB with the fetched full records
        const itemsToPut = [];
        const itemsToAdd = [];
        
        for (const remoteItem of fullRemoteRecords) {
          const cloudItem = mapFromCloud(remoteItem);
          const keyValue = cloudItem[mapping.key];
          if (keyValue) {
            const exists = localMap.get(keyValue);
            if (exists) {
              itemsToPut.push({ ...cloudItem, id: exists.id });
            } else {
              const { id, ...newItem } = cloudItem;
              itemsToAdd.push(newItem);
            }
          }
        }

        if (itemsToPut.length > 0) {
          await mapping.local.bulkPut(itemsToPut);
        }
        if (itemsToAdd.length > 0) {
          await mapping.local.bulkAdd(itemsToAdd);
        }

        // Push local changes to cloud if they don't exist there
        const normKey = (val) => val == null ? '' : String(val).trim().toLowerCase();
        const remoteKeys = new Set(remoteMetadataList ? remoteMetadataList.map(d => normKey(mapFromCloud(d)[mapping.key])) : []);
        const pushPromises = [];
        for (const localItem of localItems) {
          const localKey = localItem[mapping.key];
          if (localKey && !remoteKeys.has(normKey(localKey))) {
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
      await Promise.all(setts.map(s => db.settings.put({ key: s.key, value: s.value })));
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
export async function updateCustomer(id, data) { const numericId = Number(id); await db.customers.update(numericId, data); pushToCloud('customers', data); }
export async function deleteCustomer(id) { 
  const numericId = Number(id);
  const item = await db.customers.get(numericId); 
  if (item) removeFromCloud('customers', { companyName: item.companyName });
  return await db.customers.delete(numericId); 
}

export async function saveInvoice(data) { const id = await db.invoices.add(data); pushToCloud('invoices', data); return id; }
export async function updateInvoice(id, data) { const numericId = Number(id); await db.invoices.update(numericId, data); pushToCloud('invoices', data); }
export async function deleteInvoice(id) {
  const numericId = Number(id);
  const item = await db.invoices.get(numericId);
  if (item) removeFromCloud('invoices', { invoiceNo: item.invoiceNo });
  return await db.invoices.delete(numericId);
}

export async function saveCashBill(data) { const id = await db.cashbills.add(data); pushToCloud('cashbills', data); return id; }
export async function updateCashBill(id, data) { const numericId = Number(id); await db.cashbills.update(numericId, data); pushToCloud('cashbills', data); }
export async function deleteCashBill(id) {
  const numericId = Number(id);
  const item = await db.cashbills.get(numericId);
  if (item) removeFromCloud('cashbills', { billNo: item.billNo });
  return await db.cashbills.delete(numericId);
}

export async function saveDc(data) { const id = await db.deliveryChellans.add(data); pushToCloud('delivery_chellans', data); return id; }
export async function updateDc(id, data) { const numericId = Number(id); await db.deliveryChellans.update(numericId, data); pushToCloud('delivery_chellans', data); }
export async function deleteDc(id) {
  const numericId = Number(id);
  const item = await db.deliveryChellans.get(numericId);
  if (item) removeFromCloud('delivery_chellans', { dcNo: item.dcNo });
  return await db.deliveryChellans.delete(numericId);
}

export async function saveQuotation(data) { const id = await db.quotations.add(data); pushToCloud('quotations', data); return id; }
export async function updateQuotation(id, data) { const numericId = Number(id); await db.quotations.update(numericId, data); pushToCloud('quotations', data); }
export async function deleteQuotation(id) {
  const numericId = Number(id);
  const item = await db.quotations.get(numericId);
  if (item) removeFromCloud('quotations', { docName: item.docName });
  return await db.quotations.delete(numericId);
}

export async function saveProformaInvoice(data) { const id = await db.proformaInvoices.add(data); pushToCloud('proforma_invoices', data); return id; }
export async function updateProformaInvoice(id, data) { const numericId = Number(id); await db.proformaInvoices.update(numericId, data); pushToCloud('proforma_invoices', data); }
export async function deleteProformaInvoice(id) {
  const numericId = Number(id);
  const item = await db.proformaInvoices.get(numericId);
  if (item) removeFromCloud('proforma_invoices', { invoiceNo: item.invoiceNo });
  return await db.proformaInvoices.delete(numericId);
}

export async function saveExperienceCertificate(data) { const id = await db.experienceCertificates.add(data); pushToCloud('experience_certificates', data); return id; }
export async function updateExperienceCertificate(id, data) { const numericId = Number(id); await db.experienceCertificates.update(numericId, data); pushToCloud('experience_certificates', data); }
export async function deleteExperienceCertificate(id) {
  const numericId = Number(id);
  const item = await db.experienceCertificates.get(numericId);
  if (item) removeFromCloud('experience_certificates', { docName: item.docName });
  return await db.experienceCertificates.delete(numericId);
}

export async function getNextCashBillNumber() { const counter = await db.settings.get('cashBillCounter'); return String(counter ? counter.value : 1).padStart(3, '0'); }
export async function updateCashBillCounter(n) { const num = parseInt(n); if (!isNaN(num)) await db.settings.put({ key: 'cashBillCounter', value: num + 1 }); }
export async function getNextDcNumber() { const counter = await db.settings.get('dcCounter'); return String(counter ? counter.value : 1).padStart(3, '0'); }
export async function updateDcCounter(n) { const num = parseInt(n); if (!isNaN(num)) await db.settings.put({ key: 'dcCounter', value: num + 1 }); }

export async function getAllMediaItems() { return (await db.mediaLibrary.toArray()).sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); }
export async function saveMediaItem(data) { const id = await db.mediaLibrary.add(data); pushToCloud('media_library', data); return id; }
export async function updateMediaItem(id, data) { const numericId = Number(id); await db.mediaLibrary.update(numericId, data); const item = await db.mediaLibrary.get(numericId); if (item) pushToCloud('media_library', item); }
export async function deleteMediaItem(id) {
  const numericId = Number(id);
  const item = await db.mediaLibrary.get(numericId);
  if (item) removeFromCloud('media_library', { name: item.name });
  return await db.mediaLibrary.delete(numericId);
}

export async function getAllPurchaseBills() { return (await db.purchaseBills.toArray()).sort((a,b) => new Date(b.date) - new Date(a.date)); }
export async function savePurchaseBill(data) { const id = await db.purchaseBills.add(data); pushToCloud('purchase_bills', data); return id; }
export async function deletePurchaseBill(id) {
  const numericId = Number(id);
  const item = await db.purchaseBills.get(numericId);
  if (item) removeFromCloud('purchase_bills', { name: item.name, date: item.date });
  return await db.purchaseBills.delete(numericId);
}

export async function getAllVehicleSections() { return (await db.vehicleDetails.toArray()).sort((a,b) => (a.order||0) - (b.order||0)); }
export async function saveVehicleSection(data) { return await db.vehicleDetails.add(data); }
export async function updateVehicleSection(id, data) { const numericId = Number(id); return await db.vehicleDetails.update(numericId, data); }
export async function deleteVehicleSection(id) { const numericId = Number(id); return await db.vehicleDetails.delete(numericId); }

export async function updatePaymentStatus(id, type, paidAmount, status) {
  const numericId = Number(id);
  const table = type === 'invoice' ? db.invoices : db.cashbills;
  const remoteTable = type === 'invoice' ? 'invoices' : 'cashbills';
  
  await table.update(numericId, { paidAmount, paymentStatus: status });
  const updatedItem = await table.get(numericId);
  if (updatedItem) pushToCloud(remoteTable, updatedItem);
}

export async function getCompanyProfile() { const p = await db.settings.get('companyProfile'); return p ? p.value : COMPANY; }
export async function updateCompanyProfile(data) { await db.settings.put({ key: 'companyProfile', value: data }); pushToCloud('settings', { key: 'companyProfile', value: data }); }
