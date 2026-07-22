import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompanyHeader from './CompanyHeader';

// Mock the COMPANY constant imported from '../db'
vi.mock('../db', () => ({
  COMPANY: {
    name: 'OM SARAVANA CRANES',
    displayName: 'Om Saravana Cranes',
    tagline: 'All Kinds of crane, Forklift, Heavy Operator - 24 Hrs. Service',
    address: 'NO.18, P.S. Complex, 55-Thandalam,\nSriperumbudur (TK) - 602105',
    gstin: '33AOVPN6372D1ZM',
    mobile: '9551076305 / 9551070705',
    email: 'omsaravanacranes@gmail.com',
    website: 'omsaravanacranes.in',
  }
}));

describe('CompanyHeader Component', () => {
  it('should render the full variant logo container only by default', () => {
    const { container } = render(<CompanyHeader />);
    
    // Check if the logo image exists
    const logoImg = screen.getByAltText('Logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', '/logo.png');
    
    // The details from the invoice variant should not be visible
    expect(screen.queryByText(/Email:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GST NUMBER:/i)).not.toBeInTheDocument();
  });

  it('should render detailed header content when variant is set to invoice', () => {
    const { container } = render(<CompanyHeader variant="invoice" />);

    // Logo should be present
    expect(screen.getByAltText('Logo')).toBeInTheDocument();

    // Crane hook and company titles should render
    expect(screen.getByText('Om Saravana')).toBeInTheDocument();
    expect(screen.getByText('ranes')).toBeInTheDocument();
    
    // Since alt="" is decorative/empty, query it via class name or src attribute
    expect(container.querySelector('.crane-icon')).toBeInTheDocument();
    expect(container.querySelector('img[src="/crane-hook.png"]')).toBeInTheDocument();

    // Tagline and contacts should render correctly
    expect(screen.getByText('All Kinds of crane, Forklift, Heavy Operator - 24 Hrs. Service')).toBeInTheDocument();
    expect(screen.getByText(/Email: omsaravanacranes@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile: 9551076305 \/ 9551070705/i)).toBeInTheDocument();
    expect(screen.getByText(/GST NUMBER: 33AOVPN6372D1ZM/i)).toBeInTheDocument();
    expect(screen.getByText(/Website: omsaravanacranes.in/i)).toBeInTheDocument();
  });
});
