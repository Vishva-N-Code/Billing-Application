import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaxInvoice from './TaxInvoice';

vi.mock('../db', () => ({
  COMPANY: {
    name: 'OM SARAVANA CRANES',
    address: 'Thandalam',
    gstin: '33AOVPN6372D1ZM',
    mobile: '9551076305',
    email: 'omsaravanacranes@gmail.com',
    website: 'omsaravanacranes.in',
  },
  getCompanyProfile: vi.fn().mockResolvedValue({
    name: 'OM SARAVANA CRANES',
    address: 'Thandalam',
    gstin: '33AOVPN6372D1ZM',
    mobile: '9551076305',
    email: 'omsaravanacranes@gmail.com',
    website: 'omsaravanacranes.in',
    bankAccount: '12345',
    bankName: 'Test Bank',
    bankIFSC: 'TEST0001',
    bankBranch: 'Test Branch'
  }),
  getNextInvoiceNumber: vi.fn().mockResolvedValue('OSC/25-26/001'),
  updateInvoiceCounter: vi.fn().mockResolvedValue(true),
  initSettings: vi.fn().mockResolvedValue(true),
  saveInvoice: vi.fn().mockResolvedValue('inv_1'),
  updateInvoice: vi.fn().mockResolvedValue(true),
  deleteInvoice: vi.fn().mockResolvedValue(true),
  saveCustomer: vi.fn().mockResolvedValue('cust_1'),
  db: {
    invoices: { toArray: vi.fn().mockResolvedValue([]) },
    customers: { toArray: vi.fn().mockResolvedValue([]) },
  }
}));

describe('TaxInvoice Component Optional Columns', () => {
  it('should render Qty and Rate checkboxes in details tab', async () => {
    render(
      <MemoryRouter>
        <TaxInvoice />
      </MemoryRouter>
    );

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2);
    });
    expect(screen.getByLabelText(/Qty Column/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rate Column/i)).toBeInTheDocument();
  });

  it('should toggle Qty and Rate columns in preview table when checked in details tab', async () => {
    render(
      <MemoryRouter>
        <TaxInvoice />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
    });

    // Check Qty Column and Rate Column checkboxes in details filling section
    const qtyCheckbox = screen.getByLabelText(/Qty Column/i);
    const rateCheckbox = screen.getByLabelText(/Rate Column/i);
    
    // Check Qty Column checkbox
    fireEvent.click(qtyCheckbox);
    // Check Rate Column checkbox
    fireEvent.click(rateCheckbox);

    // Switch to preview tab
    const previewTabBtn = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewTabBtn);

    // Now both QTY and RATE column headers should be rendered in preview table
    expect(screen.getByRole('columnheader', { name: /^QTY$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^RATE$/i })).toBeInTheDocument();
  });
});
