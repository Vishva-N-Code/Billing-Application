import { createClient } from '@libsql/client';
const turso = createClient({
  url: 'libsql://oms-db-vishva-040104.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEwMDYyOTksImlkIjoiMDFhMTAwNGEtOTIwMS03ODgwLWI0ZGQtZWY1YWMxNTQ0YTg2Iiwia2lkIjoiV3lRN1plSXRURXVYMkJ2TVRUc3N0S0NZQlBmQWNULW8wcHFYeE5OeVlMRSIsInJpZCI6IjE0ZjcwNDc2LTExYzQtNDBmYS05YjE5LWFlYTIxMGI5MWNiMiJ9.6zfDHufbLx9Xe0ybdoLwA_lv1KxiZbMSD0XQDTQCuJYqbEltmhhSn6HCahGd1W-7XlcnD5uMmkemm2iMZpbLBA'
});
const supaUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co/rest/v1';
const supaKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';
const headers = { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey };
const tables = ['customers', 'invoices', 'cashbills', 'delivery_chellans', 'quotations', 'proforma_invoices', 'media_library', 'settings', 'experience_certificates', 'purchase_bills'];
async function run() {
  for (const table of tables) {
    try {
      const res = await fetch(supaUrl + '/' + table + '?select=*', { headers });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.log('Skipping ' + table + ' - no data.');
        continue;
      }
      const cols = Object.keys(data[0]).filter(c => c !== 'id');
      const placeholders = cols.map(() => '?').join(', ');
      let count = 0;
      for (const row of data) {
        const values = cols.map(c => row[c] === undefined || row[c] === null ? null : typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]);
        try {
          await turso.execute({
            sql: 'INSERT INTO ' + table + ' (' + cols.join(', ') + ') VALUES (' + placeholders + ') ON CONFLICT DO NOTHING',
            args: values
          });
          count++;
        } catch(e) { console.error('Error inserting row into ' + table, e.message); }
      }
      console.log('Migrated ' + count + ' rows to ' + table);
    } catch(e) { console.error('Error fetching ' + table, e.message); }
  }
  console.log('Migration complete!');
}
run().catch(console.error);
