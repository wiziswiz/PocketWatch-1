/**
 * Encryption primitives for .pwbackup files.
 * Uses AES-256-GCM with PBKDF2-derived keys from the vault password.
 *
 * File format:
 *   [4B] Magic "PWTB"
 *   [1B] Version 0x01
 *   [32B] PBKDF2 salt
 *   [12B] AES-GCM IV
 *   [NB] Ciphertext (gzipped JSON + GCM auth tag)
 */

import { gzipSync, gunzipSync } from "node:zlib"

const MAGIC = new Uint8Array([0x50, 0x57, 0x54, 0x42]) // "PWTB"
const FORMAT_VERSION = 0x01
const HEADER_SIZE = 4 + 1 + 32 + 12 // 49 bytes

const PBKDF2_ITERATIONS = 600_000
const KEY_LENGTH_BITS = 256
const IV_LENGTH = 12
const TAG_LENGTH = 128

/**
 * Derive a 256-bit AES key from the vault password + salt.
 */
async function deriveBackupKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    passwordKey,
    KEY_LENGTH_BITS,
  )

  return crypto.subtle.importKey(
    "raw",
    bits,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Encrypt a backup payload into a .pwbackup binary buffer.
 */
export async function encryptBackup(
  payload: object,
  password: string,
): Promise<Buffer> {
  const json = JSON.stringify(payload)
  const compressed = gzipSync(Buffer.from(json, "utf-8"), { level: 6 })

  const salt = crypto.getRandomValues(new Uint8Array(32))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveBackupKey(password, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: TAG_LENGTH },
    key,
    compressed,
  )

  // Assemble: magic + version + salt + iv + ciphertext(+tag)
  const output = Buffer.alloc(HEADER_SIZE + ciphertext.byteLength)
  output.set(MAGIC, 0)
  output[4] = FORMAT_VERSION
  output.set(salt, 5)
  output.set(iv, 37)
  output.set(new Uint8Array(ciphertext), HEADER_SIZE)

  return output
}

/**
 * Decrypt a .pwbackup binary buffer into the parsed JSON payload.
 * Throws on wrong password, corrupted file, or version mismatch.
 */
export async function decryptBackup(
  buffer: Buffer,
  password: string,
): Promise<unknown> {
  if (buffer.length < HEADER_SIZE + 16) {
    throw new Error("File is too small to be a valid PocketWatch backup")
  }

  // Validate magic
  for (let i = 0; i < 4; i++) {
    if (buffer[i] !== MAGIC[i]) {
      throw new Error("Not a valid PocketWatch backup file")
    }
  }

  // Validate version
  if (buffer[4] !== FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup version ${buffer[4]}. This version of PocketWatch supports version ${FORMAT_VERSION}.`,
    )
  }

  // Uint8Array.from() copies into fresh ArrayBuffers — avoids subarray offset bug
  const salt = Uint8Array.from(buffer.subarray(5, 37))
  const iv = Uint8Array.from(buffer.subarray(37, HEADER_SIZE))
  const ciphertext = Uint8Array.from(buffer.subarray(HEADER_SIZE))

  const key = await deriveBackupKey(password, salt)

  let decrypted: ArrayBuffer
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: TAG_LENGTH },
      key,
      ciphertext,
    )
  } catch {
    throw new Error("Incorrect password or corrupted backup file")
  }

  const decompressed = gunzipSync(Buffer.from(decrypted))
  return JSON.parse(decompressed.toString("utf-8"))
}
