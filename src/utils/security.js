const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const securitySettings = {
  get isLockEnabled() {
    return localStorage.getItem('lock_enabled') === 'true';
  },
  set isLockEnabled(val) {
    localStorage.setItem('lock_enabled', val);
  },
  get appPin() {
    return localStorage.getItem('app_pin');
  },
  set appPin(val) {
    localStorage.setItem('app_pin', val);
  },
  get isBiometricEnabled() {
    return !!localStorage.getItem('biometric_credential_id');
  },
  disableBiometric() {
    localStorage.removeItem('biometric_credential_id');
  }
};

export async function registerBiometric() {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported on this device/browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const publicKey = {
    challenge: challenge,
    rp: { name: "Om Saravana Cranes" },
    user: {
      id: userId,
      name: "admin",
      displayName: "Admin"
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    },
    timeout: 60000
  };

  try {
    const credential = await navigator.credentials.create({ publicKey });
    const credentialIdStr = arrayBufferToBase64(credential.rawId);
    localStorage.setItem('biometric_credential_id', credentialIdStr);
    return true;
  } catch (err) {
    console.error("Biometric registration failed:", err);
    throw err;
  }
}

export async function verifyBiometric() {
  const credentialIdStr = localStorage.getItem('biometric_credential_id');
  if (!credentialIdStr) return false;

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const rawIdBuffer = base64ToArrayBuffer(credentialIdStr);

  const publicKey = {
    challenge: challenge,
    allowCredentials: [{
      id: rawIdBuffer,
      type: "public-key"
    }],
    userVerification: "required",
    timeout: 60000
  };

  try {
    await navigator.credentials.get({ publicKey });
    return true;
  } catch (err) {
    console.error("Biometric verification failed:", err);
    return false;
  }
}
