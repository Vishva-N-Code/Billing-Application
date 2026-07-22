import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function generateLocalBackup() {
  console.log("Generating local backup JSON from database...");
  try {
    const [invoices, cashbills, dcs, quotations, customers] = await Promise.all([
      supabase.from('invoices').select('*').eq('business_id', BUSINESS_ID),
      supabase.from('cashbills').select('*').eq('business_id', BUSINESS_ID),
      supabase.from('delivery_chellans').select('*').eq('business_id', BUSINESS_ID),
      supabase.from('quotations').select('*').eq('business_id', BUSINESS_ID),
      supabase.from('customers').select('*').eq('business_id', BUSINESS_ID)
    ]);

    const backupData = {
      exportedAt: new Date().toISOString(),
      businessId: BUSINESS_ID,
      invoices: invoices.data || [],
      cashbills: cashbills.data || [],
      deliveryChellans: dcs.data || [],
      quotations: quotations.data || [],
      customers: customers.data || []
    };

    fs.writeFileSync('scratch/backup_data.json', JSON.stringify(backupData, null, 2));
    console.log(`Backup successfully written! Total invoices: ${backupData.invoices.length}, Quotations: ${backupData.quotations.length}`);
  } catch (e) {
    console.error("Backup error:", e);
  }
}

generateLocalBackup();
