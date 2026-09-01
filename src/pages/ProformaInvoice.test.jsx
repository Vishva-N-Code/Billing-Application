import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProformaInvoice from './ProformaInvoice';

vi.mock('../db', () => ({
  COMPANY: {
    name: 'OM SARAVANA CRANES',
    address: 'Thandalam',
    gstin: '33AOVPN6372D1ZM',
    mobile: '9551076305',
    email: 'omsaravanacranes@gmail.com',
    website: 'omsaravanacranes.in',
    owner: 'K. Nanda Kumar'
  },
  getCompanyProfile: vi.fn().mockResolvedValue({
    name: 'OM SARAVANA CRANES',
    address: 'Thandalam',
    gstin: '33AOVPN6372D1ZM',
    mobile: '9551076305',
    email: 'omsaravanacranes@gmail.com',
    website: 'omsaravanacranes.in',
    owner: 'K. Nanda Kumar'
  }),
  initSettings: vi.fn().mockResolvedValue(true),
  saveProformaInvoice: vi.fn().mockResolvedValue('pf_1'),
  updateProformaInvoice: vi.fn().mockResolvedValue(true),
  deleteProformaInvoice: vi.fn().mockResolvedValue(true),
  getNextProformaInvoiceNumber: vi.fn().mockImplementation(async (companyName) => {
    if (!companyName || !companyName.trim()) return '';
    const clean = companyName.trim();
    const firstLetter = (clean.match(/[a-zA-Z]/) || ['P'])[0].toUpperCase();
    return `${firstLetter}001`;
  }),
  db: {
    proformaInvoices: { 
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1)
    },
    customers: { 
      toArray: vi.fn().mockResolvedValue([
        { id: 1, companyName: 'KOTEC AUTOMOTIVE SERVICES INDIA PRIVATE LIMITED', address: 'Thandalam' },
        { id: 2, companyName: 'FUSO GLASS INDIA PVT LTD', address: 'Sriperumbudur' }
      ]) 
    },
  }
}));

describe('Proforma Invoice Component Rendering & Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-populate invoice number when company name is typed or selected', async () => {
    render(
      <MemoryRouter>
        <ProformaInvoice />
      </MemoryRouter>
    );

    const companyInput = screen.getByPlaceholderText(/Client company name/i);
    fireEvent.change(companyInput, { target: { value: 'KOTEC INDIA' } });

    await waitFor(() => {
      const invoiceNoInput = screen.getByPlaceholderText(/e\.g\. K001, F001\.\.\./i);
      expect(invoiceNoInput.value).toBe('K001');
    });
  });

  it('should display preview document when switching to Preview tab', async () => {
    render(
      <MemoryRouter>
        <ProformaInvoice />
      </MemoryRouter>
    );

    // Switch to preview tab
    const previewTab = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewTab);

    // Document header and title should be rendered
    await waitFor(() => {
      const titles = screen.getAllByText(/PROFORMA INVOICE/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});

