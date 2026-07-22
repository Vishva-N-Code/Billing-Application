import { useState, useEffect } from 'react';
import { Download, Upload, Save, Settings as SettingsIcon, Shield, Fingerprint, Lock } from 'lucide-react';
import { getCompanyProfile, updateCompanyProfile, db } from '../db';
import { securitySettings, registerBiometric } from '../utils/security';
import 'dexie-export-import';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [securityTab, setSecurityTab] = useState({
    lockEnabled: securitySettings.isLockEnabled,
    pin: securitySettings.appPin || '',
    biometricEnabled: securitySettings.isBiometricEnabled
  });

  const handleSecurityChange = async (field, value) => {
    if (field === 'lockEnabled') {
      securitySettings.isLockEnabled = value;
      setSecurityTab(prev => ({ ...prev, lockEnabled: value }));
    }
    if (field === 'pin') {
      const p = value.replace(/\D/g, '').slice(0, 4);
      securitySettings.appPin = p;
      setSecurityTab(prev => ({ ...prev, pin: p }));
    }
    if (field === 'biometricEnabled') {
      if (value) {
        try {
          await registerBiometric();
          setSecurityTab(prev => ({ ...prev, biometricEnabled: true }));
          alert('Biometric login enabled successfully!');
        } catch (e) {
          alert('Failed to enable biometric: ' + e.message);
        }
      } else {
        securitySettings.disableBiometric();
        setSecurityTab(prev => ({ ...prev, biometricEnabled: false }));
      }
    }
  };

  useEffect(() => {
    async function load() {
      const data = await getCompanyProfile();
      setProfile(data);
    }
    load();
  }, []);

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCompanyProfile(profile);
      alert('Company Profile Saved Successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save profile');
    }
    setIsSaving(false);
  };

  const handleBackup = async () => {
    try {
      const blob = await db.export();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OmSaravanaCranes_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error("Backup failed", error);
      alert('Backup failed! Please try again.');
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (window.confirm("WARNING: Restoring from a backup will overwrite your current database. Are you sure you want to proceed?")) {
      try {
        await db.import(file);
        alert('Database restored successfully! The application will now reload.');
        window.location.reload();
      } catch (error) {
        console.error("Restore failed", error);
        alert('Restore failed. The file might be corrupted.');
      }
    }
  };

  if (!profile) return <div className="page-header"><h1>Loading...</h1></div>;

  return (
    <>
      <div className="page-header">
        <h1>Company Settings & Profile</h1>
        <p>Manage your billing details, bank info, templates and database backups</p>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', maxWidth: '1200px' }}>
          
          <div className="card">
            <div className="card-title"><SettingsIcon size={20} /> Company Branding & Details</div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label>Company Name</label>
                <input className="form-control" value={profile.name} onChange={e => handleChange('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Owner Name</label>
                <input className="form-control" value={profile.owner} onChange={e => handleChange('owner', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Display Tagline</label>
                <input className="form-control" value={profile.tagline} onChange={e => handleChange('tagline', e.target.value)} />
              </div>
              <div className="form-group">
                <label>GSTIN</label>
                <input className="form-control" value={profile.gstin} onChange={e => handleChange('gstin', e.target.value)} />
              </div>
            </div>
            
            <div className="form-row form-row-2">
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" rows={3} value={profile.address} onChange={e => handleChange('address', e.target.value)} />
              </div>
              <div>
                <div className="form-group">
                  <label>Mobile Number(s)</label>
                  <input className="form-control" value={profile.mobile} onChange={e => handleChange('mobile', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label>Email Address</label>
                  <input className="form-control" value={profile.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label>Website</label>
              <input className="form-control" value={profile.website} onChange={e => handleChange('website', e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Bank Information</div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label>Account Name</label>
                <input className="form-control" value={profile.bankName} onChange={e => handleChange('bankName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input className="form-control" value={profile.bankAccount} onChange={e => handleChange('bankAccount', e.target.value)} />
              </div>
              <div className="form-group mb-0">
                <label>IFSC Code</label>
                <input className="form-control" value={profile.bankIFSC} onChange={e => handleChange('bankIFSC', e.target.value)} />
              </div>
              <div className="form-group mb-0">
                <label>Branch Name</label>
                <input className="form-control" value={profile.bankBranch} onChange={e => handleChange('bankBranch', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Default Terms & Conditions</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>This text will appear at the bottom of newly created invoices and bills by default. You can still modify them per-document.</p>
            <div className="form-group mb-0">
              <textarea className="form-control" rows={4} value={profile.termsAndConditions} onChange={e => handleChange('termsAndConditions', e.target.value)} placeholder="1. Interest..." />
            </div>
          </div>

          <div className="card">
            <div className="card-title"><Shield size={20} /> App Security & Authentication</div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Enable App Lock</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lock the app after 5 minutes of inactivity or when closed</span>
              </div>
              <div>
                <input 
                  type="checkbox" 
                  style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                  checked={securityTab.lockEnabled} 
                  onChange={e => handleSecurityChange('lockEnabled', e.target.checked)} 
                />
              </div>
            </div>

            {securityTab.lockEnabled && (
              <div className="form-row form-row-2" style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeft: '4px solid #3b82f6' }}>
                <div className="form-group mb-0">
                  <label><Lock size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> 4-Digit Security PIN</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Enter 4-digit PIN" 
                    value={securityTab.pin} 
                    onChange={e => handleSecurityChange('pin', e.target.value)} 
                    maxLength={4}
                    style={{ fontSize: '1.2rem', letterSpacing: '4px' }}
                  />
                  <small style={{color: 'var(--text-secondary)', marginTop: '8px', display: 'block'}}>This PIN will be required to unlock the app.</small>
                </div>

                <div className="form-group mb-0">
                  <label><Fingerprint size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> Biometric Unlock</label>
                  <div style={{ marginTop: '4px' }}>
                    {securityTab.biometricEnabled ? (
                      <button className="btn btn-secondary" onClick={() => handleSecurityChange('biometricEnabled', false)} style={{ width: '100%' }}>
                        Disable Fingerprint/FaceID
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => handleSecurityChange('biometricEnabled', true)} style={{ width: '100%' }}>
                        Enable Fingerprint/FaceID
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ minWidth: '200px' }}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>

          <div className="card" style={{ marginTop: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
            <div className="card-title" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '12px' }}>Database Backup & Transfer</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Your invoices and customer data are stored locally in this browser. To prevent data loss when clearing history, or to transfer your app to another laptop, please download a backup regularly.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleBackup}>
                <Download size={16} /> Download Backup (.json)
              </button>
              <div>
                <input type="file" id="restoreFile" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
                <button className="btn btn-secondary" onClick={() => document.getElementById('restoreFile').click()}>
                  <Upload size={16} /> Restore from Backup
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
