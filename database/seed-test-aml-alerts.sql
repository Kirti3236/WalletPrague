-- ========================================
-- SEED TEST AML ALERTS FOR TESTING
-- ========================================
-- This script creates sample AML alerts for testing the AML alerts endpoints
-- Run this after you have users and transactions in your database

-- First, let's check if we have users
-- You'll need to replace the UUIDs below with actual user_id values from your database

-- ========================================
-- METHOD 1: Insert with Known User IDs
-- ========================================
-- Replace 'YOUR_USER_ID_HERE' with an actual user_id from yapague_users table
-- Replace 'YOUR_TRANSACTION_ID_HERE' with an actual transaction_id from yapague_transactions table (optional)

-- Alert 1: High Velocity Alert (Pending)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users ORDER BY created_at DESC LIMIT 1), -- Gets most recent user
  (SELECT id FROM yapague_transactions ORDER BY created_at DESC LIMIT 1), -- Gets most recent transaction
  'velocity',
  'high',
  'pending',
  'User exceeded transaction velocity threshold: 10 transactions in 1 hour',
  5000.00,
  'USD',
  85,
  '{"transaction_count": 10, "time_period": "1 hour", "threshold": 5, "exceeded_by": 5}',
  NOW(),
  NOW()
);

-- Alert 2: Amount Threshold Alert (Pending - Critical)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users ORDER BY created_at DESC LIMIT 1 OFFSET 1), -- Gets 2nd most recent user
  NULL,
  'amount_threshold',
  'critical',
  'pending',
  'Single transaction exceeded critical amount threshold of $10,000',
  15000.00,
  'USD',
  92,
  '{"threshold": 10000, "amount": 15000, "exceeded_by_percentage": 50}',
  NOW(),
  NOW()
);

-- Alert 3: Structuring Alert (Under Review)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  reviewed_at,
  reviewed_by,
  review_notes,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users ORDER BY created_at DESC LIMIT 1 OFFSET 2), -- Gets 3rd most recent user
  NULL,
  'structuring',
  'high',
  'under_review',
  'Potential structuring: Multiple transactions just below reporting threshold',
  9500.00,
  'USD',
  78,
  NOW() - INTERVAL '2 hours',
  (SELECT id FROM yapague_users WHERE user_role = 'admin' LIMIT 1), -- Admin user as reviewer
  'Investigating pattern of transactions just below $10k threshold',
  '{"transactions": 5, "average_amount": 9500, "time_period": "24 hours"}',
  NOW() - INTERVAL '1 day',
  NOW()
);

-- Alert 4: Unusual Pattern Alert (Medium Severity - Pending)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users WHERE user_status = 'active' ORDER BY RANDOM() LIMIT 1),
  NULL,
  'unusual_pattern',
  'medium',
  'pending',
  'Transaction pattern deviation: User normally sends $100-500, suddenly sent $3000',
  3000.00,
  'USD',
  65,
  '{"normal_range": "100-500", "current_amount": 3000, "deviation": "6x normal"}',
  NOW() - INTERVAL '3 hours',
  NOW()
);

-- Alert 5: Geographic Anomaly (Low Severity - Pending)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users WHERE user_status = 'active' ORDER BY RANDOM() LIMIT 1),
  NULL,
  'geographic',
  'medium',
  'pending',
  'Unusual geographic activity: Transaction from high-risk country',
  2500.00,
  'USD',
  70,
  '{"origin_country": "Unknown", "destination_country": "High Risk", "ip_address": "1.2.3.4"}',
  NOW() - INTERVAL '5 hours',
  NOW()
);

-- Alert 6: High Risk Country Alert (Critical - Pending)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users WHERE user_status = 'active' ORDER BY RANDOM() LIMIT 1),
  NULL,
  'high_risk_country',
  'critical',
  'pending',
  'Transaction involving OFAC sanctioned country detected',
  8000.00,
  'USD',
  95,
  '{"sanctioned_country": "Restricted", "ofac_list": true, "requires_immediate_review": true}',
  NOW() - INTERVAL '1 hour',
  NOW()
);

-- Alert 7: Watchlist Match (Critical - Escalated)
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  is_escalated,
  escalated_at,
  reviewed_at,
  reviewed_by,
  review_notes,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users WHERE user_status = 'active' ORDER BY RANDOM() LIMIT 1),
  NULL,
  'watchlist',
  'critical',
  'escalated',
  'User name matches entry on global watchlist',
  12000.00,
  'USD',
  98,
  true,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '2 hours',
  (SELECT id FROM yapague_users WHERE user_role = 'admin' LIMIT 1),
  'Escalated to compliance team for further investigation',
  '{"watchlist": "OFAC SDN", "match_confidence": "high", "requires_kyc_review": true}',
  NOW() - INTERVAL '1 day',
  NOW()
);

-- Alert 8: Resolved - False Positive
INSERT INTO yapague_aml_alerts (
  id, 
  user_id, 
  transaction_id,
  alert_type, 
  severity, 
  status, 
  description,
  triggered_amount,
  currency,
  risk_score,
  reviewed_at,
  reviewed_by,
  review_notes,
  resolved_at,
  resolved_by,
  resolution_type,
  resolution_notes,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM yapague_users WHERE user_status = 'active' ORDER BY RANDOM() LIMIT 1),
  NULL,
  'velocity',
  'medium',
  'false_positive',
  'Multiple small transactions flagged for review',
  500.00,
  'USD',
  55,
  NOW() - INTERVAL '2 days',
  (SELECT id FROM yapague_users WHERE user_role = 'admin' LIMIT 1),
  'Reviewed transaction pattern',
  NOW() - INTERVAL '1 day',
  (SELECT id FROM yapague_users WHERE user_role = 'admin' LIMIT 1),
  'false_positive',
  'Legitimate business activity - customer operates a small business with frequent small transactions',
  '{"transactions_reviewed": 15, "business_verified": true}',
  NOW() - INTERVAL '3 days',
  NOW()
);

-- ========================================
-- Verify the alerts were created
-- ========================================
SELECT 
  id,
  alert_type,
  severity,
  status,
  description,
  triggered_amount,
  risk_score,
  created_at
FROM yapague_aml_alerts
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- Get count by status
-- ========================================
SELECT 
  status,
  COUNT(*) as count
FROM yapague_aml_alerts
GROUP BY status;

-- ========================================
-- Get count by severity
-- ========================================
SELECT 
  severity,
  COUNT(*) as count
FROM yapague_aml_alerts
GROUP BY severity;

