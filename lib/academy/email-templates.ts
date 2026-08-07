export interface EmailTemplateData {
  learnerName: string;
  courseTitle: string;
  amount: number;
  currency: string;
  registrationId: string;
  paymentInstructions: string;
}

export interface VerificationEmailData {
  userName: string;
  verificationLink: string;
}

export function renderRegistrationEmail(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - ${data.courseTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .content h2 { color: #10b981; margin-top: 0; }
    .details { background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .details p { margin: 5px 0; }
    .instructions { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .instructions pre { background-color: #ffffff; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 10px 0; }
    .steps { margin: 20px 0; }
    .steps ol { padding-left: 20px; }
    .steps li { margin: 10px 0; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer a { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Registration Confirmation</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.learnerName}</strong>,</p>
      <p>Thank you for registering for <strong>${data.courseTitle}</strong> at HouseLink Academy.</p>
      
      <h2>📋 Registration Details</h2>
      <div class="details">
        <p><strong>Course:</strong> ${data.courseTitle}</p>
        <p><strong>Amount:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
        <p><strong>Registration ID:</strong> ${data.registrationId}</p>
      </div>
      
      <h2>💳 Payment Instructions</h2>
      <div class="instructions">
        <pre>${data.paymentInstructions}</pre>
      </div>
      
      <h2>📝 Next Steps</h2>
      <div class="steps">
        <ol>
          <li>Complete your payment using the instructions above</li>
          <li>Upload proof of payment to your learner dashboard</li>
          <li>Your course access will be activated after payment verification</li>
        </ol>
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HouseLink Academy. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function renderVerificationEmail(data: VerificationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - HouseLink Academy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background-color: #2563eb; }
    .info { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.userName}</strong>,</p>
      <p>Thank you for signing up for HouseLink Academy!</p>
      <p>To complete your registration, please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${data.verificationLink}" class="button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #3b82f6; font-size: 12px;">${data.verificationLink}</p>
      
      <div class="info">
        <p><strong>⚠️ Important:</strong></p>
        <ul>
          <li>This link will expire in 24 hours</li>
          <li>If you did not create an account, please ignore this email</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HouseLink Academy. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
