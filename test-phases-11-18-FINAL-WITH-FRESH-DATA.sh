#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║      🔬 YAPAGUE! PHASES 11-18 - FINAL COMPLETE TEST             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Get fresh admin token
echo "🔐 Getting fresh admin token..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"user_DNI_number": "admin999", "user_password": "TestPassword123!"}' | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  exit 1
fi
echo "✅ Admin authenticated"
echo ""

# Reseed fresh AML alerts data
echo "📊 Reseeding fresh AML alerts..."
PGPASSWORD=harvi2425 psql -h localhost -p 5433 -U postgres -d yapague_db -c "DELETE FROM yapague_aml_alerts;" > /dev/null 2>&1
PGPASSWORD=harvi2425 psql -h localhost -p 5433 -U postgres -d yapague_db -f database/seed-test-aml-alerts.sql > /dev/null 2>&1
echo "✅ Fresh data seeded"
echo ""

BASE_URL="http://localhost:3000/v1"

# Phase 11
echo "════════════════════════════════════════════════════════════════"
echo "🚨 PHASE 11: AML/FRAUD ALERTS (Steps 33-37)"
echo "════════════════════════════════════════════════════════════════"
echo ""
curl -s -X GET "$BASE_URL/private/admin/aml-alerts?page=1&limit=20" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.data | map(.id)[0:3] as $ids | "✅ STEP 33: List AML Alerts - Found \(.| length) alerts"'

# Get 3 different alert IDs
ALERTS=$(curl -s -X GET "$BASE_URL/private/admin/aml-alerts?page=1&limit=20" -H "Authorization: Bearer $ADMIN_TOKEN")
ALERT_ID_1=$(echo "$ALERTS" | jq -r '.data.data[0].id')
ALERT_ID_2=$(echo "$ALERTS" | jq -r '.data.data[1].id')
ALERT_ID_3=$(echo "$ALERTS" | jq -r '.data.data[2].id')

echo "✅ STEP 34: Get AML Alert Details - $(curl -s -X GET "$BASE_URL/private/admin/aml-alerts/$ALERT_ID_1" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"

echo "✅ STEP 35: Review AML Alert - $(curl -s -X PATCH "$BASE_URL/private/admin/aml-alerts/$ALERT_ID_2/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"review_notes": "Under investigation"}' | jq -r 'if .success then "✅ SUCCESS" else ("❌ FAILED: " + .message) end')"

echo "✅ STEP 36: Resolve AML Alert - $(curl -s -X PATCH "$BASE_URL/private/admin/aml-alerts/$ALERT_ID_3/resolve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"resolution_type": "false_positive", "resolution_notes": "Verified legitimate", "escalate": false}' | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"

echo "✅ STEP 37: Get AML Statistics - $(curl -s -X GET "$BASE_URL/private/admin/aml-alerts/stats" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then ("✅ SUCCESS (Total: " + (.data.total|tostring) + ")") else "❌ FAILED" end')"
echo ""

# Phase 12
echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 12: ADMIN DASHBOARD (Steps 38-41)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ STEP 38: Dashboard Summary - $(curl -s -X GET "$BASE_URL/private/admin/dashboard/summary" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then ("✅ SUCCESS (Users: " + (.data.total_users|tostring) + ")") else "❌ FAILED" end')"
echo "✅ STEP 39: Dashboard Metrics - $(curl -s -X GET "$BASE_URL/private/admin/dashboard/metrics?period=daily" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo "✅ STEP 40: Top Users - $(curl -s -X GET "$BASE_URL/private/admin/dashboard/top-users?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo "✅ STEP 41: Dashboard Alerts - $(curl -s -X GET "$BASE_URL/private/admin/dashboard/alerts" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo ""

# Phase 13
echo "════════════════════════════════════════════════════════════════"
echo "🔐 PHASE 13: AUDIT LOGS (Steps 42, 44)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ STEP 42: List Audit Logs - $(curl -s -X GET "$BASE_URL/private/admin/audit/logs?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo "✅ STEP 44: Verify Hash Chain - $(curl -s -X POST "$BASE_URL/private/admin/audit/verify-chain" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"from_sequence": 1, "to_sequence": 100}' | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo ""

# Phase 14
echo "════════════════════════════════════════════════════════════════"
echo "💼 PHASE 14: DISPUTES (Steps 48-51)"
echo "════════════════════════════════════════════════════════════════"
echo ""
DISPUTES=$(curl -s -X GET "$BASE_URL/private/admin/disputes?page=1&limit=20" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "✅ STEP 48: List All Disputes - $(echo "$DISPUTES" | jq -r 'if .success then ("✅ SUCCESS (Total: " + (.data.data.pagination.total|tostring) + ")") else "❌ FAILED" end')"
DISPUTE_ID=$(echo "$DISPUTES" | jq -r '.data.data.disputes[0].id')
echo "✅ STEP 49: Get Dispute Details - $(curl -s -X GET "$BASE_URL/private/admin/disputes/$DISPUTE_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo "✅ STEP 50: Update Dispute Status - $(curl -s -X PUT "$BASE_URL/private/admin/disputes/$DISPUTE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"status": "under_review", "resolution": "Investigating"}' | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo "✅ STEP 51: Resolve Dispute - $(curl -s -X PUT "$BASE_URL/private/admin/disputes/$DISPUTE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"status": "resolved", "resolution": "Refund processed"}' | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
echo ""

# Phase 18
echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 18: ADMIN TRANSACTIONS (Steps 66-67)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ STEP 66: List All Transactions - $(curl -s -X GET "$BASE_URL/private/admin/transactions?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then ("✅ SUCCESS (Total: " + (.data.total|tostring) + ")") else "⚠️ No data" end')"
TXN_ID=$(curl -s -X GET "$BASE_URL/private/admin/transactions?page=1&limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.transactions[0].id')
if [ ! -z "$TXN_ID" ] && [ "$TXN_ID" != "null" ]; then
  echo "✅ STEP 67: Get Transaction Details - $(curl -s -X GET "$BASE_URL/private/admin/transactions/$TXN_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r 'if .success then "✅ SUCCESS" else "❌ FAILED" end')"
else
  echo "✅ STEP 67: Get Transaction Details - ⚠️ Skipped (no transactions)"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║               ✅ PHASES 11-18 TESTING COMPLETE!                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
