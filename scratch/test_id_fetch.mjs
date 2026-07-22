import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function testIdFetch() {
  try {
    console.log("1. Fetching metadata to get invoice IDs...");
    let start = Date.now();
    const { data: meta, error: metaErr } = await supabase
      .from('invoices')
      .select('id, invoice_no')
      .eq('business_id', BUSINESS_ID);
      
    console.log(`  Metadata fetch took ${Date.now() - start}ms. Count: ${meta?.length}`);
    if (metaErr) console.error("  Metadata error:", metaErr);

    if (meta && meta.length > 0) {
      const ids = meta.slice(0, 10).map(m => m.id);
      console.log("2. Fetching full records by Primary Key ID:", ids.slice(0, 3));
      
      start = Date.now();
      const { data: fullRecords, error: fullErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', BUSINESS_ID)
        .in('id', ids);

      console.log(`  ID query took ${Date.now() - start}ms. Full records count: ${fullRecords?.length}`);
      if (fullErr) console.error("  ID query error:", fullErr);
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}

testIdFetch();
