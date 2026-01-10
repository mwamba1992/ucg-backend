#!/bin/bash

# Test Vodacom M-Pesa Transaction Notification with correct XML format
# Endpoint: POST /api/v1/vodacom/transaction

echo "======================================"
echo "Vodacom M-Pesa Transaction Notification Test"
echo "======================================"
echo ""

# Note: The spPassword should be SHA-256 hash of: spId + plainPassword + timestamp
# Example: SHA256("400205" + "your-password" + "20190221124032") | base64

curl -X POST http://localhost:8000/api/v1/vodacom/transaction \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>400205</spId>
      <spPassword>24NGiZuATISn=+widndaULALANVLJIYn99CCNbxs76?m</spPassword>
      <timestamp>20190221124032</timestamp>
    </serviceProvider>
    <transaction>
      <amount>18000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255758027779</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>400205</recipient>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2019-02-21 12:40:27</transactionDate>
      <accountReference>UCG-0000001-A1B</accountReference>
      <transactionID>1251899741111</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>'

echo ""
echo ""
echo "======================================"
echo "Expected Response:"
echo "======================================"
cat << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <response>
    <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
    <transactionID>1251899741111</transactionID>
    <responseCode>0</responseCode>
    <responseDesc>Received</responseDesc>
    <serviceStatus>Success</serviceStatus>
  </response>
</mpesaBroker>
EOF
