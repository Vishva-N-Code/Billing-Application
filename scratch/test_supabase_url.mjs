import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('invoices').select('id, invoice_no, doc_name, date, client_company, grand_total').limit(10);
  console.log('Error:', error);
  console.log('Count:', data ? data.length : 0);
  console.log('Sample Data:', data);
}

test();
