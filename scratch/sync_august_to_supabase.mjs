import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const BUSINESS_ID = 'om-saravana-cranes-v1';

const supabase = createClient(supabaseUrl, supabaseKey);

const augInvoices = [
  {
    business_id: BUSINESS_ID,
    invoice_no: '104',
    doc_name: 'TOPRUN AUTOMOTIVE - 104',
    date: '2026-08-01',
    client_company: 'TOPRUN AUTOMOTIVE INDIA PRIVATE LIMITED',
    grand_total: 48380,
    payment_status: 'unpaid',
    paid_amount: 0,
    data: {
      form: { invoiceNo: '104', date: '2026-08-01', billingCompany: 'TOPRUN AUTOMOTIVE INDIA PRIVATE LIMITED', hsnCode: '996719', gstType: 'cgst_sgst', showQty: true, showRate: true },
      items: [{ description: '16-ton forklift hire charges and mobilization and demobilization charges', rate: '35000', unitType: 'shifts', quantity: '1', amount: '41000' }]
    }
  },
  {
    business_id: BUSINESS_ID,
    invoice_no: '105',
    doc_name: 'ECI DISPLAY INDIA PVT LTD - 105',
    date: '2026-08-04',
    client_company: 'ECI DISPLAY INDIA PVT LTD',
    grand_total: 18880,
    payment_status: 'unpaid',
    paid_amount: 0,
    data: {
      form: { invoiceNo: '105', date: '2026-08-04', billingCompany: 'ECI DISPLAY INDIA PVT LTD', hsnCode: '996719', gstType: 'cgst_sgst', showQty: true, showRate: true },
      items: [{ description: '5-ton forklift hire charges', rate: '8000', unitType: 'shifts', quantity: '2', amount: '16000' }]
    }
  },
  {
    business_id: BUSINESS_ID,
    invoice_no: '106',
    doc_name: 'NVH INDIA AUTO PARTS LIMITED - 106',
    date: '2026-08-07',
    client_company: 'NVH INDIA AUTO PARTS LIMITED',
    grand_total: 35400,
    payment_status: 'unpaid',
    paid_amount: 0,
    data: {
      form: { invoiceNo: '106', date: '2026-08-07', billingCompany: 'NVH INDIA AUTO PARTS LIMITED', hsnCode: '996719', gstType: 'cgst_sgst', showQty: true, showRate: true },
      items: [{ description: 'Crane Service Charges', rate: '30000', unitType: 'shifts', quantity: '1', amount: '30000' }]
    }
  }
];

const augCashbills = [
  {
    business_id: BUSINESS_ID,
    bill_no: '011',
    doc_name: 'SHEKINA METAL WORKS - 011',
    date: '2026-08-02',
    client_company: 'SHEKINA METAL WORKS',
    grand_total: 12500,
    payment_status: 'paid',
    paid_amount: 12500,
    data: {
      form: { billNo: '011', date: '2026-08-02', clientCompany: 'SHEKINA METAL WORKS' },
      items: [{ description: '3 Ton Forklift Service', rate: '12500', quantity: '1', amount: '12500' }]
    }
  },
  {
    business_id: BUSINESS_ID,
    bill_no: '012',
    doc_name: 'Capricorn Logistics - 012',
    date: '2026-08-06',
    client_company: 'Capricorn Logistics Pvt Ltd',
    grand_total: 8500,
    payment_status: 'paid',
    paid_amount: 8500,
    data: {
      form: { billNo: '012', date: '2026-08-06', clientCompany: 'Capricorn Logistics Pvt Ltd' },
      items: [{ description: 'Forklift Service', rate: '8500', quantity: '1', amount: '8500' }]
    }
  }
];

async function syncAugust() {
  console.log('Pushing August invoices to Supabase Cloud...');
  for (const inv of augInvoices) {
    const { error } = await supabase.from('invoices').upsert(inv, { onConflict: 'business_id, invoice_no' });
    if (error) console.error(`Error pushing invoice ${inv.invoice_no}:`, error.message);
    else console.log(`Successfully synced August invoice ${inv.invoice_no} to Supabase!`);
  }

  for (const bill of augCashbills) {
    const { error } = await supabase.from('cashbills').upsert(bill, { onConflict: 'business_id, bill_no' });
    if (error) console.error(`Error pushing cashbill ${bill.bill_no}:`, error.message);
    else console.log(`Successfully synced August cashbill ${bill.bill_no} to Supabase!`);
  }
}

syncAugust();
