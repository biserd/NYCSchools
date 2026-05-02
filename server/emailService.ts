// Email service for NYC School Ratings using custom Resend API
import { Resend } from 'resend';

// Use custom Resend credentials from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Email format: "Display Name <email@domain.com>"
// The RESEND_FROM_EMAIL env var should contain the full format like "NYC Schools Ratings <hello@nycschoolsratings.com>"
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NYC Schools Ratings <hello@nycschoolsratings.com>';

// Cached Resend client (singleton pattern)
let cachedClient: Resend | null = null;

function getResendClient(): { client: Resend; fromEmail: string } {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  if (!cachedClient) {
    cachedClient = new Resend(RESEND_API_KEY);
  }
  return {
    client: cachedClient,
    fromEmail: RESEND_FROM_EMAIL
  };
}

const ADMIN_EMAIL = 'hello@bigappledigital.nyc';
const CONTACT_EMAIL = 'hello@nycschoolsratings.com';

function logEmail(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[EMAIL_SERVICE ${level}] ${timestamp}`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export async function sendAdminNewCustomerNotification(customerEmail: string, planType: string, amount?: number): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const formattedAmount = amount ? `$${(amount / 100).toFixed(2)}` : 'N/A';
    const planName = planType === 'season_pass' ? 'Season Pass ($29 for 6 months)' : planType;
    
    const result = await client.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: `New Season Pass Customer: ${customerEmail}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">New Customer Alert!</h1>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Customer Email:</strong> ${customerEmail}</p>
            <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${planName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
            <p style="margin: 0;"><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This notification was sent automatically by NYC School Ratings.
          </p>
        </div>
      `,
    });
    
    logEmail('INFO', 'Admin notification sent successfully', { to: ADMIN_EMAIL, customerEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send admin notification', { error: error.message, customerEmail });
    return false;
  }
}

export async function sendWelcomeEmail(customerEmail: string, firstName?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: 'Welcome to NYC School Ratings Season Pass!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to NYC School Ratings!</h1>
            <p style="color: #6b7280; font-size: 16px;">Your Season Pass is now active</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for joining the NYC School Ratings family! Your Season Pass is now active and you have full access to all premium features.
          </p>
          
          <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px;">Your Season Pass Benefits</h2>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">AI Chat Assistant</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Get personalized school recommendations and answers to all your questions
                </span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Side-by-Side School Comparison</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Compare up to 4 schools at once with detailed metrics
                </span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Detailed Score Breakdowns</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Deep dive into test scores, progress metrics, and school climate data
                </span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Lottery & Admissions Calculator</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Understand your odds and plan your application strategy
                </span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Application Tracker</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Keep all your school applications organized in one place
                </span>
              </li>
              <li style="padding: 10px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">District Deep Dives</strong>
                <span style="color: #6b7280; display: block; margin-left: 24px; font-size: 14px;">
                  Explore district-level comparisons and trends
                </span>
              </li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Exploring Schools →
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              Your Season Pass is valid for <strong>6 months</strong>. If you have any questions, 
              just reply to this email or reach out at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
              Best of luck with your school search!<br/>
              <strong>— The NYC School Ratings Team</strong>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'Welcome email sent successfully', { to: customerEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send welcome email', { error: error.message, customerEmail });
    return false;
  }
}

export async function sendNewUserWelcomeEmail(userEmail: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Welcome to NYC School Ratings!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to NYC School Ratings!</h1>
            <p style="color: #6b7280; font-size: 16px;">Your guide to NYC schools starts here</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for joining NYC School Ratings! You now have access to browse and compare over 1,500 NYC public and charter schools.
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">A Note From the Founder</h2>
            <p style="font-size: 15px; line-height: 1.7; color: #374151;">
              I'm the father of two boys on the Upper East Side. Like you, I found myself overwhelmed 
              by the complexity of NYC's school system. I spent countless hours researching schools, 
              comparing test scores, and trying to understand what really matters.
            </p>
            <p style="font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 0;">
              That's why I built NYC School Ratings — <strong>a tool made by a NYC parent, for NYC parents</strong>. 
              I hope it helps your family as much as it's helped mine.
            </p>
          </div>
          
          <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px;">What You Can Do Now</h2>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <span style="margin-left: 10px;">Browse all 1,500+ NYC public and charter schools</span>
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <span style="margin-left: 10px;">View basic school information and ratings</span>
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <span style="margin-left: 10px;">Filter by district, grade level, and programs</span>
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <span style="margin-left: 10px;">Save your favorite schools</span>
              </li>
            </ul>
          </div>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #f59e0b;">
            <h2 style="color: #92400e; margin-top: 0; font-size: 18px;">Unlock Premium Features with Season Pass</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #78350f; margin-bottom: 15px;">
              Get the complete toolkit for your school search — just <strong>$29 for 6 months</strong>:
            </p>
            <ul style="list-style: none; padding: 0; margin: 0 0 15px 0; color: #78350f;">
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <strong>AI Chat Assistant</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Get personalized school recommendations and answers to all your questions</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <strong>Side-by-Side Comparison</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Compare up to 4 schools at once with detailed metrics</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <strong>Detailed Score Breakdowns</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Deep dive into test scores, progress metrics, and school climate data</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <strong>Lottery & Admissions Calculator</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Understand your odds and plan your application strategy</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <strong>Application Tracker</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Keep all your school applications organized in one place</span>
              </li>
              <li style="padding: 10px 0;">
                <strong>District Deep Dives</strong>
                <span style="display: block; font-size: 14px; margin-top: 4px;">Explore district-level comparisons and trends</span>
              </li>
            </ul>
            <div style="text-align: center;">
              <a href="https://nycschoolsratings.com/pricing" 
                 style="background: #f59e0b; color: #78350f; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Season Pass
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Exploring Schools
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              Questions? Just reply to this email or reach out at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
              Best of luck with your school search!<br/>
              <strong>— The NYC School Ratings Team</strong>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'New user welcome email sent', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send new user welcome email', { error: error.message, userEmail });
    return false;
  }
}

export async function sendAdminNewUserRegistrationNotification(userEmail: string, firstName?: string | null, lastName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Not provided';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: `New User Registration: ${userEmail}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">New User Registered</h1>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${fullName}</p>
            <p style="margin: 0;"><strong>Registered:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This user has created a free account and may convert to a Season Pass customer.
          </p>
        </div>
      `,
    });
    
    logEmail('INFO', 'Admin new user registration notification sent', { to: ADMIN_EMAIL, userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send admin new user registration notification', { error: error.message, userEmail });
    return false;
  }
}

export async function sendPasswordResetEmail(userEmail: string, resetUrl: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Reset Your Password - NYC School Ratings',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Password Reset Request</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            We received a request to reset your password for your NYC School Ratings account. 
            Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset My Password
            </a>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>This link expires in 30 minutes.</strong> If you didn't request a password reset, 
              you can safely ignore this email.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              Need help? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
              <strong>— The NYC School Ratings Team</strong>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'Password reset email sent', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send password reset email', { error: error.message, userEmail });
    return false;
  }
}

export async function sendMagicLinkEmail(userEmail: string, magicLinkUrl: string, firstName?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Your NYC School Ratings Access Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Your Membership is Active!</h1>
            <p style="color: #6b7280; font-size: 16px;">Here's your access link for NYC School Ratings</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for your purchase! Your Season Pass is now active, and you have full access to all premium features.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            <strong>Use the button below to access your account anytime:</strong>
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Access NYC School Ratings
            </a>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>Bookmark this email!</strong> Use this link whenever you need to log in. 
              No password required – just click the link above.
            </p>
          </div>
          
          <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px;">Your Season Pass Benefits</h2>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">AI Chat Assistant</strong> – Personalized school recommendations
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Side-by-Side Comparison</strong> – Compare up to 4 schools
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Detailed Score Breakdowns</strong> – Deep dive into metrics
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Commute Time Calculator</strong> – Travel times from your home
              </li>
              <li style="padding: 8px 0;">
                <span style="color: #10b981; font-weight: bold;">✓</span>
                <strong style="margin-left: 10px;">Application Tracker</strong> – Manage deadlines and documents
              </li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${magicLinkUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              Need help? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
              <strong>— The NYC School Ratings Team</strong>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'Magic link email sent', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send magic link email', { error: error.message, userEmail });
    return false;
  }
}

export async function sendMagicLinkLoginEmail(userEmail: string, magicLinkUrl: string, firstName?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Sign in to NYC School Ratings',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Sign In Request</h1>
            <p style="color: #6b7280; font-size: 16px;">Click the button below to sign in to your account</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You requested to sign in to your NYC School Ratings account. Click the button below to continue:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Sign In to NYC School Ratings
            </a>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>This link expires in 15 minutes.</strong> If you didn't request this sign-in link, 
              you can safely ignore this email.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${magicLinkUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              Need help? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
              <strong>— The NYC School Ratings Team</strong>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'Magic link login email sent', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send magic link login email', { error: error.message, userEmail });
    return false;
  }
}

// ==========================================
// DRIP CAMPAIGN EMAILS
// ==========================================

function getUnsubscribeLink(userId: string): string {
  return `https://nycschoolsratings.com/api/email/unsubscribe?userId=${encodeURIComponent(userId)}`;
}

function getDripEmailFooter(userId: string): string {
  const unsubscribeUrl = getUnsubscribeLink(userId);
  return `
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
        Questions? Reply to this email or reach out at <a href="mailto:${CONTACT_EMAIL}" style="color: #2563eb;">${CONTACT_EMAIL}</a>
      </p>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
        <strong>— The NYC School Ratings Team</strong>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">
        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from marketing emails</a>
      </p>
    </div>
  `;
}

// Day 1: Welcome tip on using filters and favorites
export async function sendDripWelcomeTip(userEmail: string, userId: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Quick Tip: Find Schools Faster with Filters',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Welcome back! Here's a quick tip to help you get the most out of NYC School Ratings:
          </p>
          
          <div style="background: #f0f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">Use Filters to Narrow Your Search</h2>
            <p style="font-size: 15px; line-height: 1.7; color: #374151;">
              With over 1,500 schools in our database, filters are your best friend:
            </p>
            <ul style="padding-left: 20px; margin: 15px 0; color: #374151;">
              <li style="margin-bottom: 8px;"><strong>District filter:</strong> Focus on schools in your neighborhood</li>
              <li style="margin-bottom: 8px;"><strong>Grade band:</strong> Find schools for your child's current grade</li>
              <li style="margin-bottom: 8px;"><strong>Programs:</strong> Search for 3-K, Pre-K, or Gifted & Talented</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Pro tip:</strong> Use the heart icon to save your favorite schools. 
              They'll appear in your Favorites page for easy comparison later!
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com/search" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Exploring Schools
            </a>
          </div>
          
          ${getDripEmailFooter(userId)}
        </div>
      `,
    });
    
    logEmail('INFO', 'Drip email sent: welcome_tip', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send drip email: welcome_tip', { error: error.message, userEmail });
    return false;
  }
}

// Day 3: AI Chat Assistant feature spotlight
export async function sendDripAiSpotlight(userEmail: string, userId: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Meet Your Personal School Search Assistant',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Choosing the right school is overwhelming. That's why we built an AI assistant that knows NYC schools inside and out.
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">Ask It Anything About NYC Schools</h2>
            <p style="font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 15px;">
              Our AI Chat Assistant can answer questions like:
            </p>
            <ul style="padding-left: 20px; margin: 0; color: #374151;">
              <li style="margin-bottom: 10px;">"What are the best elementary schools in District 2?"</li>
              <li style="margin-bottom: 10px;">"Which schools near me have Gifted & Talented programs?"</li>
              <li style="margin-bottom: 10px;">"Compare PS 6 and PS 290 for me"</li>
              <li style="margin-bottom: 10px;">"What are my chances of getting into Hunter Elementary?"</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">
            It's like having a knowledgeable NYC parent friend who has done all the research!
          </p>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>This premium feature is available with Season Pass</strong> — just $29 for 6 months of full access.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com/pricing" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Learn More About Season Pass
            </a>
          </div>
          
          ${getDripEmailFooter(userId)}
        </div>
      `,
    });
    
    logEmail('INFO', 'Drip email sent: ai_spotlight', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send drip email: ai_spotlight', { error: error.message, userEmail });
    return false;
  }
}

