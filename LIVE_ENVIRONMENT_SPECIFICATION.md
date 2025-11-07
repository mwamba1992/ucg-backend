# UCG - Live Environment Specification

## 1. PRODUCTION ENVIRONMENT OVERVIEW

### 1.1 Infrastructure Requirements

#### Server Specifications
| Component | Specification | Quantity |
|-----------|--------------|----------|
| **Application Servers** | 4 vCPU, 8GB RAM, 100GB SSD | 3 nodes (load balanced) |
| **Database Server** | 8 vCPU, 16GB RAM, 500GB SSD | 1 primary + 2 replicas |
| **Cache Server** | 2 vCPU, 4GB RAM, 50GB SSD | 3 nodes (Redis cluster) |
| **Load Balancer** | 2 vCPU, 4GB RAM | 2 nodes (HA) |
| **Backup Server** | 4 vCPU, 8GB RAM, 2TB HDD | 1 node |

#### Network Requirements
- **Bandwidth**: Minimum 100 Mbps (recommended 1 Gbps)
- **VPN**: Site-to-site VPN with MHB internal network
- **Firewall**: WAF (Web Application Firewall) enabled
- **SSL/TLS**: TLS 1.3 certificates from recognized CA
- **IP Whitelisting**: For MNO callbacks and bank integrations

### 1.2 Software Stack

```yaml
Operating System: Ubuntu Server 22.04 LTS
Runtime: Node.js v18.x LTS
Database: PostgreSQL 14.x
Cache: Redis 7.x
Container Runtime: Docker 24.x
Orchestration: Kubernetes 1.28.x
Web Server: Nginx 1.24.x
Monitoring: Prometheus + Grafana
Logging: ELK Stack (Elasticsearch, Logstash, Kibana)
```

### 1.3 High Availability Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (HAProxy/Nginx)            │
│                      Active-Standby (2 nodes)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐   ┌────▼────┐   ┌───▼─────┐
    │ App 1   │   │ App 2   │   │ App 3   │
    │ Node.js │   │ Node.js │   │ Node.js │
    └────┬────┘   └────┬────┘   └───┬─────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   PostgreSQL Cluster      │
         │ Primary + 2 Read Replicas │
         └───────────────────────────┘
```

## 2. DEPLOYMENT ARCHITECTURE

### 2.1 Production Deployment

```yaml
Environment: Production
URL: https://ucg.mhb.co.tz
API URL: https://api.ucg.mhb.co.tz
Admin Portal: https://admin.ucg.mhb.co.tz

Deployment Strategy: Blue-Green Deployment
Rollback Time: < 5 minutes
Downtime: Zero downtime deployments
```

### 2.2 Environment Variables (Production)

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database (Production)
DB_HOST=ucg-db-primary.internal.mhb.co.tz
DB_PORT=5432
DB_USERNAME=ucg_app_user
DB_PASSWORD=<SECURE_PASSWORD_FROM_VAULT>
DB_DATABASE=ucg_production
DB_SSL=true
DB_POOL_MIN=10
DB_POOL_MAX=50

# Redis Cache
REDIS_HOST=ucg-redis.internal.mhb.co.tz
REDIS_PORT=6379
REDIS_PASSWORD=<SECURE_PASSWORD_FROM_VAULT>
REDIS_TLS=true

# Security
JWT_SECRET=<SECURE_SECRET_FROM_VAULT>
JWT_EXPIRATION=1h
ENCRYPTION_KEY=<SECURE_KEY_FROM_VAULT>

# MNO Integration
VODACOM_API_URL=https://api.vodacom.co.tz/mpesa
VODACOM_API_KEY=<FROM_VAULT>
VODACOM_API_SECRET=<FROM_VAULT>

AIRTEL_API_URL=https://api.airtel.co.tz/money
AIRTEL_API_KEY=<FROM_VAULT>
AIRTEL_API_SECRET=<FROM_VAULT>

TIGO_API_URL=https://api.tigo.co.tz/pesa
TIGO_API_KEY=<FROM_VAULT>

# Bank Integration
TIPS_API_URL=https://tips.bot.go.tz/api
TIPS_CERTIFICATE_PATH=/secure/certs/tips-client.crt
TIPS_PRIVATE_KEY_PATH=/secure/certs/tips-client.key

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# Notifications
SMS_PROVIDER=VODACOM
SMS_API_KEY=<FROM_VAULT>
EMAIL_PROVIDER=SMTP
EMAIL_HOST=smtp.mhb.co.tz
EMAIL_PORT=587
```

## 3. PERFORMANCE REQUIREMENTS

### 3.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Monthly |
| **Response Time** | < 2 seconds (95th percentile) | Per request |
| **Throughput** | 200+ TPS | Peak hours |
| **Concurrent Users** | 500,000+ | Simultaneous |
| **Database Query Time** | < 100ms (95th percentile) | Per query |
| **API Error Rate** | < 0.5% | Hourly |

### 3.2 Load Distribution

