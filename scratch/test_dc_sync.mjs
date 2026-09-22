import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function testSync() {
  const { data: remoteRecords, error } = await supabase
    .from('delivery_chellans')
    .select('*')
    .eq('business_id', BUSINESS_ID);

  if (error) {
    console.error('Supabase fetch error:', error);
    return;
  }

  console.log(`Fetched ${remoteRecords.length} delivery chellans from Supabase.`);
  for (const r of remoteRecords) {
    if (r.dc_no >= 'OSC0065') {
      console.log(`- ${r.dc_no}: docName="${r.doc_name}", client="${r.client_company}", date="${r.date}"`);
    }
  }
}

testSync();