// Day 7: Data insight about top schools
export async function sendDripDataInsight(userEmail: string, userId: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'NYC School Insight: What the Numbers Tell Us',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Did you know that NYC has over 1,800 public schools? Here's what our data reveals about finding the right fit:
          </p>
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #065f46; margin-top: 0; font-size: 18px;">Key Insights from Our Analysis</h2>
            <ul style="padding-left: 20px; margin: 15px 0; color: #374151;">
              <li style="margin-bottom: 12px;">
                <strong>Smaller isn't always better:</strong> Schools with 400-600 students often have the best balance of resources and individual attention
              </li>
              <li style="margin-bottom: 12px;">
                <strong>Climate matters:</strong> Schools with high parent satisfaction scores tend to have better student outcomes
              </li>
              <li style="margin-bottom: 12px;">
                <strong>Look beyond test scores:</strong> Progress scores show which schools are helping students grow, regardless of starting point
              </li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Want to dive deeper? Our premium features give you access to historical trends, side-by-side comparisons, and detailed breakdowns.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com/search" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Explore Schools Now
            </a>
          </div>
          
          ${getDripEmailFooter(userId)}
        </div>
      `,
    });
    
    logEmail('INFO', 'Drip email sent: data_insight', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send drip email: data_insight', { error: error.message, userEmail });
    return false;
  }
}

// Day 14: Soft upgrade nudge with Season Pass benefits
export async function sendDripUpgradeNudge(userEmail: string, userId: string, firstName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Get the Full Picture with Season Pass',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You've been exploring NYC schools — great! But are you getting the complete picture?
          </p>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #f59e0b;">
            <h2 style="color: #92400e; margin-top: 0; font-size: 20px;">Season Pass: $29 for 6 Months</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #78350f; margin-bottom: 15px;">
              Built by a NYC parent, for NYC parents. Get everything you need for your school search:
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; color: #78350f;">
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <strong style="margin-left: 10px;">AI Chat Assistant</strong>
                <span style="display: block; font-size: 14px; margin-left: 24px; color: #92400e;">Get instant answers about any NYC school</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <strong style="margin-left: 10px;">Side-by-Side Comparison</strong>
                <span style="display: block; font-size: 14px; margin-left: 24px; color: #92400e;">Compare up to 4 schools at once</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <strong style="margin-left: 10px;">Lottery & Admissions Calculator</strong>
                <span style="display: block; font-size: 14px; margin-left: 24px; color: #92400e;">Understand your real odds</span>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <strong style="margin-left: 10px;">Application Tracker</strong>
                <span style="display: block; font-size: 14px; margin-left: 24px; color: #92400e;">Never miss a deadline</span>
              </li>
              <li style="padding: 10px 0;">
                <span style="color: #10b981; font-weight: bold;">&#10003;</span>
                <strong style="margin-left: 10px;">Detailed Score Breakdowns</strong>
                <span style="display: block; font-size: 14px; margin-left: 24px; color: #92400e;">Deep dive into test scores and trends</span>
              </li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; text-align: center; color: #6b7280;">
            That's less than <strong>$5 per month</strong> for complete peace of mind during your school search.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com/pricing" 
               style="background: #f59e0b; color: #78350f; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Get Season Pass Now
            </a>
          </div>
          
          ${getDripEmailFooter(userId)}
        </div>
      `,
    });
    
    logEmail('INFO', 'Drip email sent: upgrade_nudge', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send drip email: upgrade_nudge', { error: error.message, userEmail });
    return false;
  }
}

