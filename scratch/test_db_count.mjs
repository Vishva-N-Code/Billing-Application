import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function inspectColumns() {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .limit(1);
      
    if (error || !invoices || invoices.length === 0) {
      console.error('Error or no invoice found:', error);
      return;
    }

    console.log(`Invoices table top-level columns:`, Object.keys(invoices[0]));
  } catch (e) {
    console.error('Exception:', e);
  }
}

inspectColumns();
