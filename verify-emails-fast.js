const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Read the CSV file
const inputFile = path.join(__dirname, 'Job Emails.csv');
const validOutputFile = path.join(__dirname, 'Valid Existing Emails.csv');
const invalidOutputFile = path.join(__dirname, 'Invalid Non-Existing Emails.csv');

/**
 * Check if domain has MX records (faster check)
 */
async function checkMXRecords(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    // If MX lookup fails, try A record as fallback
    try {
      await dns.resolve4(domain);
      return true; // Domain exists, might accept emails
    } catch (e) {
      return false;
    }
  }
}

/**
 * Verify email with MX record check
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
    return { exists: false, reason: 'No MX records or domain not found' };
  }

  return { exists: true, reason: 'Domain has MX records' };
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
    console.log(`Checking MX records (faster method)...\n`);

    const validEmails = [];
    const invalidEmails = [];
    const domainCache = {}; // Cache domain checks

    // Process emails
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const domain = email.split('@')[1];

      process.stdout.write(`\rProcessing ${i + 1}/${emails.length}: ${email.substring(0, 40)}...`);

      try {
        // Check cache first
        let hasMX;
        if (domainCache[domain] !== undefined) {
          hasMX = domainCache[domain];
        } else {
          const result = await verifyEmail(email);
          hasMX = result.exists;
          domainCache[domain] = hasMX;
        }

        if (hasMX) {
          validEmails.push(email);
        } else {
          invalidEmails.push({ email, reason: 'No MX records or domain not found' });
        }

        // Small delay to avoid overwhelming DNS servers
        if (i < emails.length - 1 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

      } catch (error) {
        console.log(`\n⚠ Error checking ${email}: ${error.message}`);
        invalidEmails.push({ email, reason: `Error: ${error.message}` });
      }
    }

    // Write results
    const validContent = validEmails.join('\n');
    const invalidContent = invalidEmails.map(item => `${item.email},${item.reason}`).join('\n');

    fs.writeFileSync(validOutputFile, validContent, 'utf-8');
    fs.writeFileSync(invalidOutputFile, invalidContent, 'utf-8');

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('=== Email Verification Summary (MX Records Check) ===');
    console.log('='.repeat(60));
    console.log(`Total emails processed: ${emails.length}`);
    console.log(`Valid emails (with MX records): ${validEmails.length}`);
    console.log(`Invalid emails (no MX records): ${invalidEmails.length}`);
    console.log(`\nValid emails saved to: ${validOutputFile}`);
    console.log(`Invalid emails saved to: ${invalidOutputFile}`);

    // Show some invalid examples
    if (invalidEmails.length > 0) {
      console.log('\n=== Sample Invalid Emails ===');
      invalidEmails.slice(0, 20).forEach(({ email, reason }) => {
        console.log(`  ${email} - ${reason}`);
      });
      if (invalidEmails.length > 20) {
        console.log(`  ... and ${invalidEmails.length - 20} more`);
      }
    }

    console.log('\n✅ Verification complete!');
    console.log('\nNote: This checked MX records only. For deeper verification,');
    console.log('use verify-email-existence.js (slower but more accurate).');

  } catch (error) {
    console.error('\n❌ Error processing file:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
verifyEmails();

