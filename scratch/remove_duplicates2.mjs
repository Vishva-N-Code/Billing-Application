import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUSINESS_ID = 'om-saravana-cranes-v1';

async function removeDuplicates() {
  console.log("Fetching all invoices...");
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, created_at')
    .eq('business_id', BUSINESS_ID);
    
  if (error) {
    console.error("Error fetching invoices:", error);
    return;
  }
  
  console.log(`Fetched ${invoices.length} invoices. Identifying duplicates...`);
  
  const byInvoiceNo = {};
  for (const inv of invoices) {
    if (!inv.invoice_no) continue;
    if (!byInvoiceNo[inv.invoice_no]) {
      byInvoiceNo[inv.invoice_no] = [];
    }
    byInvoiceNo[inv.invoice_no].push(inv);
  }
  
  const toDelete = [];
  
  for (const [invoiceNo, records] of Object.entries(byInvoiceNo)) {
    if (records.length > 1) {
      // Sort by created_at descending (newest first)
      records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Keep the first one (newest), mark rest for deletion
      for (let i = 1; i < records.length; i++) {
        toDelete.push(records[i].id);
      }
    }
  }
  
  if (toDelete.length === 0) {
    console.log("No duplicates found.");
    return;
  }
  
  console.log(`Found ${toDelete.length} duplicate records. Deleting...`);
  
  // Delete in batches of 100
  const batchSize = 100;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error: delErr } = await supabase
      .from('invoices')
      .delete()
      .in('id', batch);
      
    if (delErr) {
      console.error(`Error deleting batch ${i}:`, delErr);
    } else {
      console.log(`Deleted batch of ${batch.length} records.`);
    }
  }
  
  console.log("Finished removing duplicates.");
}

removeDuplicates();
