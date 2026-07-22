import { useState, useEffect } from 'react';
import { Fingerprint, Delete, Shield, AlertCircle } from 'lucide-react';
import { securitySettings, verifyBiometric } from '../utils/security';
import './SecurityLock.css';

export default function SecurityLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState(false);

  useEffect(() => {
    if (securitySettings.isBiometricEnabled) {
      handleBiometricUnlock();
    }
  }, []);

  const handleBiometricUnlock = async () => {
    setIsBiometricPrompting(true);
    const success = await verifyBiometric();
    setIsBiometricPrompting(false);
    if (success) {
      onUnlock();
    }
  };

  const handlePinInput = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (enteredPin) => {
    const savedPin = securitySettings.appPin;
    if (enteredPin === savedPin) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setPin(''), 500);
    }
  };

  return (
    <div className="security-lock-container">
      <div className="security-lock-content">
        <div className="lock-header">
          <div className="shield-icon-wrapper">
            <Shield size={42} className="lock-icon" />
          </div>
          <h2>App Locked</h2>
          <p>
            {securitySettings.isBiometricEnabled 
              ? "Enter your 4-digit PIN or use Fingerprint/FaceID to access the application" 
              : "Enter your 4-digit PIN to access the application"}
          </p>
        </div>

        <div className={`pin-display ${error ? 'error-shake' : ''}`}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''} ${error ? 'error' : ''}`} />
          ))}
        </div>

        <div className="pin-error-container">
          {error && <div className="pin-error"><AlertCircle size={14} /> Incorrect PIN</div>}
        </div>

        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="pin-btn" onClick={() => handlePinInput(num.toString())}>
              {num}
            </button>
          ))}
          
          {securitySettings.isBiometricEnabled ? (
            <button className={`pin-btn icon-btn ${isBiometricPrompting ? 'pulse' : ''}`} onClick={handleBiometricUnlock} disabled={isBiometricPrompting}>
              <Fingerprint size={28} />
            </button>
          ) : (
            <div className="pin-btn-placeholder" />
          )}

          <button className="pin-btn" onClick={() => handlePinInput('0')}>0</button>
          
          <button className="pin-btn icon-btn" onClick={handleDelete}>
            <Delete size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
