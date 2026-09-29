export const FAMILY_PREMIUM_REGISTER_PATH = '/register?plan=family_premium';
export const FAMILY_PREMIUM_CONTINUE_PATH = '/pricing?checkout=continue';

export function isFamilyPremiumRegistration(search: string): boolean {
  return new URLSearchParams(search).get('plan') === 'family_premium';
}

export function isFamilyPremiumContinuation(search: string): boolean {
  return new URLSearchParams(search).get('checkout') === 'continue';
}

export function registrationRedirect(search: string): string {
  if (isFamilyPremiumRegistration(search)) return FAMILY_PREMIUM_CONTINUE_PATH;
  const raw = new URLSearchParams(search).get('redirect') || '/';
  return raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/';
}
