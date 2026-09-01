import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('../db', () => ({
  db: {
    invoices: {
      toArray: vi.fn().mockResolvedValue([
        { id: 1, invoiceNo: '101', date: '2026-07-15', grandTotal: 25000, paymentStatus: 'paid' },
        { id: 2, invoiceNo: '102', date: '2026-08-10', grandTotal: 35000, paymentStatus: 'unpaid' }
      ])
    },
    cashbills: {
      toArray: vi.fn().mockResolvedValue([
        { id: 1, billNo: '001', date: '2026-08-12', grandTotal: 5000, paymentStatus: 'paid' }
      ])
    },
    vehicleDetails: {
      toArray: vi.fn().mockResolvedValue([])
    },
    customers: {
      toArray: vi.fn().mockResolvedValue([])
    }
  }
}));

describe('Dashboard Component', () => {
  it('should render Financial Dashboard heading and KPI cards without crashing', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Financial Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Tax Invoice Turnover/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash Bill Revenue/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Tax Invoice Turnover/i)).toBeInTheDocument();
    });
  });
});
