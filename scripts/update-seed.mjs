import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://ulqqatavwuvenuyeyvdb.supabase.co';
// Using the same key from your frontend code
const supabaseKey = 'sb_publishable_mk7g8pNykTAHXfV_bHw3SA_EcakrDZq';
const sb = createClient(supabaseUrl, supabaseKey);
const BID = 'om-saravana-cranes-v1';

async function fetchTable(table, select) {
  const { data, error } = await sb.from(table).select(select || '*').eq('business_id', BID);
  if (error) { 
    console.error(`Error fetching ${table}:`, error.message); 
    return []; 
  }
  return data || [];
}

async function main() {
  console.log('Fetching latest data from Supabase...');
  
  const [invoices, cashbills, dcs, customers, quotations] = await Promise.all([
    fetchTable('invoices', 'id,invoice_no,doc_name,date,client_company,grand_total,payment_status,paid_amount,created_at'),
    fetchTable('cashbills', 'id,bill_no,doc_name,date,client_company,grand_total,payment_status,paid_amount,created_at'),
    fetchTable('delivery_chellans', 'id,dc_no,doc_name,date,client_company,created_at'),
    fetchTable('customers', 'id,company_name,gstin,address,mobile,email,website,vendor_code,created_at'),
    fetchTable('quotations', 'id,doc_name,date,client_company,created_at'),
  ]);

  // Map snake_case cloud keys back to camelCase for local seed compatibility
  const mapInv = r => ({ id: r.id, invoiceNo: r.invoice_no, docName: r.doc_name, date: r.date, clientCompany: r.client_company, grandTotal: r.grand_total, paymentStatus: r.payment_status, paidAmount: r.paid_amount, created_at: r.created_at });
  const mapBill = r => ({ id: r.id, billNo: r.bill_no, docName: r.doc_name, date: r.date, clientCompany: r.client_company, grandTotal: r.grand_total, paymentStatus: r.payment_status, paidAmount: r.paid_amount, created_at: r.created_at });
  const mapDc = r => ({ id: r.id, dcNo: r.dc_no, docName: r.doc_name, date: r.date, clientCompany: r.client_company, created_at: r.created_at });
  const mapCust = r => ({ id: r.id, companyName: r.company_name, gstin: r.gstin, address: r.address, mobile: r.mobile, email: r.email, website: r.website, vendorCode: r.vendor_code, created_at: r.created_at });
  const mapQuot = r => ({ id: r.id, docName: r.doc_name, date: r.date, clientCompany: r.client_company, created_at: r.created_at });

  const seed = {
    invoices: invoices.map(mapInv),
    cashbills: cashbills.map(mapBill),
    dcs: dcs.map(mapDc),
    customers: customers.map(mapCust),
    quotations: quotations.map(mapQuot),
  };

  // Deduplicate by key
  seed.invoices = [...new Map(seed.invoices.map(i => [i.invoiceNo, i])).values()];
  seed.cashbills = [...new Map(seed.cashbills.map(i => [i.billNo, i])).values()];
  seed.dcs = [...new Map(seed.dcs.map(i => [i.dcNo, i])).values()];
  seed.customers = [...new Map(seed.customers.map(i => [i.companyName, i])).values()];
  seed.quotations = seed.quotations.filter(q => q.docName && q.docName.trim() !== '');
  seed.quotations = [...new Map(seed.quotations.map(i => [i.docName, i])).values()];

  console.log(`invoices: ${seed.invoices.length} | cashbills: ${seed.cashbills.length} | dcs: ${seed.dcs.length} | customers: ${seed.customers.length} | quotations: ${seed.quotations.length}`);

  const targetPath = path.resolve(__dirname, '../src/data/seedInvoices.json');
  fs.writeFileSync(targetPath, JSON.stringify(seed, null, 2));
  console.log(`\n✅ seedInvoices.json updated successfully at ${targetPath}`);
}

main().catch(console.error);
