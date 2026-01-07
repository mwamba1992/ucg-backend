#!/bin/bash

# M-Pesa C2B Payment Test Script
# This script simulates an M-Pesa payment notification

# Server URL
SERVER_URL="http://192.168.1.94:3000"

# Test Data
REFERENCE_NUMBER="TA5-0000001-97D"  # Active reference from database
AMOUNT="50000"
CUSTOMER_PHONE="255712345678"
MPESA_RECEIPT="RBK12345TEST$(date +%s)"  # Unique receipt number
TRANSACTION_ID="MPESA-TEST-$(date +%s)"
CONVERSATION_ID="AG_$(date +%Y%m%d)_$(date +%s)"
ORIGINATOR_CONVERSATION_ID="ORG_$(date +%Y%m%d)_$(date +%s)"

# M-Pesa Notification XML
# Note: In production, this would come from M-Pesa servers
XML_PAYLOAD=$(cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<request>
  <spId>888000</spId>
  <spPassword>encrypted_password_here</spPassword>
  <timeStamp>$(date +%Y%m%d%H%M%S)</timeStamp>
  <amount>${AMOUNT}</amount>
  <commandID>CustomerPayBillOnline</commandID>
  <initiator>${CUSTOMER_PHONE}</initiator>
  <originatorConversationID>${ORIGINATOR_CONVERSATION_ID}</originatorConversationID>
  <recipient>888000</recipient>
  <serviceReceipt>${MPESA_RECEIPT}</serviceReceipt>
  <serviceDate>$(date +%Y%m%d%H%M%S)</serviceDate>
  <accountReference>${REFERENCE_NUMBER}</accountReference>
  <transactionID>${TRANSACTION_ID}</transactionID>
  <conversationID>${CONVERSATION_ID}</conversationID>
</request>
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
