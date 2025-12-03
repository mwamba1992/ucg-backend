# UCG Notification Testing Guide

## Quick Start

### 1. Configure Notification Service URL

Edit `.env`:
```bash
NOTIFICATION_SERVICE_URL=http://your-notification-service-url
```

### 2. Start Application

```bash
npm run start:dev
```

## Test Scenarios

### Test 1: Service Provider Registration

**Endpoint**: `POST /api/v1/service-providers`

```bash
curl -X POST http://localhost:3000/api/v1/service-providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "businessName": "Test School",
    "businessType": "SCHOOL",
    "email": "test@school.com",
    "phoneNumber": "0759123081",
    "contact": {
      "fullName": "John Doe",
      "phoneNumber": "0759123081",
      "email": "john@school.com",
      "position": "Director"
    },
    "bankAccounts": [{
      "bankName": "CRDB",
      "accountNumber": "1234567890",
      "accountName": "Test School",
      "isPrimary": true
    }],
    "settings": {
      "commissionRate": 2.5
    }
  }'
```

**Expected Notifications**:
- ✅ SMS to `0759123081`: Registration confirmation
- ✅ Email to `test@school.com`: Registration confirmation

**Check Logs**:
```bash
tail -f server.log | grep Notification
```

Expected output:
```
Sending SMS notification to 0759123081 - Subject: Service Provider Registration Successful
Sending EMAIL notification to test@school.com - Subject: Service Provider Registration Successful
Notification sent successfully: Notification received successfully
```

### Test 2: Service Provider Approval

**Endpoint**: `POST /api/v1/service-providers/:id/approve`

```bash
curl -X POST http://localhost:3000/api/v1/service-providers/{SP_ID}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "approvedBy": "admin-user-id"
  }'
```

**Expected Notifications**:
- ✅ SMS to service provider: Approval notification with API key
- ✅ Email to service provider: Approval notification with API key

### Test 3: Payment Reference Creation

**Endpoint**: `POST /api/v1/references`

```bash
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serviceProviderId": "sp-uuid",
    "customerName": "Jane Customer",
    "customerPhone": "0759123082",
    "amount": 50000,
    "description": "School fees Term 1"
  }'
```

**Expected Notifications**:
- ✅ SMS to `0759123082`: Reference number and payment instructions

### Test 4: Payment Processing

**Endpoint**: `POST /api/v1/payments`

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "referenceNumber": "TST-0000001-A1B",
    "amountPaid": 50000,
    "payerName": "Jane Customer",
    "payerPhone": "0759123082",
    "paymentChannel": "M-PESA"
  }'
```

**Expected Notifications**:
- ✅ SMS to customer (`0759123082`): Payment confirmation
- ✅ SMS to service provider: Payment received notification
- ✅ Email to service provider: Payment received notification

### Test 5: Batch Reference Generation

**Endpoint**: `POST /api/v1/service-providers/:id/references/bulk-generate`

```bash
curl -X POST http://localhost:3000/api/v1/service-providers/{SP_ID}/references/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "references": [
      {
        "customerName": "Customer 1",
        "customerPhone": "0759123083",
        "amount": 10000,
        "description": "Payment 1"
      },
      {
        "customerName": "Customer 2",
        "customerPhone": "0759123084",
        "amount": 20000,
        "description": "Payment 2"
      }
    ],
    "defaultExpiryDays": 30
  }'
```

**Expected Notifications**:
- ✅ SMS to each customer: Reference creation notification
- ✅ Email + SMS to service provider: Batch completion summary (after processing)

## Notification Service Mock

If you don't have the notification service running, you can mock it:

### Option 1: Using JSON Server

```bash
# Install json-server
npm install -g json-server

# Create mock-notification.json
echo '{
  "send": {
    "statusCode": "6200",
    "statusDescription": "Notification received successfully"
  }
}' > mock-notification.json

# Run mock server
json-server --watch mock-notification.json --port 3001

# Update .env
NOTIFICATION_SERVICE_URL=http://localhost:3001
```

### Option 2: Using Express

Create `mock-notification-server.js`:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/send', (req, res) => {
  console.log('Notification received:', req.body);
  res.json({
    statusCode: '6200',
    statusDescription: 'Notification received successfully'
  });
});

app.listen(3001, () => {
  console.log('Mock notification server running on port 3001');
});
```

