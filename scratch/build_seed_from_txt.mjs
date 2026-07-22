import fs from 'fs';

const txt = fs.readFileSync('scratch/db_output.txt', 'utf8');

const lines = txt.split('\n');

const invoices = [];
const cashbills = [];
const dcs = [];

let currentSection = '';

for (const line of lines) {
  if (line.includes('--- invoices ---')) { currentSection = 'invoices'; continue; }
  if (line.includes('--- cashbills ---')) { currentSection = 'cashbills'; continue; }
  if (line.includes('--- quotations ---')) { currentSection = 'quotations'; continue; }
  if (line.includes('--- delivery_chellans ---')) { currentSection = 'dcs'; continue; }

  if (!line.startsWith('ID:')) continue;

  const parts = line.split(', ');
  const item = {};
  for (const p of parts) {
    const [k, ...vParts] = p.split(': ');
    const v = vParts.join(': ').trim();
    if (k === 'ID') item.id = v;
    else if (k === 'Date') item.date = v;
    else if (k === 'Doc Name') item.docName = v;
    else if (k === 'No') item.no = v;
    else if (k === 'Client') item.clientCompany = v;
    else if (k === 'Total') item.grandTotal = parseFloat(v) || 0;
  }

  if (currentSection === 'invoices') {
    invoices.push({
      invoiceNo: item.no,
      docName: item.docName,
      date: item.date,
      clientCompany: item.clientCompany,
      grandTotal: item.grandTotal,
      paymentStatus: 'unpaid',
      paidAmount: 0
    });
  } else if (currentSection === 'cashbills') {
    cashbills.push({
      billNo: item.no,
      docName: item.docName,
      date: item.date,
      clientCompany: item.clientCompany,
      grandTotal: item.grandTotal,
      paymentStatus: 'paid',
      paidAmount: item.grandTotal
    });
  } else if (currentSection === 'dcs') {
    dcs.push({
      dcNo: item.no,
      docName: item.docName,
      date: item.date,
      clientCompany: item.clientCompany
    });
  }
}

const seedObj = { invoices, cashbills, dcs };
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/seedInvoices.json', JSON.stringify(seedObj, null, 2));
console.log(`Successfully built seedInvoices.json: Invoices=${invoices.length}, CashBills=${cashbills.length}, DCs=${dcs.length}`);
