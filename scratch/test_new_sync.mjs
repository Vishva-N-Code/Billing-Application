import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function testMetadataAndChunkedFetch() {
  try {
    // 1. Fetch invoices metadata (fast)
    console.log("1. Fetching invoices metadata...");
    let start = Date.now();
    const { data: invMeta, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_no, doc_name, date, client_company, grand_total, payment_status, paid_amount')
      .eq('business_id', BUSINESS_ID);
      
    if (invErr) {
      console.error("  Error fetching invoices metadata:", invErr);
      return;
    }
    console.log(`  Success. Fetched ${invMeta.length} invoice metadata records in ${Date.now() - start}ms.`);

    // 2. Fetch quotations metadata (fast)
    console.log("2. Fetching quotations metadata...");
    start = Date.now();
    const { data: quotMeta, error: quotErr } = await supabase
      .from('quotations')
      .select('id, doc_name, date, client_company')
      .eq('business_id', BUSINESS_ID);
      
    if (quotErr) {
      console.error("  Error fetching quotations metadata:", quotErr);
      return;
    }
    console.log(`  Success. Fetched ${quotMeta.length} quotation metadata records in ${Date.now() - start}ms.`);

    // 3. Batch-fetch full data for a few invoices (chunking simulation)
    const mockMissingKeys = invMeta.slice(0, 7).map(item => item.invoice_no);
    console.log(`3. Simulating chunked fetching of full data for invoice keys:`, mockMissingKeys);
    
    const batchSize = 5;
    const allFetched = [];
    
    for (let i = 0; i < mockMissingKeys.length; i += batchSize) {
      const batchKeys = mockMissingKeys.slice(i, i + batchSize);
      console.log(`  Fetching batch:`, batchKeys);
      start = Date.now();
      const { data: batchData, error: batchErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', BUSINESS_ID)
        .in('invoice_no', batchKeys);
        
      if (batchErr) {
        console.error(`  Batch fetch error:`, batchErr);
      } else {
        console.log(`  Success. Fetched ${batchData.length} full records in ${Date.now() - start}ms.`);
        allFetched.push(...batchData);
      }
    }
    
    console.log(`Finished verification. Total full records fetched: ${allFetched.length}`);

  } catch (e) {
    console.error("Exception during verification:", e);
  }
}

testMetadataAndChunkedFetch();
