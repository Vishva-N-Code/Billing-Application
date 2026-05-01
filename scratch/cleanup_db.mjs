import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function cleanup() {
  const tables = ['invoices', 'cashbills', 'quotations', 'delivery_chellans', 'proforma_invoices'];
  
  for (const t of tables) {
    const { data: records, error } = await supabase.from(t).select('*').eq('business_id', BUSINESS_ID);
    if (error) {
      console.error(`Error fetching ${t}:`, error);
      continue;
    }
    
    // Identify unwanted records
    const unwantedIds = records.filter(item => {
      const isClientEmpty = !item.client_company || item.client_company.trim() === '';
      const isTestClient = item.client_company === 'Test Corp';
      const isDraftName = item.doc_name && (item.doc_name.toLowerCase().includes('draft') || item.doc_name.toLowerCase().includes('test'));
      const isZeroTotalWithEmptyClient = isClientEmpty && (item.grand_total === 0 || item.grand_total == null);
      
      // Specifically target the exact empty-client / zero-total ones we saw in the logs, plus "Test Corp" and "Draft"
      if (isClientEmpty || isTestClient || isDraftName || isZeroTotalWithEmptyClient) {
        return true;
      }
      return false;
    }).map(r => r.id);

    if (unwantedIds.length > 0) {
      console.log(`Deleting ${unwantedIds.length} unwanted records from ${t}...`);
      const { error: deleteError } = await supabase.from(t).delete().in('id', unwantedIds);
      if (deleteError) {
        console.error(`Error deleting from ${t}:`, deleteError);
      } else {
        console.log(`Successfully deleted ${unwantedIds.length} records from ${t}.`);
      }
    } else {
      console.log(`No unwanted records found in ${t}.`);
    }
  }
}

cleanup().then(() => console.log('Cleanup complete.'));
