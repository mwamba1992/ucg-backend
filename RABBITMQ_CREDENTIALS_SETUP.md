# RabbitMQ Username & Password Setup Guide

## Complete Setup: RabbitMQ Server + Application

### Step 1: Start RabbitMQ with Username & Password

#### Option A: Docker (Recommended for Development)

```bash
# Start RabbitMQ with specific username and password
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management

# Verify it's running
docker ps | grep rabbitmq
```

**Created Credentials:**
- Username: `admin`
- Password: `admin123`
- Management UI: http://localhost:15672

#### Option B: Create User in Existing RabbitMQ

If RabbitMQ is already running:

```bash
# Access RabbitMQ container
docker exec -it rabbitmq bash

# Create user
rabbitmqctl add_user ucg_user MySecurePassword123

# Grant permissions
rabbitmqctl set_permissions -p / ucg_user ".*" ".*" ".*"

# Make administrator (optional)
rabbitmqctl set_user_tags ucg_user administrator

# Exit container
exit

# Verify user was created
docker exec rabbitmq rabbitmqctl list_users
```

**Output should show:**
```
Listing users ...
user         tags
admin        [administrator]
ucg_user     [administrator]
```

### Step 2: Configure Application to Use Credentials

#### Update `.env` File

**Location:** `/Users/mwendavano/mwanga/ucg-backend/.env`

```bash
# RabbitMQ Configuration
# Format: amqp://username:password@hostname:port

# If using Docker with default credentials (admin/admin123):
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Or if you created custom user (ucg_user/MySecurePassword123):
# RABBITMQ_URL=amqp://ucg_user:MySecurePassword123@localhost:5672
```

**Current Configuration (Already Set):**
```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### Step 3: Restart Application

```bash
# Stop current application (if running)
# Press Ctrl+C or:
lsof -ti:3000 | xargs kill

# Start application
npm run start:dev
```

### Step 4: Verify Connection

#### A. Check Application Logs

Look for these messages:

```
[ReferenceProducer] Reference producer connected to RabbitMQ ✅
[PaymentProducer] Payment producer connected to RabbitMQ ✅
```

#### B. Check RabbitMQ Management UI

1. Open http://localhost:15672
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Go to **Connections** tab
4. Should see connections from your application

#### C. Check Queues Were Created

In Management UI:
1. Go to **Queues** tab
2. Should see 5 queues:
   - ✅ ucg.reference.generation
   - ✅ ucg.reference.bulk
   - ✅ ucg.reference.validation
   - ✅ ucg.payment.processing
   - ✅ ucg.payment.notification

## URL Format Explained

### Basic Structure
```
amqp://username:password@hostname:port/virtualhost
```

### Components

| Part | Description | Example |
|------|-------------|---------|
| `amqp://` | Protocol | Always `amqp://` (or `amqps://` for SSL) |
| `username` | RabbitMQ user | `admin`, `ucg_user`, etc. |
| `password` | User password | `admin123`, `MySecurePass`, etc. |
| `hostname` | RabbitMQ host | `localhost`, `rabbitmq.example.com` |
| `port` | RabbitMQ port | `5672` (default) |
| `virtualhost` | Virtual host (optional) | `/`, `/production`, etc. |

### Examples

#### 1. Local Development (No Auth)
```bash
RABBITMQ_URL=amqp://localhost:5672
```

#### 2. Local Development (With Auth)
```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

#### 3. Production (Custom User)
```bash
RABBITMQ_URL=amqp://ucg_user:SecurePassword789@rabbitmq.internal:5672
```

#### 4. Production (With Virtual Host)
```bash
RABBITMQ_URL=amqp://ucg_user:SecurePassword789@rabbitmq.internal:5672/production
```

#### 5. Cloud RabbitMQ (SSL)
```bash
RABBITMQ_URL=amqps://user:pass@your-instance.cloudamqp.com/vhost
```

## Complete Example: From Scratch

### 1. Start RabbitMQ

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=myuser \
  -e RABBITMQ_DEFAULT_PASS=mypassword123 \
  rabbitmq:3-management
```

### 2. Update `.env`

```bash
RABBITMQ_URL=amqp://myuser:mypassword123@localhost:5672
```

### 3. Start Application

```bash
npm run start:dev
```

### 4. Test Connection

```bash
# Check logs
tail -f server.log | grep -i rabbitmq

# Should see:
# [ReferenceProducer] Reference producer connected to RabbitMQ
# [PaymentProducer] Payment producer connected to RabbitMQ
```

## Different Environment Configurations

