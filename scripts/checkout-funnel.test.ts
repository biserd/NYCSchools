import assert from 'node:assert/strict';
import {
  FAMILY_PREMIUM_CONTINUE_PATH,
  FAMILY_PREMIUM_REGISTER_PATH,
  isFamilyPremiumContinuation,
  isFamilyPremiumRegistration,
  registrationRedirect,
} from '../client/src/lib/checkout-intent';

assert.equal(FAMILY_PREMIUM_REGISTER_PATH, '/register?plan=family_premium');
assert.equal(isFamilyPremiumRegistration('?plan=family_premium'), true);
assert.equal(registrationRedirect('?plan=family_premium'), FAMILY_PREMIUM_CONTINUE_PATH);
assert.equal(registrationRedirect('?plan=family_premium&redirect=%2F'), FAMILY_PREMIUM_CONTINUE_PATH);
assert.equal(isFamilyPremiumContinuation('?checkout=continue'), true);
assert.equal(isFamilyPremiumContinuation('?canceled=true'), false);

// Ordinary registration and existing deep links keep their previous behavior.
assert.equal(registrationRedirect(''), '/');
assert.equal(registrationRedirect('?redirect=%2Ffavorites'), '/favorites');
assert.equal(registrationRedirect('?redirect=%2F%2Fevil.example'), '/');
assert.equal(registrationRedirect('?redirect=%2F%5Cevil.example'), '/');

console.log('Checkout intent passed: account-first signup continues to monthly pricing; ordinary free signup and safe redirects are unchanged.');
