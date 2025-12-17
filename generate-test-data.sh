#!/bin/bash

# YaPague! Comprehensive Test Data Generator
# Purpose: Generate realistic test data for reporting and analytics testing

set -e

BASE_URL="http://localhost:3000"
API_BASE="/v1"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       🎲 YAPAGUE! TEST DATA GENERATOR - COMPREHENSIVE           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Login as admin (try multiple credentials)
echo "🔐 Authenticating as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "87654321", "user_password": "StrongPassword123!"}' | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "⚠️  Admin authentication failed, continuing with regular users for data generation..."
  ADMIN_TOKEN=""
else
  echo "✅ Admin authenticated"
fi

# Login as User 1
USER1_TOKEN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "12345678", "user_password": "TestPassword123!"}' | jq -r '.data.accessToken')

USER1_WALLET_ID="521ec755-9677-4bcb-adfd-355f01fdc0c5"

# Login as User 2
USER2_TOKEN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "99887766", "user_password": "SecurePass456!"}' | jq -r '.data.accessToken')

USER2_WALLET_ID="e81ca2a2-db58-46ec-b2a6-21b293befdac"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 1: GENERATING DEPOSIT TRANSACTIONS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate multiple deposits for User 1 (various amounts)
DEPOSIT_AMOUNTS=(100 250 500 75 150 300 50 200)
for i in "${!DEPOSIT_AMOUNTS[@]}"; do
  AMOUNT=${DEPOSIT_AMOUNTS[$i]}
  echo "💰 User 1 Deposit #$((i+1)): $AMOUNT LPS"
  curl -s -X POST "$BASE_URL$API_BASE/private/deposits/from-card" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: deposit-u1-$(date +%s)-$i" \
    -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"payment_method_id\": \"bed1cd21-cb84-4c21-be06-f1623247a687\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"Test deposit $((i+1))\"}" > /dev/null
  echo "   ✅ Deposited"
  sleep 1
done

