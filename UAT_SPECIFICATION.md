# UCG - User Acceptance Testing (UAT) Specification

## 1. UAT OVERVIEW

### 1.1 Purpose
This document outlines the User Acceptance Testing requirements, test cases, and success criteria for the Unified Collection Gateway (UCG) system before production deployment.

### 1.2 UAT Environment

```yaml
Environment: UAT
URL: https://uat.ucg.mhb.co.tz
API URL: https://api-uat.ucg.mhb.co.tz
Admin Portal: https://admin-uat.ucg.mhb.co.tz

Database: Separate UAT database with test data
MNO Integration: Sandbox/Test environments
Duration: 4 weeks
Participants: MHB staff, Selected service providers, QA team
```

## 2. UAT PARTICIPANTS

### 2.1 UAT Team Structure

| Role | Responsibility | Count |
|------|----------------|-------|
| **UAT Lead** | Overall coordination, sign-off | 1 |
| **Business Analysts** | Test case validation, requirement verification | 2 |
| **Service Provider Representatives** | End-user testing (schools, hospitals, etc.) | 5-10 |
| **MHB Staff** | Admin testing, operational procedures | 3-5 |
| **QA Engineers** | Technical testing, defect logging | 2 |
| **Technical Support** | Issue resolution during UAT | 2 |

### 2.2 Onboarding Requirements

```yaml
Before UAT Starts:
  - [ ] UAT environment setup complete
  - [ ] Test data loaded
  - [ ] User accounts created
  - [ ] Training sessions conducted (2 sessions)
  - [ ] UAT guide distributed
  - [ ] Defect tracking tool configured

Training Topics:
  1. System overview (30 minutes)
  2. Service provider onboarding (45 minutes)
  3. Payment reference generation (30 minutes)
  4. Transaction monitoring (45 minutes)
  5. Reporting and analytics (30 minutes)
  6. Defect logging procedures (15 minutes)
```

## 3. TEST DATA REQUIREMENTS

### 3.1 Service Providers (Pre-loaded)

```yaml
Total Test SPs: 20

By Type:
  - Schools: 8
  - Hospitals: 4
  - Churches: 3
  - SACCOs: 2
  - Utilities: 2
  - NGOs: 1

By Status:
  - Pending: 5
  - Approved: 12
  - Rejected: 2
  - Suspended: 1
```

### 3.2 Payment References (Pre-loaded)

```yaml
Total References: 500

By Status:
  - Active: 300
  - Used: 150
  - Expired: 30
  - Cancelled: 20

Amount Range:
  - Minimum: TZS 1,000
  - Maximum: TZS 5,000,000
  - Average: TZS 50,000
```

### 3.3 Test Users

```yaml
Admin Users:
  - super_admin@mhb.co.tz (Super Admin)
  - admin1@mhb.co.tz (Admin)
  - admin2@mhb.co.tz (Admin)

Service Provider Users:
  - sp_admin_school1@test.com (School Admin)
  - sp_user_school1@test.com (School User)
  - sp_admin_hospital1@test.com (Hospital Admin)
  - sp_user_hospital1@test.com (Hospital User)

Test Credentials:
  - Password: Test@1234 (must be changed on first login)
```

## 4. UAT TEST SCENARIOS

### 4.1 MODULE 1: Service Provider Onboarding

#### TC-SPO-001: Register New Service Provider
**Priority**: Critical
**User Role**: MHB Admin

**Pre-conditions**:
- Admin logged in
- Has complete SP information

**Test Steps**:
1. Navigate to Service Provider registration
2. Enter business details:
   - Business Name: "Kilimanjaro Primary School"
   - Business Type: SCHOOL
   - Email: kilimanjaro@test.co.tz
   - Phone: +255712000001
3. Enter contact person details
4. Add bank account details
5. Configure settlement settings
6. Submit registration

**Expected Results**:
- ✅ SP created successfully
- ✅ Unique SP code generated (e.g., KIL)
- ✅ Status set to PENDING
- ✅ Email notification sent to SP
- ✅ Displayed in pending approvals list

