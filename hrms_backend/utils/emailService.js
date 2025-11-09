import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

/**
 * Email service using API-based providers (Resend, SendGrid, Mailgun, etc.)
 * No SMTP configuration required - uses HTTP API calls
 */

/**
 * Sends email using API-based email service
 * Supports multiple providers: Resend, SendGrid, Mailgun, AWS SES
 * @param {Object} emailData - Email data object
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content
 * @param {string} emailData.text - Plain text content
 * @param {string} emailData.from - Sender email (optional)
 * @returns {Promise<boolean>} - Success status
 */
const sendEmailViaAPI = async (emailData) => {
    const emailProvider = process.env.EMAIL_PROVIDER || 'resend'; // resend, sendgrid, mailgun, aws-ses
    
    try {
        switch (emailProvider.toLowerCase()) {
            case 'resend':
                return await sendViaResend(emailData);
            case 'sendgrid':
                return await sendViaSendGrid(emailData);
            case 'mailgun':
                return await sendViaMailgun(emailData);
            case 'aws-ses':
                return await sendViaAWSSES(emailData);
            default:
                console.warn(`Unknown email provider: ${emailProvider}. Using Resend as fallback.`);
                return await sendViaResend(emailData);
        }
    } catch (error) {
        console.error(`Error sending email via ${emailProvider}:`, error);
        return false;
    }
};

/**
 * Send email via Resend API
 * @param {Object} emailData - Email data
 * @returns {Promise<boolean>} - Success status
 */
const sendViaResend = async (emailData) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY not configured');
        return false;
    }

    const fromEmail = emailData.from || process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'noreply@hrms.com';
    const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'HRMS System';

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('Email sent via Resend:', result.id);
    return true;
};

/**
 * Send email via SendGrid API
 * @param {Object} emailData - Email data
 * @returns {Promise<boolean>} - Success status
 */
const sendViaSendGrid = async (emailData) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error('SENDGRID_API_KEY not configured');
        return false;
    }

    const fromEmail = emailData.from || process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@hrms.com';
    const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'HRMS System';

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            personalizations: [{
                to: [{ email: emailData.to }],
            }],
            from: {
                email: fromEmail,
                name: fromName,
            },
            subject: emailData.subject,
            content: [
                {
                    type: 'text/plain',
                    value: emailData.text,
                },
                {
                    type: 'text/html',
                    value: emailData.html,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${error}`);
    }

    console.log('Email sent via SendGrid');
    return true;
};

/**
 * Send email via Mailgun API
 * @param {Object} emailData - Email data
 * @returns {Promise<boolean>} - Success status
 */
const sendViaMailgun = async (emailData) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    
    if (!apiKey || !domain) {
        console.error('MAILGUN_API_KEY or MAILGUN_DOMAIN not configured');
        return false;
    }

    const fromEmail = emailData.from || process.env.EMAIL_FROM || `noreply@${domain}`;
    const fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'HRMS System';

    const formData = new URLSearchParams();
    formData.append('from', `${fromName} <${fromEmail}>`);
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    formData.append('text', emailData.text);
    formData.append('html', emailData.html);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mailgun API error: ${error}`);
    }

    const result = await response.json();
    console.log('Email sent via Mailgun:', result.id);
    return true;
};

/**
 * Send email via AWS SES API
 * @param {Object} emailData - Email data
 * @returns {Promise<boolean>} - Success status
 */
const sendViaAWSSES = async (emailData) => {
    // AWS SES requires AWS SDK - this is a simplified version
    // For production, use @aws-sdk/client-ses
    console.warn('AWS SES requires AWS SDK. Please install @aws-sdk/client-ses for full support.');
    
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';
    
    if (!accessKeyId || !secretAccessKey) {
        console.error('AWS credentials not configured');
        return false;
    }

    // Note: Full AWS SES implementation requires AWS SDK
    // This is a placeholder - implement with @aws-sdk/client-ses for production
    console.warn('AWS SES implementation requires @aws-sdk/client-ses package');
    return false;
};

