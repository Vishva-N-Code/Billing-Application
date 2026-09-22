import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);
const BUSINESS_ID = 'om-saravana-cranes-v1';

const COLUMN_MAP = {
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

async function exportFullSeed() {
  console.log('Fetching all tables from Supabase...');
  const [invoicesRes, cashbillsRes, dcsRes, customersRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('business_id', BUSINESS_ID).order('invoice_no'),
    supabase.from('cashbills').select('*').eq('business_id', BUSINESS_ID).order('bill_no'),
    supabase.from('delivery_chellans').select('*').eq('business_id', BUSINESS_ID).order('dc_no'),
    supabase.from('customers').select('*').eq('business_id', BUSINESS_ID).order('company_name')
  ]);

  if (invoicesRes.error || cashbillsRes.error || dcsRes.error || customersRes.error) {
    console.error('Fetch error:', {
      invoices: invoicesRes.error,
      cashbills: cashbillsRes.error,
      dcs: dcsRes.error,
      customers: customersRes.error
    });
    return;
  }

  const cleanDcs = dcsRes.data.map(mapFromCloud);
  const cleanInvoices = invoicesRes.data.map(mapFromCloud);
  const cleanCashbills = cashbillsRes.data.map(mapFromCloud);
  const cleanCustomers = customersRes.data.map(mapFromCloud);

  console.log(`Fetched counts:`);
  console.log(`  Invoices: ${cleanInvoices.length}`);
  console.log(`  CashBills: ${cleanCashbills.length}`);
  console.log(`  DCs: ${cleanDcs.length}`);
  console.log(`  Customers: ${cleanCustomers.length}`);

  const seedData = {
    invoices: cleanInvoices,
    cashbills: cleanCashbills,
    dcs: cleanDcs,
    customers: cleanCustomers
  };

  // Back up existing seedInvoices.json first
  if (fs.existsSync('src/data/seedInvoices.json')) {
    fs.copyFileSync('src/data/seedInvoices.json', 'scratch/seedInvoices.backup.json');
    console.log('Backed up old seedInvoices.json to scratch/seedInvoices.backup.json');
  }

  fs.writeFileSync('src/data/seedInvoices.json', JSON.stringify(seedData, null, 2));
  console.log('Successfully updated src/data/seedInvoices.json with fresh Supabase data!');
}

exportFullSeed();
