import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function testTypeComparison() {
  try {
    console.log("1. Testing string '046'...");
    let start = Date.now();
    const { data: data1 } = await supabase
      .from('invoices')
      .select('invoice_no')
      .eq('business_id', BUSINESS_ID)
      .eq('invoice_no', '046')
      .limit(1);
    console.log(`  String query took ${Date.now() - start}ms. Result:`, data1);

    console.log("2. Testing integer 46...");
    start = Date.now();
    const { data: data2 } = await supabase
      .from('invoices')
      .select('invoice_no')
      .eq('business_id', BUSINESS_ID)
      .eq('invoice_no', 46)
      .limit(1);
    console.log(`  Integer query took ${Date.now() - start}ms. Result:`, data2);

  } catch (e) {
    console.error("Exception:", e);
  }
}

testTypeComparison();
