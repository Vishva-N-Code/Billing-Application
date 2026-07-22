import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Dexie before importing db (class declared inside the factory to avoid hoisting issues)
vi.mock('dexie', () => {
  class MockDexie {
    constructor(name) {
      this.name = name;
      this.settings = {
        get: vi.fn(),
        put: vi.fn(),
      };
      this.customers = {
        toArray: vi.fn(),
        update: vi.fn(),
      };
      this.vehicleDetails = {
        count: vi.fn(),
        add: vi.fn(),
      };
      this.invoices = {};
      this.cashbills = {};
      this.deliveryChellans = {};
      this.quotations = {};
      this.proformaInvoices = {};
      this.mediaLibrary = {};
      this.experienceCertificates = {};
      this.purchaseBills = {};
    }
    version() { return this; }
    stores() { return this; }
  }

  return {
    default: MockDexie,
    Dexie: MockDexie,
  };
});

// Mock supabase before importing db
vi.mock('./supabase', () => {
  const mockFrom = vi.fn();
  const mockDelete = vi.fn();
  const mockMatch = vi.fn();
  const mockUpsert = vi.fn();

  mockFrom.mockReturnValue({
    upsert: mockUpsert,
    delete: mockDelete,
  });

  mockDelete.mockReturnValue({
    match: mockMatch,
  });

  mockUpsert.mockResolvedValue({ error: null });
  mockMatch.mockResolvedValue({ error: null });

  return {
    supabase: {
      from: mockFrom,
    },
    BUSINESS_ID: 'test-business-id',
  };
});

// Import db and supabase
import { db, getNextInvoiceNumber, updateInvoiceCounter, pushToCloud, removeFromCloud } from './db';
import { supabase, BUSINESS_ID } from './supabase';

describe('Database and Sync Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice Counters', () => {
    it('getNextInvoiceNumber should return zero-padded string of counter value', async () => {
      db.settings.get.mockResolvedValue({ value: 123 });
      const num = await getNextInvoiceNumber();
      expect(num).toBe('123');
      expect(db.settings.get).toHaveBeenCalledWith('invoiceCounter');
    });

    it('getNextInvoiceNumber should pad numbers less than 3 digits with zeros', async () => {
      db.settings.get.mockResolvedValue({ value: 5 });
      const num = await getNextInvoiceNumber();
      expect(num).toBe('005');
    });

    it('getNextInvoiceNumber should fall back to 046 if no counter is set', async () => {
      db.settings.get.mockResolvedValue(undefined);
      const num = await getNextInvoiceNumber();
      expect(num).toBe('046');
    });

    it('updateInvoiceCounter should write incremented integer back to settings', async () => {
      db.settings.put.mockResolvedValue(undefined);
      await updateInvoiceCounter('046');
      expect(db.settings.put).toHaveBeenCalledWith({ key: 'invoiceCounter', value: 47 });
    });
  });

  describe('Cloud Sync Mappings and Sync Operations', () => {
    it('pushToCloud should map camelCase keys to snake_case for Supabase integration', async () => {
      const inputData = {
        id: 999, // Should be stripped out
        invoiceNo: '102',
        docName: 'TestDoc',
        billNo: '55',
        dcNo: '12',
        clientCompany: 'Acme Corp',
        grandTotal: 15000,
        uploadedAt: '2026-06-29T14:00:00Z',
        dataUrl: 'https://example.com/file',
        paymentStatus: 'paid',
        paidAmount: 15000,
        driverName: 'John Doe',
        monthYear: 'June 2026',
        vendorCode: 'VND-01',
        type: 'test-type',
        someRegularField: 'no-change',
      };

      const expectedPayload = {
        invoice_no: '102',
        doc_name: 'TestDoc',
        bill_no: '55',
        dc_no: '12',
        client_company: 'Acme Corp',
        grand_total: 15000,
        uploaded_at: '2026-06-29T14:00:00Z',
        data_url: 'https://example.com/file',
        payment_status: 'paid',
        paid_amount: 15000,
        driver_name: 'John Doe',
        month_year: 'June 2026',
        vendor_code: 'VND-01',
        type: 'test-type',
        someRegularField: 'no-change',
        business_id: BUSINESS_ID,
      };

      // Set online status
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

      const mockUpsert = supabase.from().upsert;
      await pushToCloud('invoices', inputData);

      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(mockUpsert).toHaveBeenCalledWith(expectedPayload, { onConflict: 'business_id, invoice_no' });

      // Restore navigator online state
      Object.defineProperty(window.navigator, 'onLine', { value: originalOnLine, configurable: true });
    });

    it('removeFromCloud should format the query matching object correctly', async () => {
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });

      const mockMatch = supabase.from().delete().match;
      await removeFromCloud('customers', { companyName: 'Acme Corp' });

      expect(supabase.from).toHaveBeenCalledWith('customers');
      expect(mockMatch).toHaveBeenCalledWith({
        company_name: 'Acme Corp',
        business_id: BUSINESS_ID,
      });

      Object.defineProperty(window.navigator, 'onLine', { value: originalOnLine, configurable: true });
    });
  });
});
