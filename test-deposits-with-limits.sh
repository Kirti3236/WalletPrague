#!/bin/bash

# Test Deposits with Limit Validation
# This script tests deposits for users with different policies and validates limit exceed scenarios

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_VERSION="v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}YaPague - Deposit & Limit Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Login as Admin
echo -e "${YELLOW}Step 1: Logging in as Admin...${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/${API_VERSION}/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "user_DNI_number": "87654321",
    "user_password": "TestPassword123!"
  }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.data.accessToken // empty')
ADMIN_ID=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.data.user.id // empty')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Admin login failed${NC}"
  echo "$ADMIN_LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Admin logged in${NC}"
echo -e "   Admin ID: $ADMIN_ID\n"

# Step 2: Get all users
echo -e "${YELLOW}Step 2: Fetching all users...${NC}"
USERS_RESPONSE=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/user/list" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

USERS_COUNT=$(echo $USERS_RESPONSE | jq '. | length')
echo -e "${GREEN}✅ Found $USERS_COUNT users${NC}\n"

# Step 3: Get all policies
echo -e "${YELLOW}Step 3: Fetching all limit policies...${NC}"
POLICIES_RESPONSE=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/admin/limits/policies" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

POLICIES=$(echo $POLICIES_RESPONSE | jq -r '.policies[]? | "\(.policy_code)|\(.max_transaction_amount)|\(.max_daily_amount)|\(.max_monthly_amount)"')

echo -e "${GREEN}✅ Available Policies:${NC}"
echo "$POLICIES" | while IFS='|' read -r code max_txn max_daily max_monthly; do
  echo -e "   - ${BLUE}$code${NC}: Max Txn=${max_txn}, Daily=${max_daily}, Monthly=${max_monthly}"
done
echo ""

# Step 4: Assign policies to users (round-robin)
echo -e "${YELLOW}Step 4: Assigning policies to users...${NC}"
POLICY_CODES=("standard" "premium" "vip" "restricted")
POLICY_INDEX=0