### Development (`.env`)
```bash
# Use simple credentials for local development
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### Staging (`.env.staging`)
```bash
# Use staging-specific credentials
RABBITMQ_URL=amqp://staging_user:StagingPass456@rabbitmq-staging.internal:5672/staging
```

### Production (`.env.production`)
```bash
# Use strong, unique credentials for production
RABBITMQ_URL=amqp://prod_user:VerySecurePassword789@rabbitmq-prod.internal:5672/production
```

## Security Best Practices

### 1. Create Dedicated User (Don't Use Default)

```bash
# DON'T use default 'guest' user in production
# DON'T use 'admin' in production

# DO create a dedicated user:
rabbitmqctl add_user ucg_production_user VerySecurePassword789
rabbitmqctl set_permissions -p /production ucg_production_user ".*" ".*" ".*"
```

### 2. Use Strong Passwords

```bash
# BAD (weak password)
RABBITMQ_URL=amqp://admin:admin@localhost:5672

# BAD (common password)
RABBITMQ_URL=amqp://user:password123@localhost:5672

# GOOD (strong password)
RABBITMQ_URL=amqp://ucg_app:K9mP#xL2$vN8@wR4qT5y@rabbitmq.internal:5672
```

### 3. Never Commit Credentials

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.staging" >> .gitignore
echo ".env.production" >> .gitignore
```

### 4. Use Different Credentials per Environment

| Environment | Username | Password | Virtual Host |
|-------------|----------|----------|--------------|
| Development | `dev_user` | `dev_pass` | `/` |
| Staging | `staging_user` | `staging_pass` | `/staging` |
| Production | `prod_user` | Strong password | `/production` |

### 5. Rotate Passwords Regularly

```bash
# Change password
rabbitmqctl change_password ucg_user NewSecurePassword456

# Update .env file
RABBITMQ_URL=amqp://ucg_user:NewSecurePassword456@host:5672

# Restart application
npm run start:dev
```

## Troubleshooting

### Issue 1: Authentication Failed

```
Error: ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN
```

**Causes:**
- Wrong username or password
- User doesn't exist
- User doesn't have permissions

**Solutions:**

```bash
# Check if user exists
docker exec rabbitmq rabbitmqctl list_users

# Check user permissions
docker exec rabbitmq rabbitmqctl list_user_permissions ucg_user

# Reset password
docker exec rabbitmq rabbitmqctl change_password ucg_user NewPassword123

# Grant permissions
docker exec rabbitmq rabbitmqctl set_permissions -p / ucg_user ".*" ".*" ".*"

# Update .env with correct credentials
RABBITMQ_URL=amqp://ucg_user:NewPassword123@localhost:5672

# Restart application
```

### Issue 2: Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Solution:**
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# If not running, start it
docker start rabbitmq

# Or start new instance
docker run -d --name rabbitmq -p 5672:5672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin123 rabbitmq:3-management
```

### Issue 3: Can't Access Management UI

**Solution:**
```bash
# Check management plugin is enabled
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_management

# Restart RabbitMQ
docker restart rabbitmq

# Access UI
open http://localhost:15672
```

### Issue 4: Special Characters in Password

If your password has special characters (`@`, `#`, `:`, etc.), URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |

**Example:**
```bash
# Password: Pass@123#Word
# Encoded: Pass%40123%23Word

RABBITMQ_URL=amqp://user:Pass%40123%23Word@localhost:5672
```

## Quick Reference Commands

### User Management

```bash
# List all users
docker exec rabbitmq rabbitmqctl list_users

# Add user
docker exec rabbitmq rabbitmqctl add_user USERNAME PASSWORD

# Delete user
docker exec rabbitmq rabbitmqctl delete_user USERNAME

# Change password
docker exec rabbitmq rabbitmqctl change_password USERNAME NEW_PASSWORD

# Set permissions
docker exec rabbitmq rabbitmqctl set_permissions -p / USERNAME ".*" ".*" ".*"

# Set user tags (admin)
docker exec rabbitmq rabbitmqctl set_user_tags USERNAME administrator
```

### Connection Testing

```bash
# Test RabbitMQ API with credentials
curl -u admin:admin123 http://localhost:15672/api/overview

# Test connection with Python (if installed)
python3 << EOF
import pika
connection = pika.BlockingConnection(
    pika.URLParameters('amqp://admin:admin123@localhost:5672')
)
print("✅ Connection successful!")
connection.close()
EOF
```

## Summary

**To set up RabbitMQ with username and password:**

### Server Side (Create Credentials)
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management
```

### Application Side (Use Credentials)
```bash
# In .env file
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### Verify
```bash
# Start application
npm run start:dev

# Check logs for:
# ✅ [ReferenceProducer] Reference producer connected to RabbitMQ
# ✅ [PaymentProducer] Payment producer connected to RabbitMQ
```

---

**Current Configuration:**
- **RabbitMQ User:** `admin`
- **RabbitMQ Password:** `admin123`
- **Application Config:** `.env` file (line 24)
- **Connection URL:** `amqp://admin:admin123@localhost:5672`

**Ready to use!** Just start RabbitMQ and your application.
