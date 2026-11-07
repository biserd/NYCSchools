import { FAMILY_PREMIUM_ACTIVE_STATUSES } from '../shared/plans';

// The caller supplies the email from a verified KinderLearner parent account.
// Return only the active monthly access deadline. Legacy passes and account
// data stay within NYC School Ratings.
export async function kinderLearnerAccessUntil(db: D1Database, verifiedEmail: string, now = Date.now()): Promise<number | null> {
  if (typeof verifiedEmail !== 'string' || verifiedEmail.length > 254) return null;
  const email = verifiedEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const row = await db.prepare(`
    SELECT MAX(f.current_period_end) AS expiresAt
    FROM users u
    INNER JOIN family_subscriptions f ON f.user_id = u.id
    WHERE lower(trim(u.email)) = ?
      AND f.status IN (?, ?)
      AND f.current_period_end > ?
  `).bind(email, ...FAMILY_PREMIUM_ACTIVE_STATUSES, now).first<{ expiresAt: number | null }>();
  return row?.expiresAt ?? null;
}
