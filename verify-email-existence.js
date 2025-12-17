const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const emailExistence = require('email-existence');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Configuration
const DELAY_BETWEEN_CHECKS = 200; // milliseconds between email checks (increased to avoid rate limiting)
const SMTP_TIMEOUT = 15000; // 15 seconds timeout for SMTP checks (increased for better accuracy)
const BATCH_SIZE = 50; // Process in batches and save progress
const RETRY_COUNT = 2; // Number of retries for uncertain results

// Read the CSV file
const inputFile = path.join(__dirname, 'Job Emails.csv');
const validOutputFile = path.join(__dirname, 'Valid Existing Emails.csv');
const invalidOutputFile = path.join(__dirname, 'Invalid Non-Existing Emails.csv');
const progressFile = path.join(__dirname, 'email-verification-progress.json');

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
      // On timeout, retry if we haven't exceeded retry count
      if (retry < RETRY_COUNT) {
        resolve(verifyEmailExistence(email, retry + 1));
      } else {
        resolve({ exists: false, reason: 'Timeout after retries' });
      }
    }, SMTP_TIMEOUT);

    emailExistence.check(email, (error, result) => {
      clearTimeout(timeout);
      if (error) {
        // Check for specific error messages that indicate non-existent email
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
          // Retry on timeout if we haven't exceeded retry count
          if (retry < RETRY_COUNT) {
            shouldRetry = true;
          }
        } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
          reason = 'Connection refused or domain not found';
        } else {
          reason = errorMsg;
        }
        
        if (shouldRetry) {
          resolve(verifyEmailExistence(email, retry + 1));
        } else {
          resolve({ exists: false, reason });
        }
      } else {
        // If result is false, it means email doesn't exist
        // If result is true, we still want to be cautious
        if (result === false) {
          resolve({ exists: false, reason: 'Address not found' });
        } else if (result === true) {
          // Double-check: if we got true but want to be more conservative, we could retry
          resolve({ exists: true, reason: 'Verified' });
        } else {
          // Uncertain result - treat as invalid to be safe
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
  // First check format
  if (!emailRegex.test(email)) {
    return { exists: false, reason: 'Invalid format' };
  }

  // Extract domain
  const domain = email.split('@')[1];
  if (!domain) {
    return { exists: false, reason: 'No domain' };
  }

  // Check MX records
  const hasMX = await checkMXRecords(domain);
  if (!hasMX) {
    return { exists: false, reason: 'No MX records' };
  }

  // Attempt SMTP verification
  const smtpResult = await verifyEmailExistence(email);
  return smtpResult;
}

/**
 * Load progress if exists
 */
function loadProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      const data = fs.readFileSync(progressFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No previous progress found, starting fresh');
  }
  return { processed: [], lastIndex: -1 };
}

/**
 * Save progress
 */
function saveProgress(progress) {
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Main verification function
 */
async function verifyEmails() {
  try {
    // Read all emails
    const fileContent = fs.readFileSync(inputFile, 'utf-8');
    const emails = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`Total emails to verify: ${emails.length}`);
    console.log(`Delay between checks: ${DELAY_BETWEEN_CHECKS}ms`);
    console.log(`This may take a while...\n`);

    // Load previous progress
    const progress = loadProgress();
    const processedEmails = new Set(progress.processed);
    let startIndex = progress.lastIndex + 1;

    const validEmails = [];
    const invalidEmails = [];
    let processed = 0;
    let skipped = 0;

    // Process emails
    for (let i = startIndex; i < emails.length; i++) {
      const email = emails[i];

      // Skip if already processed
      if (processedEmails.has(email)) {
        skipped++;
        continue;
      }

      process.stdout.write(`\rProcessing ${i + 1}/${emails.length}: ${email}...`);

      try {
        const result = await verifyEmail(email);
        
        if (result.exists) {
          validEmails.push(email);
          console.log(`\n✓ Valid: ${email}`);
        } else {
          invalidEmails.push({ email, reason: result.reason });
          console.log(`\n✗ Invalid: ${email} (${result.reason})`);
        }

        processedEmails.add(email);
        processed++;

        // Save progress every BATCH_SIZE emails
        if (processed % BATCH_SIZE === 0) {
          saveProgress({
            processed: Array.from(processedEmails),
            lastIndex: i
          });
          console.log(`\n💾 Progress saved (${processed} processed)`);
        }

        // Delay between checks to avoid rate limiting
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHECKS));
        }

      } catch (error) {
        console.log(`\n⚠ Error checking ${email}: ${error.message}`);
        invalidEmails.push({ email, reason: `Error: ${error.message}` });
        processedEmails.add(email);
        processed++;
      }
    }

    // Write results
    const validContent = validEmails.join('\n');
    const invalidContent = invalidEmails.map(item => `${item.email},${item.reason}`).join('\n');

    fs.writeFileSync(validOutputFile, validContent, 'utf-8');
    fs.writeFileSync(invalidOutputFile, invalidContent, 'utf-8');

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('=== Email Verification Summary ===');
    console.log('='.repeat(60));
    console.log(`Total emails processed: ${emails.length}`);
    console.log(`Newly processed: ${processed}`);
    console.log(`Skipped (already processed): ${skipped}`);
    console.log(`Valid existing emails: ${validEmails.length}`);
    console.log(`Invalid/non-existing emails: ${invalidEmails.length}`);
    console.log(`\nValid emails saved to: ${validOutputFile}`);
    console.log(`Invalid emails saved to: ${invalidOutputFile}`);

    // Show some invalid examples
    if (invalidEmails.length > 0) {
      console.log('\n=== Sample Invalid Emails ===');
      invalidEmails.slice(0, 10).forEach(({ email, reason }) => {
        console.log(`  ${email} - ${reason}`);
      });
      if (invalidEmails.length > 10) {
        console.log(`  ... and ${invalidEmails.length - 10} more`);
      }
    }

    // Clean up progress file if done
    if (processed + skipped === emails.length) {
      if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
        console.log('\n✅ Verification complete! Progress file cleaned up.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error processing file:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
verifyEmails();

