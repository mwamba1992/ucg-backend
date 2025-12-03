# UCG Notification Integration Guide

## Overview

The UCG backend has been integrated with SMS and Email notification services across all critical business operations. This document outlines the notification integration implementation and usage.

## Notification Service API

The notification service uses a simple REST API with the following specification:

### SMS Notification
```bash
curl --location -g '{{notification-service}}/send' \
--data '{
    "message": "Your message here",
    "recepient": "0759123081",
    "type": "SMS",
    "subject": "Subject"
}'
```

### Email Notification
```bash
curl --location -g '{{notification-service}}/send' \
--data-raw '{
    "message": "Your message here",
    "recepient": "user@example.com",
    "type": "EMAIL",
    "subject": "Email Subject",
    "sender": "UCG"
}'
```

### Response Format
```json
{
  "statusDescription": "Notification received successfully",
  "statusCode": "6200"
}
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Notification Service Configuration
NOTIFICATION_SERVICE_URL=http://your-notification-service-url
```

## Notification Module Structure

```
src/modules/notification/
├── dto/
│   ├── send-notification.dto.ts
│   └── notification-response.dto.ts
├── notification.service.ts
└── notification.module.ts
```

### Key Features

- **Automatic retry**: Failed notifications are logged but don't block the main operation
- **Dual channel**: Can send both SMS and email simultaneously
- **Template methods**: Pre-built notification templates for common scenarios
- **Error handling**: All notification failures are logged without affecting business operations

## Integration Points

### 1. Service Provider Onboarding

#### Registration Notification
**Triggered**: When a new service provider registers
**Recipients**: Service Provider (Email + SMS)
**Content**: Registration confirmation with SP Code

```typescript
await notificationService.notifyServiceProviderRegistration(
  email,
  phoneNumber,
  businessName,
  spCode
);
```

#### Approval Notification
**Triggered**: When service provider is approved
**Recipients**: Service Provider (Email + SMS)
**Content**: Approval confirmation with API Key

```typescript
await notificationService.notifyServiceProviderApproval(
  email,
  phoneNumber,
  businessName,
  apiKey
);
```

#### Rejection Notification
**Triggered**: When service provider is rejected
**Recipients**: Service Provider (Email + SMS)
**Content**: Rejection reason and next steps

```typescript
await notificationService.notifyServiceProviderRejection(
  email,
  phoneNumber,
  businessName,
  reason
);
```

### 2. Payment Reference Generation

#### Single Reference Creation
**Triggered**: When a payment reference is created
**Recipients**: Customer (SMS)
**Content**: Reference number, amount, and payment instructions

```typescript
await notificationService.notifyReferenceCreated(
  serviceProviderEmail,
  customerPhone,
  customerName,
  referenceNumber,
  amount,
  description,
  businessName
);
```

#### Batch Reference Completion
**Triggered**: When bulk reference generation completes
**Recipients**: Service Provider (Email + SMS)
**Content**: Batch summary with success/failure counts

```typescript
await notificationService.notifyBatchReferenceComplete(
  email,
  phoneNumber,
  businessName,
  batchId,
  totalRequested,
  successCount,
  failureCount
);
```

### 3. Payment Processing

#### Customer Payment Confirmation
**Triggered**: When payment is successfully processed
**Recipients**: Customer (SMS)
**Content**: Payment confirmation with receipt details

```typescript
await notificationService.notifyCustomerPaymentSuccess(
  customerPhone,
  customerName,
  referenceNumber,
  amount,
  businessName
);
```

#### Service Provider Payment Notification
**Triggered**: When payment is received
**Recipients**: Service Provider (Email + SMS)
**Content**: Payment received notification with details

```typescript
await notificationService.notifyPaymentReceived(
  spEmail,
  spPhone,
  referenceNumber,
  amount,
  customerName,
  businessName
);
```

### 4. User Management

#### User Registration
**Triggered**: When new user registers
**Recipients**: User (Email)
**Content**: Welcome message and account status

```typescript
await notificationService.notifyUserRegistration(
  email,
  firstName,
  lastName
);
```

#### User Activation
**Triggered**: When user account is activated
**Recipients**: User (Email)
**Content**: Account activation confirmation

```typescript
await notificationService.notifyUserActivation(
  email,
  firstName,
  lastName
);
```

#### Password Change
**Triggered**: When user changes password
**Recipients**: User (Email)
**Content**: Security notification

```typescript
await notificationService.notifyPasswordChange(
  email,
  firstName,
  lastName
);
```

### 5. Additional Notifications

#### Reference Expiry Reminder
**Triggered**: Reference approaching expiry (scheduled job)
**Recipients**: Customer (SMS)
**Content**: Reminder with days remaining

```typescript
await notificationService.notifyReferenceExpiringSoon(
  customerPhone,
  customerName,
  referenceNumber,
  amount,
  expiryDate
);
```

#### Settlement Notification
**Triggered**: When settlement is processed
**Recipients**: Service Provider (Email + SMS)
**Content**: Settlement details

```typescript
await notificationService.notifySettlement(
  email,
  phoneNumber,
  businessName,
  amount,
  transactionCount,
  settlementDate
);
```

#### Workflow Task Assignment
**Triggered**: When workflow task is assigned
**Recipients**: Assignee (Email)
**Content**: Task details

```typescript
await notificationService.notifyWorkflowTaskAssigned(
  email,
  assigneeName,
  taskTitle,
  taskDescription,
  dueDate
);
```

## Usage Examples

### Example 1: Manual Notification

