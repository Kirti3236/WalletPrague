# Job Application Email Sender - Setup Guide

## Overview
This system sends professional job application emails with your resume attached, with built-in spam prevention and rate limiting (20 emails per day).

## Prerequisites

### 1. Gmail App Password Setup
To send emails through Gmail, you need to create an App Password:

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "Job Application Sender" as the name
6. Click **Generate**
7. Copy the 16-character password (you'll need this)

### 2. Set Environment Variable
Set your Gmail App Password as an environment variable:

```bash
export GMAIL_APP_PASSWORD="your-16-character-app-password"
```

Or add it to your `.bashrc` or `.zshrc`:
```bash
echo 'export GMAIL_APP_PASSWORD="your-16-character-app-password"' >> ~/.bashrc
source ~/.bashrc
```

## Files

- `email-template.html` - Modern HTML email template
- `send-job-emails.js` - Main email sending script
- `Valid Existing Emails.csv` - List of valid email addresses (generated from verification)
- `sent-emails.json` - Tracks sent emails to avoid duplicates
- `Hardik_Sheladiya_CV_Nodejs.pdf` - Your resume (attached to emails)

## Usage

### Test Email First
Before sending to all emails, test with a single email:

```bash
GMAIL_APP_PASSWORD="your-password" node send-job-emails.js --test
```

This will send a test email to: `dhruvisuvagiya38@gmail.com`

### Send Job Application Emails
To send emails to valid email addresses (up to 20 per day):

```bash
GMAIL_APP_PASSWORD="your-password" node send-job-emails.js
```

Or if you've set the environment variable:
```bash
node send-job-emails.js
```

## Features

### ✅ Spam Prevention
- Professional HTML template with proper formatting
- Text version included for better deliverability
- Proper email headers
- 3-second delay between emails
- Limited to 20 emails per day

### ✅ Rate Limiting
- Maximum 20 emails per day
- Automatic tracking of sent emails
- Prevents duplicate sends
- Resets daily

### ✅ Email Tracking
- Tracks all sent emails in `sent-emails.json`
- Prevents sending to the same email twice
- Records date and timestamp of each send

## Daily Workflow

1. **Morning**: Run the script to send up to 20 emails
   ```bash
   node send-job-emails.js
   ```

2. **Check Results**: The script will show:
   - How many emails were sent successfully
   - How many failed
   - Remaining emails to send

3. **Next Day**: Run again to send the next batch

## Troubleshooting

### "Gmail App Password not set"
- Make sure you've set the `GMAIL_APP_PASSWORD` environment variable
- Verify the password is correct (16 characters, no spaces)

### "Email server connection failed"
- Check your internet connection
- Verify your Gmail App Password is correct
- Make sure 2-Step Verification is enabled on your Google account

### "Daily limit reached"
- You've already sent 20 emails today
- Wait until tomorrow to send more
- Or manually edit `sent-emails.json` to reset (not recommended)

### Emails going to spam
- The template is designed to avoid spam triggers
- Make sure you're not sending too many at once (we limit to 20/day)
- Consider warming up your email account by sending a few test emails first

## Email Template Customization

Edit `email-template.html` to customize:
- Colors and styling
- Content and messaging
- Your personal information

## Notes

- The script automatically attaches your resume PDF
- All emails are tracked to prevent duplicates
- The daily limit resets at midnight (based on date)
- Failed emails are logged but won't count toward the daily limit

