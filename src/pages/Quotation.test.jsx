import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Quotation from './Quotation';

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
  saveQuotation: vi.fn().mockResolvedValue('quote_1'),
  updateQuotation: vi.fn().mockResolvedValue(true),
  deleteQuotation: vi.fn().mockResolvedValue(true),
  db: {
    quotations: {
      toArray: vi.fn().mockResolvedValue([])
    },
    customers: {
      toArray: vi.fn().mockResolvedValue([
        { id: 1, companyName: 'KOTEC AUTOMOTIVE SERVICES INDIA PRIVATE LIMITED', address: 'Thandalam' }
      ])
    }
  }
}));

describe('Quotation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Quotation form and Preview tab properly', async () => {
    render(
      <MemoryRouter>
        <Quotation />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /^Quotation$/i })).toBeInTheDocument();

    const previewTab = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewTab);

    await waitFor(() => {
      expect(screen.getAllByText(/QUOTATION/i).length).toBeGreaterThan(0);
    });
  });

  it('should auto-populate customer details on selection', async () => {
    render(
      <MemoryRouter>
        <Quotation />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Client company name/i)).toBeInTheDocument();
    });

    const toInput = screen.getByPlaceholderText(/Client company name/i);
    fireEvent.change(toInput, { target: { value: 'KOTEC' } });

    await waitFor(() => {
      expect(screen.getByText(/KOTEC AUTOMOTIVE SERVICES INDIA PRIVATE LIMITED/i)).toBeInTheDocument();
    });

    // Select customer from dropdown
    const dropdownItem = screen.getByText(/KOTEC AUTOMOTIVE SERVICES INDIA PRIVATE LIMITED/i);
    fireEvent.mouseDown(dropdownItem);

    expect(toInput.value).toBe('KOTEC AUTOMOTIVE SERVICES INDIA PRIVATE LIMITED');
  });
});
