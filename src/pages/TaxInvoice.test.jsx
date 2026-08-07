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
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getAllByText(/Qty Column/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rate Column/i).length).toBeGreaterThan(0);
  });

  it('should toggle Qty and Rate columns in preview table when checked', async () => {
    render(
      <MemoryRouter>
        <TaxInvoice />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
    });

    // Switch to preview tab
    const previewTabBtn = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewTabBtn);

    // Initially Qty and Rate columns are not visible in preview table header
    expect(screen.queryByRole('columnheader', { name: /^QTY$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^RATE$/i })).not.toBeInTheDocument();

    // Check Qty Column checkbox in preview panel toolbar
    const qtyCheckbox = screen.getAllByLabelText(/Qty Column/i)[0];
    fireEvent.click(qtyCheckbox);

    // Now Qty column header should be rendered in preview table
    expect(screen.getByRole('columnheader', { name: /^QTY$/i })).toBeInTheDocument();

    // Check Rate Column checkbox
    const rateCheckbox = screen.getAllByLabelText(/Rate Column/i)[0];
    fireEvent.click(rateCheckbox);

    // Now both QTY and RATE column headers should be rendered
    expect(screen.getByRole('columnheader', { name: /^QTY$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^RATE$/i })).toBeInTheDocument();
  });
});
