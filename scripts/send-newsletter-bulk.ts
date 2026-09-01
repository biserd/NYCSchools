import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { sendNewsletterJanuary2025 } from '../server/emailService';

const DELAY_BETWEEN_EMAILS_MS = 1000; // Pace bulk sends to protect provider limits.
const BATCH_SIZE = 10; // Process in batches
const PAUSE_BETWEEN_BATCHES_MS = 5000; // 5 second pause between batches

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendBulkNewsletter() {
  console.log('='.repeat(60));
  console.log('NYC School Ratings - January 2025 Newsletter Bulk Send');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  // Fetch all users who haven't unsubscribed
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      emailUnsubscribed: users.emailUnsubscribed,
    })
    .from(users)
    .where(
      or(
        eq(users.emailUnsubscribed, false),
        isNull(users.emailUnsubscribed)
      )
    );

  console.log(`Total users eligible to receive newsletter: ${allUsers.length}`);
  console.log(`Rate limit: ${DELAY_BETWEEN_EMAILS_MS}ms between emails`);
  console.log(`Batch size: ${BATCH_SIZE}, pause between batches: ${PAUSE_BETWEEN_BATCHES_MS}ms`);
  console.log('');

  if (allUsers.length === 0) {
    console.log('No users to send to. Exiting.');
    process.exit(0);
  }

  // Confirmation prompt
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirmed = await new Promise<boolean>((resolve) => {
    rl.question(`\nSend newsletter to ${allUsers.length} users? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });

  if (!confirmed) {
    console.log('Cancelled. No emails sent.');
    process.exit(0);
  }

  console.log('\nStarting bulk send...\n');

  let successCount = 0;
  let failCount = 0;
  const failedEmails: string[] = [];

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    const progress = `[${i + 1}/${allUsers.length}]`;

    try {
      const success = await sendNewsletterJanuary2025(user.email, user.firstName || undefined);
      
      if (success) {
        successCount++;
        console.log(`${progress} ✓ Sent to ${user.email}`);
      } else {
        failCount++;
        failedEmails.push(user.email);
        console.log(`${progress} ✗ Failed: ${user.email}`);
      }
    } catch (error: any) {
      failCount++;
      failedEmails.push(user.email);
      console.log(`${progress} ✗ Error: ${user.email} - ${error.message}`);
      
      // If rate limited, wait longer
      if (error.statusCode === 429 || error.message?.includes('rate limit')) {
        console.log('   Rate limit hit! Waiting 60 seconds...');
        await sleep(60000);
      }
    }

    // Delay between emails
    if (i < allUsers.length - 1) {
      await sleep(DELAY_BETWEEN_EMAILS_MS);
    }

    // Pause between batches
    if ((i + 1) % BATCH_SIZE === 0 && i < allUsers.length - 1) {
      console.log(`\n--- Batch ${Math.floor((i + 1) / BATCH_SIZE)} complete. Pausing ${PAUSE_BETWEEN_BATCHES_MS / 1000}s ---\n`);
      await sleep(PAUSE_BETWEEN_BATCHES_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BULK SEND COMPLETE');
  console.log('='.repeat(60));
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log(`Total sent successfully: ${successCount}`);
  console.log(`Total failed: ${failCount}`);
  
  if (failedEmails.length > 0) {
    console.log('\nFailed emails:');
    failedEmails.forEach(email => console.log(`  - ${email}`));
  }

  process.exit(failCount > 0 ? 1 : 0);
}

sendBulkNewsletter().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
