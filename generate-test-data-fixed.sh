#!/bin/bash

# YaPague! Comprehensive Test Data Generator - FIXED VERSION
# Purpose: Generate realistic test data for reporting and analytics testing

set -e

BASE_URL="http://localhost:3000"
API_BASE="/v1"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     🎲 YAPAGUE! TEST DATA GENERATOR - FIXED & IMPROVED          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Login as User 1
echo "🔐 Authenticating users..."
USER1_LOGIN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "12345678", "user_password": "TestPassword123!"}')

USER1_TOKEN=$(echo $USER1_LOGIN | jq -r '.data.accessToken')
USER1_ID=$(echo $USER1_LOGIN | jq -r '.data.user.id')

if [ "$USER1_TOKEN" = "null" ] || [ -z "$USER1_TOKEN" ]; then
  echo "❌ User 1 login failed"
  exit 1
fi

# Login as User 2
USER2_LOGIN=$(curl -s -X POST "$BASE_URL$API_BASE/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "99887766", "user_password": "SecurePass456!"}')

USER2_TOKEN=$(echo $USER2_LOGIN | jq -r '.data.accessToken')
USER2_ID=$(echo $USER2_LOGIN | jq -r '.data.user.id')

if [ "$USER2_TOKEN" = "null" ] || [ -z "$USER2_TOKEN" ]; then
  echo "❌ User 2 login failed"
  exit 1
fi

echo "✅ Users authenticated"
echo "   User 1 ID: $USER1_ID"
echo "   User 2 ID: $USER2_ID"
echo ""

# Get User 1 wallet (handle double nesting)
WALLET1_DATA=$(curl -s -X GET "$BASE_URL$API_BASE/private/wallets/dashboard" \
  -H "Authorization: Bearer $USER1_TOKEN")
USER1_WALLET_ID=$(echo $WALLET1_DATA | jq -r '.data.data.wallet.id // .data.wallet.id // empty')

# Get User 2 wallet (handle double nesting)
WALLET2_DATA=$(curl -s -X GET "$BASE_URL$API_BASE/private/wallets/dashboard" \
  -H "Authorization: Bearer $USER2_TOKEN")
USER2_WALLET_ID=$(echo $WALLET2_DATA | jq -r '.data.data.wallet.id // .data.wallet.id // empty')

if [ -z "$USER1_WALLET_ID" ] || [ -z "$USER2_WALLET_ID" ]; then
  echo "❌ Failed to get wallet IDs"
  exit 1
fi

echo "✅ Wallets retrieved"
echo "   User 1 Wallet: $USER1_WALLET_ID"
echo "   User 2 Wallet: $USER2_WALLET_ID"
echo ""

# Get payment methods for User 1
PAYMENT_METHODS_1=$(curl -s -X GET "$BASE_URL$API_BASE/private/wallets/payment-methods" \
  -H "Authorization: Bearer $USER1_TOKEN")
PAYMENT_METHOD_ID_1=$(echo $PAYMENT_METHODS_1 | jq -r '.data[0].id // empty')

# Get payment methods for User 2
PAYMENT_METHODS_2=$(curl -s -X GET "$BASE_URL$API_BASE/private/wallets/payment-methods" \
  -H "Authorization: Bearer $USER2_TOKEN")
PAYMENT_METHOD_ID_2=$(echo $PAYMENT_METHODS_2 | jq -r '.data[0].id // empty')

echo "✅ Payment methods retrieved"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "📊 PHASE 1: GENERATING DEPOSIT TRANSACTIONS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate deposits for User 1
if [ ! -z "$PAYMENT_METHOD_ID_1" ]; then
  DEPOSIT_AMOUNTS=(100 250 500 75 150 300 50 200)
  for i in "${!DEPOSIT_AMOUNTS[@]}"; do
    AMOUNT=${DEPOSIT_AMOUNTS[$i]}
    echo "💰 User 1 Deposit #$((i+1)): $AMOUNT LPS"
    RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/deposits/from-card" \
      -H "Authorization: Bearer $USER1_TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: deposit-u1-fix-$(date +%s%N)-$i" \
      -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"payment_method_id\": \"$PAYMENT_METHOD_ID_1\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"Test deposit $((i+1))\"}")
    
    if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
      echo "   ✅ Deposited"
    else
      echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
    fi
    sleep 1
  done
else
  echo "⚠️  User 1 has no payment method, skipping deposits"
fi

# Generate deposits for User 2
if [ ! -z "$PAYMENT_METHOD_ID_2" ]; then
  DEPOSIT_AMOUNTS_U2=(200 400 150 300 100)
  for i in "${!DEPOSIT_AMOUNTS_U2[@]}"; do
    AMOUNT=${DEPOSIT_AMOUNTS_U2[$i]}
    echo "💰 User 2 Deposit #$((i+1)): $AMOUNT LPS"
    RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/deposits/from-card" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: deposit-u2-fix-$(date +%s%N)-$i" \
      -d "{\"wallet_id\": \"$USER2_WALLET_ID\", \"payment_method_id\": \"$PAYMENT_METHOD_ID_2\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"Test deposit $((i+1))\"}")
    
    if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
      echo "   ✅ Deposited"
    else
      echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
    fi
    sleep 1
  done
