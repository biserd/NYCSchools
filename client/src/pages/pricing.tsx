import { Link } from 'wouter';
import { Check, MessageCircle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCheckout } from '@/hooks/useCheckout';
import { FAMILY_PREMIUM } from '@shared/plans';

const features = [
  'Full school database access, detailed profiles and historical trends',
  'School comparisons, commute tools, favorites and application tracking',
  'Existing on-site AI school-research chat and recommendations',
  'WhatsApp Parent Assistant: up to 30 requests per day',
  'Up to 100 opted-in WhatsApp reminders per calendar month',
  'Official NYCPS calendar suggestions and saved-school answers',
];
const questions = [
  ['What happens to my existing paid plan?', 'Your price, expiry date and billing terms do not change. As a grandfathered benefit, active paid customers can use Parent Assistant at no extra charge while their existing plan remains active. A prepaid Research Pass still ends on its original expiry date and does not renew.'],
  ['Can I still buy the $29 Research Pass?', 'No. It is closed to new purchases. Family Premium at $19.99/month is the only paid plan available to new customers when checkout opens.'],
  ['Is there a free trial?', 'No. Your first monthly payment is charged at checkout, then the subscription renews monthly until canceled.'],
  ['What happens when I cancel?', 'Cancel in account settings. Monthly benefits continue through the paid billing period. Any separately held, unexpired legacy Research Pass remains valid through its original expiry.'],
  ['Does connecting WhatsApp subscribe me?', 'No. A paid subscription requires a separate checkout. Reminder delivery also requires a connected phone and explicit consent. Reply STOP to stop WhatsApp reminders; this does not cancel billing.'],
  ['Are school calendars updated automatically?', 'The assistant offers reviewed official NYCPS calendar dates for you to confirm. This is not a live school-announcement feed. Check applicability and dates with your provider.'],
];

export default function PricingPage() {
  const checkout = useCheckout();
  const returned = new URLSearchParams(window.location.search).get('success') === 'true';
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title="Family Premium — $19.99/month" description="Family Premium is $19.99/month: school research and a WhatsApp Parent Assistant in one plan. No free trial. Existing paid customers keep their original terms." canonicalPath="/pricing" />
    <AppHeader stackOnMobile />
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 space-y-10">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <p className="text-primary font-semibold">One account. One monthly plan.</p>
        <h1 className="text-4xl md:text-5xl font-bold">Find the right school.<br />Stay on top of school life.</h1>
        <p className="text-lg text-muted-foreground">School research and ongoing help from a Parent Assistant, together in Family Premium.</p>
      </header>
      {returned && <p role="status">Checkout returned. Access updates after payment is confirmed. Check your account for its status.</p>}
      {checkout.isPremium && <p className="rounded-lg border p-4 bg-muted" role="status">Your paid access is active and Parent Assistant is included while it remains active. You do not need to buy another plan now. <Link className="underline" href="/family">Use Parent Assistant</Link>.</p>}
      <Card className="max-w-xl mx-auto border-teal-600 bg-teal-50/60 dark:bg-teal-950/20" data-testid="card-family-premium">
        <CardHeader className="space-y-3">
          <MessageCircle className="text-teal-700" />
          <Badge variant="secondary" className="w-fit">{checkout.isReady ? 'School research + parent support' : 'Coming soon · Not for sale yet'}</Badge>
          <CardTitle className="text-2xl">{FAMILY_PREMIUM.name}</CardTitle>
          <p><span className="text-4xl font-bold">${checkout.priceAmount}</span>/month</p>
          <p className="font-medium">School research included while subscribed.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">{features.map(feature => <li className="flex gap-2" key={feature}><Check className="w-5 h-5 text-teal-700 shrink-0" />{feature}</li>)}</ul>
          <p className="text-sm text-muted-foreground">No free trial. Charged at checkout, then $19.99 monthly until canceled. Cancel in account settings; access continues through the paid billing period.</p>
          {!checkout.isReady && <p role="status" className="text-sm">Monthly checkout is closed while launch testing is completed. No payment will be taken.</p>}
          {checkout.monthlyActive ? <Button asChild className="w-full"><Link href="/settings">Manage Family Premium</Link></Button> : checkout.assistantActive ? <Button asChild className="w-full"><Link href="/family">Use your included Parent Assistant</Link></Button> : <Button className="w-full min-h-11" disabled={!checkout.isReady || checkout.isPending} onClick={checkout.startCheckout} data-testid="button-family-checkout">{checkout.isPending ? 'Opening secure checkout…' : checkout.isReady ? 'Subscribe — $19.99/month' : 'Family Premium — Coming soon'}</Button>}
          <Link className="block text-center underline min-h-11 py-2" href="/family">Explore My Family</Link>
          <p className="text-xs text-muted-foreground">Reminder delivery requires a connected WhatsApp phone and separate consent. Calendar dates require your review. The assistant is not a live school-announcement feed.</p>
        </CardContent>
      </Card>
      <section className="rounded-xl border p-6 space-y-2" aria-label="Existing paid customers">
        <h2 className="text-xl font-semibold">Already a paying customer? Your plan stays intact.</h2>
        <p className="text-muted-foreground">We will not switch you to monthly billing or change your existing price or expiry. Active paid customers receive Parent Assistant as a grandfathered benefit through their existing paid access period. The legacy Research Pass is no longer sold.</p>
        <Link className="inline-block underline py-2" href="/settings">View existing access</Link>
      </section>
      <section className="rounded-xl border p-6 text-center"><h2 className="text-xl font-semibold">Just exploring? Start free.</h2><p className="text-muted-foreground my-3">Browse the directory and map, see basic school details and save up to five favorites.</p><Button variant="outline" asChild><Link href="/">Explore schools</Link></Button></section>
      <section className="grid md:grid-cols-2 gap-6" aria-label="Plan questions">{questions.map(([question, answer]) => <div key={question} className="space-y-2"><h3 className="font-semibold">{question}</h3><p className="text-muted-foreground text-sm">{answer}</p></div>)}</section>
    </main><Footer />
  </div>;
}