```
Expected Daily Transactions: 50,000 - 100,000
Peak Hours: 8 AM - 10 AM, 4 PM - 6 PM
Peak TPS: 200-300 transactions/second
Average TPS: 50-80 transactions/second

Payment Channels Distribution:
- Vodacom M-Pesa: 40%
- Airtel Money: 25%
- Tigo Pesa: 20%
- Halotel Pesa: 10%
- TTCL M-Pesa: 5%
```

## 4. SECURITY SPECIFICATIONS

### 4.1 Network Security

```yaml
Firewall Rules:
  Ingress:
    - Port 443 (HTTPS): Public access
    - Port 80 (HTTP): Redirect to 443
    - Port 22 (SSH): Whitelisted IPs only
    - VPN: MHB internal network only

  Egress:
    - MNO APIs: Whitelisted destinations
    - Bank TIPS: Dedicated VPN tunnel
    - Internet: Via proxy for updates only

WAF Rules:
  - SQL Injection protection
  - XSS protection
  - Rate limiting: 100 req/min per IP
  - DDoS protection
  - Bot detection
```

### 4.2 Data Security

```yaml
Encryption:
  At Rest:
    - Database: AES-256
    - Backups: AES-256
    - File Storage: AES-256

  In Transit:
    - TLS 1.3 minimum
    - Certificate: SHA-256 with RSA
    - Perfect Forward Secrecy enabled

Sensitive Data:
  - API Keys: Stored in HashiCorp Vault
  - Passwords: Bcrypt (12 rounds)
  - Bank Accounts: Encrypted in database
  - PII: Encrypted at column level
```

### 4.3 Access Control

```yaml
Authentication:
  - JWT tokens with 1-hour expiry
  - Refresh tokens with 7-day expiry
  - Multi-factor authentication for admins
  - Session tracking and monitoring

Authorization:
  - Role-Based Access Control (RBAC)
  - Roles: SUPER_ADMIN, ADMIN, SP_ADMIN, SP_USER
  - Permission-based resource access
  - Audit logging for all actions
```

## 5. BACKUP & DISASTER RECOVERY

### 5.1 Backup Strategy

```yaml
Database Backups:
  Full Backup:
    - Frequency: Daily at 2:00 AM EAT
    - Retention: 30 days
    - Location: Off-site storage

  Incremental Backup:
    - Frequency: Every 6 hours
    - Retention: 7 days

  Transaction Logs:
    - Frequency: Continuous (WAL archiving)
    - Retention: 7 days
    - Point-in-time recovery enabled

Application Backups:
  - Configuration files: Daily
  - Application code: Version controlled (Git)
  - Uploaded files: Daily sync to S3/MinIO
```

### 5.2 Disaster Recovery

```yaml
RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 1 hour

DR Site:
  Location: Secondary data center
  Sync: Real-time database replication
  Failover: Automatic for database, manual for apps
  Testing: Quarterly DR drills

Recovery Procedures:
  - Database restoration: 30 minutes
  - Application deployment: 30 minutes
  - Integration testing: 1 hour
  - Full system verification: 2 hours
```

## 6. MONITORING & ALERTING

### 6.1 Monitoring Dashboards

```yaml
Infrastructure Monitoring (Prometheus + Grafana):
  - CPU, Memory, Disk usage
  - Network traffic
  - Container health
  - Database connections
  - Cache hit rates

Application Monitoring (APM):
  - Request/response times
  - Error rates
  - Transaction throughput
  - API endpoint performance
  - Database query performance

Business Metrics:
  - Transactions per minute
  - Success/failure rates per MNO
  - Revenue tracking
  - Service provider statistics
```

### 6.2 Alert Configuration

```yaml
Critical Alerts (SMS + Email + PagerDuty):
  - System down (> 1 minute)
  - Database unreachable
  - Error rate > 5%
  - Response time > 5 seconds
  - Disk usage > 90%

Warning Alerts (Email + Slack):
  - CPU usage > 80% for 5 minutes
  - Memory usage > 80%
  - Error rate > 1%
  - Response time > 3 seconds
  - Failed transactions > 10/minute

Info Alerts (Slack):
  - Daily transaction summary
  - Backup completion status
  - Security scan results
```

## 7. MAINTENANCE WINDOWS

```yaml
Scheduled Maintenance:
  Day: Sunday
  Time: 2:00 AM - 6:00 AM EAT
  Frequency: Monthly (first Sunday)
  Duration: Max 4 hours
  Notification: 7 days advance notice

Emergency Maintenance:
  Authorization: CTO approval required
  Notification: 2 hours advance (if possible)
  Rollback plan: Mandatory
```

## 8. COMPLIANCE & REGULATIONS

### 8.1 Regulatory Compliance

