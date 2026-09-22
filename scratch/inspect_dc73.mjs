import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);

const COLUMN_MAP = {
  companyName: 'company_name',
  invoiceNo: 'invoice_no',
  docName: 'doc_name',
  billNo: 'bill_no',
  dcNo: 'dc_no',
  clientCompany: 'client_company',
  grandTotal: 'grand_total',
  uploadedAt: 'uploaded_at',
  dataUrl: 'data_url',
  paymentStatus: 'payment_status',
  paidAmount: 'paid_amount',
  driverName: 'driver_name',
  monthYear: 'month_year',
  vendorCode: 'vendor_code',
  type: 'type'
};

function mapFromCloud(data) {
  if (!data) return data;
  const mapped = {};
  const inverseMap = Object.fromEntries(Object.entries(COLUMN_MAP).map(([k, v]) => [v, k]));
  for (const key in data) {
    const localKey = inverseMap[key] || key;
    mapped[localKey] = data[key];
  }
  return mapped;
}

async function inspect() {
  const { data: dcs } = await supabase
    .from('delivery_chellans')
    .select('*')
    .eq('business_id', 'om-saravana-cranes-v1')
    .order('dc_no');

  const dc73 = dcs.find(d => d.dc_no === 'OSC0073');
  console.log('Raw DC 73 from Supabase:', dc73);
  console.log('\nMapped DC 73:', mapFromCloud(dc73));
}

inspect();