/**
 * Sends welcome email with login credentials to new employee
 * @param {string} email - Employee email
 * @param {string} firstName - Employee first name
 * @param {string} employeeId - Generated employee ID
 * @param {string} password - Generated password
 * @returns {Promise<boolean>} - Success status
 */
export const sendWelcomeEmail = async (email, firstName, employeeId, password) => {
    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .credentials { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5; border-radius: 4px; }
                    .credential-item { margin: 10px 0; }
                    .label { font-weight: bold; color: #666; }
                    .value { font-family: monospace; font-size: 16px; color: #4F46E5; padding: 5px 10px; background-color: #f0f0f0; border-radius: 3px; }
                    .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to HRMS!</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${firstName},</p>
                        <p>Your account has been successfully created in the HRMS system. Please find your login credentials below:</p>
                        
                        <div class="credentials">
                            <div class="credential-item">
                                <span class="label">Login ID (Employee ID):</span><br>
                                <span class="value">${employeeId}</span>
                            </div>
                            <div class="credential-item">
                                <span class="label">Email:</span><br>
                                <span class="value">${email}</span>
                            </div>
                            <div class="credential-item">
                                <span class="label">Temporary Password:</span><br>
                                <span class="value">${password}</span>
                            </div>
                        </div>

                        <div class="warning">
                            <strong>⚠️ Important Security Notice:</strong><br>
                            For your security, please change your password immediately after your first login.
                        </div>

                        <p>You can now log in to the system using your email or employee ID along with the temporary password provided above.</p>
                        
                        <p>If you have any questions or need assistance, please contact the HR department.</p>
                        
                        <p>Best regards,<br>HRMS Administration Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textContent = `
Welcome to HRMS!

Dear ${firstName},

Your account has been successfully created in the HRMS system. Please find your login credentials below:

Login ID (Employee ID): ${employeeId}
Email: ${email}
Temporary Password: ${password}

IMPORTANT: For your security, please change your password immediately after your first login.

You can now log in to the system using your email or employee ID along with the temporary password provided above.

If you have any questions or need assistance, please contact the HR department.

Best regards,
HRMS Administration Team

---
This is an automated email. Please do not reply to this message.
        `;

        const emailSent = await sendEmailViaAPI({
            to: email,
            subject: 'Welcome to HRMS - Your Account Credentials',
            html: htmlContent,
            text: textContent,
        });

        return emailSent;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Don't throw error - email failure shouldn't prevent user creation
        return false;
    }
};

/**
 * Sends payslip notification email to employee
 * @param {string} email - Employee email
 * @param {string} firstName - Employee first name
 * @param {string} month - Month name
 * @param {number} year - Year
 * @param {string} payslipId - Payslip ID for download link
 * @returns {Promise<boolean>} - Success status
 */
export const sendPayslipEmail = async (email, firstName, month, year, payslipId) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
        const payslipUrl = `${baseUrl}/payroll/payslips/${payslipId}`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Payslip is Ready</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${firstName},</p>
                        <p>Your payslip for <strong>${month} ${year}</strong> has been generated and is now available.</p>
                        <p>You can view and download your payslip by clicking the button below:</p>
                        <p style="text-align: center;">
                            <a href="${payslipUrl}" class="button">View Payslip</a>
                        </p>
                        <p>If you have any questions about your payslip, please contact the HR or Payroll department.</p>
                        <p>Best regards,<br>HRMS Payroll Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textContent = `
Your Payslip is Ready

Dear ${firstName},

Your payslip for ${month} ${year} has been generated and is now available.

View your payslip: ${payslipUrl}

If you have any questions about your payslip, please contact the HR or Payroll department.

Best regards,
HRMS Payroll Team

---
This is an automated email. Please do not reply to this message.
        `;

        const emailSent = await sendEmailViaAPI({
            to: email,
            subject: `Your Payslip for ${month} ${year} - HRMS`,
            html: htmlContent,
            text: textContent,
        });

        return emailSent;
    } catch (error) {
        console.error('Error sending payslip email:', error);
        return false;
    }
};
