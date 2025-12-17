const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const emailExistence = require('email-existence');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Configuration
const DELAY_BETWEEN_CHECKS = 300; // milliseconds between email checks (slower for re-verification)
const SMTP_TIMEOUT = 15000; // 15 seconds timeout
const RETRY_COUNT = 2;

// Files
const validEmailsFile = path.join(__dirname, 'Valid Existing Emails.csv');
const reVerifiedValidFile = path.join(__dirname, 'Re-Verified Valid Emails.csv');
const reVerifiedInvalidFile = path.join(__dirname, 'Re-Verified Invalid Emails.csv');

/**
 * Check if domain has MX records
 */
async function checkMXRecords(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Verify email existence using SMTP with retry logic
 */
function verifyEmailExistence(email, retry = 0) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (retry < RETRY_COUNT) {
        resolve(verifyEmailExistence(email, retry + 1));
      } else {
        resolve({ exists: false, reason: 'Timeout after retries' });
      }
    }, SMTP_TIMEOUT);

    emailExistence.check(email, (error, result) => {
      clearTimeout(timeout);
      if (error) {
        const errorMsg = error.message || error.toString() || 'SMTP Error';
        let reason = 'SMTP Error';
        let shouldRetry = false;
        
        if (errorMsg.includes('550') || 
            errorMsg.includes('No such recipient') || 
            errorMsg.includes('Address not found') ||
            errorMsg.includes('User unknown') ||
            errorMsg.includes('mailbox not found') ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('recipient rejected')) {
          reason = 'Address not found (550)';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout') || errorMsg.includes('ETIMEDOUT')) {
          reason = 'Timeout';
          if (retry < RETRY_COUNT) {
            shouldRetry = true;
          }
        } else {
          reason = errorMsg;
        }
        
        if (shouldRetry) {
          resolve(verifyEmailExistence(email, retry + 1));
        } else {
          resolve({ exists: false, reason });
        }
      } else {
        if (result === false) {
          resolve({ exists: false, reason: 'Address not found' });
        } else if (result === true) {
          resolve({ exists: true, reason: 'Verified' });
        } else {
          resolve({ exists: false, reason: 'Uncertain result' });
        }
      }
    });
  });
}

/**
 * Verify email with multiple checks
 */
async function verifyEmail(email) {
  if (!emailRegex.test(email)) {
    return { exists: false, reason: 'Invalid format' };
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return { exists: false, reason: 'No domain' };
  }

  const hasMX = await checkMXRecords(domain);
  if (!hasMX) {
    return { exists: false, reason: 'No MX records' };
  }

  const smtpResult = await verifyEmailExistence(email);
  return smtpResult;
}

/**
 * Main re-verification function
 */
async function reVerifyEmails() {
  try {
    if (!fs.existsSync(validEmailsFile)) {
      console.error(`❌ File not found: ${validEmailsFile}`);
      console.log('Please run verify-email-existence.js first to generate the valid emails file.');
      process.exit(1);
    }

    // Read valid emails
    const fileContent = fs.readFileSync(validEmailsFile, 'utf-8');
    const emails = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`\n🔄 Re-verifying ${emails.length} emails from Valid Existing Emails.csv`);
    console.log(`Delay between checks: ${DELAY_BETWEEN_CHECKS}ms`);
    console.log(`This may take a while...\n`);

    const validEmails = [];
    const invalidEmails = [];

    // Process emails
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      process.stdout.write(`\rProcessing ${i + 1}/${emails.length}: ${email}...`);

      try {
        const result = await verifyEmail(email);
        
        if (result.exists) {
          validEmails.push(email);
          console.log(`\n✓ Still Valid: ${email}`);
        } else {
          invalidEmails.push({ email, reason: result.reason });
          console.log(`\n✗ Now Invalid: ${email} (${result.reason})`);
        }

        // Delay between checks
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHECKS));
        }

      } catch (error) {
        console.log(`\n⚠ Error checking ${email}: ${error.message}`);
        invalidEmails.push({ email, reason: `Error: ${error.message}` });
      }
    }

    // Write results
    const validContent = validEmails.join('\n');
    const invalidContent = invalidEmails.map(item => `${item.email},${item.reason}`).join('\n');

    fs.writeFileSync(reVerifiedValidFile, validContent, 'utf-8');
    fs.writeFileSync(reVerifiedInvalidFile, invalidContent, 'utf-8');

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('=== Re-Verification Summary ===');
    console.log('='.repeat(60));
    console.log(`Total emails re-verified: ${emails.length}`);
    console.log(`Still valid: ${validEmails.length}`);
    console.log(`Now invalid: ${invalidEmails.length}`);
    console.log(`\nRe-verified valid emails saved to: ${reVerifiedValidFile}`);
    console.log(`Re-verified invalid emails saved to: ${reVerifiedInvalidFile}`);

    if (invalidEmails.length > 0) {
      console.log('\n=== Emails That Are Now Invalid ===');
      invalidEmails.slice(0, 20).forEach(({ email, reason }) => {
        console.log(`  ${email} - ${reason}`);
      });
      if (invalidEmails.length > 20) {
        console.log(`  ... and ${invalidEmails.length - 20} more`);
      }
    }

    console.log('\n✅ Re-verification complete!');

  } catch (error) {
    console.error('\n❌ Error processing file:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run re-verification
reVerifyEmails();

