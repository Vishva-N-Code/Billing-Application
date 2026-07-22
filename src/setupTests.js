import '@testing-library/jest-dom';

// Polyfill and Mock browser APIs not supported by jsdom
if (typeof window !== 'undefined') {
  // Mock window.crypto
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.getRandomValues) {
    window.crypto.getRandomValues = function (array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }

  // Mock navigator.credentials
  if (!window.navigator.credentials) {
    window.navigator.credentials = {
      create: async () => { throw new Error('Not implemented'); },
      get: async () => { throw new Error('Not implemented'); }
    };
  }
}
