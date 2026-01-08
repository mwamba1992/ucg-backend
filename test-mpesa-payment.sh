#!/bin/bash

# M-Pesa C2B Payment Test Script
# This script simulates an M-Pesa payment notification

# Server URL
SERVER_URL="http://192.168.1.94:3000"

# Test Data
REFERENCE_NUMBER="TA5-0000001-97D"  # Active reference from database
AMOUNT="50000.0"
CUSTOMER_PHONE="255712345678"
MPESA_RECEIPT="RBK$(date +%s)TEST"  # Unique receipt number
TRANSACTION_ID="$(date +%s)$(shuf -i 100000-999999 -n 1)"
CONVERSATION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
ORIGINATOR_CONVERSATION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

# M-Pesa Configuration (must match database)
MPESA_SP_ID="888000"
MPESA_PLAIN_PASSWORD="test_password"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TRANSACTION_DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Calculate encrypted password: Base64(SHA256(spId + password + timestamp))
COMBINED="${MPESA_SP_ID}${MPESA_PLAIN_PASSWORD}${TIMESTAMP}"
ENCRYPTED_PASSWORD=$(echo -n "$COMBINED" | openssl dgst -sha256 -binary | base64)

# M-Pesa Notification XML (Correct nested structure)
# Note: In production, this would come from M-Pesa servers
XML_PAYLOAD=$(cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>${MPESA_SP_ID}</spId>
      <spPassword>${ENCRYPTED_PASSWORD}</spPassword>
      <timestamp>${TIMESTAMP}</timestamp>
    </serviceProvider>
    <transaction>
      <amount>${AMOUNT}</amount>
      <commandID>Pay Bill</commandID>
      <initiator>${CUSTOMER_PHONE}</initiator>
      <originatorConversationID>${ORIGINATOR_CONVERSATION_ID}</originatorConversationID>
      <recipient>${MPESA_SP_ID}</recipient>
      <mpesaReceipt>${MPESA_RECEIPT}</mpesaReceipt>
      <transactionDate>${TRANSACTION_DATE}</transactionDate>
      <accountReference>${REFERENCE_NUMBER}</accountReference>
      <transactionID>${TRANSACTION_ID}</transactionID>
      <conversationID>${CONVERSATION_ID}</conversationID>
    </transaction>
  </request>
</mpesaBroker>
EOF
)

echo "======================================"
echo "M-PESA PAYMENT TEST"
echo "======================================"
echo ""
echo "Reference Number: ${REFERENCE_NUMBER}"
echo "Amount: TZS ${AMOUNT}"
echo "M-Pesa Receipt: ${MPESA_RECEIPT}"
echo "Transaction ID: ${TRANSACTION_ID}"
echo "Timestamp: ${TIMESTAMP}"
echo "Encrypted Password: ${ENCRYPTED_PASSWORD}"
echo ""
echo "Sending payment notification..."
echo ""

# Send M-Pesa notification
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SERVER_URL}/api/v1/mpesa/c2b/payment" \
  -H "Content-Type: application/xml" \
  -d "${XML_PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "======================================"
echo "RESPONSE"
echo "======================================"
echo "HTTP Status: ${HTTP_CODE}"
echo ""
echo "Response Body:"
echo "${BODY}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Payment notification sent successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Check the mpesa_transactions table for the transaction"
  echo "2. Check the payments table for the created payment"
  echo "3. Check the payment_references table to see updated totalPaid"
  echo ""
  echo "SQL Queries:"
  echo "  SELECT * FROM mpesa_transactions WHERE \"mpesaReceipt\" = '${MPESA_RECEIPT}';"
  echo "  SELECT * FROM payments WHERE \"transactionId\" = '${MPESA_RECEIPT}';"
  echo "  SELECT \"referenceNumber\", amount, \"totalPaid\" FROM payment_references WHERE \"referenceNumber\" = '${REFERENCE_NUMBER}';"
else
  echo "❌ Payment notification failed!"
  echo ""
  echo "Check server logs for details:"
  echo "  npm run start:dev"
fi

echo "======================================"
