import fetch from 'node-fetch';

async function checkSupabase() {
  try {
    const res = await fetch('https://uejvaymoaxkfofiwzskz.supabase.co/rest/v1/invoices?select=id&limit=1', {
      headers: {
        'apikey': 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0',
        'Authorization': 'Bearer sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0'
      }
    });
    console.log("HTTP Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text.slice(0, 300));
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

checkSupabase();
