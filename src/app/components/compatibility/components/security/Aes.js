/**
 * AES Encryption wrapper using native Web Crypto API
 * Maintains the same interface as aes-encryption library
 */
class AesEncryption {
  constructor() {
    this.secretKey = null;
    this.cryptoKey = null;
  }

  /**
   * Set the secret key for encryption/decryption
   * @param {string} key - The secret key string
   */
  setSecretKey(key) {
    this.secretKey = key;
  }

  /**
   * Derive a crypto key from the secret key
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey() {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(this.secretKey);

    // Hash the key to get a consistent 256-bit key
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);

    // Import the key for AES-GCM
    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.cryptoKey;
  }

  /**
   * Encrypt a string
   * @param {string} plaintext - The text to encrypt
   * @returns {string} Base64 encoded encrypted text with IV prepended
   */
  encrypt(plaintext) {
    if (!this.secretKey) {
      throw new Error('Secret key not set. Call setSecretKey() first.');
    }

    // Use synchronous approach with promises
    return this._encryptAsync(plaintext);
  }

  /**
   * Internal async encryption method
   * @param {string} plaintext
   * @returns {Promise<string>}
   */
  async _encryptAsync(plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey();

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to base64
    return this._arrayBufferToBase64(combined);
  }

  /**
   * Decrypt a string
   * @param {string} ciphertext - The base64 encoded encrypted text
   * @returns {string} Decrypted plaintext
   */
  decrypt(ciphertext) {
    if (!this.secretKey) {
      throw new Error('Secret key not set. Call setSecretKey() first.');
    }

    return this._decryptAsync(ciphertext);
  }

  /**
   * Internal async decryption method
   * @param {string} ciphertext
   * @returns {Promise<string>}
   */
  async _decryptAsync(ciphertext) {
    // Convert from base64
    const combined = this._base64ToArrayBuffer(ciphertext);

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const key = await this.deriveKey();

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedData
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * @param {Uint8Array} buffer
   * @returns {string}
   */
  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * @param {string} base64
   * @returns {Uint8Array}
   */
  _base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

export default AesEncryption;
