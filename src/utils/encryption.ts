import CryptoJS from 'crypto-js';

// Generate a random encryption key
export const generateEncryptionKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

// Encrypt content using AES-256
export const encryptContent = (content: string, key: string) => {
  return CryptoJS.AES.encrypt(content, key).toString();
};

// Decrypt content using AES-256
export const decryptContent = (encryptedContent: string, key: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

// Generate a URL-safe key for sharing
export const generateShareableKey = (key: string) => {
  return encodeURIComponent(key);
};

// Parse a URL-safe key
export const parseShareableKey = (shareableKey: string) => {
  return decodeURIComponent(shareableKey);
};