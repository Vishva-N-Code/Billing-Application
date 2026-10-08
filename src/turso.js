import { createClient } from '@libsql/client/web';
export const turso = createClient({
  url: 'libsql://oms-db-vishva-040104.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEwMDYyOTksImlkIjoiMDFhMTAwNGEtOTIwMS03ODgwLWI0ZGQtZWY1YWMxNTQ0YTg2Iiwia2lkIjoiV3lRN1plSXRURXVYMkJ2TVRUc3N0S0NZQlBmQWNULW8wcHFYeE5OeVlMRSIsInJpZCI6IjE0ZjcwNDc2LTExYzQtNDBmYS05YjE5LWFlYTIxMGI5MWNiMiJ9.6zfDHufbLx9Xe0ybdoLwA_lv1KxiZbMSD0XQDTQCuJYqbEltmhhSn6HCahGd1W-7XlcnD5uMmkemm2iMZpbLBA'
});
export const BUSINESS_ID = 'om-saravana-cranes-v1';
export const dbApi = {
  async selectAll(tableName) {
    const res = await turso.execute({
      sql: 'SELECT * FROM ' + tableName + ' WHERE business_id = ?',
      args: [BUSINESS_ID]
    });
    return res.rows.map(r => {
      const out = { ...r };
      if (out.data && typeof out.data === 'string' && out.data.startsWith('{')) {
        try { out.data = JSON.parse(out.data); } catch(e) {}
      }
      return out;
    });
  },
  async upsert(tableName, data) {
    const cols = Object.keys(data).filter(c => c !== 'id');
    const placeholders = cols.map(() => '?').join(', ');
    const updateSet = cols.map(c => c + ' = EXCLUDED.' + c).join(', ');
    let conflictCol = 'id';
    if (tableName === 'invoices') conflictCol = 'invoice_no';
    if (tableName === 'cashbills') conflictCol = 'bill_no';
    if (tableName === 'delivery_chellans') conflictCol = 'dc_no';
    if (tableName === 'quotations' || tableName === 'experience_certificates') conflictCol = 'doc_name';
    if (tableName === 'proforma_invoices') conflictCol = 'invoice_no';
    if (tableName === 'customers') conflictCol = 'company_name';
    if (tableName === 'media_library' || tableName === 'purchase_bills') conflictCol = 'name';
    if (tableName === 'settings') conflictCol = 'key';
    const values = cols.map(c => typeof data[c] === 'object' && data[c] !== null ? JSON.stringify(data[c]) : data[c]);
    await turso.execute({
      sql: 'INSERT INTO ' + tableName + ' (' + cols.join(', ') + ') VALUES (' + placeholders + ') ON CONFLICT (business_id, ' + conflictCol + ') DO UPDATE SET ' + updateSet,
      args: values
    });
  },
  async update(tableName, data, matchQuery) {
    const cols = Object.keys(data);
    const setClause = cols.map(c => c + ' = ?').join(', ');
    const matchCols = Object.keys(matchQuery);
    const whereClause = matchCols.map(c => c + ' = ?').join(' AND ');
    const args = [...cols.map(c => typeof data[c] === 'object' && data[c] !== null ? JSON.stringify(data[c]) : data[c]), ...matchCols.map(c => matchQuery[c])];
    await turso.execute({
      sql: 'UPDATE ' + tableName + ' SET ' + setClause + ' WHERE ' + whereClause + ' AND business_id = ?',
      args: [...args, BUSINESS_ID]
    });
  },
  async deleteMatch(tableName, matchQuery) {
    const matchCols = Object.keys(matchQuery);
    const whereClause = matchCols.map(c => c + ' = ?').join(' AND ');
    await turso.execute({
      sql: 'DELETE FROM ' + tableName + ' WHERE ' + whereClause + ' AND business_id = ?',
      args: [...matchCols.map(c => matchQuery[c]), BUSINESS_ID]
    });
  }
};