echo "$USERS_RESPONSE" | jq -r '.[] | "\(.id)|\(.user_DNI_number)|\(.user_first_name) \(.user_last_name)"' | while IFS='|' read -r user_id dni name; do
  POLICY_CODE=${POLICY_CODES[$POLICY_INDEX]}
  
  echo -e "   Assigning ${BLUE}$POLICY_CODE${NC} to ${name} (${dni})..."
  
  ASSIGN_RESPONSE=$(curl -s -X POST "${BASE_URL}/${API_VERSION}/private/admin/limits/assign" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$user_id\",
      \"policy_code\": \"$POLICY_CODE\"
    }")
  
  if echo "$ASSIGN_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Policy assigned${NC}"
  else
    echo -e "   ${YELLOW}⚠️  Policy assignment response:${NC}"
    echo "$ASSIGN_RESPONSE" | jq '.'
  fi
  
  POLICY_INDEX=$(( (POLICY_INDEX + 1) % ${#POLICY_CODES[@]} ))
done

echo ""

# Step 5: Test deposits for each user
echo -e "${YELLOW}Step 5: Testing deposits with limit validation...${NC}\n"

echo "$USERS_RESPONSE" | jq -r '.[] | "\(.id)|\(.user_DNI_number)|\(.user_first_name) \(.user_last_name)"' | while IFS='|' read -r user_id dni name; do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Testing User: ${name} (${dni})${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Get user's limit status
  LIMIT_STATUS=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/admin/limits/user/${user_id}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
  
  POLICY_CODE=$(echo $LIMIT_STATUS | jq -r '.policy.policy_code // "none"')
  MAX_TXN=$(echo $LIMIT_STATUS | jq -r '.policy.max_transaction_amount // 0')
  MAX_DAILY=$(echo $LIMIT_STATUS | jq -r '.policy.max_daily_amount // 0')
  MAX_MONTHLY=$(echo $LIMIT_STATUS | jq -r '.policy.max_monthly_amount // 0')
  
  echo -e "Policy: ${BLUE}$POLICY_CODE${NC}"
  echo -e "Limits: Max Txn=${MAX_TXN}, Daily=${MAX_DAILY}, Monthly=${MAX_MONTHLY}"
  
  # Login as user
  USER_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/${API_VERSION}/public/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_DNI_number\": \"$dni\",
      \"user_password\": \"TestPassword123!\"
    }")
  
  USER_TOKEN=$(echo $USER_LOGIN_RESPONSE | jq -r '.data.accessToken // empty')
  
  if [ -z "$USER_TOKEN" ] || [ "$USER_TOKEN" = "null" ]; then
    echo -e "${RED}❌ User login failed${NC}"
    continue
  fi
  
  # Get user's wallet
  WALLET_RESPONSE=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/wallets/dashboard?currency=LPS" \
    -H "Authorization: Bearer ${USER_TOKEN}")
  
  WALLET_ID=$(echo $WALLET_RESPONSE | jq -r '.data.wallet.id // empty')
  
  if [ -z "$WALLET_ID" ] || [ "$WALLET_ID" = "null" ]; then
    echo -e "${RED}❌ Wallet not found${NC}"
    continue
  fi
  
  echo -e "Wallet ID: $WALLET_ID"
  
  # Get payment method (card)
  PAYMENT_METHODS=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/payment-methods/cards/${user_id}" \
    -H "Authorization: Bearer ${USER_TOKEN}")
  
  PAYMENT_METHOD_ID=$(echo $PAYMENT_METHODS | jq -r '.[0].id // empty')
  
  if [ -z "$PAYMENT_METHOD_ID" ] || [ "$PAYMENT_METHOD_ID" = "null" ]; then
    echo -e "${YELLOW}⚠️  No payment method found, skipping deposit tests${NC}\n"
    continue
  fi
  
  echo -e "Payment Method ID: $PAYMENT_METHOD_ID\n"
  
  # Test 1: Deposit within transaction limit
  TEST_AMOUNT=$(echo "$MAX_TXN * 0.5" | bc | cut -d. -f1)
  if [ -z "$TEST_AMOUNT" ] || [ "$TEST_AMOUNT" = "0" ]; then
    TEST_AMOUNT=100
  fi
  
  echo -e "${YELLOW}Test 1: Deposit within limit (${TEST_AMOUNT} LPS)${NC}"
  IDEMPOTENCY_KEY=$(uuidgen)
  
  DEPOSIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/${API_VERSION}/private/deposits/from-card" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
    -d "{
      \"user_id\": \"$user_id\",
      \"wallet_id\": \"$WALLET_ID\",
      \"payment_method_id\": \"$PAYMENT_METHOD_ID\",
      \"amount\": \"$TEST_AMOUNT\",
      \"currency\": \"LPS\",
      \"description\": \"Test deposit within limit\"
    }")
  
  if echo "$DEPOSIT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deposit successful${NC}"
  elif echo "$DEPOSIT_RESPONSE" | jq -e '.code == "TXN_004" or .code == "LIMIT_EXCEEDED"' > /dev/null 2>&1; then
    echo -e "${RED}❌ Limit exceeded (expected to pass)${NC}"
    echo "$DEPOSIT_RESPONSE" | jq '.message'
  else
    echo -e "${RED}❌ Deposit failed${NC}"
    echo "$DEPOSIT_RESPONSE" | jq '.'
  fi
  
  # Test 2: Deposit exceeding transaction limit
  EXCEED_AMOUNT=$(echo "$MAX_TXN * 1.5" | bc | cut -d. -f1)
  if [ -z "$EXCEED_AMOUNT" ] || [ "$EXCEED_AMOUNT" = "0" ]; then
    EXCEED_AMOUNT=10000
  fi
  
  echo -e "\n${YELLOW}Test 2: Deposit exceeding transaction limit (${EXCEED_AMOUNT} LPS)${NC}"
  IDEMPOTENCY_KEY=$(uuidgen)
  
  DEPOSIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/${API_VERSION}/private/deposits/from-card" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
    -d "{
      \"user_id\": \"$user_id\",
      \"wallet_id\": \"$WALLET_ID\",
      \"payment_method_id\": \"$PAYMENT_METHOD_ID\",
      \"amount\": \"$EXCEED_AMOUNT\",
      \"currency\": \"LPS\",
      \"description\": \"Test deposit exceeding limit\"
    }")
  
  if echo "$DEPOSIT_RESPONSE" | jq -e '.code == "TXN_004" or .code == "LIMIT_EXCEEDED" or .status == 429' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Limit validation working correctly${NC}"
    echo -e "   ${BLUE}Message:${NC} $(echo "$DEPOSIT_RESPONSE" | jq -r '.message // .error // "Limit exceeded"')"
  elif echo "$DEPOSIT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${RED}❌ Deposit succeeded (should have failed - limit exceeded)${NC}"
  else
    echo -e "${YELLOW}⚠️  Unexpected response:${NC}"
    echo "$DEPOSIT_RESPONSE" | jq '.'
  fi
  
  # Test 3: Check limit status
  echo -e "\n${YELLOW}Test 3: Checking current limit status...${NC}"
  LIMIT_STATUS=$(curl -s -X GET "${BASE_URL}/${API_VERSION}/private/admin/limits/user/${user_id}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
  
  DAILY_USED=$(echo $LIMIT_STATUS | jq -r '.current_usage.daily_amount_used // 0')
  MONTHLY_USED=$(echo $LIMIT_STATUS | jq -r '.current_usage.monthly_amount_used // 0')
  
  echo -e "Daily Used: ${DAILY_USED} / ${MAX_DAILY}"
  echo -e "Monthly Used: ${MONTHLY_USED} / ${MAX_MONTHLY}"
  
  echo -e "\n"
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Suite Completed!${NC}"
echo -e "${GREEN}========================================${NC}"