```typescript
import { NotificationService } from '@/modules/notification/notification.service';

@Injectable()
export class MyService {
  constructor(private readonly notificationService: NotificationService) {}

  async sendCustomNotification() {
    // Send SMS
    await this.notificationService.sendSMS(
      '0759123081',
      'Your custom message',
      'Custom Subject'
    );

    // Send Email
    await this.notificationService.sendEmail(
      'user@example.com',
      'Your custom email message',
      'Email Subject',
      'UCG'
    );

    // Send both SMS and Email
    const result = await this.notificationService.sendBoth(
      '0759123081',
      'user@example.com',
      'Your message',
      'Subject',
      'UCG'
    );

    console.log('SMS Result:', result.sms);
    console.log('Email Result:', result.email);
  }
}
```

### Example 2: Notification in Transaction

```typescript
async createTransaction() {
  try {
    // Business logic
    const transaction = await this.processTransaction();

    // Send notification (non-blocking)
    try {
      await this.notificationService.sendSMS(
        customer.phone,
        'Transaction successful',
        'Transaction Confirmation'
      );
    } catch (error) {
      this.logger.error(`Notification failed: ${error.message}`);
      // Transaction continues even if notification fails
    }

    return transaction;
  } catch (error) {
    throw error;
  }
}
```

## Best Practices

### 1. Non-Blocking Operations
Always wrap notification calls in try-catch blocks to prevent failures from affecting core business logic:

```typescript
try {
  await this.notificationService.sendNotification(...);
} catch (error) {
  this.logger.error(`Failed to send notification: ${error.message}`);
  // Continue with business logic
}
```

### 2. Logging
Use structured logging for notification events:

```typescript
this.logger.log(`Sending ${type} notification to ${recipient}`);
this.logger.error(`Notification failed: ${error.message}`, error.stack);
```

### 3. Template Usage
Use pre-built template methods instead of raw sendSMS/sendEmail when possible:

```typescript
// Good
await this.notificationService.notifyPaymentReceived(...);

// Avoid
await this.notificationService.sendSMS(...);
```

### 4. Async Operations
For bulk operations, consider queuing notifications:

```typescript
// Queue notifications for processing
for (const customer of customers) {
  this.queue.add('notification', {
    phone: customer.phone,
    message: 'Bulk notification'
  });
}
```

## Testing

### Unit Tests

```typescript
describe('NotificationService', () => {
  let service: NotificationService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://mock-url'),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should send SMS successfully', async () => {
    jest.spyOn(httpService, 'post').mockReturnValue(
      of({
        data: {
          statusCode: '6200',
          statusDescription: 'Success',
        },
      } as any)
    );

    const result = await service.sendSMS(
      '0759123081',
      'Test message',
      'Test'
    );

    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```bash
# Set test notification service URL
export NOTIFICATION_SERVICE_URL=http://test-notification-service

# Run integration tests
npm run test:e2e
```

## Monitoring

### Key Metrics

1. **Notification Success Rate**: Track successful vs failed notifications
2. **Response Times**: Monitor notification service response times
3. **Failure Reasons**: Log and categorize failure reasons
4. **Volume**: Track notification volume by type and time

### Alerting

Set up alerts for:
- Notification service unavailability
- High failure rates (> 5%)
- Slow response times (> 10 seconds)

## Troubleshooting

### Common Issues

#### 1. Notification Service URL Not Configured
```
Error: Notification service URL not configured
Solution: Add NOTIFICATION_SERVICE_URL to .env file
```

#### 2. Connection Timeout
```
Error: Connection timeout
Solution: Check network connectivity and service availability
```

#### 3. Invalid Response Code
```
Error: Unexpected status code: 6400
Solution: Check notification service logs for error details
```

## Future Enhancements

1. **Notification Queue**: Implement RabbitMQ queue for notifications
2. **Retry Mechanism**: Add exponential backoff retry for failed notifications
3. **Templates**: Store notification templates in database
4. **Delivery Reports**: Track SMS/Email delivery status
5. **Scheduled Notifications**: Support for scheduled/delayed notifications
6. **Multi-language**: Support for multiple languages
7. **Rich Content**: Support for HTML emails and MMS

## API Reference

### NotificationService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `sendSMS` | phone, message, subject | `Promise<NotificationResult>` | Send SMS notification |
| `sendEmail` | email, message, subject, sender | `Promise<NotificationResult>` | Send email notification |
| `sendBoth` | phone, email, message, subject, sender | `Promise<{sms, email}>` | Send both SMS and email |
| `notifyServiceProviderRegistration` | email, phone, businessName, spCode | `Promise<void>` | SP registration notification |
| `notifyServiceProviderApproval` | email, phone, businessName, apiKey | `Promise<void>` | SP approval notification |
| `notifyServiceProviderRejection` | email, phone, businessName, reason | `Promise<void>` | SP rejection notification |
| `notifyPaymentReceived` | email, phone, refNumber, amount, customer, business | `Promise<void>` | Payment received notification |
| `notifyCustomerPaymentSuccess` | phone, customer, refNumber, amount, business | `Promise<void>` | Customer payment confirmation |
| `notifyReferenceCreated` | email, phone, customer, refNumber, amount, desc, business | `Promise<void>` | Reference creation notification |
| `notifyBatchReferenceComplete` | email, phone, business, batchId, total, success, failure | `Promise<void>` | Batch completion notification |
| `notifyUserRegistration` | email, firstName, lastName | `Promise<void>` | User registration notification |
| `notifyUserActivation` | email, firstName, lastName | `Promise<void>` | User activation notification |
| `notifyPasswordChange` | email, firstName, lastName | `Promise<void>` | Password change notification |

## Support

For issues or questions regarding notification integration:
- Check logs: `tail -f server.log | grep Notification`
- Review notification service status
- Contact notification service provider

---

**Last Updated**: December 3, 2025
**Version**: 1.0.0
**Maintained By**: UCG Development Team
