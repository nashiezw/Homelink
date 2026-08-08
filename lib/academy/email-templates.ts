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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - HouseLink Academy</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: white;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 20px 0;
    }
    .message {
      color: #64748b;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f8fafc;
      border-left: 4px solid #0ea5e9;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-box h3 {
      margin: 0 0 15px 0;
      color: #0ea5e9;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-item {
      margin: 10px 0;
      color: #475569;
    }
    .info-label {
      font-weight: 600;
      color: #334155;
    }
    .payment-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .payment-box h3 {
      margin: 0 0 15px 0;
      color: #d97706;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-text {
      color: #92400e;
      white-space: pre-line;
      line-height: 1.8;
    }
    .steps-box {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .steps-box h3 {
      margin: 0 0 15px 0;
      color: #059669;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .step-item {
      margin: 12px 0;
      color: #065f46;
      padding-left: 25px;
      position: relative;
    }
    .step-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #94a3b8;
      font-size: 14px;
      margin: 5px 0;
    }
    .footer-link {
      color: #0ea5e9;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .content {
        padding: 25px 20px;
      }
      .header {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="logo">HouseLink</h1>
    </div>
    
    <div class="content">
      <h2 class="greeting">Welcome to HouseLink Academy, ${data.learnerName}!</h2>
      
      <p class="message">
        Thank you for registering for <strong>${data.courseTitle}</strong>. We're excited to have you join our community of learners.
      </p>
      
      <div class="info-box">
        <h3>Registration Details</h3>
        <div class="info-item">
          <span class="info-label">Course:</span> ${data.courseTitle}
        </div>
        <div class="info-item">
          <span class="info-label">Amount:</span> ${data.currency} ${data.amount.toFixed(2)}
        </div>
        <div class="info-item">
          <span class="info-label">Registration ID:</span> ${data.registrationId}
        </div>
      </div>
      
      <div class="payment-box">
        <h3>Payment Instructions</h3>
        <div class="payment-text">${data.paymentInstructions.replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="steps-box">
        <h3>Next Steps</h3>
        <div class="step-item">Complete your payment using the instructions above</div>
        <div class="step-item">Upload proof of payment to your learner dashboard</div>
        <div class="step-item">Your course access will be activated after payment verification</div>
      </div>
      
      <p class="message">
        If you have any questions or need assistance, please don't hesitate to contact our support team.
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-text">© 2024 HouseLink Academy. All rights reserved.</p>
      <p class="footer-text">
        <a href="https://houselinkzim.co.zw" class="footer-link">houselinkzim.co.zw</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderVerificationEmail(data: VerificationEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - HouseLink Academy</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: white;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 20px 0;
    }
    .message {
      color: #64748b;
      margin-bottom: 30px;
    }
    .verify-button {
      display: inline-block;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 30px 0;
      box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);
      transition: transform 0.2s;
    }
    .verify-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(14, 165, 233, 0.4);
    }
    .link-text {
      color: #64748b;
      font-size: 14px;
      margin: 20px 0;
      word-break: break-all;
    }
    .link-text a {
      color: #0ea5e9;
      text-decoration: none;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .warning-box h3 {
      margin: 0 0 15px 0;
      color: #d97706;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .warning-item {
      margin: 10px 0;
      color: #92400e;
      padding-left: 25px;
      position: relative;
    }
    .warning-item:before {
      content: "⚠";
      position: absolute;
      left: 0;
      color: #f59e0b;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 30px 0;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #94a3b8;
      font-size: 14px;
      margin: 5px 0;
    }
    .footer-link {
      color: #0ea5e9;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .content {
        padding: 25px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .verify-button {
        display: block;
        text-align: center;
        padding: 14px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="logo">HouseLink</h1>
    </div>
    
    <div class="content">
      <h2 class="greeting">Welcome, ${data.userName}!</h2>
      
      <p class="message">
        Thank you for signing up for HouseLink Academy! We're thrilled to have you join our learning community.
      </p>
      
      <p class="message">
        To complete your registration and secure your account, please verify your email address by clicking the button below:
      </p>
      
      <div style="text-align: center;">
        <a href="${data.verificationLink}" class="verify-button">Verify Email Address</a>
      </div>
      
      <p class="link-text">
        Or copy and paste this link into your browser:<br>
        <a href="${data.verificationLink}">${data.verificationLink}</a>
      </p>
      
      <div class="warning-box">
        <h3>Important Information</h3>
        <div class="warning-item">This verification link will expire in 24 hours</div>
        <div class="warning-item">If you did not create an account, please ignore this email</div>
      </div>
      
      <p class="message">
        Once verified, you'll have full access to all HouseLink Academy features and can start your learning journey immediately.
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-text">© 2024 HouseLink Academy. All rights reserved.</p>
      <p class="footer-text">
        <a href="https://houselinkzim.co.zw" class="footer-link">houselinkzim.co.zw</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
