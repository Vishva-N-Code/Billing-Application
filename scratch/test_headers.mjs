import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';

async function testHeaderModes() {
  console.log("--- Test 1: Direct fetch with apikey header only (no Bearer) ---");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/invoices?select=invoice_no&business_id=eq.om-saravana-cranes-v1&limit=2`, {
      headers: {
        'apikey': supabaseKey
      }
    });
    console.log("  Status:", res.status);
    const text = await res.text();
    console.log("  Response:", text.slice(0, 200));
  } catch (e) {
    console.error("  Fetch error:", e.message);
  }

  console.log("\n--- Test 2: Direct fetch with apikey + Bearer ---");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/invoices?select=invoice_no&business_id=eq.om-saravana-cranes-v1&limit=2`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log("  Status:", res.status);
    const text = await res.text();
    console.log("  Response:", text.slice(0, 200));
  } catch (e) {
    console.error("  Fetch error:", e.message);
  }

  console.log("\n--- Test 3: supabase-js client ---");
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('invoices').select('invoice_no').eq('business_id', 'om-saravana-cranes-v1').limit(2);
    console.log("  Data count:", data?.length, "Error:", error);
  } catch (e) {
    console.error("  Client error:", e.message);
  }
}

testHeaderModes();
