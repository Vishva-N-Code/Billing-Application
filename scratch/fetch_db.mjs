import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';

const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function fetch() {
  const tables = ['invoices', 'cashbills', 'quotations', 'delivery_chellans', 'proforma_invoices'];
  let outputLines = [];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').eq('business_id', BUSINESS_ID);
    outputLines.push(`--- ${t} ---`);
    if (error) console.error(error);
    else {
      data.forEach(item => {
        outputLines.push(`ID: ${item.id}, Date: ${item.date}, Doc Name: ${item.doc_name}, No: ${item.invoice_no || item.bill_no || item.dc_no || 'N/A'}, Client: ${item.client_company}, Total: ${item.grand_total}`);
      });
    }
  }
  fs.writeFileSync('scratch/db_output.txt', outputLines.join('\n'), 'utf8');
}
fetch();
