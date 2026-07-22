import { db } from '../db';
import seedData from '../data/seedData.json';

export async function checkAndSeedOfflineData() {
  try {
    const invoiceCount = await db.invoices.count();
    if (invoiceCount === 0 && seedData && seedData.invoices && seedData.invoices.length > 0) {
      console.log(`Seeding ${seedData.invoices.length} offline documents...`);
      
      const mapItem = (item) => {
        const mapped = {};
        for (const k in item) {
          if (k === 'id' || k === 'business_id') continue;
          if (k === 'invoice_no') mapped.invoiceNo = item[k];
          else if (k === 'bill_no') mapped.billNo = item[k];
          else if (k === 'dc_no') mapped.dcNo = item[k];
          else if (k === 'doc_name') mapped.docName = item[k];
          else if (k === 'client_company') mapped.clientCompany = item[k];
          else if (k === 'grand_total') mapped.grandTotal = item[k];
          else if (k === 'payment_status') mapped.paymentStatus = item[k];
          else if (k === 'paid_amount') mapped.paidAmount = item[k];
          else if (k === 'company_name') mapped.companyName = item[k];
          else mapped[k] = item[k];
        }
        return mapped;
      };

      if (seedData.invoices) await db.invoices.bulkAdd(seedData.invoices.map(mapItem));
      if (seedData.cashbills) await db.cashbills.bulkAdd(seedData.cashbills.map(mapItem));
      if (seedData.deliveryChellans) await db.deliveryChellans.bulkAdd(seedData.deliveryChellans.map(mapItem));
      if (seedData.quotations) await db.quotations.bulkAdd(seedData.quotations.map(mapItem));
      if (seedData.customers) await db.customers.bulkAdd(seedData.customers.map(mapItem));

      window.dispatchEvent(new CustomEvent('sync-complete'));
    }
  } catch (e) {
    console.error("Offline seed error:", e);
  }
}