**Success Criteria**:
- SP record created in database
- All mandatory fields validated
- Unique constraints enforced (email, SP code)

---

#### TC-SPO-002: Approve Service Provider
**Priority**: Critical
**User Role**: MHB Admin

**Test Steps**:
1. Navigate to pending SPs
2. Select test SP
3. Review details
4. Click "Approve"
5. Confirm approval

**Expected Results**:
- ✅ Status changed to APPROVED
- ✅ API key generated
- ✅ Approval email sent to SP
- ✅ SP can now login
- ✅ SP can create payment references

---

#### TC-SPO-003: Reject Service Provider
**Priority**: High
**User Role**: MHB Admin

**Test Steps**:
1. Select pending SP
2. Click "Reject"
3. Enter rejection reason
4. Confirm rejection

**Expected Results**:
- ✅ Status changed to REJECTED
- ✅ Rejection reason saved
- ✅ Notification sent to SP
- ✅ SP cannot login
- ✅ Can reapply with corrections

---

#### TC-SPO-004: Update Service Provider Details
**Priority**: Medium
**User Role**: SP Admin

**Test Steps**:
1. SP logs in
2. Navigate to profile
3. Update phone number
4. Update bank account
5. Save changes

**Expected Results**:
- ✅ Changes saved successfully
- ✅ Audit log created
- ✅ Email validation if email changed
- ✅ Cannot change critical fields (SP code, business name)

---

#### TC-SPO-005: Add Multiple Bank Accounts
**Priority**: High
**User Role**: SP Admin

**Test Steps**:
1. Navigate to bank accounts
2. Add second bank account
3. Set one as primary
4. Save changes

**Expected Results**:
- ✅ Multiple accounts saved
- ✅ Only one primary account allowed
- ✅ Can activate/deactivate accounts
- ✅ Settlements use primary account

---

### 4.2 MODULE 2: Payment Reference Management

#### TC-REF-001: Generate Single Payment Reference
**Priority**: Critical
**User Role**: SP User

**Test Steps**:
1. SP logs in
2. Navigate to "Generate Reference"
3. Enter customer details:
   - Name: John Doe
   - Phone: +255712345678
   - Amount: TZS 50,000
   - Description: School fees Term 1
4. Set expiry date (30 days)
5. Submit

**Expected Results**:
- ✅ Reference generated (format: XXX-YYYYYYY-ZZZ)
- ✅ Reference number displayed and copyable
- ✅ SMS sent to customer with reference
- ✅ Status set to ACTIVE
- ✅ Appears in reference list

