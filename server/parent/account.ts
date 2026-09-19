import { TuckError } from '../tuck/store';
import { hashLinkToken, parentWhatsappReady, type ParentWhatsappEnvironment } from './whatsapp';

export async function parentWhatsappStatus(userId: string, env: ParentWhatsappEnvironment) {
  const configured = parentWhatsappReady(env);
  if (!['staging', 'production'].includes(env.ENVIRONMENT)) return { preview: false, configured: false, connected: false, phone: null };
  const row = await env.DB.prepare('SELECT phone,consent_at FROM parent_whatsapp_links WHERE user_id=?').bind(userId).first<{ phone: string | null; consent_at: number | null }>();
  return { preview: true, configured, assistantEnabled: Reflect.get(env,'PARENT_ASSISTANT_ENABLED')==='true', connected: !!row?.phone && !!row.consent_at, phone: row?.phone ? `••••${row.phone.slice(-4)}` : null };
}
export async function createParentWhatsappLink(userId: string, env: ParentWhatsappEnvironment, consent: unknown) {
  if (consent !== true) throw new TuckError(400, 'Confirm that you want to link WhatsApp for this preview.');
  if (!parentWhatsappReady(env)) throw new TuckError(503, 'WhatsApp preview setup is not complete.');
  const now = Date.now();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = now + 600_000;
  const row = await env.DB.prepare(`INSERT INTO parent_whatsapp_links(user_id,token_hash,token_expires_at,token_issued_at) VALUES (?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,token_expires_at=excluded.token_expires_at,token_issued_at=excluded.token_issued_at
    WHERE parent_whatsapp_links.token_issued_at<=? AND parent_whatsapp_links.phone IS NULL RETURNING user_id`)
    .bind(userId, await hashLinkToken(token), expiresAt, now, now - 60_000).first();
  if (!row) throw new TuckError(409, 'Already linked, or a link was just created. Disconnect first or wait one minute.');
  return { url: `https://wa.me/${env.TWILIO_WHATSAPP_FROM!.replace('whatsapp:+', '')}?text=${encodeURIComponent(`LINK ${token}`)}`, expiresAt };
}
export async function disconnectParentWhatsapp(userId: string, env: ParentWhatsappEnvironment) {
  if (!['staging', 'production'].includes(env.ENVIRONMENT)) throw new TuckError(404, 'Connection not available.');
  await env.DB.batch([
    env.DB.prepare('UPDATE parent_preferences SET reminder_consent_at=NULL WHERE user_id=?').bind(userId),
    env.DB.prepare("UPDATE parent_reminders SET status='canceled' WHERE user_id=? AND status='pending'").bind(userId),
    env.DB.prepare('UPDATE parent_whatsapp_links SET phone=NULL,consent_at=NULL,token_hash=NULL,token_expires_at=NULL WHERE user_id=?').bind(userId),
  ]);
}
