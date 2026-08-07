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
  return `Dear ${data.learnerName},

Thank you for registering for ${data.courseTitle} at HouseLink Academy.

REGISTRATION DETAILS
Course: ${data.courseTitle}
Amount: ${data.currency} ${data.amount.toFixed(2)}
Registration ID: ${data.registrationId}

PAYMENT INSTRUCTIONS
${data.paymentInstructions}

NEXT STEPS
1. Complete your payment using the instructions above
2. Upload proof of payment to your learner dashboard
3. Your course access will be activated after payment verification

If you have any questions, please contact our support team.`;
}

export function renderVerificationEmail(data: VerificationEmailData): string {
  return `Dear ${data.userName},

Thank you for signing up for HouseLink Academy!

To complete your registration, please verify your email address by clicking the link below:

${data.verificationLink}

Or copy and paste this link into your browser:
${data.verificationLink}

IMPORTANT:
- This link will expire in 24 hours
- If you did not create an account, please ignore this email`;
}
