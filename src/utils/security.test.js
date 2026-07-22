import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { securitySettings, registerBiometric, verifyBiometric } from './security';

describe('Security Utility Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('securitySettings', () => {
    it('should manage isLockEnabled flag in localStorage', () => {
      expect(securitySettings.isLockEnabled).toBe(false);
      
      securitySettings.isLockEnabled = true;
      expect(localStorage.getItem('lock_enabled')).toBe('true');
      expect(securitySettings.isLockEnabled).toBe(true);

      securitySettings.isLockEnabled = false;
      expect(localStorage.getItem('lock_enabled')).toBe('false');
      expect(securitySettings.isLockEnabled).toBe(false);
    });

    it('should manage appPin in localStorage', () => {
      expect(securitySettings.appPin).toBeNull();

      securitySettings.appPin = '1234';
      expect(localStorage.getItem('app_pin')).toBe('1234');
      expect(securitySettings.appPin).toBe('1234');
    });

    it('should identify if biometric is enabled based on credential presence', () => {
      expect(securitySettings.isBiometricEnabled).toBe(false);

      localStorage.setItem('biometric_credential_id', 'some-base64-credential-id');
      expect(securitySettings.isBiometricEnabled).toBe(true);

      securitySettings.disableBiometric();
      expect(localStorage.getItem('biometric_credential_id')).toBeNull();
      expect(securitySettings.isBiometricEnabled).toBe(false);
    });
  });

  describe('Biometrics Registration and Verification', () => {
    const originalPublicKeyCredential = window.PublicKeyCredential;

    beforeEach(() => {
      // Setup default mock implementation for credentials APIs
      vi.stubGlobal('navigator', {
        credentials: {
          create: vi.fn(),
          get: vi.fn(),
        }
      });
    });

    afterEach(() => {
      window.PublicKeyCredential = originalPublicKeyCredential;
    });

    it('should throw an error during registration if WebAuthn is not supported', async () => {
      // WebAuthn not supported
      window.PublicKeyCredential = undefined;

      await expect(registerBiometric()).rejects.toThrow(
        'WebAuthn is not supported on this device/browser.'
      );
    });

    it('should register biometric and store credential ID if WebAuthn is supported and user consents', async () => {
      // Mock WebAuthn support
      window.PublicKeyCredential = vi.fn();

      const mockRawId = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      navigator.credentials.create.mockResolvedValue({
        rawId: mockRawId,
      });

      const success = await registerBiometric();

      expect(success).toBe(true);
      expect(navigator.credentials.create).toHaveBeenCalledTimes(1);
      
      const storedCredId = localStorage.getItem('biometric_credential_id');
      expect(storedCredId).toBeDefined();
      expect(storedCredId).not.toBeNull();
      
      // Check that decoding it yields our mock raw ID
      const binaryString = window.atob(storedCredId);
      const decodedBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        decodedBytes[i] = binaryString.charCodeAt(i);
      }
      expect(Array.from(decodedBytes)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should throw an error if registration is cancelled or fails', async () => {
      window.PublicKeyCredential = vi.fn();
      const mockError = new Error('User cancelled or timeout');
      navigator.credentials.create.mockRejectedValue(mockError);

      await expect(registerBiometric()).rejects.toThrow('User cancelled or timeout');
      expect(localStorage.getItem('biometric_credential_id')).toBeNull();
    });

    it('should fail biometric verification if no biometric ID is registered', async () => {
      const result = await verifyBiometric();
      expect(result).toBe(false);
      expect(navigator.credentials.get).not.toHaveBeenCalled();
    });

    it('should verify biometric and return true if navigator.credentials.get succeeds', async () => {
      localStorage.setItem('biometric_credential_id', 'AQIDBAU='); // Base64 for [1, 2, 3, 4, 5]
      navigator.credentials.get.mockResolvedValue({ id: 'dummy-credential' });

      const result = await verifyBiometric();

      expect(result).toBe(true);
      expect(navigator.credentials.get).toHaveBeenCalledTimes(1);
      
      // Verify public key format passed to credential.get
      const callArg = navigator.credentials.get.mock.calls[0][0];
      expect(callArg.publicKey).toBeDefined();
      expect(callArg.publicKey.allowCredentials[0].id).toBeInstanceOf(ArrayBuffer);
    });

    it('should return false if navigator.credentials.get fails during verification', async () => {
      localStorage.setItem('biometric_credential_id', 'AQIDBAU=');
      navigator.credentials.get.mockRejectedValue(new Error('Verification failed'));

      const result = await verifyBiometric();
      expect(result).toBe(false);
    });
  });
});
