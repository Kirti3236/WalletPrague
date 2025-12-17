# YaPague! API Testing Sequence Guide

## 📋 Recommended Testing Flow

This guide provides a step-by-step sequence to test all YaPague! API endpoints without breaking dependencies.

---

## 🔑 Prerequisites

1. **Import Postman Collection**: Import `YaPague.postman_collection.json` and `YaPague.postman_environment.json`
2. **Select Environment**: Choose "YaPague Local" environment
3. **Start Server**: Ensure backend is running on `http://localhost:3000`

---

## 📝 Testing Sequence

### **Phase 1: User Setup & Authentication** (No Auth Required)

#### Step 1: Register User 1
- **Endpoint**: `🌐 Register a new user` (POST `/v1/public/auth/register`)
- **Purpose**: Create first test user
- **Required Fields**:
  - `user_first_name`: "John"
  - `user_last_name`: "Doe"
  - `user_DNI_number`: "12345678" (unique)
  - `user_password`: "SecurePassword123"
  - `confirm_password`: "SecurePassword123"
- **Optional**: ID document files (frontIdFile, backIdFile)
- **Note**: This automatically creates a default LPS wallet for the user
- **Save**: Copy `accessToken` from response for later use

#### Step 2: Register User 2
- **Endpoint**: `🌐 Register a new user` (POST `/v1/public/auth/register`)
- **Purpose**: Create second test user for P2P transfers
- **Use Different DNI**: e.g., "87654321"
- **Save**: Copy `accessToken` from response for User 2

#### Step 3: Login User 1
- **Endpoint**: `🌐 User login` (POST `/v1/public/auth/login`)
- **Purpose**: Authenticate and get fresh JWT token
- **Body**:
  ```json
  {
    "user_DNI_number": "12345678",
    "user_password": "SecurePassword123"
  }
  ```
- **Action**: Copy `accessToken` → Set in Postman environment variable `jwt` as `Bearer <token>`

#### Step 4: Login User 2
- **Endpoint**: `🌐 User login` (POST `/v1/public/auth/login`)
- **Body**: Use User 2 credentials
- **Note**: You can switch between User 1 and User 2 tokens for testing transfers

---

### **Phase 2: User Profile & Wallet** (JWT Required)

#### Step 5: Get Current User Profile
- **Endpoint**: `🔐 Get current user profile` (GET `/v1/private/user/profile`)
- **Purpose**: Verify user data and confirm authentication works
- **Headers**: Uses `{{jwt}}` from environment

#### Step 6: Get Wallet Dashboard
- **Endpoint**: `🔐 Get wallet dashboard` (GET `/v1/private/wallets/dashboard`)
- **Purpose**: Check wallet balance and recent transactions
- **Expected**: Should show LPS wallet with 0.00 balance (newly created)

#### Step 7: Get Single User by ID (Optional)
- **Endpoint**: `🔐 Get single user by ID` (GET `/v1/private/user/get-single-user/:id`)
- **Purpose**: Test user lookup functionality
- **Note**: Use User ID from registration/login response

---

### **Phase 3: Payment Methods Setup** (JWT Required)

