/**
 * Simplified Deposit & Limit Test
 * Tests deposits for users with different policies
 * Usage: node test-deposits-simple.js [admin_dni] [admin_password]
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

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

async function login(dni, password) {
  try {
    const response = await axios.post(`${BASE_URL}/${API_VERSION}/public/auth/login`, {
      user_DNI_number: dni,
      user_password: password,
    });

    if (response.data.data && response.data.data.accessToken) {
      return {
        token: response.data.data.accessToken,
        id: response.data.data.user.id,
        role: response.data.data.user.user_role,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getAllUsers(token) {
  try {
    const response = await axios.get(`${BASE_URL}/${API_VERSION}/private/user/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Handle both array and object responses
    const data = response.data;
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    log(`   ⚠️  Could not get users: ${error.response?.status} ${error.response?.statusText}`, 'yellow');
    return [];
  }
}

async function getAllPolicies(token) {
  try {
    const response = await axios.get(`${BASE_URL}/${API_VERSION}/private/admin/limits/policies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.policies || [];
  } catch (error) {
    return [];
  }
}

async function assignPolicy(adminToken, userId, policyCode) {
  try {
    const response = await axios.post(
      `${BASE_URL}/${API_VERSION}/private/admin/limits/assign`,
      { user_id: userId, policy_code: policyCode },
      { headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

async function getUserLimitStatus(adminToken, userId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_VERSION}/private/admin/limits/user/${userId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
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
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    // Handle nested response format: data.data.wallet
    const data = response.data;
    if (data.data && data.data.data && data.data.data.wallet) {
      return data.data.data.wallet;
    }
    if (data.data && data.data.wallet) {
      return data.data.wallet;
    }
    if (data.wallet) {
      return data.wallet;
    }
    if (data.data && data.data.id) {
      return data.data; // Wallet might be directly in data
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getUserPaymentMethods(userToken, userId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_VERSION}/private/payment-methods/cards/${userId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    // Handle different response formats
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
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
      { headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  log('\n========================================', 'blue');
  log('YaPague - Deposit & Limit Test Suite', 'blue');
  log('========================================\n', 'blue');

  // Get admin credentials
  const args = process.argv.slice(2);
  let adminDNI = args[0] || process.env.ADMIN_DNI;
  let adminPassword = args[1] || process.env.ADMIN_PASSWORD;

  if (!adminDNI) {
    adminDNI = await askQuestion('Enter Admin DNI (or press Enter for 87654321): ') || '87654321';
  }

  if (!adminPassword) {
    adminPassword = await askQuestion('Enter Admin Password (or press Enter for TestPassword123!): ') || 'TestPassword123!';
  }

  // Step 1: Login as Admin
  logStep(1, 'Logging in as Admin');
  let admin = await login(adminDNI, adminPassword);

  if (!admin) {
    log('❌ Admin login failed. Trying alternative approach...', 'red');
    log('   Attempting to use first available user...', 'yellow');
    
    // Try to login with first user from database
    const testUsers = [
      { dni: '12345678', password: 'TestPassword123!' },
      { dni: '87654321', password: 'TestPassword123!' },
    ];

    for (const testUser of testUsers) {
      admin = await login(testUser.dni, testUser.password);
      if (admin) {
        log(`✅ Logged in as user: ${testUser.dni}`, 'green');
        if (admin.role !== 'admin') {
          log('⚠️  User is not admin. Some operations may fail.', 'yellow');
        }
        break;
      }
    }

    if (!admin) {
      log('❌ Could not login. Please check credentials.', 'red');
      process.exit(1);
    }
  } else {
    log(`✅ Admin logged in (ID: ${admin.id}, Role: ${admin.role})`, 'green');
  }

  // Step 2: Get all users (or use current user if not admin)
  logStep(2, 'Fetching users');
  let users = await getAllUsers(admin.token);
  
  if (!Array.isArray(users) || users.length === 0) {
    if (admin.role !== 'admin') {
      log('⚠️  Not admin - using current user only', 'yellow');
      // Create a user object from admin info
      users = [{ id: admin.id, user_DNI_number: adminDNI, user_first_name: 'Test', user_last_name: 'User' }];
    } else {
      log('❌ No users found. Cannot proceed with tests.', 'red');
      process.exit(1);
    }
  }
  
  log(`✅ Found ${users.length} user(s)`, 'green');

  // Step 3: Get all policies (only if admin)
  let policies = [];
  if (admin.role === 'admin') {
    logStep(3, 'Fetching all limit policies');
    policies = await getAllPolicies(admin.token);
    log(`✅ Available Policies:`, 'green');
    policies.forEach((policy) => {
      log(
        `   - ${policy.policy_code}: Max Txn=${policy.max_transaction_amount}, Daily=${policy.max_daily_amount}, Monthly=${policy.max_monthly_amount}`,
        'cyan'
      );
    });
  } else {
    log('⚠️  Not admin - skipping policy operations', 'yellow');
  }

  // Step 4: Assign policies (only if admin)
  if (admin.role === 'admin' && policies.length > 0) {
    logStep(4, 'Assigning policies to users');
    const policyCodes = ['standard', 'premium', 'vip', 'restricted'];
    let policyIndex = 0;

    for (const user of users.slice(0, 10)) { // Limit to first 10 users
      const policyCode = policyCodes[policyIndex % policyCodes.length];
      log(`   Assigning ${policyCode} to ${user.user_first_name} ${user.user_last_name}...`, 'cyan');

      const result = await assignPolicy(admin.token, user.id, policyCode);
      if (result && result.id) {
        log(`   ✅ Policy assigned`, 'green');
      }

      policyIndex++;
    }
  }

  // Step 5: Test deposits for first few users
  logStep(5, 'Testing deposits with limit validation');
  // Test with the logged-in user first, then others
  const testUsers = users.filter(u => u.id === admin.id).length > 0 
    ? [users.find(u => u.id === admin.id), ...users.filter(u => u.id !== admin.id)].slice(0, 3)
    : users.slice(0, 3);

  for (const user of testUsers) {
    log(`\n${'-'.repeat(50)}`, 'blue');
    log(`Testing User: ${user.user_first_name} ${user.user_last_name} (${user.user_DNI_number})`, 'blue');
    log('-'.repeat(50), 'blue');

    // Get user's limit status
    let limitStatus = null;
    if (admin.role === 'admin') {
      limitStatus = await getUserLimitStatus(admin.token, user.id);
    }

    if (limitStatus && limitStatus.has_policy) {
      const policy = limitStatus.policy;
      const maxTxn = parseFloat(policy.max_transaction_amount);
      log(`Policy: ${policy.policy_code}`, 'cyan');
      log(`Limits: Max Txn=${maxTxn}, Daily=${policy.max_daily_amount}, Monthly=${policy.max_monthly_amount}`, 'cyan');
    } else {
      log('⚠️  User has no policy assigned', 'yellow');
    }

    // Login as user (try common password)
    const userAuth = await login(user.user_DNI_number, 'TestPassword123!');
    if (!userAuth) {
      log(`❌ Could not login as user ${user.user_DNI_number}`, 'red');
      continue;
    }

    // Get wallet
    const wallet = await getUserWallet(userAuth.token);
    if (!wallet || !wallet.id) {
      log(`❌ Wallet not found`, 'red');
      continue;
    }

    log(`Wallet ID: ${wallet.id}`, 'cyan');

    // Get payment methods
    let paymentMethods = await getUserPaymentMethods(userAuth.token, user.id);
    if (!paymentMethods || paymentMethods.length === 0) {
      log(`⚠️  No payment method found, attempting to create one...`, 'yellow');
      // Try to create a payment method
      try {
        const createResponse = await axios.post(
          `${BASE_URL}/${API_VERSION}/private/payment-methods/cards`,
          {
            user_id: user.id,
            brand: 'VISA',
            last4: '1111',
            expiry_month: 12,
            expiry_year: 2025,
          },
          { headers: { Authorization: `Bearer ${userAuth.token}`, 'Content-Type': 'application/json' } }
        );
        // Payment method created, fetch it from the list
        if (createResponse.data && createResponse.data.success !== false) {
          log(`   ✅ Payment method created, fetching...`, 'green');
          // Wait a bit and fetch the payment methods
          await new Promise(resolve => setTimeout(resolve, 500));
          paymentMethods = await getUserPaymentMethods(userAuth.token, user.id);
          if (paymentMethods && paymentMethods.length > 0) {
            log(`   ✅ Payment method retrieved`, 'green');
          }
        }
      } catch (error) {
        log(`   ❌ Could not create payment method: ${error.response?.data?.message || error.message}`, 'red');
        if (error.response?.data) {
          log(`   Error details: ${JSON.stringify(error.response.data)}`, 'yellow');
        }
        log(`   ⚠️  Skipping deposit tests for this user`, 'yellow');
        continue;
      }
    }
    
    if (!paymentMethods || paymentMethods.length === 0) {
      log(`⚠️  No payment method available, skipping deposit tests`, 'yellow');
      continue;
    }

    const paymentMethodId = paymentMethods[0].id || paymentMethods[0].data?.id;
    log(`Payment Method ID: ${paymentMethodId}\n`, 'cyan');

    // Test deposit
    const testAmount = limitStatus && limitStatus.policy ? Math.floor(parseFloat(limitStatus.policy.max_transaction_amount) * 0.5) || 100 : 100;
    log(`Test: Deposit within limit (${testAmount} LPS)`, 'yellow');

    const limitCheck = await checkLimit(userAuth.token, testAmount);
    if (limitCheck) {
      log(`   Limit Check: ${limitCheck.allowed ? '✅ Allowed' : '❌ Not Allowed'}`, limitCheck.allowed ? 'green' : 'red');
    }

    const deposit = await depositFromCard(
      userAuth.token,
      user.id,
      wallet.id,
      paymentMethodId,
      testAmount,
      'Test deposit'
    );

    if (deposit.success) {
      log(`   ✅ Deposit successful`, 'green');
    } else if (deposit.status === 429 || deposit.error?.code === 'TXN_004') {
      log(`   ❌ Limit exceeded`, 'red');
      log(`   Message: ${deposit.error?.message || 'Limit exceeded'}`, 'yellow');
    } else {
      log(`   ⚠️  Deposit response:`, 'yellow');
      console.log(JSON.stringify(deposit.error, null, 2));
    }
  }

  log(`\n${'='.repeat(50)}`, 'green');
  log('Test Suite Completed!', 'green');
  log('='.repeat(50), 'green');
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

