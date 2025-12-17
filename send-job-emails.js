const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Configuration
const DAILY_EMAIL_LIMIT = 200; // Maximum emails per day
const DELAY_BETWEEN_EMAILS = 3000; // 3 seconds between emails (to avoid spam)
const EMAIL_CONFIG = {
  user: 'hardiksheladiya98@gmail.com',
  // For Gmail, you'll need to use an App Password
  // Go to: Google Account > Security > 2-Step Verification > App passwords
  // Set password as environment variable: export GMAIL_APP_PASSWORD="your-password"
  pass: 'llit mmbp zdqr xvgc', // Use environment variable or set directly here
};

// Files
const validEmailsFile = path.join(__dirname, 'Valid Existing Emails.csv');
const sentEmailsFile = path.join(__dirname, 'sent-emails.json');
const sentEmailsTxtFile = path.join(__dirname, 'sent-emails.txt'); // Simple text file for tracking
const emailTemplateFile = path.join(__dirname, 'email-template.html');
const resumeFile = path.join(__dirname, 'Hardik Sheladiya_Node JS_Resume.pdf');

// Test email (for testing)
const TEST_EMAIL = 'dhruvisuvagiya38@gmail.com';

/**
 * Load sent emails from text file
 */
function loadSentEmailsFromTxt() {
  try {
    if (fs.existsSync(sentEmailsTxtFile)) {
      const content = fs.readFileSync(sentEmailsTxtFile, 'utf-8');
      return new Set(content.split('\n').map(line => line.trim()).filter(line => line.length > 0));
    }
  } catch (error) {
    console.error('Error loading sent emails from txt:', error.message);
  }
  return new Set();
}

/**
 * Load sent emails tracking (JSON for detailed tracking)
 */
function loadSentEmails() {
  try {
    if (fs.existsSync(sentEmailsFile)) {
      const data = fs.readFileSync(sentEmailsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sent emails:', error.message);
  }
  return { sent: [], lastSentDate: null };
}

/**
 * Save sent emails to text file (simple tracking)
 */
function saveSentEmailToTxt(email) {
  try {
    fs.appendFileSync(sentEmailsTxtFile, email + '\n', 'utf-8');
  } catch (error) {
    console.error('Error saving email to txt file:', error.message);
  }
}

/**
 * Save sent emails tracking (JSON for detailed tracking)
 */
function saveSentEmails(data) {
  try {
    fs.writeFileSync(sentEmailsFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving sent emails:', error.message);
  }
}

/**
 * Check if we can send emails today
 */
function canSendToday(sentEmailsData) {
  const today = new Date().toISOString().split('T')[0];

  if (sentEmailsData.lastSentDate !== today) {
    return { canSend: true, count: 0, today };
  }

  const todayCount = sentEmailsData.sent.filter(
    email => email.date === today
  ).length;

  return {
    canSend: todayCount < DAILY_EMAIL_LIMIT,
    count: todayCount,
    today,
  };
}

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
  });
}

/**
 * Read email template
 */
function getEmailTemplate() {
  try {
    return fs.readFileSync(emailTemplateFile, 'utf-8');
  } catch (error) {
    console.error('Error reading email template:', error.message);
    return null;
  }
}

/**
 * Send email
 */
