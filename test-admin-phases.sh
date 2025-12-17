#!/bin/bash

# YaPague! Admin & Reporting Phases Test (Phases 11-18)
# Purpose: Test all admin and reporting endpoints

set -e

BASE_URL="http://localhost:3000"
API_BASE="/v1"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🔬 YAPAGUE! ADMIN & REPORTING PHASES (11-18)             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Login as admin
echo "🔐 Authenticating as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "admin999", "user_password": "TestPassword123!"}' | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed."
  exit 1
fi

echo "✅ Admin authenticated"
echo ""

# Phase 11: AML/Fraud Alerts
echo "════════════════════════════════════════════════════════════════"
echo "🚨 PHASE 11: AML/FRAUD ALERTS"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 33: List AML Alerts"
AML_ALERTS=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/aml-alerts?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP33=$(echo $AML_ALERTS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $AML_ALERTS | jq -c '{success, total: (.data.total // 0), alerts: (.data.alerts[0:2] // []) | map({id, alert_type, severity, status})}')"
echo "   Result: $STEP33"
ALERT_ID=$(echo $AML_ALERTS | jq -r '.data.alerts[0].id // empty')
echo ""

if [ ! -z "$ALERT_ID" ]; then
  echo "✅ STEP 34: Get AML Alert Details"
  AML_DETAIL=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/aml-alerts/$ALERT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  STEP34=$(echo $AML_DETAIL | jq -r 'if .data.id then "✅ PASSED" else "❌ FAILED" end')
  echo "   Result: $STEP34"
  echo ""
  
  echo "✅ STEP 35: Review AML Alert"
  REVIEW=$(curl -s -X PATCH "$BASE_URL$API_BASE/private/admin/aml-alerts/$ALERT_ID/review" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: review-$(date +%s)" \
    -d '{"reviewer_notes": "Under investigation"}')
  STEP35=$(echo $REVIEW | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
  echo "   Result: $STEP35"
  echo ""
else
  echo "⚠️  STEP 34-36: Skipped (no alerts found)"
  echo ""
fi

echo "✅ STEP 37: Get AML Alert Statistics"
AML_STATS=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/aml-alerts/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP37=$(echo $AML_STATS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $AML_STATS | jq -c '{success, stats: .data}')"
echo "   Result: $STEP37"
echo ""

# Phase 12: Admin Dashboard & Metrics
echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 12: ADMIN DASHBOARD & METRICS"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 38: Get Admin Dashboard Summary"
DASHBOARD=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/dashboard/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP38=$(echo $DASHBOARD | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $DASHBOARD | jq -c '{success, total_users: .data.total_users, active_users: .data.active_users, transaction_volume: .data.transaction_volume}')"
echo "   Result: $STEP38"
echo ""

echo "✅ STEP 39: Get Admin Dashboard Metrics"
METRICS=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/dashboard/metrics?period=daily" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP39=$(echo $METRICS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $METRICS | jq -c '{success, data_points: (.data | length)}')"
echo "   Result: $STEP39"
echo ""

echo "✅ STEP 40: Get Top Users"
TOP_USERS=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/dashboard/top-users?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP40=$(echo $TOP_USERS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $TOP_USERS | jq -c '{success, users_count: (.data.users | length)}')"
echo "   Result: $STEP40"
echo ""

echo "✅ STEP 41: Get Dashboard Alerts Summary"
ALERTS_SUMMARY=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/dashboard/alerts" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP41=$(echo $ALERTS_SUMMARY | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $ALERTS_SUMMARY | jq -c '{success, open_alerts: .data.open_alerts}')"
echo "   Result: $STEP41"
echo ""

# Phase 13: Admin Audit Logs & Compliance
echo "════════════════════════════════════════════════════════════════"
echo "🔐 PHASE 13: AUDIT LOGS & COMPLIANCE"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 42: List All Audit Logs"
AUDIT_LOGS=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/audit/logs?limit=10&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP42=$(echo $AUDIT_LOGS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $AUDIT_LOGS | jq -c '{success, total: (.data.total // 0), logs_count: (.data.logs | length)}')"
echo "   Result: $STEP42"
AUDIT_LOG_ID=$(echo $AUDIT_LOGS | jq -r '.data.logs[0].id // empty')
echo ""

echo "✅ STEP 44: Verify Hash Chain Integrity"
VERIFY_CHAIN=$(curl -s -X POST "$BASE_URL$API_BASE/private/admin/audit/verify-chain" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")
STEP44=$(echo $VERIFY_CHAIN | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $VERIFY_CHAIN | jq -c '{success, is_verified: (.data.is_verified // .data.verified), verified_count: .data.verified_count}')"
echo "   Result: $STEP44"
echo ""

# Phase 14: Admin Disputes Management
echo "════════════════════════════════════════════════════════════════"
echo "💼 PHASE 14: ADMIN DISPUTES MANAGEMENT"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 48: List All Disputes (Admin)"
ALL_DISPUTES=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/disputes?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP48=$(echo $ALL_DISPUTES | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $ALL_DISPUTES | jq -c '{success, total: (.data.pagination.total // 0), disputes: (.data.disputes[0:2] // []) | map({id, dispute_type, status})}')"
echo "   Result: $STEP48"
DISPUTE_ID=$(echo $ALL_DISPUTES | jq -r '.data.disputes[0].id // empty')
echo ""

if [ ! -z "$DISPUTE_ID" ]; then
  echo "✅ STEP 49: Get Dispute Details (Admin)"
  DISPUTE_DETAIL=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/disputes/$DISPUTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  STEP49=$(echo $DISPUTE_DETAIL | jq -r 'if .data.id then "✅ PASSED" else "❌ FAILED" end')
  echo "   Result: $STEP49"
  echo ""
  
  echo "✅ STEP 50: Update Dispute Status"
  UPDATE_STATUS=$(curl -s -X PATCH "$BASE_URL$API_BASE/private/admin/disputes/$DISPUTE_ID/status" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: dispute-status-$(date +%s)" \
    -d '{"status": "under_review", "admin_notes": "Reviewing case"}')
  STEP50=$(echo $UPDATE_STATUS | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
  echo "   Result: $STEP50"
  echo ""
else
  echo "⚠️  STEP 49-51: Skipped (no disputes found)"
  echo ""
fi

# Phase 15: Admin Reports
echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 15: ADMIN REPORTS"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "✅ STEP 52: Generate Transaction Report"
TXN_REPORT=$(curl -s -X POST "$BASE_URL$API_BASE/private/admin/reports/transactions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-11-01", "end_date": "2025-11-30"}')
STEP52=$(echo $TXN_REPORT | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $TXN_REPORT | jq -c '{success, transaction_count: (.data.transaction_count // 0), total_volume: (.data.total_volume // 0)}')"
echo "   Result: $STEP52"
echo ""

echo "✅ STEP 53: Generate User Summary Report"
USER_REPORT=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/reports/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP53=$(echo $USER_REPORT | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $USER_REPORT | jq -c '{success, total_users: (.data.total_users // 0), active_users: (.data.active_users // 0)}')"
echo "   Result: $STEP53"
echo ""

echo "✅ STEP 54: Generate AML Summary Report"
AML_REPORT=$(curl -s -X GET "$BASE_URL$API_BASE/private/admin/reports/aml-summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STEP54=$(echo $AML_REPORT | jq -r 'if .success then "✅ PASSED" else "❌ FAILED (" + .message + ")" end')
echo "   Response: $(echo $AML_REPORT | jq -c '{success, total_alerts: (.data.total_alerts // 0)}')"
echo "   Result: $STEP54"
echo ""

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              ✅ ADMIN PHASES TESTING COMPLETE!                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Test Summary:"
echo "   Phase 11 (AML Alerts): Steps 33-37"
echo "   Phase 12 (Dashboard): Steps 38-41"
echo "   Phase 13 (Audit Logs): Steps 42-44"
echo "   Phase 14 (Disputes): Steps 48-50"
echo "   Phase 18 (Transactions): Step 66"
echo ""
echo "✅ Testing complete!"
echo ""