#### Step 8: Add a Card (Mock)
- **Endpoint**: `Add a static card` (POST `/v1/private/payment-methods/cards`)
- **Purpose**: Add payment method for deposits
- **Body**:
  ```json
  {
    "card_number": "4111111111111111",
    "card_holder_name": "John Doe",
    "expiry_month": "12",
    "expiry_year": "2025",
    "card_type": "visa"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Save**: Note the `card_id` from response

#### Step 9: Add a Bank Account (Mock)
- **Endpoint**: `Add a bank account` (POST `/v1/private/payment-methods/bank-accounts`)
- **Purpose**: Add bank account for deposits
- **Body**:
  ```json
  {
    "account_number": "1234567890",
    "routing_number": "987654321",
    "bank_name": "Test Bank",
    "account_type": "checking"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Save**: Note the `account_id` from response

#### Step 10: List User Cards
- **Endpoint**: `List user cards` (GET `/v1/private/payment-methods/cards/:user_id`)
- **Purpose**: Verify card was saved

#### Step 11: List User Bank Accounts
- **Endpoint**: `List user bank accounts` (GET `/v1/private/payment-methods/bank-accounts/:user_id`)
- **Purpose**: Verify bank account was saved

---

### **Phase 4: Deposits** (JWT Required)

#### Step 12: Deposit from Card
- **Endpoint**: `Deposit money from saved card to wallet` (POST `/v1/private/deposits/from-card`)
- **Purpose**: Add funds to wallet
- **Body**:
  ```json
  {
    "card_id": "<card_id from Step 8>",
    "amount": "100.00",
    "currency": "LPS"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Expected**: Wallet balance should increase

#### Step 13: Deposit from Bank Account
- **Endpoint**: `Deposit money from saved bank account to wallet` (POST `/v1/private/deposits/from-bank`)
- **Purpose**: Add more funds via bank
- **Body**:
  ```json
  {
    "bank_account_id": "<account_id from Step 9>",
    "amount": "200.00",
    "currency": "LPS"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 14: Verify Wallet Balance
- **Endpoint**: `🔐 Get wallet dashboard` (GET `/v1/private/wallets/dashboard`)
- **Purpose**: Confirm deposits were successful
- **Expected**: Should show updated balance (300.00 LPS)

---

### **Phase 5: Payments & QR Codes** (JWT Required)

#### Step 15: Create Payment Request
- **Endpoint**: `🔐 Create a QR/code payment request` (POST `/v1/private/payments/request`)
- **Purpose**: Generate payment request for another user to pay
- **Body**:
  ```json
  {
    "amount": "50.00",
    "currency": "LPS",
    "description": "Test payment request"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Save**: Copy `code` and `qr_id` from response

#### Step 16: Get Payment Code Details
- **Endpoint**: `🔐 Get payment code details` (GET `/v1/private/payments/code/:code`)
- **Purpose**: Verify payment request details
- **Use**: Code from Step 15

#### Step 17: Generate QR Code
- **Endpoint**: `🔐 Generate payment QR code` (POST `/v1/private/payments/generate-qr`)
- **Purpose**: Generate QR code for payment
- **Body**:
  ```json
  {
    "amount": "25.00",
    "currency": "LPS",
    "description": "QR payment test"
  }
  ```

#### Step 18: Redeem Payment (Switch to User 2)
- **Endpoint**: `🔐 Redeem a QR/code payment` (POST `/v1/private/payments/redeem`)
- **Purpose**: Pay using the code from Step 15
- **Action**: First, update `jwt` environment variable with User 2's token
- **Body**:
  ```json
  {
    "code": "<code from Step 15>"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Note**: User 2 needs funds first (deposit as User 2)

---

### **Phase 6: P2P Transfers** (JWT Required)

#### Step 19: Validate Recipient
- **Endpoint**: `🔐 Validate recipient` (POST `/v1/private/transfers/validate-recipient`)
- **Purpose**: Verify recipient exists before transferring
- **Body**:
  ```json
  {
    "recipient_dni": "87654321"
  }
  ```
- **Switch**: Use User 1's token

#### Step 20: Transfer by DNI
- **Endpoint**: `🔐 Transfer by DNI` (POST `/v1/private/transfers/by-dni`)
- **Purpose**: Send money to another user by DNI
- **Body**:
  ```json
  {
    "recipient_dni": "87654321",
    "amount": "30.00",
    "currency": "LPS",
    "description": "Test P2P transfer"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 21: P2P Transfer
- **Endpoint**: `🔐 P2P transfer` (POST `/v1/private/transfers/p2p`)
- **Purpose**: Alternative transfer method
- **Body**:
  ```json
  {
    "recipient_user_id": "<User 2 ID>",
    "amount": "20.00",
    "currency": "LPS",
    "description": "Direct P2P transfer"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 22: Get Transfer Confirmation
- **Endpoint**: `🔐 Get transfer confirmation` (GET `/v1/private/transfers/:id/confirmation`)
- **Purpose**: Verify transfer details
- **Use**: Transfer ID from Step 20 or 21

---

### **Phase 7: Withdrawals** (JWT Required)

#### Step 23: Generate Withdrawal Code
- **Endpoint**: `🔐 Generate withdrawal code` (POST `/v1/private/withdrawals/generate`)
- **Purpose**: Create code for cash withdrawal
- **Body**:
  ```json
  {
    "amount": "50.00",
    "currency": "LPS",
    "bank_location_id": "<optional bank location ID>"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Save**: Copy withdrawal code

---

### **Phase 8: Transaction History** (JWT Required)

#### Step 24: Get Transaction History
- **Endpoint**: `🔐 Get transaction history` (GET `/v1/private/transactions/history`)
- **Purpose**: View all transactions
- **Query Params**: `?page=1&limit=10&currency=LPS`

#### Step 25: Search Transactions
- **Endpoint**: `🔐 Search transactions` (GET `/v1/private/transactions/search`)
- **Purpose**: Filter transactions
- **Query Params**: `?type=transfer&status=completed&start_date=2025-01-01`

#### Step 26: Get Transaction Details
- **Endpoint**: `🔐 Get transaction by ID` (GET `/v1/private/transactions/:id`)
- **Purpose**: View specific transaction
- **Use**: Transaction ID from history

---

### **Phase 9: Additional Features** (JWT Required)

#### Step 27: Generate Shareable Payment Link
- **Endpoint**: `🔐 Generate shareable payment link` (POST `/v1/private/payments/share`)
- **Purpose**: Create shareable link for payment
- **Body**:
  ```json
  {
    "payment_code": "<code from Step 15>"
  }
  ```

#### Step 28: Scan QR Code
- **Endpoint**: `🔐 Process payment by scanning QR code` (POST `/v1/private/payments/scan-qr`)
- **Purpose**: Process QR code payment
- **Body**:
  ```json
  {
    "qr_data": "<QR code data>"
  }
  ```

#### Step 29: Validate Payment Code
- **Endpoint**: `🔐 Validate payment code` (POST `/v1/private/payments/validate-code`)
- **Purpose**: Check if payment code is valid
- **Body**:
  ```json
  {
    "code": "<code from Step 15>"
  }
  ```

---

### **Phase 10: Disputes** (JWT Required)

#### Step 30: File a Dispute
- **Endpoint**: `💼 File a dispute for a transaction` (POST `/v1/private/disputes`)
- **Purpose**: Create a dispute for a transaction
- **Prerequisites**: Need a transaction ID from a previous transaction
- **Body**:
  ```json
  {
    "transaction_id": "<transaction_id from Step 20 or 21>",
    "dispute_type": "complaint",
    "reason": "Product not received or service not provided"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Note**: `dispute_type` options: `complaint`, `chargeback`, `refund_request`
- **Save**: Copy `dispute_id` from response

#### Step 31: List User Disputes
- **Endpoint**: `💼 List user disputes` (GET `/v1/private/disputes`)
- **Purpose**: View all disputes filed by current user
- **Query Params**: `?status=open&dispute_type=complaint&page=1&limit=10`

#### Step 32: Get Dispute Details
- **Endpoint**: `💼 Get dispute details` (GET `/v1/private/disputes/:id`)
- **Purpose**: View specific dispute details
- **Use**: Dispute ID from Step 30

---

### **Phase 11: AML/Fraud Alerts** (Admin Role Required)

> **Note**: These require admin user account. Login with admin credentials first and update `jwt` environment variable.

#### Step 33: List AML Alerts
- **Endpoint**: `AML/Fraud Alerts - List alerts` (GET `/v1/private/admin/aml-alerts`)
- **Purpose**: View all AML/fraud alerts in the system
- **Query Params**: `?status=pending&severity=high&alert_type=velocity&page=1&limit=20`
- **Note**: Filter options:
  - `status`: `pending`, `under_review`, `resolved`, `false_positive`, `escalated`
  - `severity`: `low`, `medium`, `high`, `critical`
  - `alert_type`: `velocity`, `amount_threshold`, `structuring`, `unusual_pattern`, etc.

#### Step 34: Get AML Alert Details
- **Endpoint**: `AML/Fraud Alerts - Get alert details` (GET `/v1/private/admin/aml-alerts/:id`)
- **Purpose**: View detailed information about a specific alert
- **Use**: Alert ID from Step 33

#### Step 35: Review AML Alert
- **Endpoint**: `AML/Fraud Alerts - Mark alert as reviewed` (PATCH `/v1/private/admin/aml-alerts/:id/review`)
- **Purpose**: Mark an alert as under review
- **Body**:
  ```json
  {
    "reviewer_notes": "Investigating unusual transaction pattern"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Use**: Alert ID from Step 33

#### Step 36: Resolve AML Alert
- **Endpoint**: `AML/Fraud Alerts - Resolve alert` (PATCH `/v1/private/admin/aml-alerts/:id/resolve`)
- **Purpose**: Resolve an alert (mark as false positive or confirmed)
- **Body**:
  ```json
  {
    "resolution": "false_positive",
    "resolution_notes": "User verified identity, transaction is legitimate"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Note**: `resolution` options: `false_positive`, `confirmed`, `escalated`

#### Step 37: Get AML Alert Statistics
- **Endpoint**: `AML/Fraud Alerts - Get alert statistics` (GET `/v1/private/admin/aml-alerts/stats`)
- **Purpose**: View statistics about AML alerts
- **Query Params**: `?from_date=2025-01-01&to_date=2025-01-31`

---

### **Phase 12: Admin Dashboard & Metrics** (Admin Role Required)

#### Step 38: Get Admin Dashboard Summary
- **Endpoint**: `📊 Get admin dashboard summary` (GET `/v1/private/admin/dashboard/summary`)
- **Purpose**: View system-wide dashboard overview
- **Response Includes**: Total users, active users, transaction volume, fees, open alerts

#### Step 39: Get Admin Dashboard Metrics
- **Endpoint**: `📊 Get admin dashboard metrics` (GET `/v1/private/admin/dashboard/metrics`)
- **Purpose**: View detailed metrics by period
- **Query Params**: `?period=daily&from_date=2025-01-01&to_date=2025-01-31`

#### Step 40: Get Top Users
- **Endpoint**: `📊 Get top active users` (GET `/v1/private/admin/dashboard/top-users`)
- **Purpose**: View top users by activity/volume
- **Query Params**: `?limit=10&sort_by=volume&period=monthly`

#### Step 41: Get Dashboard Alerts Summary
- **Endpoint**: `📊 Get open alerts summary` (GET `/v1/private/admin/dashboard/alerts`)
- **Purpose**: View summary of open alerts (AML, limit violations, etc.)

---

### **Phase 13: Admin Audit Logs & Compliance** (Admin Role Required)

#### Step 42: List All Audit Logs
- **Endpoint**: `🔐 List all audit logs` (GET `/v1/private/admin/audit-logs`)
- **Purpose**: View complete system audit trail
- **Query Params**: `?entity_type=transaction&action=create&from_date=2025-01-01&limit=100`
- **Note**: Filter by `entity_type`, `entity_id`, `action`, date range

#### Step 43: Get Audit Log Details
- **Endpoint**: `🔐 Get audit log details` (GET `/v1/private/admin/audit-logs/:id`)
- **Purpose**: View detailed audit log entry
- **Use**: Audit log ID from Step 42

#### Step 44: Verify Hash Chain Integrity
- **Endpoint**: `🔐 Verify hash chain integrity` (POST `/v1/private/admin/audit-logs/verify-chain`)
- **Purpose**: Verify audit log chain hasn't been tampered with
- **Body**:
  ```json
  {
    "from_sequence": 1,
    "to_sequence": 1000
  }
  ```
- **Expected**: Returns verification status indicating if chain is intact

#### Step 45: Export Audit Logs
- **Endpoint**: `🔐 Export audit logs` (GET `/v1/private/admin/audit-logs/export`)
- **Purpose**: Export audit logs for compliance/analysis
- **Query Params**: `?from_date=2025-01-01&to_date=2025-01-31&format=csv`
- **Note**: Format options: `csv`, `json`

#### Step 46: Get User Audit Logs
- **Endpoint**: `🔐 Get audit logs for user` (GET `/v1/private/admin/audit-logs/user/:user_id`)
- **Purpose**: View all audit logs for a specific user
- **Use**: User ID from registration

#### Step 47: Get Resource History
- **Endpoint**: `🔐 Get resource history` (GET `/v1/private/admin/audit-logs/resource/:entity_type/:entity_id`)
- **Purpose**: View complete history of a specific resource
- **Example**: `/v1/private/admin/audit-logs/resource/transaction/<transaction_id>`

---

### **Phase 14: Admin Disputes Management** (Admin Role Required)

#### Step 48: List All Disputes (Admin)
- **Endpoint**: `💼 Admin - List all disputes` (GET `/v1/private/admin/disputes`)
- **Purpose**: View all disputes in the system
- **Query Params**: `?status=open&dispute_type=complaint&page=1&limit=20`

#### Step 49: Get Dispute Details (Admin)
- **Endpoint**: `💼 Admin - Get dispute details` (GET `/v1/private/admin/disputes/:id`)
- **Purpose**: View detailed dispute information
- **Use**: Dispute ID from Step 30 or 48

#### Step 50: Update Dispute Status (Admin)
- **Endpoint**: `💼 Admin - Update dispute status` (PATCH `/v1/private/admin/disputes/:id/status`)
- **Purpose**: Update dispute status (e.g., under_review, resolved)
- **Body**:
  ```json
  {
    "status": "under_review",
    "admin_notes": "Reviewing transaction details"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 51: Resolve Dispute (Admin)
- **Endpoint**: `💼 Admin - Resolve dispute` (PATCH `/v1/private/admin/disputes/:id/resolve`)
- **Purpose**: Resolve a dispute (approve/deny)
- **Body**:
  ```json
  {
    "resolution": "approved",
    "resolution_notes": "Transaction refunded to user",
    "refund_amount": "30.00"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

---

### **Phase 15: Admin Accounting & Reports** (Admin Role Required)

#### Step 52: Get Chart of Accounts
- **Endpoint**: `📊 Get chart of accounts` (GET `/v1/private/admin/accounting/accounts`)
- **Purpose**: View all accounts in the chart of accounts
- **Query Params**: `?account_type=asset&page=1&limit=50`

#### Step 53: Create Account
- **Endpoint**: `📊 Create account` (POST `/v1/private/admin/accounting/accounts`)
- **Purpose**: Add new account to chart of accounts
- **Body**:
  ```json
  {
    "account_code": "1200",
    "account_name": "Accounts Receivable",
    "account_type": "asset",
    "description": "Outstanding customer payments"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 54: Get Trial Balance
- **Endpoint**: `📊 Get trial balance` (GET `/v1/private/admin/accounting/trial-balance`)
- **Purpose**: View trial balance showing all accounts with debit/credit balances
- **Query Params**: `?as_of_date=2025-01-31`

#### Step 55: Create Journal Entry
- **Endpoint**: `📊 Create journal entry` (POST `/v1/private/admin/accounting/journals`)
- **Purpose**: Create double-entry journal entry
- **Body**:
  ```json
  {
    "description": "Manual adjustment entry",
    "entries": [
      {
        "account_code": "1000",
        "debit": "100.00",
        "credit": "0.00",
        "description": "Cash account"
      },
      {
        "account_code": "4000",
        "debit": "0.00",
        "credit": "100.00",
        "description": "Revenue account"
      }
    ]
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`
- **Note**: Total debits must equal total credits

#### Step 56: Get Financial Reports
- **Endpoint**: `📊 Get balance sheet` (GET `/v1/private/admin/reports/balance-sheet`)
- **Purpose**: View balance sheet snapshot
- **Query Params**: `?as_of_date=2025-01-31`

#### Step 57: Get P&L Statement
- **Endpoint**: `📊 Get P&L statement` (GET `/v1/private/admin/reports/p-l`)
- **Purpose**: View profit & loss statement
- **Query Params**: `?period=monthly&from_date=2025-01-01&to_date=2025-01-31`

---

### **Phase 16: Admin Refunds Management** (Admin Role Required)

#### Step 58: List All Refund Requests
- **Endpoint**: `💸 List refund requests` (GET `/v1/private/admin/refunds`)
- **Purpose**: View all refund requests
- **Query Params**: `?status=pending&page=1&limit=20`

#### Step 59: Get Refund Details
- **Endpoint**: `💸 Get refund details` (GET `/v1/private/admin/refunds/:id`)
- **Purpose**: View detailed refund request information

#### Step 60: Approve Refund
- **Endpoint**: `💸 Approve refund` (PATCH `/v1/private/admin/refunds/:id/approve`)
- **Purpose**: Approve and process a refund
- **Body**:
  ```json
  {
    "refund_amount": "50.00",
    "admin_notes": "Refund approved due to service issue"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

#### Step 61: Reject Refund
- **Endpoint**: `💸 Reject refund` (PATCH `/v1/private/admin/refunds/:id/reject`)
- **Purpose**: Reject a refund request
- **Body**:
  ```json
  {
    "rejection_reason": "Refund request does not meet policy requirements"
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

---

### **Phase 17: Admin Settlements & Fees** (Admin Role Required)

#### Step 62: List Settlements
- **Endpoint**: `💸 List settlements` (GET `/v1/private/admin/settlements`)
- **Purpose**: View all settlement batches
- **Query Params**: `?status=completed&from_date=2025-01-01&page=1`

#### Step 63: Get Settlement Details
- **Endpoint**: `💸 Get settlement details` (GET `/v1/private/admin/settlements/:id`)
- **Purpose**: View detailed settlement information

#### Step 64: List Fee Policies
- **Endpoint**: `💰 List fee policies` (GET `/v1/private/admin/fees/policies`)
- **Purpose**: View all fee policies
- **Query Params**: `?fee_type=transaction&active=true`

#### Step 65: Create Fee Policy
- **Endpoint**: `💰 Create fee policy` (POST `/v1/private/admin/fees/policies`)
- **Purpose**: Create new fee policy
- **Body**:
  ```json
  {
    "fee_type": "transaction",
    "fee_name": "P2P Transfer Fee",
    "fee_rate": "0.02",
    "fee_rate_type": "percentage",
    "min_fee": "1.00",
    "max_fee": "10.00",
    "currency": "LPS",
    "is_active": true
  }
  ```
- **Headers**: Add `Idempotency-Key: {{$guid}}`

---

### **Phase 18: Admin Transaction Management** (Admin Role Required)

#### Step 66: Get All Transactions (Admin)
- **Endpoint**: `📊 Get all transactions` (GET `/v1/private/admin/transactions`)
- **Purpose**: View all transactions across all users
- **Query Params**: `?status=completed&type=p2p&from_date=2025-01-01&page=1&limit=50`

#### Step 67: Get Transaction Details (Admin)
- **Endpoint**: `📊 Get transaction details` (GET `/v1/private/admin/transactions/:id`)
- **Purpose**: View detailed transaction information (admin view)

---

## 🔄 Testing Multiple Users Flow

For testing P2P transfers between users:

1. **User 1 Setup**:
   - Register User 1 → Login → Get JWT
   - Add payment method → Deposit funds
   - Create payment request or transfer to User 2

2. **User 2 Setup**:
   - Register User 2 → Login → Get JWT
   - Add payment method → Deposit funds
   - Redeem payment from User 1 or receive transfer

3. **Switch Tokens**:
   - Update `jwt` environment variable in Postman
   - Test endpoints from different user perspectives

---

## ⚠️ Important Notes

### Idempotency Keys
- **All POST/PATCH/DELETE requests** require `Idempotency-Key` header
- Use `{{$guid}}` in Postman to auto-generate unique keys
- Same key within 24 hours returns cached response (prevents duplicates)

### JWT Token Management
- Login returns `accessToken` - set as `Bearer <token>` in environment
- Token expires after configured time (default: 1 hour)
- Re-login to get fresh token if expired

### Environment Variables
- `baseUrl`: `http://localhost:3000`
- `jwt`: Your JWT token (set after login)
- `apiVersion`: `v1`
- `idempotencyKey`: Use `{{$guid}}` for auto-generation

### Rate Limiting
- Global: 1000 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP
- Admin endpoints: 100 requests/minute per user

### Wallet Creation
- Wallets are **automatically created** during user registration
- Default currency: **LPS** (Honduran Lempira)
- Initial balance: **0.00**

---

## 📊 Quick Reference Checklist

- [ ] Phase 1: User Setup & Authentication
- [ ] Phase 2: User Profile & Wallet
- [ ] Phase 3: Payment Methods Setup
- [ ] Phase 4: Deposits
- [ ] Phase 5: Payments & QR Codes
- [ ] Phase 6: P2P Transfers
- [ ] Phase 7: Withdrawals
- [ ] Phase 8: Transaction History
- [ ] Phase 9: Additional Features
- [ ] Phase 10: Disputes (User)
- [ ] Phase 11: AML/Fraud Alerts (Admin)
- [ ] Phase 12: Admin Dashboard & Metrics
- [ ] Phase 13: Admin Audit Logs & Compliance
- [ ] Phase 14: Admin Disputes Management
- [ ] Phase 15: Admin Accounting & Reports
- [ ] Phase 16: Admin Refunds Management
- [ ] Phase 17: Admin Settlements & Fees
- [ ] Phase 18: Admin Transaction Management

---

## 🐛 Troubleshooting

**Issue**: "Unauthorized - invalid or missing JWT token"
- **Solution**: Login again and update `jwt` environment variable

**Issue**: "User not found" or "Wallet not found"
- **Solution**: Ensure user registration completed successfully (creates wallet automatically)

**Issue**: "Insufficient balance"
- **Solution**: Make deposits first before transfers/payments

**Issue**: "Idempotency key required"
- **Solution**: Add `Idempotency-Key: {{$guid}}` header to POST/PATCH/DELETE requests



