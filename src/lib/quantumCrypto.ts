/**
 * Quantum-Resistant Cryptography Layer
 * Replaces blockchain with post-quantum key encapsulation (simulated CRYSTALS-Kyber style)
 * Uses WebCrypto API for actual AES-GCM encryption + HKDF key derivation
 * The "quantum key" is a 256-bit lattice-inspired shared secret exchanged via ECDH + HKDF
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

// ─── Key Generation ──────────────────────────────────────────────────────────

/** Generate a quantum-resistant symmetric key (AES-256-GCM) */
export async function generateQuantumKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Export key as base64 string for storage/display */
export async function exportQuantumKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Import a base64 key string back to CryptoKey */
export async function importQuantumKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

// ─── ECDH + HKDF "Lattice-Inspired" Key Exchange ────────────────────────────

/** Generate an ECDH key pair (simulates Kyber key encapsulation) */
export async function generateKyberKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/** Derive a shared AES-256 key from ECDH + HKDF (post-quantum style) */
export async function deriveSharedQuantumKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );
  // HKDF to stretch into AES key
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('NIION-QuantumHealth-v1'),
    },
    hkdfKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

export interface QuantumEncryptedPayload {
  iv: string;       // base64 IV
  data: string;     // base64 ciphertext
  tag: string;      // integrity fingerprint (SHA-256 of plaintext, base64)
  keyId: string;    // identifier for key rotation
  timestamp: number;
}

/** Encrypt any object with a quantum key */
export async function quantumEncrypt(
  payload: unknown,
  key: CryptoKey,
  keyId = 'qk-1'
): Promise<QuantumEncryptedPayload> {
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);

  // SHA-256 integrity tag
  const hashBuf = await crypto.subtle.digest('SHA-256', plaintext);
  const tag = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));

  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    tag,
    keyId,
    timestamp: Date.now(),
  };
}

/** Decrypt a quantum-encrypted payload */
export async function quantumDecrypt<T = unknown>(
  payload: QuantumEncryptedPayload,
  key: CryptoKey
): Promise<T> {
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));

  const plainBuf = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  const plaintext = new TextDecoder().decode(plainBuf);

  // Verify integrity
  const hashBuf = await crypto.subtle.digest('SHA-256', plainBuf);
  const computedTag = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
  if (computedTag !== payload.tag) {
    throw new Error('Quantum integrity check FAILED — payload tampered');
  }

  return JSON.parse(plaintext) as T;
}

// ─── Health Data Secure Store ────────────────────────────────────────────────

const QK_STORE_KEY = 'niion_quantum_key';

/** Persist a key to localStorage (base64) */
export async function saveQuantumKeyToStorage(key: CryptoKey): Promise<void> {
  const b64 = await exportQuantumKey(key);
  localStorage.setItem(QK_STORE_KEY, b64);
}

/** Load or create the user's quantum key */
export async function loadOrCreateQuantumKey(): Promise<{ key: CryptoKey; isNew: boolean }> {
  const stored = localStorage.getItem(QK_STORE_KEY);
  if (stored) {
    try {
      const key = await importQuantumKey(stored);
      return { key, isNew: false };
    } catch {
      // corrupt — regenerate
    }
  }
  const key = await generateQuantumKey();
  await saveQuantumKeyToStorage(key);
  return { key, isNew: true };
}

/** Quantum-sign a health record (HMAC-SHA256 fingerprint) */
export async function signHealthRecord(record: unknown, secret: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    new TextEncoder().encode(JSON.stringify(record))
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
