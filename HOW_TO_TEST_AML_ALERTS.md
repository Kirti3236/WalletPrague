# 🚨 How to Test AML Alert Endpoints

## Problem
The AML alert endpoints require existing alerts in the database, but **AML alerts are not manually created** - they are automatically triggered by the system based on suspicious transaction patterns.

For testing purposes, you need to seed sample alerts into the database.

---

## Solution: Seed Test AML Alerts

### **Method 1: Using SQL Script (Recommended)**

#### Step 1: Run the SQL Seeding Script

```bash
# Connect to your PostgreSQL database and run the seed script
psql -U your_username -d your_database -f database/seed-test-aml-alerts.sql
```

Or using pgAdmin or any PostgreSQL client, execute the SQL file:
- **File Location**: `database/seed-test-aml-alerts.sql`

This will create 8 sample AML alerts with different:
- ✅ Alert types: velocity, amount_threshold, structuring, unusual_pattern, geographic, high_risk_country, watchlist
- ✅ Severities: low, medium, high, critical
- ✅ Statuses: pending, under_review, escalated, false_positive, resolved

#### Step 2: Verify Alerts Were Created

```sql
-- Check all alerts
SELECT id, alert_type, severity, status, description 
FROM yapague_aml_alerts 
ORDER BY created_at DESC;

-- Count by status
SELECT status, COUNT(*) as count 
FROM yapague_aml_alerts 
GROUP BY status;
```

---

### **Method 2: Manual SQL Insert (Quick Test)**

If you just want **one quick alert** for testing:

```sql
-- Insert a single test alert
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users LIMIT 1), -- Gets any user
  'velocity',
  'high',
  'pending',
  'Test alert: User exceeded transaction velocity threshold',
  5000.00,
  'USD',
  85,
  NOW(),
  NOW()
);
```

---

## Testing the Endpoints

Once you have alerts in the database, you can test:

### 1️⃣ **GET** - List AML Alerts
```
GET /v1/private/admin/aml-alerts
```
**Query Parameters:**
- `?status=pending` - Filter by status
- `?severity=high` - Filter by severity
- `?alert_type=velocity` - Filter by type
- `?page=1&limit=20` - Pagination

### 2️⃣ **GET** - Get AML Alert Details
```
GET /v1/private/admin/aml-alerts/:alertId
```
**Path Parameter:**
- Replace `:alertId` with an actual ID from the list endpoint

### 3️⃣ **PATCH** - Review AML Alert
```
PATCH /v1/private/admin/aml-alerts/:alertId/review
```
**Body:**
```json
{
  "admin_notes": "Investigating suspicious pattern - requires additional documentation"
}
```

### 4️⃣ **PATCH** - Resolve AML Alert
```
PATCH /v1/private/admin/aml-alerts/:alertId/resolve
```
**Body:**
```json
{
  "resolution_type": "false_positive",
  "resolution_notes": "Verified as legitimate business transaction",
  "escalate": false
}
```

**Resolution Types:**
- `false_positive` - Not actually suspicious
- `resolved` - Issue resolved
- `escalated` - Needs higher level review

---

## Testing Workflow

1. **Run the seed script** to create test alerts
2. **List all alerts** to get alert IDs
   ```
   GET /v1/private/admin/aml-alerts
   ```
3. **Get details** of a specific alert
   ```
   GET /v1/private/admin/aml-alerts/{alertId}
   ```
4. **Review the alert** (marks as under_review)
   ```
   PATCH /v1/private/admin/aml-alerts/{alertId}/review
   Body: { "admin_notes": "Under review" }
   ```
5. **Resolve the alert** (marks as resolved/false_positive)
   ```
   PATCH /v1/private/admin/aml-alerts/{alertId}/resolve
   Body: { "resolution_type": "false_positive", "resolution_notes": "Legitimate transaction" }
   ```

---

## Understanding Alert Statuses

| Status | Description |
|--------|-------------|
| `pending` | New alert, not yet reviewed |
| `under_review` | Being investigated by admin |
| `resolved` | Issue resolved, action taken |
| `false_positive` | Not actually suspicious |
| `escalated` | Requires higher level review |
| `dismissed` | Alert dismissed |

---

## Understanding Alert Types

| Type | Description | Example |
|------|-------------|---------|
| `velocity` | Too many transactions in short time | 10 transactions in 1 hour |
| `amount_threshold` | Transaction exceeds amount limit | Single $15,000 transaction |
| `structuring` | Breaking large amounts into smaller ones | 5 x $9,500 transactions |
| `unusual_pattern` | Deviation from normal behavior | User normally sends $100, suddenly $3000 |
| `geographic` | Unusual location activity | Transaction from different country |
| `high_risk_country` | Sanctioned/high-risk country | OFAC sanctioned country |
| `watchlist` | Name matches watchlist | Global watchlist match |
| `pep` | Politically Exposed Person | Government official |

---

## Understanding Severity Levels

| Severity | Risk Score | Action Required |
|----------|-----------|-----------------|
| `low` | 0-40 | Monitor |
| `medium` | 41-70 | Review within 24 hours |
| `high` | 71-90 | Immediate review required |
| `critical` | 91-100 | Urgent action, potential freeze |

---

## Troubleshooting

### Error: "Alert not found"
- Make sure you ran the seed script
- Verify alerts exist: `SELECT COUNT(*) FROM yapague_aml_alerts;`
- Use a valid alert ID from the list endpoint

### Error: "No users found"
- The seed script requires at least one user in `yapague_users` table
- Create a user first, then run the seed script

### Error: "Unauthorized"
- Make sure you're logged in as an **admin** user
- AML endpoints require `admin` role
- Check your JWT token has admin privileges

---

## Quick Reference

```bash
# 1. Seed test alerts
psql -U username -d database_name -f database/seed-test-aml-alerts.sql

# 2. Check alerts exist
psql -U username -d database_name -c "SELECT COUNT(*) FROM yapague_aml_alerts;"

# 3. Get alert IDs
psql -U username -d database_name -c "SELECT id, status, alert_type FROM yapague_aml_alerts LIMIT 5;"
```

---

## Need More Alerts?

Simply run the seed script again! It will create new alerts each time (with random user assignments).

Or modify the SQL script to create alerts with specific scenarios you want to test.

---

## Production Note

⚠️ **Important**: In production, AML alerts are **automatically created** by the system's monitoring services when suspicious patterns are detected. You should NOT manually create alerts in production.

These manual seeding scripts are **for testing/development only**.