// Newsletter email for January 2025 updates
export async function sendNewsletterJanuary2025(userEmail: string, firstName?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'NYC School Ratings - January 2025 Updates',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">What's New at NYC School Ratings</h1>
            <p style="color: #6b7280; font-size: 16px;">January 2025 Updates</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">${greeting},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            We've been working hard to make NYC School Ratings even more helpful for your school search. Here's what's new:
          </p>
          
          <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Latest Updates</h2>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
                <strong style="margin-left: 10px; color: #1f2937;">2024-25 Test Scores Now Available</strong>
                <span style="color: #6b7280; display: block; margin-left: 28px; font-size: 14px; margin-top: 4px;">
                  Updated ELA, Math, and Science proficiency data from NYC DOE InfoHub for 1,100+ schools, including grade-level breakdowns (Grades 3-8)
                </span>
              </li>
              <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
                <strong style="margin-left: 10px; color: #1f2937;">623 Private Schools Added</strong>
                <span style="color: #6b7280; display: block; margin-left: 28px; font-size: 14px; margin-top: 4px;">
                  Browse NYC private schools with enrollment by grade, tuition info, religious affiliation, and admissions details from the NCES Private School Survey
                </span>
              </li>
              <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
                <strong style="margin-left: 10px; color: #1f2937;">Interactive School Zone Maps</strong>
                <span style="color: #6b7280; display: block; margin-left: 28px; font-size: 14px; margin-top: 4px;">
                  Visual maps with plotted school zone boundaries so you can see actual coverage areas
                </span>
              </li>
              <li style="padding: 12px 0;">
                <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
                <strong style="margin-left: 10px; color: #1f2937;">Correct Grade Bands</strong>
                <span style="color: #6b7280; display: block; margin-left: 28px; font-size: 14px; margin-top: 4px;">
                  Updated 1,953 schools with accurate grade band information from NYC DOE LCGMS dataset
                </span>
              </li>
            </ul>
          </div>
          
          <h2 style="color: #7c3aed; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Coming Soon</h2>
          
          <div style="background: #faf5ff; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e9d5ff;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6;">
              <strong style="color: #7c3aed;">Neighborhood Safety Index</strong> - A new metric reflecting the volume of reported incidents near school locations over the last 12 months (within 0.5 miles). This provides neighborhood context to help with your decision-making.
            </p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #6b7280; margin-top: 30px;">
            We'd love to hear your thoughts! Feel free to reply to this email with any suggestions or features you'd like to see.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nycschoolsratings.com" 
               style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Explore the Updates
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              NYC School Ratings - Helping NYC families find the right school
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
              <a href="https://nycschoolsratings.com" style="color: #6b7280;">nycschoolsratings.com</a>
            </p>
          </div>
          
        </div>
      `,
    });
    
    logEmail('INFO', 'Newsletter January 2025 sent', { to: userEmail, result });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send newsletter January 2025', { error: error.message, userEmail });
    return false;
  }
}

// Admin alert when the API abuse-detection cron flags a suspicious key.
// Plain HTML so it threads consistently in the admin's inbox; subject is
// distinct per alert type so they're easy to filter.
export async function sendApiAbuseAlert(params: {
  keyId: number;
  keyPrefix: string;
  keyName: string;
  ownerEmail: string | null;
  alertType: 'rate_limit_storm' | 'distinct_ip_spike';
  summary: string;
  detail: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) ||
      [ADMIN_EMAIL, 'biserd@gmail.com'];
    const subjectByType: Record<string, string> = {
      rate_limit_storm: '[API Abuse] Rate limit storm detected',
      distinct_ip_spike: '[API Abuse] Distinct-IP spike (possible leaked key)',
    };
    const subject = `${subjectByType[params.alertType] || '[API Abuse] Alert'} — key #${params.keyId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b91c1c; margin: 0 0 16px 0;">API abuse signal</h2>
        <p style="margin: 0 0 12px 0;">${params.summary}</p>
        <table style="border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Key</td>
              <td style="padding: 4px 0;"><code>${params.keyPrefix}…</code> (id ${params.keyId}) — ${params.keyName}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Owner</td>
              <td style="padding: 4px 0;">${params.ownerEmail || '(unknown)'}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Type</td>
              <td style="padding: 4px 0;"><code>${params.alertType}</code></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Detail</td>
              <td style="padding: 4px 0;"><code>${JSON.stringify(params.detail)}</code></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Time</td>
              <td style="padding: 4px 0;">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td></tr>
        </table>
        <p style="margin: 16px 0 0 0;">
          <a href="https://nycschoolsratings.com/admin/api-usage"
             style="color: #2563eb; text-decoration: none;">Open admin dashboard →</a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          You'll receive at most one email per key per alert type per day.
        </p>
      </div>
    `;
    await client.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject,
      html,
    });
    logEmail('INFO', 'API abuse alert sent', { to: adminEmails, keyId: params.keyId, type: params.alertType });
    return true;
  } catch (error: any) {
    logEmail('ERROR', 'Failed to send API abuse alert', { error: error.message, keyId: params.keyId });
    return false;
  }
}

export const emailService = {
  sendAdminNewCustomerNotification,
  sendWelcomeEmail,
  sendAdminNewUserRegistrationNotification,
  sendNewUserWelcomeEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendMagicLinkLoginEmail,
  // Drip campaign emails
  sendDripWelcomeTip,
  sendDripAiSpotlight,
  sendDripDataInsight,
  sendDripUpgradeNudge,
  // Newsletter emails
  sendNewsletterJanuary2025,
  // Admin alerts
  sendApiAbuseAlert,
};
