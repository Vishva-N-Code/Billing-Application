import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const BUSINESS_ID = 'om-saravana-cranes-v1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: invs, error: e1 } = await supabase.from('invoices').select('*').eq('business_id', BUSINESS_ID);
  console.log('Invoices count:', invs?.length, 'Error:', e1);
  if (invs) {
    const augInvs = invs.filter(i => i.date && i.date.includes('2026-08'));
    console.log('August invoices in Supabase:', augInvs.length);
    invs.forEach(i => console.log(`  [Invoice] No: ${i.invoice_no}, Date: ${i.date}, Client: ${i.client_company}, Total: ${i.grand_total}`));
  }

  const { data: bills } = await supabase.from('cashbills').select('*').eq('business_id', BUSINESS_ID);
  console.log('Cashbills count:', bills?.length);
  if (bills) {
    bills.forEach(b => console.log(`  [Cashbill] No: ${b.bill_no}, Date: ${b.date}, Client: ${b.client_company}`));
  }
}

test();
