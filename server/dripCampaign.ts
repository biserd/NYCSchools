// Drip Email Campaign Service for NYC School Ratings
// Sends re-engagement emails to free users over 14 days
// IMPORTANT: Only runs when drip_campaign_enabled setting is 'true'

import { db } from './db';
import { users, appSettings, type DripEmailType, DRIP_EMAIL_TYPES } from '@shared/schema';
import { eq, and, isNull, or, sql, lte, not, inArray } from 'drizzle-orm';
import {
  sendDripWelcomeTip,
  sendDripAiSpotlight,
  sendDripDataInsight,
  sendDripUpgradeNudge,
} from './emailService';

// Drip email schedule (days after signup)
const DRIP_SCHEDULE: { emailType: DripEmailType; daysAfterSignup: number }[] = [
  { emailType: 'welcome_tip', daysAfterSignup: 1 },
  { emailType: 'ai_spotlight', daysAfterSignup: 3 },
  { emailType: 'data_insight', daysAfterSignup: 7 },
  { emailType: 'upgrade_nudge', daysAfterSignup: 14 },
];

// Minimum hours between drip emails (to avoid spamming)
const MIN_HOURS_BETWEEN_EMAILS = 24;

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[DRIP_CAMPAIGN ${level}] ${timestamp}`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Check if the drip campaign is enabled globally
export async function isDripCampaignEnabled(): Promise<boolean> {
  try {
    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'drip_campaign_enabled'))
      .limit(1);
    
    if (!setting.length) {
      log('WARN', 'Drip campaign setting not found, defaulting to disabled');
      return false;
    }
    
    return setting[0].value === 'true';
  } catch (error: any) {
    log('ERROR', 'Failed to check drip campaign setting', { error: error.message });
    return false;
  }
}

// Get eligible users for drip emails (free users who haven't unsubscribed)
async function getEligibleUsers() {
  try {
    const eligibleUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        createdAt: users.createdAt,
        dripEmailsSent: users.dripEmailsSent,
        lastDripEmailAt: users.lastDripEmailAt,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionPlan: users.subscriptionPlan,
      })
      .from(users)
      .where(
        and(
          // Not unsubscribed from marketing emails
          or(
            eq(users.emailUnsubscribed, false),
            isNull(users.emailUnsubscribed)
          ),
          // Free users only (skip anyone who has paid)
          or(
            eq(users.subscriptionStatus, 'free'),
            isNull(users.subscriptionStatus)
          ),
          // Must have a subscription plan of 'free' or null (not season_pass, developer, etc.)
          or(
            eq(users.subscriptionPlan, 'free'),
            isNull(users.subscriptionPlan)
          )
        )
      );
    
    return eligibleUsers;
  } catch (error: any) {
    log('ERROR', 'Failed to get eligible users', { error: error.message });
    return [];
  }
}

// Determine which drip email to send to a user (if any)
function getNextDripEmail(
  user: {
    createdAt: Date | null;
    dripEmailsSent: string[] | null;
    lastDripEmailAt: Date | null;
  }
): DripEmailType | null {
  if (!user.createdAt) return null;
  
  const now = new Date();
  const signupDate = new Date(user.createdAt);
  const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check minimum time between emails
  if (user.lastDripEmailAt) {
    const hoursSinceLastEmail = (now.getTime() - new Date(user.lastDripEmailAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastEmail < MIN_HOURS_BETWEEN_EMAILS) {
      return null;
    }
  }
  
  const sentEmails = user.dripEmailsSent || [];
  
  // Find the next email that should be sent
  for (const schedule of DRIP_SCHEDULE) {
    // Check if enough days have passed and email hasn't been sent yet
    if (daysSinceSignup >= schedule.daysAfterSignup && !sentEmails.includes(schedule.emailType)) {
      return schedule.emailType;
    }
  }
  
  return null;
}

// Send a drip email based on type
async function sendDripEmail(
  emailType: DripEmailType,
  userEmail: string,
  userId: string,
  firstName?: string | null
): Promise<boolean> {
  switch (emailType) {
    case 'welcome_tip':
      return sendDripWelcomeTip(userEmail, userId, firstName);
    case 'ai_spotlight':
      return sendDripAiSpotlight(userEmail, userId, firstName);
    case 'data_insight':
      return sendDripDataInsight(userEmail, userId, firstName);
    case 'upgrade_nudge':
      return sendDripUpgradeNudge(userEmail, userId, firstName);
    default:
      log('ERROR', 'Unknown drip email type', { emailType });
      return false;
  }
}

// Record that a drip email was sent to a user
async function recordDripEmailSent(userId: string, emailType: DripEmailType): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        dripEmailsSent: sql`array_append(COALESCE(${users.dripEmailsSent}, ARRAY[]::text[]), ${emailType})`,
        lastDripEmailAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error: any) {
    log('ERROR', 'Failed to record drip email sent', { userId, emailType, error: error.message });
  }
}

// Main function to process drip campaign
export async function processDripCampaign(): Promise<{ processed: number; sent: number; errors: number }> {
  const stats = { processed: 0, sent: 0, errors: 0 };
  
  // Check if campaign is enabled
  const isEnabled = await isDripCampaignEnabled();
  if (!isEnabled) {
    log('INFO', 'Drip campaign is disabled, skipping');
    return stats;
  }
  
  log('INFO', 'Starting drip campaign processing');
  
  // Get eligible users
  const eligibleUsers = await getEligibleUsers();
  log('INFO', `Found ${eligibleUsers.length} eligible users for drip campaign`);
  
  for (const user of eligibleUsers) {
    stats.processed++;
    
    // Determine which email to send (if any)
    const nextEmail = getNextDripEmail({
      createdAt: user.createdAt,
      dripEmailsSent: user.dripEmailsSent,
      lastDripEmailAt: user.lastDripEmailAt,
    });
    
    if (!nextEmail) {
      continue;
    }
    
    log('INFO', `Sending drip email`, { userId: user.id, email: user.email, type: nextEmail });
    
    // Send the email
    const success = await sendDripEmail(nextEmail, user.email, user.id, user.firstName);
    
    if (success) {
      stats.sent++;
      await recordDripEmailSent(user.id, nextEmail);
    } else {
      stats.errors++;
    }
    
    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  log('INFO', 'Drip campaign processing complete', stats);
  return stats;
}

// Unsubscribe a user from drip emails
export async function unsubscribeUser(userId: string): Promise<boolean> {
  try {
    await db
      .update(users)
      .set({
        emailUnsubscribed: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    log('INFO', 'User unsubscribed from drip emails', { userId });
    return true;
  } catch (error: any) {
    log('ERROR', 'Failed to unsubscribe user', { userId, error: error.message });
    return false;
  }
}

// Admin function to enable/disable drip campaign
export async function setDripCampaignEnabled(enabled: boolean): Promise<boolean> {
  try {
    await db
      .update(appSettings)
      .set({
        value: enabled ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(appSettings.key, 'drip_campaign_enabled'));
    
    log('INFO', `Drip campaign ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error: any) {
    log('ERROR', 'Failed to set drip campaign setting', { enabled, error: error.message });
    return false;
  }
}