Run it:
```bash
node mock-notification-server.js
```

Update `.env`:
```
NOTIFICATION_SERVICE_URL=http://localhost:3001
```

## Verification Checklist

### Application Startup
- [ ] Application starts without errors
- [ ] Notification service URL is loaded from environment
- [ ] No missing dependency errors

### Service Provider Flow
- [ ] SP registration sends notifications
- [ ] SP approval sends notifications with API key
- [ ] SP rejection sends notifications with reason

### Reference Flow
- [ ] Single reference creation sends customer SMS
- [ ] Batch reference generation sends completion notification
- [ ] Reference notifications contain correct details

### Payment Flow
- [ ] Payment processing sends customer confirmation
- [ ] Payment processing sends SP notification
- [ ] Both SMS and email are sent to SP

### Error Handling
- [ ] Failed notifications don't block operations
- [ ] Errors are logged appropriately
- [ ] Application continues normally after notification failure

## Common Issues

### Issue: "Notification service URL not configured"

**Solution**:
```bash
# Add to .env
NOTIFICATION_SERVICE_URL=http://your-service-url
```

### Issue: "Connection timeout"

**Check**:
1. Is notification service running?
2. Is URL correct?
3. Is there network connectivity?

```bash
# Test connectivity
curl -X POST http://your-service-url/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test",
    "recepient": "0759123081",
    "type": "SMS",
    "subject": "Test"
  }'
```

### Issue: "Invalid response format"

**Check**:
- Does notification service return statusCode: "6200"?
- Is response format JSON?

## Monitoring Commands

### Watch Notification Logs
```bash
tail -f server.log | grep -i notification
```

### Watch Specific Notification Type
```bash
tail -f server.log | grep "Sending SMS"
tail -f server.log | grep "Sending EMAIL"
```

### Watch Errors Only
```bash
tail -f server.log | grep "Failed to send"
```

### Count Notifications
```bash
grep "Notification sent successfully" server.log | wc -l
grep "Failed to send" server.log | wc -l
```

## Performance Testing

### Load Test with Artillery

Create `artillery-notifications.yml`:

```yaml
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: Bearer YOUR_TOKEN
      Content-Type: application/json

scenarios:
  - name: Create references with notifications
    flow:
      - post:
          url: /api/v1/references
          json:
            serviceProviderId: "sp-uuid"
            customerName: "Load Test Customer"
            customerPhone: "0759123999"
            amount: 10000
            description: "Load test"
```

Run:
```bash
artillery run artillery-notifications.yml
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Notifications

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start Mock Notification Service
        run: |
          node mock-notification-server.js &
          echo "NOTIFICATION_SERVICE_URL=http://localhost:3001" >> .env
      - name: Run Tests
        run: |
          npm install
          npm run build
          npm run test:e2e
```

## Manual Testing Checklist

### Pre-requisites
- [ ] Notification service is running
- [ ] `NOTIFICATION_SERVICE_URL` is configured
- [ ] Application is running
- [ ] Valid JWT token obtained

### Test Service Provider Module
- [ ] Test registration notification
- [ ] Test approval notification
- [ ] Test rejection notification
- [ ] Verify SMS content
- [ ] Verify email content

### Test Reference Module
- [ ] Test single reference notification
- [ ] Test bulk reference notifications
- [ ] Verify customer receives SMS
- [ ] Verify SP receives batch completion

### Test Payment Module
- [ ] Test payment success notification to customer
- [ ] Test payment received notification to SP
- [ ] Verify both SMS and email for SP

### Test Error Scenarios
- [ ] Notification service down - operation continues
- [ ] Invalid phone number - error logged
- [ ] Invalid email - error logged
- [ ] Timeout - error logged

## Success Criteria

✅ All notifications send successfully
✅ No business operations blocked by notification failures
✅ Errors are logged but don't crash the application
✅ Response times remain acceptable with notifications
✅ Notification content is accurate and professional

---

**Testing Date**: _____________
**Tested By**: _____________
**Notification Service URL**: _____________
**Test Environment**: _____________
**Status**: ✅ Pass / ❌ Fail

## Notes

_Add any additional notes or observations here_
