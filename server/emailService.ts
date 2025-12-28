// Email service for NYC School Ratings using Resend integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
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
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formattedAmount = amount ? `$${(amount / 100).toFixed(2)}` : 'N/A';
    const planName = planType === 'season_pass' ? 'Season Pass ($29 for 6 months)' : planType;
    
    const result = await client.emails.send({
      from: fromEmail || `NYC School Ratings <${CONTACT_EMAIL}>`,
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
    const { client, fromEmail } = await getUncachableResendClient();
    
    const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
    
    const result = await client.emails.send({
      from: fromEmail || `NYC School Ratings <${CONTACT_EMAIL}>`,
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
            Thank you for joining the NYC School Ratings family! I'm thrilled to have you on board.
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">A Note From the Founder</h2>
            <p style="font-size: 15px; line-height: 1.7; color: #374151;">
              I'm the father of two boys on the Upper East Side. Like you, I found myself overwhelmed 
              by the complexity of NYC's school system. I spent countless hours researching schools, 
              comparing test scores, and trying to understand what really matters.
            </p>
            <p style="font-size: 15px; line-height: 1.7; color: #374151;">
              That's why I built NYC School Ratings — <strong>a tool made by a NYC parent, for NYC parents</strong>. 
              I wanted to create something that gives families the clear, honest information they need 
              to make confident decisions about their children's education.
            </p>
            <p style="font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 0;">
              Welcome to the community. I hope this helps your family as much as it's helped mine.
            </p>
          </div>
          
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
            <a href="https://nycschoolratings.com" 
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

export async function sendAdminNewUserRegistrationNotification(userEmail: string, firstName?: string | null, lastName?: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Not provided';
    
    const result = await client.emails.send({
      from: fromEmail || `NYC School Ratings <${CONTACT_EMAIL}>`,
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

export const emailService = {
  sendAdminNewCustomerNotification,
  sendWelcomeEmail,
  sendAdminNewUserRegistrationNotification,
};
