const fs = require('fs');
const path = require('path');

// Email validation regex (same as used in the codebase)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Read the CSV file
const inputFile = path.join(__dirname, 'Job Emails.csv');
const outputFile = path.join(__dirname, 'Valid Job Emails.csv');

try {
  // Read all lines from the CSV
  const fileContent = fs.readFileSync(inputFile, 'utf-8');
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`Total lines read: ${lines.length}`);
  
  // Validate emails
  const validEmails = [];
  const invalidEmails = [];
  
  lines.forEach((email, index) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && emailRegex.test(trimmedEmail)) {
      validEmails.push(trimmedEmail);
    } else {
      invalidEmails.push({ line: index + 1, email: trimmedEmail });
    }
  });
  
  // Write valid emails to output file
  const validEmailsContent = validEmails.join('\n');
  fs.writeFileSync(outputFile, validEmailsContent, 'utf-8');
  
  // Print summary
  console.log('\n=== Email Validation Summary ===');
  console.log(`Total emails processed: ${lines.length}`);
  console.log(`Valid emails: ${validEmails.length}`);
  console.log(`Invalid emails: ${invalidEmails.length}`);
  console.log(`\nValid emails saved to: ${outputFile}`);
  
  if (invalidEmails.length > 0) {
    console.log('\n=== Invalid Emails (first 20) ===');
    invalidEmails.slice(0, 20).forEach(({ line, email }) => {
      console.log(`Line ${line}: ${email}`);
    });
    if (invalidEmails.length > 20) {
      console.log(`... and ${invalidEmails.length - 20} more invalid emails`);
    }
  }
  
} catch (error) {
  console.error('Error processing file:', error.message);
  process.exit(1);
}

