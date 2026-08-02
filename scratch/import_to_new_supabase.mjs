import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const BUSINESS_ID = 'om-saravana-cranes-v1';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLUMN_MAP = {
  companyName: 'company_name', invoiceNo: 'invoice_no', docName: 'doc_name',
  billNo: 'bill_no', dcNo: 'dc_no', clientCompany: 'client_company',
  grandTotal: 'grand_total', paymentStatus: 'payment_status',
  paidAmount: 'paid_amount', driverName: 'driver_name',
  monthYear: 'month_year', vendorCode: 'vendor_code',
  uploadedAt: 'uploaded_at', dataUrl: 'data_url'
};

function mapToCloud(obj) {
  const out = {};
  for (const k in obj) {
    if (k === 'id') continue;
    out[COLUMN_MAP[k] || k] = obj[k];
  }
  return out;
}

async function importTable(cloudTable, localRecords, conflictCols) {
  if (!localRecords || localRecords.length === 0) { console.log(`  Skipping ${cloudTable} (empty)`); return; }
  const rows = localRecords
    .filter(r => r && (r.clientCompany || r.companyName || r.docName || r.name || r.driverName))
    .map(r => ({ ...mapToCloud(r), business_id: BUSINESS_ID }));
  if (rows.length === 0) { console.log(`  Skipping ${cloudTable} (all empty)`); return; }
  
  // Upload in batches of 20
  const BATCH = 20;
  let uploaded = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(cloudTable).upsert(batch, { onConflict: conflictCols, ignoreDuplicates: true });
    if (error) console.error(`  Error in ${cloudTable} batch ${i}:`, error.message);
    else uploaded += batch.length;
  }
  console.log(`  ✓ ${cloudTable}: ${uploaded}/${rows.length} records imported`);
}

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) { console.error('Usage: node import_to_new_supabase.mjs <path-to-backup.json>'); process.exit(1); }
  
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('Starting import to new Supabase project...\n');

  await importTable('invoices',               backup.invoices,               'business_id,invoice_no');
  await importTable('cashbills',              backup.cashbills,              'business_id,bill_no');
  await importTable('delivery_chellans',      backup.deliveryChellans,       'business_id,dc_no');
  await importTable('quotations',             backup.quotations,             'business_id,doc_name');
  await importTable('proforma_invoices',      backup.proformaInvoices,       'business_id,invoice_no');
  await importTable('customers',              backup.customers,              'business_id,company_name');
  await importTable('experience_certificates',backup.experienceCertificates, 'business_id,doc_name');

  console.log('\n✅ Import complete! All your data is now in the new Supabase project.');
}

main().catch(console.error);