```yaml
Bank of Tanzania (BoT):
  - Payment system licensing
  - Transaction reporting
  - Data retention: 7 years minimum
  - Audit trail: All transactions

Data Protection:
  - GDPR-like compliance for data privacy
  - User consent management
  - Right to erasure (with retention rules)
  - Data breach notification < 72 hours

Financial Regulations:
  - AML (Anti-Money Laundering) monitoring
  - KYC (Know Your Customer) verification
  - Transaction limits enforcement
  - Suspicious activity reporting
```

### 8.2 Audit Requirements

```yaml
Audit Logs:
  Retention: 7 years
  Contents:
    - User authentication/authorization
    - All data modifications
    - API access logs
    - System configuration changes

  Access:
    - Read-only for auditors
    - Tamper-proof storage
    - Encrypted backups

External Audits:
  Frequency: Annual
  Scope: Security, compliance, financials
  Standards: ISO 27001, PCI-DSS equivalent
```

## 9. SERVICE LEVEL AGREEMENTS (SLA)

### 9.1 Availability SLA

```yaml
Uptime Guarantee: 99.9%
Downtime Allowance: 43.8 minutes/month

Penalties:
  - 99.9% - 99.0%: 10% monthly fee credit
  - 99.0% - 98.0%: 25% monthly fee credit
  - < 98.0%: 50% monthly fee credit

Exclusions:
  - Scheduled maintenance windows
  - Third-party failures (MNO, TIPS)
  - Force majeure events
```

### 9.2 Performance SLA

```yaml
Response Time:
  - 95th percentile: < 2 seconds
  - 99th percentile: < 3 seconds
  - If exceeded: 5% credit per hour

Transaction Processing:
  - Success rate: > 98%
  - Processing time: < 30 seconds
  - Settlement time: Per agreed schedule

Support Response:
  - Critical: 15 minutes
  - High: 1 hour
  - Medium: 4 hours
  - Low: 24 hours
```

## 10. SCALING STRATEGY

### 10.1 Horizontal Scaling

```yaml
Auto-scaling Rules:
  Trigger: CPU > 70% for 5 minutes
  Scale Out: Add 1 node (max 10 nodes)
  Scale In: Remove 1 node (min 3 nodes)
  Cool-down: 5 minutes

Database Scaling:
  Read Replicas: Add based on read load
  Write Scaling: Vertical scaling + connection pooling
  Sharding: Future consideration for > 1M users
```

### 10.2 Capacity Planning

```yaml
Current Capacity: 200 TPS
Target Capacity: 500 TPS (Year 2)

Growth Projections:
  - Year 1: 500K active users
  - Year 2: 2M active users
  - Year 3: 5M active users

Infrastructure Scaling:
  - Q1 2026: Add 2 app servers
  - Q3 2026: Upgrade database (16 vCPU, 32GB RAM)
  - Q1 2027: Implement caching layer enhancements
```

## 11. DEPLOYMENT CHECKLIST

### 11.1 Pre-Deployment

- [ ] Code review completed
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security scan completed (no critical issues)
- [ ] Performance testing completed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholder notification sent
- [ ] Change approval obtained

### 11.2 Deployment Steps

1. Create backup of current production
2. Deploy to blue environment
3. Run smoke tests on blue
4. Switch load balancer to blue
5. Monitor for 30 minutes
6. Verify transactions processing
7. Mark green environment as rollback
8. Document deployment

### 11.3 Post-Deployment

- [ ] Verify all endpoints responding
- [ ] Check error rates in monitoring
- [ ] Verify MNO integrations working
- [ ] Test critical user journeys
- [ ] Monitor for 24 hours
- [ ] Send completion notification
- [ ] Update documentation

## 12. CONTACT INFORMATION

### 12.1 Emergency Contacts

```yaml
Production Issues:
  - On-Call Engineer: +255 XXX XXX XXX
  - DevOps Lead: +255 XXX XXX XXX
  - CTO: +255 XXX XXX XXX

Business Contacts:
  - Product Owner: +255 XXX XXX XXX
  - Project Manager: +255 XXX XXX XXX

Third-Party Support:
  - Hosting Provider: support@provider.com
  - Database Support: +255 XXX XXX XXX
```

### 12.2 Escalation Matrix

```
Level 1: On-Call Engineer (0-30 minutes)
Level 2: DevOps Lead (30-60 minutes)
Level 3: CTO (60+ minutes)
Level 4: CEO (Critical outage > 2 hours)
```

---

## 13. APPENDIX

### 13.1 Technology Versions

```
Node.js: 18.19.0 LTS
TypeScript: 5.3.3
NestJS: 10.3.0
PostgreSQL: 14.10
Redis: 7.2.3
Docker: 24.0.7
Kubernetes: 1.28.4
```

### 13.2 Dependencies Licenses

All production dependencies use permissive licenses:
- MIT, Apache 2.0, BSD

No GPL-licensed dependencies in production.

---

**Document Version**: 1.0
**Last Updated**: November 6, 2025
**Next Review**: December 6, 2025
**Classification**: CONFIDENTIAL

**Approved By**:
- [ ] CTO
- [ ] DevOps Lead
- [ ] Security Officer
- [ ] Compliance Officer
