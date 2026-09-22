import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const clientNew = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);

async function detailCheck() {
  const { data: dcs, error } = await clientNew
    .from('delivery_chellans')
    .select('*')
    .order('dc_no', { ascending: true });

  console.log('--- All DCs in Supabase ---');
  if (dcs) {
    for (const d of dcs) {
      const form = d.data?.form || d.data || {};
      console.log(`DC_NO: [${d.dc_no}] | DocName: [${d.doc_name}] | Date: [${d.date}] | Client: [${d.client_company}] | Type: [${form.deliveryType}] | To: [${form.toName}]`);
    }
  }

  console.log('\n--- DCs in seedInvoices.json ---');
  const raw = fs.readFileSync('./src/data/seedInvoices.json', 'utf8');
  const parsed = JSON.parse(raw);
  const seedDcs = parsed.dcs || parsed.deliveryChellans || [];
  for (const d of seedDcs) {
    const dcNo = d.dcNo || d.dc_no;
    const num = parseInt(dcNo.replace(/\D/g, ''), 10);
    if (num >= 60) {
      const form = d.data?.form || d.data || {};
      console.log(`Seed DC_NO: [${dcNo}] | DocName: [${d.docName || d.doc_name}] | Date: [${d.date}] | Client: [${d.clientCompany || d.client_company}] | Type: [${form.deliveryType}]`);
    }
  }
}

detailCheck();
