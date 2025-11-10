# Swagger UI Access Guide

## Problem Fixed

**Issue**: Swagger decorators were present in the code but Swagger UI was not accessible.

**Root Cause**: The `swagger-ui-express` package was not installed.

**Solution**: Installed required dependencies and enhanced Swagger configuration.

---

## How to Access Swagger UI

### 1. Start the Development Server

```bash
npm run start:dev
```

Or for production:

```bash
npm run build
npm run start:prod
```

### 2. Access Swagger UI

Once the server is running, open your browser and navigate to:

```
http://localhost:3000/api/docs
```

You should see the interactive Swagger UI with all your API endpoints.

---

## What Was Fixed

### 1. Installed Missing Dependencies

```bash
npm install swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

### 2. Enhanced Swagger Configuration

Added to `src/main.ts`:

- ✅ Comprehensive API description
- ✅ Contact information
- ✅ License details
- ✅ Multiple server configurations (local & production)
- ✅ API tags for all modules
- ✅ Enhanced Swagger UI options:
  - Persistent authorization (JWT tokens stay after refresh)
  - Collapsed endpoints by default
  - Search/filter enabled
  - Request duration display
  - Syntax highlighting (Monokai theme)
  - Custom styling (hidden topbar, colored title)

---

## Swagger UI Features

### Available API Groups

1. **Service Providers** - Onboarding and management
   - Create, read, update, delete service providers
   - Approve/reject onboarding
   - Activate/deactivate providers
   - Get statistics

2. **Bank Accounts** - Manage SP bank accounts
   - Add, update, delete bank accounts
   - Set primary account
   - List all accounts

3. **References** - Payment reference generation
   - Generate references with payment options
   - Validate references
   - Bulk operations
   - Cancel references

4. **Payments Service** - Payment processing
   - Process payments (with payment option validation)
   - Get payment history
   - Get payment summary with installments

5. **Workflows** - Task and approval management
   - Start workflows
   - Complete tasks
   - Get my tasks
   - View workflow history

---

## Using the Swagger UI

### 1. Explore Endpoints

Click on any API group to expand and see all available endpoints.

### 2. Try It Out

1. Click on an endpoint
2. Click "Try it out" button
3. Fill in the required parameters
4. Click "Execute"
5. View the response

### 3. Authentication (When Implemented)

1. Click the "Authorize" button (🔒 icon at top right)
2. Enter your JWT token
3. Click "Authorize"
4. All subsequent requests will include the token

---

## Example: Testing Payment Options

### 1. Create a Service Provider

```
POST /api/v1/service-providers
```

**Request Body**:
```json
{
  "businessName": "Test School",
  "businessType": "SCHOOL",
  "email": "test@school.com",
  "phoneNumber": "+255712345678",
  "contact": {
    "fullName": "John Doe",
    "idType": "NATIONAL_ID",
    "idNumber": "123456789",
    "phoneNumber": "+255712345678",
    "email": "john@school.com"
  },
  "bankAccounts": [
    {
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456",
      "accountName": "Test School",
      "accountType": "SAVINGS"
    }
  ]
}
```

### 2. Create a Payment Reference with PARTIAL Option

```
POST /api/v1/references
```

**Request Body**:
```json
{
  "serviceProviderId": "<uuid-from-step-1>",
  "customerName": "Jane Doe",
  "customerPhone": "+255712345678",
  "amount": 500000,
  "description": "School fees",
  "paymentOption": "PARTIAL"
}
```

### 3. Make First Payment

```
POST /api/v1/payments
```

**Request Body**:
```json
{
  "referenceNumber": "<from-step-2>",
  "payerName": "Jane Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 200000,
  "paymentChannel": "M-Pesa"
}
```

✅ Success - First installment accepted

### 4. Try Invalid Payment

```
POST /api/v1/payments
```

**Request Body**:
```json
{
  "referenceNumber": "<same-reference>",
  "payerName": "Jane Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 100000,
  "paymentChannel": "M-Pesa"
}
```

❌ Error - "PARTIAL option requires final payment >= 300000"

### 5. Complete Payment

```
POST /api/v1/payments
```

**Request Body**:
```json
{
  "referenceNumber": "<same-reference>",
  "payerName": "Jane Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 300000,
  "paymentChannel": "M-Pesa"
}
```

✅ Success - Reference marked as USED (fully paid)

### 6. Get Payment Summary

```
GET /api/v1/payments/<reference-number>/summary
```

**Response**:
```json
{
  "referenceNumber": "SCH-0000001-ABC",
  "invoiceAmount": 500000,
  "totalPaid": 500000,
  "remainingAmount": 0,
  "installmentCount": 2,
  "paymentOption": "PARTIAL",
  "isFullyPaid": true,
  "status": "USED",
  "payments": [
    {
      "id": "payment-1",
      "amountPaid": 200000,
      "payerName": "Jane Doe",
      "paymentChannel": "M-Pesa",
      "paidAt": "2025-11-10T10:00:00Z",
      "status": "SUCCESS"
    },
    {
      "id": "payment-2",
      "amountPaid": 300000,
      "payerName": "Jane Doe",
      "paymentChannel": "M-Pesa",
      "paidAt": "2025-11-10T12:00:00Z",
      "status": "SUCCESS"
    }
  ]
}
```

---

## Swagger UI Configuration Options

The Swagger UI has been configured with these options:

```typescript
{
  swaggerOptions: {
    persistAuthorization: true,    // JWT token persists after page refresh
    docExpansion: 'none',          // All endpoints collapsed by default
    filter: true,                  // Enable search/filter box
    showRequestDuration: true,     // Show how long requests take
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',           // Dark syntax highlighting
    },
  },
  customSiteTitle: 'UCG API Documentation',
  customCss: `...`,               // Custom styling
}
```

---

## Troubleshooting

### Issue: Swagger UI not loading

**Check 1**: Is the server running?
```bash
ps aux | grep node
```

**Check 2**: Is the port accessible?
```bash
curl http://localhost:3000/api/docs
```

**Check 3**: Check console for errors
Look for errors in the terminal where you ran `npm run start:dev`

### Issue: Endpoints not showing

**Check 1**: Are controllers properly decorated?
All controllers should have:
```typescript
@ApiTags('Tag Name')
@Controller('path')
export class MyController { ... }
```

**Check 2**: Are operations documented?
All endpoints should have:
```typescript
@ApiOperation({ summary: 'Description' })
@ApiResponse({ status: 200, description: 'Success' })
@Get()
async myMethod() { ... }
```

### Issue: Request returns 404

**Check**: Global prefix
The API uses a global prefix `/api/v1`. Swagger automatically includes this, but if calling directly:
```
✅ http://localhost:3000/api/v1/service-providers
❌ http://localhost:3000/service-providers
```

---

## Customization

### Change Swagger UI Path

Edit `src/main.ts`:
```typescript
SwaggerModule.setup('docs', app, document); // http://localhost:3000/docs
```

### Add More API Tags

Edit `src/main.ts`:
```typescript
.addTag('My Module', 'Description of my module')
```

### Change Color Theme

Edit the `customCss` in `src/main.ts`:
```typescript
customCss: `
  .swagger-ui .info .title { color: #your-color }
  .swagger-ui .scheme-container { background: #your-bg }
`
```

---

## Export API Specification

### JSON Format

Visit:
```
http://localhost:3000/api/docs-json
```

### YAML Format

Visit:
```
http://localhost:3000/api/docs-yaml
```

You can import these into other tools like Postman, Insomnia, or API testing frameworks.

---

## Best Practices

1. ✅ **Always document new endpoints** with `@ApiOperation()` and `@ApiResponse()`
2. ✅ **Use DTOs** for request/response validation and documentation
3. ✅ **Add examples** to DTOs using `@ApiProperty({ example: ... })`
4. ✅ **Group related endpoints** using `@ApiTags()`
5. ✅ **Document error responses** with `@ApiResponse({ status: 400, ... })`
6. ✅ **Use proper HTTP status codes** (200, 201, 400, 404, etc.)
7. ✅ **Add descriptions to parameters** using `@ApiParam()` and `@ApiQuery()`

---

## Summary

✅ **Fixed**: Installed `swagger-ui-express` package
✅ **Enhanced**: Better Swagger configuration with themes and options
✅ **Access**: http://localhost:3000/api/docs
✅ **Features**: Interactive testing, authentication, syntax highlighting
✅ **Export**: JSON/YAML specs available for import

The Swagger UI is now fully functional and provides comprehensive API documentation with interactive testing capabilities.
