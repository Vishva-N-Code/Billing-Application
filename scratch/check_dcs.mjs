import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const clientNew = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);

const clientOld = createClient(
  'https://uejvaymoaxkfofiwzskz.supabase.co',
  'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0'
);

async function check() {
  console.log('--- Checking New Supabase (vhxximkbvriarcjxovvy) ---');
  try {
    const { data: dcsNew, error: errNew } = await clientNew
      .from('delivery_chellans')
      .select('id, dc_no, doc_name, date, client_company')
      .order('dc_no', { ascending: true });
    if (errNew) {
      console.log('Error fetching new supabase dcs:', errNew.message);
    } else {
      console.log(`Found ${dcsNew.length} dcs in new Supabase:`);
      dcsNew.forEach(d => console.log(`  DC: ${d.dc_no} | ${d.doc_name} | ${d.date} | ${d.client_company}`));
    }
  } catch (e) {
    console.log('New supabase error:', e.message);
  }

  console.log('\n--- Checking Old Supabase (uejvaymoaxkfofiwzskz) ---');
  try {
    const { data: dcsOld, error: errOld } = await clientOld
      .from('delivery_chellans')
      .select('id, dc_no, doc_name, date, client_company')
      .order('dc_no', { ascending: true });
    if (errOld) {
      console.log('Error fetching old supabase dcs:', errOld.message);
    } else {
      console.log(`Found ${dcsOld?.length} dcs in old Supabase:`);
      dcsOld?.forEach(d => console.log(`  DC: ${d.dc_no} | ${d.doc_name} | ${d.date} | ${d.client_company}`));
    }
  } catch (e) {
    console.log('Old supabase error:', e.message);
  }

  console.log('\n--- Checking seedInvoices.json ---');
  try {
    const raw = fs.readFileSync('./src/data/seedInvoices.json', 'utf8');
    const parsed = JSON.parse(raw);
    const dcs = parsed.dcs || parsed.deliveryChellans || [];
    console.log(`Found ${dcs.length} dcs in seedInvoices.json:`);
    dcs.forEach(d => console.log(`  DC: ${d.dcNo || d.dc_no} | ${d.docName || d.doc_name} | ${d.date} | ${d.clientCompany || d.client_company}`));
  } catch (e) {
    console.log('seedInvoices error:', e.message);
  }
}

check();