async function sendEmail(transporter, toEmail, isTest = false) {
  const emailTemplate = getEmailTemplate();
  if (!emailTemplate) {
    throw new Error('Email template not found');
  }

  const mailOptions = {
    from: `"Hardik Sheladiya" <${EMAIL_CONFIG.user}>`,
    to: toEmail,
    subject: 'Application for Backend Developer Position',
    html: emailTemplate,
    attachments: [
      {
        filename: 'Hardik_Sheladiya_CV_Nodejs.pdf',
        path: resumeFile,
        contentType: 'application/pdf',
      },
    ],
    // Spam prevention headers
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
    },
    // Text version for better deliverability
    text: `Dear Hiring Manager,

I am writing to express my interest in the Backend Developer position. With 3+ years of experience, I have built production-ready backend systems for SaaS platforms, payment processing systems, and distributed file storage solutions, leveraging Node.js for high-performance server-side applications, Express.js for flexible RESTful APIs, and Nest.js for enterprise-grade microservices with dependency injection and modular architecture.

Key Expertise:
- Built scalable microservices using Nest.js with TypeScript, leveraging dependency injection, decorators, and modular architecture for maintainable enterprise applications
- Developed RESTful APIs and middleware with Express.js, implementing authentication, validation, error handling, and rate limiting
- Database expertise: PostgreSQL and MySQL for relational data, MongoDB for document storage, and Redis for caching and real-time features
- Containerized applications with Docker, orchestrated deployments, and implemented CI/CD pipelines for automated testing and deployment

I follow clean code principles, write comprehensive tests, and prioritize performance optimization. I thrive in agile environments and collaborate effectively with cross-functional teams to deliver solutions that balance technical excellence with business needs.

Please find my resume attached for your review. I would welcome the opportunity to discuss how my experience can contribute to your team's success.

Thank you for your consideration.

Best regards,
Hardik Sheladiya
Backend Developer
hardiksheladiya98@gmail.com | +91 89803 50898`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent successfully to ${toEmail}`);
    if (isTest) {
      console.log(`  Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`✗ Failed to send email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  // Check for Gmail App Password
  if (!EMAIL_CONFIG.pass) {
    console.error('\n❌ Error: Gmail App Password not set!');
    console.log('\nTo send emails, you need to:');
    console.log('1. Go to your Google Account settings');
    console.log('2. Enable 2-Step Verification');
    console.log('3. Generate an App Password');
    console.log('4. Set it as environment variable: export GMAIL_APP_PASSWORD="your-app-password"');
    console.log('\nOr run: GMAIL_APP_PASSWORD="your-password" node send-job-emails.js\n');
    process.exit(1);
  }

  // Check if resume file exists
  if (!fs.existsSync(resumeFile)) {
    console.error(`❌ Resume file not found: ${resumeFile}`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test') || args.includes('-t');

  if (isTestMode) {
    console.log('\n🧪 TEST MODE: Sending test email...\n');
    const transporter = createTransporter();
    const result = await sendEmail(transporter, TEST_EMAIL, true);

    if (result.success) {
      console.log('\n✅ Test email sent successfully!');
      console.log(`   To: ${TEST_EMAIL}`);
    } else {
      console.log('\n❌ Test email failed!');
    }
    return;
  }

  // Load sent emails tracking
  const sentEmailsData = loadSentEmails();
  const { canSend, count, today } = canSendToday(sentEmailsData);

  if (!canSend) {
    console.log(`\n⚠️  Daily limit reached! Already sent ${count} emails today (${today})`);
    console.log(`   Limit: ${DAILY_EMAIL_LIMIT} emails per day`);
    console.log(`   Try again tomorrow or reset the tracking file.\n`);
    return;
  }

  // Load valid emails
  if (!fs.existsSync(validEmailsFile)) {
    console.error(`❌ Valid emails file not found: ${validEmailsFile}`);
    console.log('Please run verify-email-existence.js first to generate valid emails.');
    process.exit(1);
  }

  const validEmailsContent = fs.readFileSync(validEmailsFile, 'utf-8');
  const allEmails = validEmailsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Load sent emails from text file (simple tracking)
  const sentEmailsTxtSet = loadSentEmailsFromTxt();

  // Filter out already sent emails (check both JSON and text file)
  const sentEmailsSet = new Set(sentEmailsData.sent.map(e => e.email));
  // Combine both sets
  const allSentEmailsSet = new Set([...sentEmailsSet, ...sentEmailsTxtSet]);
  const emailsToSend = allEmails.filter(email => !allSentEmailsSet.has(email));

  if (emailsToSend.length === 0) {
    console.log('\n✅ All emails have been sent!');
    return;
  }

  const remainingToday = DAILY_EMAIL_LIMIT - count;
  const emailsToSendToday = emailsToSend.slice(0, remainingToday);

  console.log('\n' + '='.repeat(60));
  console.log('📧 Job Application Email Sender');
  console.log('='.repeat(60));
  console.log(`Total valid emails: ${allEmails.length}`);
  console.log(`Already sent: ${allSentEmailsSet.size} (tracked in sent-emails.txt)`);
  console.log(`Remaining: ${emailsToSend.length}`);
  console.log(`Daily limit: ${DAILY_EMAIL_LIMIT}`);
  console.log(`Already sent today: ${count}`);
  console.log(`Will send now: ${emailsToSendToday.length}`);
  console.log(`Delay between emails: ${DELAY_BETWEEN_EMAILS}ms`);
  console.log('='.repeat(60) + '\n');

  if (emailsToSendToday.length === 0) {
    console.log('No emails to send today (limit reached).\n');
    return;
  }

  // Create transporter
  const transporter = createTransporter();

  // Verify connection
  try {
    await transporter.verify();
    console.log('✓ Email server connection verified\n');
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    process.exit(1);
  }

  // Send emails
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < emailsToSendToday.length; i++) {
    const email = emailsToSendToday[i];
    console.log(`[${i + 1}/${emailsToSendToday.length}] Sending to: ${email}...`);

    const result = await sendEmail(transporter, email);

    if (result.success) {
      successCount++;
      sentEmailsData.sent.push({
        email,
        date: today,
        timestamp: new Date().toISOString(),
        messageId: result.messageId,
      });
      // Save to text file (simple tracking)
      saveSentEmailToTxt(email);
    } else {
      failCount++;
    }

    // Update last sent date
    sentEmailsData.lastSentDate = today;

    // Save progress after each email
    saveSentEmails(sentEmailsData);

    // Delay between emails (except for the last one)
    if (i < emailsToSendToday.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Successfully sent: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total sent today: ${count + successCount}/${DAILY_EMAIL_LIMIT}`);
  console.log(`Remaining emails: ${emailsToSend.length - successCount}`);
  console.log('='.repeat(60) + '\n');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

