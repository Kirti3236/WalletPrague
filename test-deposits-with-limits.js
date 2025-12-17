/**
 * Test Deposits with Limit Validation
 * Node.js script to test deposits for all users with different policies
 * and validate limit exceed scenarios
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(50)}`, 'blue');
  log(`Step ${step}: ${message}`, 'yellow');
  log('='.repeat(50), 'blue');
}

async function loginAdmin(dni = null, password = null) {
  // Try to find admin user from environment or use defaults
  const adminDNI = dni || process.env.ADMIN_DNI || '87654321';
  const adminPassword = password || process.env.ADMIN_PASSWORD || 'TestPassword123!';
  
  try {
    const response = await axios.post(`${BASE_URL}/${API_VERSION}/public/auth/login`, {
      user_DNI_number: adminDNI,
      user_password: adminPassword,
    });

    if (response.data.data && response.data.data.accessToken) {
      return {
        token: response.data.data.accessToken,
        id: response.data.data.user.id,
      };
    }
    throw new Error('Admin login failed');
  } catch (error) {
    log(`❌ Admin login failed: ${error.message}`, 'red');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

async function loginUser(dni, password = 'TestPassword123!') {
  try {
    const response = await axios.post(`${BASE_URL}/${API_VERSION}/public/auth/login`, {
      user_DNI_number: dni,
      user_password: password,
    });

    if (response.data.data && response.data.data.accessToken) {
      return {
        token: response.data.data.accessToken,
        id: response.data.data.user.id,
      };
    }
    throw new Error('User login failed');
  } catch (error) {
    log(`⚠️  User login failed for DNI ${dni}: ${error.message}`, 'yellow');
    return null;
  }
}

async function getAllUsers(adminToken) {
  try {
    const response = await axios.get(`${BASE_URL}/${API_VERSION}/private/user/list`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data;
  } catch (error) {
    log(`❌ Failed to get users: ${error.message}`, 'red');
    return [];
  }
}

async function getAllPolicies(adminToken) {
  try {
    const response = await axios.get(`${BASE_URL}/${API_VERSION}/private/admin/limits/policies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data.policies || [];
  } catch (error) {
    log(`❌ Failed to get policies: ${error.message}`, 'red');
    return [];
  }
}

async function assignPolicy(adminToken, userId, policyCode) {
  try {
    const response = await axios.post(
      `${BASE_URL}/${API_VERSION}/private/admin/limits/assign`,
      {
        user_id: userId,
        policy_code: policyCode,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    log(`⚠️  Failed to assign policy: ${error.message}`, 'yellow');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function getUserLimitStatus(adminToken, userId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_VERSION}/private/admin/limits/user/${userId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

async function getUserWallet(userToken) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_VERSION}/private/wallets/dashboard?currency=LPS`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    return response.data.data?.wallet;
  } catch (error) {
    return null;
  }
}

async function getUserPaymentMethods(userToken, userId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_VERSION}/private/payment-methods/cards/${userId}`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return [];
  }
}

async function depositFromCard(userToken, userId, walletId, paymentMethodId, amount, description) {
  const idempotencyKey = require('crypto').randomUUID();
  try {
    const response = await axios.post(
      `${BASE_URL}/${API_VERSION}/private/deposits/from-card`,
      {
        user_id: userId,
        wallet_id: walletId,
        payment_method_id: paymentMethodId,
        amount: amount.toString(),
        currency: 'LPS',
        description: description,
      },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return { success: true, data: response.data, idempotencyKey };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
      idempotencyKey,
    };
  }
}

async function checkLimit(userToken, amount) {
  try {
    const response = await axios.post(
      `${BASE_URL}/${API_VERSION}/private/limits/user/limits/check`,
      { amount: parseFloat(amount) },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

async function main() {
  log('\n========================================', 'blue');
  log('YaPague - Deposit & Limit Test Suite', 'blue');
  log('========================================\n', 'blue');

  // Step 1: Login as Admin
  logStep(1, 'Logging in as Admin');
  let admin = await loginAdmin();
  
  // If admin login fails, try to find and use first available user
  if (!admin) {
    log('⚠️  Admin login failed, trying to find any user...', 'yellow');
    // Try to get users first (might need a user token)
    // For now, let's try common passwords or skip admin operations
    log('⚠️  Skipping admin operations. Please ensure admin credentials are correct.', 'yellow');
    log('   You can set ADMIN_DNI and ADMIN_PASSWORD environment variables.', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Admin logged in (ID: ${admin.id})`, 'green');

  // Step 2: Get all users
  logStep(2, 'Fetching all users');
  const users = await getAllUsers(admin.token);
  log(`✅ Found ${users.length} users`, 'green');

  // Step 3: Get all policies
  logStep(3, 'Fetching all limit policies');
  const policies = await getAllPolicies(admin.token);
  log(`✅ Available Policies:`, 'green');
  policies.forEach((policy) => {
    log(
      `   - ${policy.policy_code}: Max Txn=${policy.max_transaction_amount}, Daily=${policy.max_daily_amount}, Monthly=${policy.max_monthly_amount}`,
      'cyan'
    );
  });

  // Step 4: Assign policies to users (round-robin)
  logStep(4, 'Assigning policies to users');
  const policyCodes = ['standard', 'premium', 'vip', 'restricted'];
  let policyIndex = 0;

  for (const user of users) {
    const policyCode = policyCodes[policyIndex % policyCodes.length];
    log(
      `   Assigning ${policyCode} to ${user.user_first_name} ${user.user_last_name} (${user.user_DNI_number})...`,
      'cyan'
    );

    const result = await assignPolicy(admin.token, user.id, policyCode);
    if (result && result.id) {
      log(`   ✅ Policy assigned`, 'green');
    } else {
      log(`   ⚠️  Policy assignment may have failed`, 'yellow');
    }

    policyIndex++;
  }

  // Step 5: Test deposits for each user
  logStep(5, 'Testing deposits with limit validation');

  for (const user of users) {
    log(`\n${'-'.repeat(50)}`, 'blue');
    log(`Testing User: ${user.user_first_name} ${user.user_last_name} (${user.user_DNI_number})`, 'blue');
    log('-'.repeat(50), 'blue');

    // Get user's limit status
    const limitStatus = await getUserLimitStatus(admin.token, user.id);
    if (!limitStatus || !limitStatus.has_policy) {
      log(`⚠️  User has no policy assigned, skipping...`, 'yellow');
      continue;
    }

    const policy = limitStatus.policy;
    const maxTxn = parseFloat(policy.max_transaction_amount);
    const maxDaily = parseFloat(policy.max_daily_amount);
    const maxMonthly = parseFloat(policy.max_monthly_amount);

    log(`Policy: ${policy.policy_code}`, 'cyan');
    log(`Limits: Max Txn=${maxTxn}, Daily=${maxDaily}, Monthly=${maxMonthly}`, 'cyan');

    // Login as user
    const userAuth = await loginUser(user.user_DNI_number);
    if (!userAuth) {
      continue;
    }

    // Get user's wallet
    const wallet = await getUserWallet(userAuth.token);
    if (!wallet || !wallet.id) {
      log(`❌ Wallet not found`, 'red');
      continue;
    }

    log(`Wallet ID: ${wallet.id}`, 'cyan');

    // Get payment methods
    const paymentMethods = await getUserPaymentMethods(userAuth.token, user.id);
    if (!paymentMethods || paymentMethods.length === 0) {
      log(`⚠️  No payment method found, skipping deposit tests`, 'yellow');
      continue;
    }

    const paymentMethodId = paymentMethods[0].id;
    log(`Payment Method ID: ${paymentMethodId}\n`, 'cyan');

    // Test 1: Deposit within transaction limit
    const testAmount = Math.floor(maxTxn * 0.5) || 100;
    log(`Test 1: Deposit within limit (${testAmount} LPS)`, 'yellow');

    // First check limit
    const limitCheck = await checkLimit(userAuth.token, testAmount);
    if (limitCheck) {
      log(`   Limit Check: ${limitCheck.allowed ? '✅ Allowed' : '❌ Not Allowed'}`, limitCheck.allowed ? 'green' : 'red');
      if (!limitCheck.allowed) {
        log(`   Reason: ${limitCheck.reason}`, 'yellow');
      }
    }

    const deposit1 = await depositFromCard(
      userAuth.token,
      user.id,
      wallet.id,
      paymentMethodId,
      testAmount,
      'Test deposit within limit'
    );

    if (deposit1.success) {
      log(`   ✅ Deposit successful`, 'green');
    } else if (
      deposit1.error?.code === 'TXN_004' ||
      deposit1.error?.code === 'LIMIT_EXCEEDED' ||
      deposit1.status === 429
    ) {
      log(`   ❌ Limit exceeded (expected to pass)`, 'red');
      log(`   Message: ${deposit1.error?.message || deposit1.error?.error || 'Limit exceeded'}`, 'yellow');
    } else {
      log(`   ❌ Deposit failed`, 'red');
      console.log(JSON.stringify(deposit1.error, null, 2));
    }

    // Test 2: Deposit exceeding transaction limit
    const exceedAmount = Math.floor(maxTxn * 1.5) || 10000;
    log(`\nTest 2: Deposit exceeding transaction limit (${exceedAmount} LPS)`, 'yellow');

    // Check limit first
    const limitCheck2 = await checkLimit(userAuth.token, exceedAmount);
    if (limitCheck2) {
      log(`   Limit Check: ${limitCheck2.allowed ? '⚠️  Allowed (unexpected)' : '✅ Correctly Rejected'}`, limitCheck2.allowed ? 'yellow' : 'green');
      if (!limitCheck2.allowed) {
        log(`   Reason: ${limitCheck2.reason}`, 'cyan');
      }
    }

    const deposit2 = await depositFromCard(
      userAuth.token,
      user.id,
      wallet.id,
      paymentMethodId,
      exceedAmount,
      'Test deposit exceeding limit'
    );

    if (deposit2.error?.code === 'TXN_004' || deposit2.error?.code === 'LIMIT_EXCEEDED' || deposit2.status === 429) {
      log(`   ✅ Limit validation working correctly`, 'green');
      log(`   Message: ${deposit2.error?.message || deposit2.error?.error || 'Limit exceeded'}`, 'cyan');
    } else if (deposit2.success) {
      log(`   ❌ Deposit succeeded (should have failed - limit exceeded)`, 'red');
    } else {
      log(`   ⚠️  Unexpected response:`, 'yellow');
      console.log(JSON.stringify(deposit2.error, null, 2));
    }

    // Test 3: Check limit status
    log(`\nTest 3: Checking current limit status...`, 'yellow');
    const updatedLimitStatus = await getUserLimitStatus(admin.token, user.id);
    if (updatedLimitStatus) {
      const dailyUsed = parseFloat(updatedLimitStatus.current_usage?.daily_amount_used || 0);
      const monthlyUsed = parseFloat(updatedLimitStatus.current_usage?.monthly_amount_used || 0);
      log(`   Daily Used: ${dailyUsed} / ${maxDaily}`, 'cyan');
      log(`   Monthly Used: ${monthlyUsed} / ${maxMonthly}`, 'cyan');
    }
  }

  log(`\n${'='.repeat(50)}`, 'green');
  log('Test Suite Completed!', 'green');
  log('='.repeat(50), 'green');
}

// Run the test
main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

