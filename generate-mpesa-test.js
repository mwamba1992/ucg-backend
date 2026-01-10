#!/usr/bin/env node

const crypto = require('crypto');

// Configuration - UPDATE THESE WITH YOUR ACTUAL VALUES
const SP_ID = '400205';
const SP_PASSWORD = 'testPassword123'; // Your M-Pesa password (from database: mpesa_config.spPassword)
const REFERENCE = 'UCG-0000001-A1B'; // Must exist in your database

// Generate current timestamp
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');
const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

// Generate encrypted password (SHA-256 + Base64)
const combined = SP_ID + SP_PASSWORD + timestamp;
const hash = crypto.createHash('sha256').update(combined).digest();
const encrypted = Buffer.from(hash).toString('base64');

// Generate unique receipt number
const uniqueId = Date.now();
const receiptNumber = `5BL716TEST${uniqueId.toString().slice(-6)}`;
const transactionId = `TEST${uniqueId}`;

// Build XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>${SP_ID}</spId>
      <spPassword>${encrypted}</spPassword>
      <timestamp>${timestamp}</timestamp>
    </serviceProvider>
    <transaction>
      <amount>18000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255758027779</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>${SP_ID}</recipient>
      <mpesaReceipt>${receiptNumber}</mpesaReceipt>
      <transactionDate>${year}-${month}-${day} ${hours}:${minutes}:${seconds}</transactionDate>
      <accountReference>${REFERENCE}</accountReference>
      <transactionID>${transactionId}</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>`;

console.log('='.repeat(80));
console.log('VODACOM M-PESA TEST PAYLOAD GENERATOR');
console.log('='.repeat(80));
console.log('');
console.log('Generated Values:');
console.log(`  Timestamp:         ${timestamp}`);
console.log(`  Encrypted Password: ${encrypted}`);
console.log(`  Receipt Number:    ${receiptNumber}`);
console.log(`  Transaction ID:    ${transactionId}`);
console.log('');
console.log('='.repeat(80));
console.log('CURL COMMAND:');
console.log('='.repeat(80));
console.log('');
console.log(`curl -X POST http://localhost:3000/api/v1/vodacom/transaction \\
  -H "Content-Type: application/xml" \\
  -d '${xml.replace(/\n/g, '\\n')}'`);
console.log('');
console.log('='.repeat(80));
console.log('XML PAYLOAD:');
console.log('='.repeat(80));
console.log('');
console.log(xml);
console.log('');
console.log('='.repeat(80));
console.log('NOTES:');
console.log('='.repeat(80));
console.log('');
console.log('1. Make sure M-Pesa config exists in database with password:', SP_PASSWORD);
console.log('2. Make sure reference exists:', REFERENCE);
console.log('3. Update SP_PASSWORD in this script to match your database');
console.log('');
console.log('To insert M-Pesa config (if not exists):');
console.log('');
console.log(`INSERT INTO mpesa_config (id, "spId", "spPassword", initiator, "initiatorPassword", "isActive")
VALUES (gen_random_uuid(), '${SP_ID}', '${SP_PASSWORD}', 'ibm_in', 'init123', true)
ON CONFLICT DO NOTHING;`);
console.log('');