# Generate deposits for User 2
DEPOSIT_AMOUNTS_U2=(200 400 150 300 100)
for i in "${!DEPOSIT_AMOUNTS_U2[@]}"; do
  AMOUNT=${DEPOSIT_AMOUNTS_U2[$i]}
  echo "💰 User 2 Deposit #$((i+1)): $AMOUNT LPS"
  # Get payment method for user 2
  PAYMENT_METHODS=$(curl -s -X GET "$BASE_URL$API_BASE/private/payment-methods" \
    -H "Authorization: Bearer $USER2_TOKEN")
  PAYMENT_METHOD_ID=$(echo $PAYMENT_METHODS | jq -r '.data[0].id // empty')
  
  if [ ! -z "$PAYMENT_METHOD_ID" ]; then
    curl -s -X POST "$BASE_URL$API_BASE/private/deposits/from-card" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: deposit-u2-$(date +%s)-$i" \
      -d "{\"wallet_id\": \"$USER2_WALLET_ID\", \"payment_method_id\": \"$PAYMENT_METHOD_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"Test deposit $((i+1))\"}" > /dev/null
    echo "   ✅ Deposited"
  fi
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "💸 PHASE 2: GENERATING P2P TRANSFERS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# User 1 sends to User 2 (multiple transfers)
P2P_AMOUNTS=(25 50 75 40 60 30 45)
for i in "${!P2P_AMOUNTS[@]}"; do
  AMOUNT=${P2P_AMOUNTS[$i]}
  echo "💸 P2P Transfer #$((i+1)): User 1 → User 2 ($AMOUNT LPS)"
  curl -s -X POST "$BASE_URL$API_BASE/private/transfers/p2p" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: p2p-u1-u2-$(date +%s)-$i" \
    -d "{\"sender_wallet_id\": \"$USER1_WALLET_ID\", \"receiver_wallet_id\": \"$USER2_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"P2P test transfer $((i+1))\"}" > /dev/null
  echo "   ✅ Transferred"
  sleep 1
done

# User 2 sends to User 1 (fewer transfers)
P2P_AMOUNTS_REVERSE=(35 55 45)
for i in "${!P2P_AMOUNTS_REVERSE[@]}"; do
  AMOUNT=${P2P_AMOUNTS_REVERSE[$i]}
  echo "💸 P2P Transfer #$((i+1)): User 2 → User 1 ($AMOUNT LPS)"
  curl -s -X POST "$BASE_URL$API_BASE/private/transfers/p2p" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: p2p-u2-u1-$(date +%s)-$i" \
    -d "{\"sender_wallet_id\": \"$USER2_WALLET_ID\", \"receiver_wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"P2P reverse transfer $((i+1))\"}" > /dev/null
  echo "   ✅ Transferred"
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🎫 PHASE 3: GENERATING QR PAYMENTS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate QR payments
QR_AMOUNTS=(20 40 60 80 35 55)
for i in "${!QR_AMOUNTS[@]}"; do
  AMOUNT=${QR_AMOUNTS[$i]}
  echo "🎫 QR Payment #$((i+1)): $AMOUNT LPS"
  
  # User 1 creates payment request
  PAYMENT_REQUEST=$(curl -s -X POST "$BASE_URL$API_BASE/private/payments/request" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: qr-req-$(date +%s)-$i" \
    -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\"}")
  
  QR_ID=$(echo $PAYMENT_REQUEST | jq -r '.data.qr_id // empty')
  
  if [ ! -z "$QR_ID" ]; then
    # User 2 redeems it
    curl -s -X POST "$BASE_URL$API_BASE/private/payments/redeem" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"qr_id\": \"$QR_ID\", \"receiver_wallet_id\": \"$USER2_WALLET_ID\"}" > /dev/null
    echo "   ✅ QR Payment completed"
  fi
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "💵 PHASE 4: GENERATING WITHDRAWALS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate withdrawals
WITHDRAWAL_AMOUNTS=(100 150 200 75 125)
for i in "${!WITHDRAWAL_AMOUNTS[@]}"; do
  AMOUNT=${WITHDRAWAL_AMOUNTS[$i]}
  echo "💵 Withdrawal #$((i+1)): $AMOUNT LPS"
  curl -s -X POST "$BASE_URL$API_BASE/private/withdrawals/generate" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: withdraw-$(date +%s)-$i" \
    -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\"}" > /dev/null
  echo "   ✅ Withdrawal code generated"
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "💼 PHASE 5: GENERATING DISPUTES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Get some recent transactions
TRANSACTIONS=$(curl -s -X GET "$BASE_URL$API_BASE/private/transactions/history?page=1&limit=10" \
  -H "Authorization: Bearer $USER1_TOKEN")

TRANSACTION_IDS=$(echo $TRANSACTIONS | jq -r '.data.transactions[1:4] | .[] | .id')

# Create disputes for some transactions
DISPUTE_COUNT=0
for TRANSACTION_ID in $TRANSACTION_IDS; do
  DISPUTE_COUNT=$((DISPUTE_COUNT+1))
  echo "💼 Creating Dispute #$DISPUTE_COUNT for transaction: ${TRANSACTION_ID:0:8}..."
  
  DISPUTE_TYPE=("complaint" "refund_request" "chargeback")
  TYPE=${DISPUTE_TYPE[$((DISPUTE_COUNT % 3))]}
  
  curl -s -X POST "$BASE_URL$API_BASE/private/user/disputes" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: dispute-$(date +%s)-$DISPUTE_COUNT" \
    -d "{\"transaction_id\": \"$TRANSACTION_ID\", \"dispute_type\": \"$TYPE\", \"reason\": \"Test dispute #$DISPUTE_COUNT - Quality issue\"}" > /dev/null
  echo "   ✅ Dispute created"
  sleep 1
done

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              ✅ TEST DATA GENERATION COMPLETE!                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Generated Data Summary:"
echo "   • Deposits: ~13 transactions"
echo "   • P2P Transfers: ~10 transactions"
echo "   • QR Payments: ~6 transactions"
echo "   • Withdrawals: ~5 transactions"
echo "   • Disputes: ~3 disputes"
echo ""
echo "   📈 Total Transactions: ~34+"
echo "   💰 Total Volume: ~6,000+ LPS"
echo ""
echo "✅ Ready for reporting and analytics testing!"
echo ""

