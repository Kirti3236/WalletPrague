const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configuration
const EMAIL_CONFIG = {
  user: 'hardiksheladiya98@gmail.com',
  pass: 'llit mmbp zdqr xvgc',
};

const emailTemplateFile = path.join(__dirname, 'email-template.html');
const resumeFile = path.join(__dirname, 'Hardik Sheladiya_Node JS_Resume.pdf');

// Target email
const TARGET_EMAIL = 'hr@questglt.org';

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
async function sendEmail(transporter, toEmail) {
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
        filename: 'Hardik_Sheladiya_Resume.pdf',
        path: resumeFile,
        contentType: 'application/pdf',
      },
    ],
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
    },
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
  console.log(`\n📧 Sending email to: ${TARGET_EMAIL}\n`);

  // Check if resume file exists
  if (!fs.existsSync(resumeFile)) {
    console.error(`❌ Resume file not found: ${resumeFile}`);
    process.exit(1);
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

  // Send email
  const result = await sendEmail(transporter, TARGET_EMAIL);

  if (result.success) {
    console.log('\n✅ Email sent successfully!');
    console.log(`   To: ${TARGET_EMAIL}`);
    console.log(`   Message ID: ${result.messageId}`);
  } else {
    console.log('\n❌ Email failed!');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