else
  echo "⚠️  User 2 has no payment method, skipping deposits"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "💸 PHASE 2: GENERATING P2P TRANSFERS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# User 1 sends to User 2 (multiple transfers) - WITH receiver_user_id
P2P_AMOUNTS=(25 50 75 40 60 30 45)
for i in "${!P2P_AMOUNTS[@]}"; do
  AMOUNT=${P2P_AMOUNTS[$i]}
  echo "💸 P2P Transfer #$((i+1)): User 1 → User 2 ($AMOUNT LPS)"
  RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/transfers/p2p" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: p2p-u1-u2-fix-$(date +%s%N)-$i" \
    -d "{\"sender_wallet_id\": \"$USER1_WALLET_ID\", \"receiver_user_id\": \"$USER2_ID\", \"receiver_wallet_id\": \"$USER2_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"P2P test transfer $((i+1))\"}")
  
  if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
    echo "   ✅ Transferred"
  else
    echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
  fi
  sleep 1
done

# User 2 sends to User 1 (fewer transfers) - WITH receiver_user_id
P2P_AMOUNTS_REVERSE=(35 55 45)
for i in "${!P2P_AMOUNTS_REVERSE[@]}"; do
  AMOUNT=${P2P_AMOUNTS_REVERSE[$i]}
  echo "💸 P2P Transfer #$((i+1)): User 2 → User 1 ($AMOUNT LPS)"
  RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/transfers/p2p" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: p2p-u2-u1-fix-$(date +%s%N)-$i" \
    -d "{\"sender_wallet_id\": \"$USER2_WALLET_ID\", \"receiver_user_id\": \"$USER1_ID\", \"receiver_wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\", \"description\": \"P2P reverse transfer $((i+1))\"}")
  
  if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
    echo "   ✅ Transferred"
  else
    echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
  fi
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
    -H "Idempotency-Key: qr-req-fix-$(date +%s%N)-$i" \
    -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\"}")
  
  QR_ID=$(echo $PAYMENT_REQUEST | jq -r '.data.qr_id // empty')
  
  if [ ! -z "$QR_ID" ]; then
    # User 2 redeems it
    REDEEM_RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/payments/redeem" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"qr_id\": \"$QR_ID\", \"receiver_wallet_id\": \"$USER2_WALLET_ID\"}")
    
    if echo $REDEEM_RESULT | jq -e '.success' > /dev/null 2>&1; then
      echo "   ✅ QR Payment completed"
    else
      echo "   ⚠️  QR redeem failed"
    fi
  else
    echo "   ⚠️  QR creation failed"
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
  RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/withdrawals/generate" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: withdraw-fix-$(date +%s%N)-$i" \
    -d "{\"wallet_id\": \"$USER1_WALLET_ID\", \"amount\": \"$AMOUNT\", \"currency\": \"LPS\"}")
  
  if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
    echo "   ✅ Withdrawal code generated"
  else
    echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
  fi
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

# Create disputes for some transactions - USING CORRECT ENUM VALUES
DISPUTE_COUNT=0
DISPUTE_TYPES=("complaint" "chargeback" "unauthorized")  # Valid enum values only
for TRANSACTION_ID in $TRANSACTION_IDS; do
  DISPUTE_COUNT=$((DISPUTE_COUNT+1))
  echo "💼 Creating Dispute #$DISPUTE_COUNT for transaction: ${TRANSACTION_ID:0:8}..."
  
  # Use modulo to cycle through valid dispute types
  TYPE_INDEX=$((DISPUTE_COUNT % 3))
  TYPE=${DISPUTE_TYPES[$TYPE_INDEX]}
  
  RESULT=$(curl -s -X POST "$BASE_URL$API_BASE/private/user/disputes" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: dispute-fix-$(date +%s%N)-$DISPUTE_COUNT" \
    -d "{\"transaction_id\": \"$TRANSACTION_ID\", \"dispute_type\": \"$TYPE\", \"reason\": \"Test dispute #$DISPUTE_COUNT - Quality issue\"}")
  
  if echo $RESULT | jq -e '.success' > /dev/null 2>&1; then
    echo "   ✅ Dispute created (Type: $TYPE)"
  else
    echo "   ⚠️  Skipped: $(echo $RESULT | jq -r '.message // "Unknown error"')"
  fi
  sleep 1
done

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║            ✅ TEST DATA GENERATION COMPLETE! (FIXED)             ║"
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

