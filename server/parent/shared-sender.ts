/** Routing for the existing AIRunningTracker WhatsApp ingress.
 * This is an adapter contract, not a public unauthenticated forwarding endpoint.
 * The ingress must verify Twilio's signature against the ORIGINAL URL and all
 * form fields before invoking this function. Never forward running message bodies
 * to Ratings, and never acknowledge STOP until both services persisted opt-out.
 */
export type SharedSenderRoute =
  | { kind: 'running' }
  | { kind: 'school'; text: string }
  | { kind: 'stop-all' }
  | { kind: 'start-all' }
  | { kind: 'help' };

const stopWords = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']);

export function classifySharedMessage(body: string, optOutType?: string): SharedSenderRoute {
  // Provider opt-out classification takes precedence over application commands.
  const provider = optOutType?.trim().toUpperCase();
  const command = body.trim().toUpperCase();
  if (provider === 'STOP' || stopWords.has(command)) return { kind: 'stop-all' };
  if (provider === 'START' || ['START', 'UNSTOP'].includes(command)) return { kind: 'start-all' };
  if (provider === 'HELP' || command === 'HELP') return { kind: 'help' };
  const school = /^SCHOOL(?:\s+|:\s*|$)([\s\S]*)$/i.exec(body.trim());
  if (school) return { kind: 'school', text: school[1].trim() };
  return { kind: 'running' };
}

export interface VerifiedSharedMessage {
  messageSid: string;
  from: string;
  body: string;
  optOutType?: string;
}

export interface SharedSenderHandlers {
  // Each receiver must durably deduplicate by MessageSid. No network sends here.
  running(message: VerifiedSharedMessage): Promise<void>;
  school(message: VerifiedSharedMessage): Promise<void>;
  stopRunning(messageSid: string, from: string): Promise<void>;
  stopSchool(messageSid: string, from: string): Promise<void>;
}

/** Call ONLY after signature/account/recipient verification at the trusted ingress.
 * Failures propagate so the ingress returns a non-2xx and Twilio can retry.
 * START deliberately cannot recreate app consent, linking or a subscription.
 */
export async function dispatchVerifiedSharedMessage(message: VerifiedSharedMessage, handlers: SharedSenderHandlers) {
  if (!/^SM[a-f0-9]{32}$/i.test(message.messageSid) || !/^whatsapp:\+[1-9]\d{7,14}$/.test(message.from)) {
    throw new Error('Invalid verified WhatsApp envelope');
  }
  const route = classifySharedMessage(message.body, message.optOutType);
  if (route.kind === 'stop-all') {
    // allSettled guarantees one failed application cannot prevent the other
    // receiving a stop. Do not put phone numbers or message bodies into errors.
    const results = await Promise.allSettled([
      handlers.stopRunning(message.messageSid, message.from),
      handlers.stopSchool(message.messageSid, message.from),
    ]);
    if (results.some(result => result.status === 'rejected')) throw new Error('Shared opt-out persistence incomplete');
  } else if (route.kind === 'running') {
    await handlers.running(message);
  } else if (route.kind === 'school') {
    await handlers.school({ ...message, body: route.text });
  }
  return route.kind;
}
