import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const BUSINESS_ID = 'om-saravana-cranes-v1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullPush() {
  const fullInvoice = {
    business_id: BUSINESS_ID,
    invoice_no: '107',
    doc_name: 'Tax Invoice 107',
    date: '2026-08-07',
    client_company: 'NVH INDIA AUTO PARTS LIMITED',
    grand_total: 35400,
    payment_status: 'unpaid',
    paid_amount: 0,
    data: {
      form: { invoiceNo: '107', billingCompany: 'NVH INDIA AUTO PARTS LIMITED' },
      items: [{ description: 'Forklift hire charges', amount: '35400' }],
      signature: 'data:image/png;base64,sample'
    }
  };

  const { data, error } = await supabase.from('invoices').upsert(fullInvoice, { onConflict: 'business_id, invoice_no' }).select();
  console.log('Push error:', error);
  console.log('Pushed record:', data);
}

testFullPush();
