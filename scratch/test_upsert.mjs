import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const BUSINESS_ID = 'om-saravana-cranes-v1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPush() {
  const testInvoice = {
    business_id: BUSINESS_ID,
    invoice_no: '104',
    doc_name: 'Tax Invoice 104',
    date: '2026-08-01',
    client_company: 'TOPRUN AUTOMOTIVE INDIA PRIVATE LIMITED',
    grand_total: 48380,
    payment_status: 'unpaid',
    paid_amount: 0,
    data: { test: true }
  };

  console.log('Testing upsert with onConflict: "business_id, invoice_no"');
  const res1 = await supabase.from('invoices').upsert(testInvoice, { onConflict: 'business_id, invoice_no' });
  console.log('Upsert result 1:', res1.error ? res1.error.message : 'SUCCESS', res1.error);

  console.log('\nTesting upsert without onConflict or with direct select/update/insert');
  const { data: existing } = await supabase.from('invoices').select('id').eq('business_id', BUSINESS_ID).eq('invoice_no', '104');
  console.log('Existing 104:', existing);
}

testPush();
