#!/usr/bin/env node

/**
 * M-Pesa Password Generator
 *
 * Generates encrypted password for M-Pesa webhook testing
 * Algorithm: Base64(SHA256(spId + password + timestamp))
 */

const crypto = require('crypto');

// Configuration (should match your database)
const SP_ID = '888000';
const PLAIN_PASSWORD = 'test_password';

// Generate timestamp in M-Pesa format: YYYYMMDDHHmmss
function generateTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Encrypt password using M-Pesa algorithm
function encryptPassword(spId, password, timestamp) {
  // Concatenate: spId + password + timestamp
  const combined = `${spId}${password}${timestamp}`;

  // Hash with SHA-256
  const hash = crypto.createHash('sha256').update(combined).digest();

  // Encode with Base64
  return Buffer.from(hash).toString('base64');
}

// Main
function main() {
  const timestamp = generateTimestamp();
  const encryptedPassword = encryptPassword(SP_ID, PLAIN_PASSWORD, timestamp);

  console.log('======================================');
  console.log('M-PESA PASSWORD GENERATOR');
  console.log('======================================');
  console.log('');
  console.log('Configuration:');
  console.log(`  SP ID: ${SP_ID}`);
  console.log(`  Plain Password: ${PLAIN_PASSWORD}`);
  console.log(`  Timestamp: ${timestamp}`);
  console.log('');
  console.log('Result:');
  console.log(`  Encrypted Password: ${encryptedPassword}`);
  console.log('');
  console.log('Algorithm:');
  console.log(`  1. Concatenate: "${SP_ID}${PLAIN_PASSWORD}${timestamp}"`);
  console.log(`  2. SHA-256 hash`);
  console.log(`  3. Base64 encode`);
  console.log('');
  console.log('Usage in XML:');
  console.log(`  <spPassword>${encryptedPassword}</spPassword>`);
  console.log(`  <timeStamp>${timestamp}</timeStamp>`);
  console.log('');
  console.log('⚠️  NOTE: Timestamp must match in both spPassword calculation and timeStamp field!');
  console.log('======================================');
}

main();
