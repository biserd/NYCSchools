import { Link } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCheckout } from '@/hooks/useCheckout';
import { FAMILY_PREMIUM } from '@shared/plans';
import { PRICING_DESCRIPTION } from '@shared/pricing-coverage';
import { PricingHero, PricingPlanFeatures } from '@shared/PricingValueContent';
import { trackEvent } from '@/lib/analytics';
import { isFamilyPremiumContinuation } from '@/lib/checkout-intent';

export default function PricingPage() {
  const checkout = useCheckout();
  const [testEmail, setTestEmail] = useState('');
  const continueRequested = isFamilyPremiumContinuation(window.location.search);
  const continuationStarted = useRef(false);
  const returned = new URLSearchParams(window.location.search).get('success') === 'true';
  const [checkoutCanceled] = useState(() => new URLSearchParams(window.location.search).get('canceled') === 'true');
  useEffect(() => {
    if (!checkoutCanceled) return;
    trackEvent('subscription_checkout_returned', { plan: 'family_premium', result: 'canceled' });
    window.history.replaceState(window.history.state, '', '/pricing#checkout');
  }, [checkoutCanceled]);
  useEffect(() => {
    if (!continueRequested || continuationStarted.current || !checkout.isSignedIn || !checkout.isAccessReady || !checkout.isReady) return;
    continuationStarted.current = true;
    // Avoid opening another Checkout session if the user returns or refreshes.
    window.history.replaceState(window.history.state, '', '/pricing#checkout');
    if (!checkout.assistantActive) checkout.startCheckout(undefined, 'registration_continue');
  }, [continueRequested, checkout.isSignedIn, checkout.isAccessReady, checkout.isReady, checkout.assistantActive, checkout.startCheckout]);
  const startPricingCheckout = () => {
    if (continueRequested) window.history.replaceState(window.history.state, '', '/pricing#checkout');
    checkout.startCheckout(testEmail);
  };
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title="Family Premium — $9.99/month" description={PRICING_DESCRIPTION} canonicalPath="/pricing" />
    <AppHeader stackOnMobile />
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
      <PricingHero />
      {returned && <p role="status">Checkout returned. Access is activated after Stripe confirms payment. If you checked out without signing in, check the email you entered at Stripe for a secure sign-in link (including spam). If it does not arrive, use the sign-in link below.</p>}
      {checkoutCanceled && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">Checkout was canceled. Your account is still available; you can subscribe whenever you’re ready.</p>}
      {checkout.isPremium && <p className="rounded-lg border p-4 bg-muted" role="status">Your paid access is active and Parent Assistant is included while it remains active. You do not need to buy another plan now. <Link className="underline" href="/family">Use Parent Assistant</Link>.</p>}
      <Card id="checkout" className="scroll-mt-24 border-blue-500 bg-sky-50/60 shadow-md dark:bg-blue-950/20" data-testid="card-family-premium">
        <CardHeader className="space-y-2">
          <MessageCircle className="text-blue-700 dark:text-sky-300" />
          <CardTitle className="text-2xl">{FAMILY_PREMIUM.name}</CardTitle>
          <p><span className="text-4xl font-bold">${checkout.priceAmount}</span>/month</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <PricingPlanFeatures />
          <p className="text-sm text-muted-foreground">Charged at checkout, then $9.99/month until canceled. Cancel anytime; access continues through the paid period.</p>
          {!checkout.isPremium && <p className="text-sm">No account needed to subscribe. Stripe collects your email; we send a sign-in link after payment. Already paying? <Link className="underline" href="/login?redirect=/family">Sign in</Link> to avoid a second charge.</p>}
          {continueRequested && !checkout.isAuthLoading && !checkout.isSignedIn && <p role="status" className="text-sm">Your account was created, but this browser is not signed in. <Link className="underline" href="/login?redirect=%2Fpricing%3Fcheckout%3Dcontinue">Sign in to continue to checkout</Link>.</p>}
          {continueRequested && checkout.isSignedIn && !checkout.isAccessReady && <p role="status" className="text-sm">{checkout.isAccessError ? 'We could not verify your current access. You can retry with the Subscribe button below; the server will prevent a duplicate subscription.' : 'Checking your account before continuing to secure checkout…'}</p>}
          {!checkout.guestReady && !checkout.isSignedIn && <p role="status" className="text-sm rounded-lg border border-amber-400 bg-amber-50 p-3">Guest checkout is temporarily unavailable because secure sign-in email cannot be delivered. No payment will be taken from a guest until this is resolved.</p>}
          {checkout.stagingTestEmailRequired && !checkout.isSignedIn && <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 space-y-2 text-sm"><p className="font-semibold">Staging test checkout · no real charge</p><p>Use the designated tester email. Stripe opens in test mode; do not enter a real card.</p><label htmlFor="stage-guest-email" className="block font-medium">Tester email</label><input id="stage-guest-email" type="email" autoComplete="email" required value={testEmail} onChange={e => setTestEmail(e.target.value)} className="w-full min-h-11 rounded-md border bg-background px-3" /></div>}
          {!checkout.isReady && <p role="status" className="text-sm">Monthly checkout is closed while launch testing is completed. No payment will be taken.</p>}
          {checkout.monthlyActive ? <Button asChild className="w-full"><Link href="/settings">Manage Family Premium</Link></Button> : checkout.assistantActive ? <Button asChild className="w-full"><Link href="/family">Use your included Parent Assistant</Link></Button> : <Button className="w-full min-h-11" disabled={!checkout.isReady || checkout.isPending || (!checkout.guestReady && !checkout.isSignedIn) || (checkout.stagingTestEmailRequired && !checkout.isSignedIn && !testEmail.trim())} onClick={startPricingCheckout} data-testid="button-family-checkout">{checkout.isPending ? 'Opening secure checkout…' : checkout.isReady ? checkout.stagingTestEmailRequired ? 'Test subscription checkout — $9.99/month' : 'Subscribe — $9.99/month' : 'Family Premium — Coming soon'}</Button>}
          <p className="text-xs text-muted-foreground">WhatsApp reminders require your opt-in. School calendar dates should be confirmed with your provider.</p>
        </CardContent>
      </Card>
    </main><Footer />
  </div>;
}