**Test Data**:
```json
{
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "description": "School fees Term 1",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

---

#### TC-REF-002: Bulk Upload Payment References
**Priority**: High
**User Role**: SP Admin

**Test Steps**:
1. Download CSV template
2. Fill with 100 student records
3. Upload CSV file
4. Review validation results
5. Confirm import

**Expected Results**:
- ✅ CSV parsed correctly
- ✅ Validation errors shown clearly
- ✅ Valid records imported
- ✅ Invalid records listed with reasons
- ✅ Summary displayed (success/failure count)

**Test CSV Format**:
```csv
customerName,customerPhone,amount,description,metadata
John Doe,+255712345678,50000,School fees,{"studentId":"STD001"}
Jane Smith,+255723456789,45000,School fees,{"studentId":"STD002"}
```

---

#### TC-REF-003: Validate Payment Reference
**Priority**: Critical
**User Role**: Customer/System

**Test Steps**:
1. Use validate endpoint
2. Enter reference number: MWA-0001234-A7B
3. Submit validation

**Expected Results**:
```json
{
  "isValid": true,
  "referenceNumber": "MWA-0001234-A7B",
  "reference": {
    "customerName": "John Doe",
    "amount": 50000,
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

**Edge Cases to Test**:
- ✅ Invalid format → isValid: false
- ✅ Expired reference → isValid: false, reason: "Expired"
- ✅ Already used → isValid: false, reason: "Already used"
- ✅ Cancelled → isValid: false, reason: "Cancelled"
- ✅ Wrong checksum → isValid: false, reason: "Invalid format"

---

#### TC-REF-004: Cancel Payment Reference
**Priority**: Medium
**User Role**: SP Admin

**Test Steps**:
1. Find active reference
2. Click "Cancel"
3. Confirm cancellation

**Expected Results**:
- ✅ Status changed to CANCELLED
- ✅ Cannot be used for payment
- ✅ Can generate new reference for same customer
- ✅ Audit log created

---

#### TC-REF-005: Reference Expiry Handling
**Priority**: High
**User Role**: System (Automated)

**Test Steps**:
1. Create reference with expiry in past
2. Try to validate
3. Run auto-expiry cron job

**Expected Results**:
- ✅ Validation returns "expired"
- ✅ Status auto-updated to EXPIRED
- ✅ Cannot be used for payment
- ✅ Statistics updated correctly

---

### 4.3 MODULE 3: Transaction Processing (Future)

#### TC-TXN-001: Initiate Payment (Placeholder)
**Priority**: Critical
**Status**: To be tested after Transaction module implementation

```yaml
Test Flow:
  1. Customer initiates payment
  2. Validates reference
  3. Routes to appropriate MNO
  4. Receives callback
  5. Updates transaction status
  6. Sends confirmation
```

---

### 4.4 MODULE 4: Reporting & Analytics

#### TC-RPT-001: View Dashboard Statistics
**Priority**: High
**User Role**: MHB Admin

**Test Steps**:
1. Login as admin
2. View dashboard

**Expected Results**:
- ✅ Total service providers count
- ✅ Pending approvals count
- ✅ Active references count
- ✅ Used references count
- ✅ Charts displaying trends
- ✅ Real-time data updates

---

#### TC-RPT-002: Generate Service Provider Report
**Priority**: Medium
**User Role**: MHB Admin

**Test Steps**:
1. Navigate to Reports
2. Select date range
3. Filter by SP type
4. Generate report

**Expected Results**:
- ✅ Report generated in < 10 seconds
- ✅ Contains all filtered data
- ✅ Can export to CSV/PDF
- ✅ Shows correct totals and subtotals

---

#### TC-RPT-003: SP View Own Statistics
**Priority**: Medium
**User Role**: SP Admin

**Test Steps**:
1. SP logs in
2. View dashboard

**Expected Results**:
- ✅ Total references created
- ✅ Active/Used/Expired counts
- ✅ Total collections
- ✅ Pending settlements
- ✅ Cannot see other SPs' data

---

### 4.5 MODULE 5: System Integration

#### TC-INT-001: MNO Callback Handling (Simulation)
**Priority**: Critical
**User Role**: System

**Test Steps**:
1. Simulate MNO callback
2. POST to /mno/vodacom/callback
3. Verify transaction update

**Expected Results**:
- ✅ Callback received and parsed
- ✅ Transaction status updated
- ✅ Reference marked as USED
- ✅ SP notified
- ✅ Customer confirmation sent

**Test Callback**:
```json
{
  "externalTransactionId": "VODACOM123456",
  "referenceNumber": "MWA-0001234-A7B",
  "amount": 50000,
  "status": "SUCCESS",
  "customerPhone": "+255712345678",
  "timestamp": "2025-11-06T10:00:00Z"
}
```

---

## 5. NON-FUNCTIONAL TESTING

### 5.1 Performance Testing

#### TC-PERF-001: Concurrent User Load
**Objective**: Verify system handles 1000 concurrent users

**Test Setup**:
- Tool: Apache JMeter / k6
- Scenario: 1000 users accessing system simultaneously
- Duration: 30 minutes

**Success Criteria**:
- ✅ Response time < 3 seconds (95th percentile)
- ✅ Error rate < 1%
- ✅ No system crashes
- ✅ Database connections stable

---

#### TC-PERF-002: Transaction Throughput
**Objective**: Process 200 transactions per second

**Test Setup**:
- Simulate 200 TPS for 10 minutes
- Mix of: validation (40%), creation (40%), updates (20%)

**Success Criteria**:
- ✅ All transactions processed
- ✅ Average response time < 2 seconds
- ✅ No transaction failures
- ✅ Database write performance acceptable

---

### 5.2 Security Testing

#### TC-SEC-001: Authentication & Authorization
**Test Steps**:
1. Attempt login with invalid credentials
2. Attempt to access admin endpoints as SP user
3. Try SQL injection in search fields
4. Test XSS in text inputs
5. Verify JWT token expiration

**Success Criteria**:
- ✅ Invalid logins rejected
- ✅ Unauthorized access blocked
- ✅ SQL injection prevented
- ✅ XSS attacks blocked
- ✅ Expired tokens rejected

---

#### TC-SEC-002: Data Encryption
**Test Steps**:
1. Inspect database for sensitive data
2. Check API responses for encrypted fields
3. Verify SSL/TLS in use

**Success Criteria**:
- ✅ Passwords hashed (bcrypt)
- ✅ Bank account numbers encrypted
- ✅ API keys encrypted
- ✅ All traffic over HTTPS

---

### 5.3 Usability Testing

#### TC-USA-001: User Interface Navigation
**User Role**: SP User (non-technical)

**Test Steps**:
1. First-time user completes key tasks without training:
   - Create payment reference
   - View reference list
   - Check statistics
2. Time each task
3. Note confusion points

**Success Criteria**:
- ✅ Tasks completed < 5 minutes each
- ✅ No critical errors encountered
- ✅ UI intuitive and clear
- ✅ Error messages helpful

---

### 5.4 Compatibility Testing

#### TC-COMP-001: Browser Compatibility
**Browsers to Test**:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

**Success Criteria**:
- All functions work correctly
- UI renders properly
- No JavaScript errors

---

#### TC-COMP-002: Device Compatibility
**Devices to Test**:
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (iPad)
- ✅ Mobile (iOS and Android)

**Success Criteria**:
- Responsive design works
- All features accessible
- Touch interactions work on mobile

---

## 6. DEFECT MANAGEMENT

### 6.1 Defect Severity Levels

| Severity | Description | Example | Response Time |
|----------|-------------|---------|---------------|
| **Critical** | System unusable, data loss | Cannot login, database down | 1 hour |
| **High** | Major feature broken | Cannot create references | 4 hours |
| **Medium** | Feature partially works | Slow response time | 1 day |
| **Low** | Minor UI issue | Typo, alignment issue | 3 days |

### 6.2 Defect Logging Format

```yaml
Defect ID: BUG-UAT-001
Title: Cannot approve service provider
Severity: High
Priority: High

Description:
  When clicking "Approve" button for pending SP,
  error message "Internal Server Error" appears.

Steps to Reproduce:
  1. Login as admin
  2. Navigate to Pending SPs
  3. Select "Kilimanjaro School"
  4. Click "Approve"
  5. Error appears

Expected Result:
  SP status changes to APPROVED

Actual Result:
  Error message displayed

Environment:
  - URL: https://uat.ucg.mhb.co.tz
  - Browser: Chrome 119
  - User: admin1@mhb.co.tz
  - Date/Time: 2025-11-06 10:30 EAT

Attachments:
  - screenshot.png
  - browser_console.log
```

### 6.3 Defect Workflow

```
NEW → ASSIGNED → IN_PROGRESS → FIXED → READY_FOR_RETEST → CLOSED
                                    ↓
                                REOPENED (if failed retest)
```

## 7. UAT EXIT CRITERIA

### 7.1 Mandatory Criteria (Must Pass)

- [ ] All Critical test cases passed (100%)
- [ ] All High priority test cases passed (100%)
- [ ] No open Critical or High defects
- [ ] All Medium defects triaged (fix or defer)
- [ ] Performance benchmarks met
- [ ] Security vulnerabilities addressed
- [ ] User training completed
- [ ] Documentation finalized
- [ ] UAT sign-off obtained from stakeholders

### 7.2 Success Metrics

```yaml
Test Execution:
  - Test cases executed: 100%
  - Test cases passed: ≥ 95%
  - Critical scenarios: 100% pass

Defects:
  - Critical defects: 0 open
  - High defects: 0 open
  - Medium defects: ≤ 5 open (deferred to post-launch)
  - Low defects: Triaged

Performance:
  - Response time: ✅ < 2 seconds (95%)
  - Uptime during UAT: ✅ > 99%
  - Throughput: ✅ > 200 TPS

User Acceptance:
  - Stakeholder approval: ✅ Obtained
  - User satisfaction: ✅ > 80% positive
```

## 8. UAT SCHEDULE

### 8.1 4-Week UAT Timeline

```yaml
Week 1: Setup & Training (Nov 11-15, 2025)
  Mon-Tue: Environment setup, test data loading
  Wed: UAT kickoff meeting
  Thu-Fri: User training sessions

Week 2: Core Testing (Nov 18-22, 2025)
  - Service Provider Onboarding (TC-SPO-*)
  - Payment Reference Management (TC-REF-*)
  - Defect logging and fixing

Week 3: Integration & Performance (Nov 25-29, 2025)
  - Integration testing (TC-INT-*)
  - Performance testing (TC-PERF-*)
  - Security testing (TC-SEC-*)
  - Regression testing

Week 4: Final Validation (Dec 2-6, 2025)
  - Retest fixed defects
  - User acceptance validation
  - Sign-off meetings
  - Go-live preparation

Go-Live: December 9, 2025 (Tentative)
```

### 8.2 Daily UAT Activities

```yaml
Morning (9:00 AM - 12:00 PM):
  - Execute test cases
  - Log defects
  - Retest fixes

Afternoon (2:00 PM - 5:00 PM):
  - Continue testing
  - Dev team bug fixes
  - Daily standup (4:00 PM)

End of Day:
  - Test execution report
  - Defect summary
  - Next day planning
```

## 9. UAT DELIVERABLES

### 9.1 Required Documents

- [ ] UAT Test Plan (this document)
- [ ] Test Case Repository (Excel/Jira)
- [ ] Defect Log (Jira)
- [ ] Daily Test Execution Reports
- [ ] Weekly Status Reports
- [ ] Performance Test Results
- [ ] Security Test Results
- [ ] User Feedback Summary
- [ ] UAT Sign-off Document
- [ ] Lessons Learned Report

### 9.2 UAT Sign-off Template

```
UAT SIGN-OFF CERTIFICATE

Project: Unified Collection Gateway (UCG)
UAT Period: November 11 - December 6, 2025

I hereby confirm that User Acceptance Testing has been completed
and the system meets the business requirements and is ready for
production deployment.

Test Summary:
  Total Test Cases: XXX
  Passed: XXX (XX%)
  Failed: XXX (XX%)
  Blocked: XXX

Defect Summary:
  Critical: 0 open
  High: 0 open
  Medium: X open (deferred)
  Low: X open (deferred)

Approved By:

__________________________    Date: __________
UAT Lead

__________________________    Date: __________
Business Owner (MHB)

__________________________    Date: __________
Project Manager

__________________________    Date: __________
CTO
```

## 10. SUPPORT DURING UAT

### 10.1 Support Team

```yaml
Help Desk:
  Email: uat-support@ucg.mhb.co.tz
  Phone: +255 XXX XXX XXX
  Hours: 8:00 AM - 6:00 PM EAT

Technical Support:
  - Backend Developer: dev1@company.com
  - Frontend Developer: dev2@company.com
  - DevOps Engineer: devops@company.com

Business Support:
  - Business Analyst: ba@company.com
  - Product Owner: po@company.com
```

### 10.2 Issue Resolution Process

```
1. User logs defect in tracker
2. Triage within 1 hour
3. Dev team fixes based on severity
4. Fix deployed to UAT
5. User retests
6. Close or reopen
```

## 11. RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Limited user availability | High | Medium | Schedule flexible test slots |
| Environment instability | High | Low | Have backup environment ready |
| Insufficient test data | Medium | Low | Pre-load comprehensive data |
| Integration sandbox unavailable | High | Medium | Use mock responses temporarily |
| Delay in bug fixes | Medium | Medium | Prioritize critical fixes |

---

**Document Version**: 1.0
**Prepared By**: QA Team
**Approved By**: Project Manager
**Date**: November 6, 2025
**Status**: READY FOR UAT
