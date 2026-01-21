import { sendNewsletterJanuary2025 } from '../server/emailService';

async function main() {
  const email = process.argv[2] || 'biserd@gmail.com';
  const firstName = process.argv[3] || '';
  
  console.log(`Sending test newsletter to ${email}...`);
  const result = await sendNewsletterJanuary2025(email, firstName || undefined);
  console.log('Result:', result ? 'Success!' : 'Failed');
  process.exit(result ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
