import fetch from 'node-fetch';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';

async function testCors() {
  console.log("--- Testing OPTIONS preflight from stately-mooncake-91705f.netlify.app ---");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/invoices?select=id`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://stately-mooncake-91705f.netlify.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'apikey,authorization,x-client-info',
        'apikey': supabaseKey
      }
    });
    console.log("Preflight Status:", res.status);
    console.log("Access-Control-Allow-Origin:", res.headers.get('access-control-allow-origin'));
    console.log("Access-Control-Allow-Headers:", res.headers.get('access-control-allow-headers'));
  } catch (e) {
    console.error("CORS preflight error:", e.message);
  }
}

testCors();
