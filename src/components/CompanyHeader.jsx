import { COMPANY } from '../db';

export default function CompanyHeader({ variant = 'full' }) {
  if (variant === 'invoice') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div className="doc-header">
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <div>
            <div className="doc-header">
              <span className="company-title">Om Saravana</span>
              <img src="/crane-hook.png" alt="" className="crane-icon" />
              <span className="company-title">ranes</span>
            </div>
          </div>
        </div>
        <div className="doc-subheader">{COMPANY.tagline}</div>
        <div className="doc-company-contacts">
          Email: {COMPANY.email} &nbsp;&nbsp; mobile: {COMPANY.mobile}
        </div>
        <div className="doc-company-contacts">
          GST NUMBER: {COMPANY.gstin} &nbsp;&nbsp;&nbsp;&nbsp; Website: {COMPANY.website}
        </div>
      </div>
    );
  }

  // Full variant for tax invoice
  return (
    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
      <div className="doc-header">
        <img src="/logo.png" alt="Logo" className="logo-img" style={{ width: '48px', height: '48px' }} />
      </div>
    </div>
  );
}
