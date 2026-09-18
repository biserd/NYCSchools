import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Check, BookOpen, MessageCircle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { RESEARCH_PASS, FAMILY_PREMIUM, type AccountAccess } from '@shared/plans';

const researchFeatures = ['Full school database access and detailed profiles', 'School comparisons, historical trends and commute tools', 'Unlimited favorites and application tracking', 'Existing on-site AI school-research chat and recommendations'];
const familyFeatures = ['All School Research Pass benefits while subscribed', 'WhatsApp Parent Assistant for school and family questions', 'Personalized reminders and calendar management', 'Proactive school updates relevant to your family'];
const comparisons = [
  ['Detailed school data and research tools', '6 months', 'While subscribed'],
  ['On-site school-research chat', 'Included', 'Included'],
  ['WhatsApp Parent Assistant', 'Not included', 'Planned'],
  ['Automated reminders and proactive updates', 'Not included', 'Planned'],
  ['Payment', '$29.99 once', '$19.99/month at launch'],
  ['Renewal', 'No automatic renewal', 'Monthly; cancel anytime'],
];
const questions = [
  ['Do I need to buy both?', 'No. Family Premium will include the school database and research tools while subscribed. The Pass is for families who prefer a single payment for six months of research.'],
  ['What happens to my existing Pass if I upgrade?', 'Its original expiry and benefits stay intact. Family Premium does not pause, replace or extend your Pass.'],
  ['What happens when I cancel Family Premium?', 'Monthly benefits end when your paid billing period ends. If you still have an unexpired Research Pass, your school-research access continues until its original expiry. Otherwise you return to free access.'],
  ['Is the Parent Assistant available now?', 'Not yet. The My Family calendar is a preview. WhatsApp, automated reminders and proactive updates are not active, and monthly checkout is disabled.'],
  ['Is the existing on-site AI chat being removed?', 'No. Existing Pass benefits, including on-site school-research chat, stay included. The new Parent Assistant adds ongoing WhatsApp and calendar assistance.'],
  ['Does a monthly payment give me six months of research?', 'No. It includes research while the monthly plan remains active. Only a separately purchased Research Pass provides its own six-month access period.'],
];
export default function PricingPage() {
  const { user } = useAuth();
  const checkout = useCheckout();
  const { data: subscription } = useQuery<{ access: AccountAccess }>({ queryKey: ['/api/subscription'], enabled: !!user });
  const returned = new URLSearchParams(window.location.search).get('success') === 'true';
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title="School Research Pass & Family Premium Pricing" description="School Research Pass: $29.99 once for six months. Family Premium: $19.99/month at launch, including school research and a WhatsApp Parent Assistant. Coming soon." canonicalPath="/pricing" />
    <AppHeader stackOnMobile />
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 space-y-12">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <p className="text-primary font-semibold">One account. Two ways to help your family.</p>
        <h1 className="text-4xl md:text-5xl font-bold">Find the right school.<br />Stay on top of school life.</h1>
        <p className="text-lg text-muted-foreground">Research schools yourself with a one-time Pass, or choose ongoing help from a Parent Assistant when Family Premium launches.</p>
      </header>
      {returned && <p role="status">Checkout returned. Your access updates after payment is confirmed. Check your account for its status.</p>}
      {subscription?.access?.research && <p className="rounded-lg border p-4 bg-muted" role="status">Your school-research access is active. <Link className="underline" href="/settings">View your plan and expiry</Link>.</p>}
      <section className="grid md:grid-cols-2 gap-6" aria-label="Paid plans">
        <Card className="border-primary shadow-sm" data-testid="card-research-pass">
          <CardHeader className="space-y-3"><BookOpen className="text-primary" /><Badge className="w-fit">For your school search</Badge><CardTitle className="text-2xl">{RESEARCH_PASS.name}</CardTitle><p className="text-muted-foreground">“Help me choose a school.”</p><p><span className="text-4xl font-bold">${(RESEARCH_PASS.amount / 100).toFixed(2)}</span> one-time</p><p className="font-medium">6 months of school-research access. No renewal.</p></CardHeader>
          <CardContent className="space-y-6"><ul className="space-y-3">{researchFeatures.map(feature => <li className="flex gap-2" key={feature}><Check className="w-5 h-5 text-teal-700 shrink-0" />{feature}</li>)}</ul><p className="text-sm text-muted-foreground">WhatsApp assistance and automated reminders are not included. Your existing research tools remain included.</p>
            {checkout.isPremium ? <Button asChild className="w-full"><Link href="/settings">Manage my access</Link></Button> : <Button className="w-full min-h-11" onClick={checkout.startCheckout} disabled={!checkout.isReady || checkout.isPending} data-testid="button-research-checkout">{checkout.isPending ? 'Opening secure checkout…' : 'Get School Research Pass — $29.99'}</Button>}
            {!checkout.isReady && !checkout.isLoading && <p className="text-sm text-muted-foreground">Checkout is not available in this preview or is temporarily unavailable. You will not be charged.</p>}
            <p className="text-xs text-muted-foreground">One payment. No automatic renewal. Existing Pass purchases keep their original benefits and expiry.</p>
          </CardContent>
        </Card>
        <Card className="bg-teal-50/60 dark:bg-teal-950/20" data-testid="card-family-premium">
          <CardHeader className="space-y-3"><MessageCircle className="text-teal-700" /><Badge variant="secondary" className="w-fit">Coming soon · Not for sale yet</Badge><CardTitle className="text-2xl">{FAMILY_PREMIUM.name}</CardTitle><p className="text-muted-foreground">“Help me manage school life.”</p><p><span className="text-4xl font-bold">${(FAMILY_PREMIUM.amount / 100).toFixed(2)}</span>/month</p><p className="font-medium">School research included while subscribed.</p></CardHeader>
          <CardContent className="space-y-6"><ul className="space-y-3">{familyFeatures.map(feature => <li className="flex gap-2" key={feature}><Check className="w-5 h-5 text-teal-700 shrink-0" />{feature}</li>)}</ul><p className="text-sm text-muted-foreground">These assistant features are planned, not live. Monthly billing will only open when the assistant is ready; usage allowances will be shown before purchase.</p><Button className="w-full min-h-11" disabled data-testid="button-family-coming-soon">Family Premium — Coming soon</Button><Link className="block text-center underline min-h-11 py-2" href="/family">Preview My Family</Link><p className="text-xs text-muted-foreground">At launch: renews monthly until canceled. Access continues through the paid billing period. No separate Research Pass purchase required.</p></CardContent>
        </Card>
      </section>
      <section className="rounded-xl border p-6 text-center"><h2 className="text-xl font-semibold">Just exploring? Start free.</h2><p className="text-muted-foreground my-3">Browse the directory and map, see basic school details and save up to five favorites.</p><Button variant="outline" asChild><Link href="/">Explore schools</Link></Button></section>
      <section className="space-y-4"><h2 className="text-2xl font-bold">Research on your terms. Assistance when you need it.</h2><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm min-w-[560px]"><caption className="sr-only">Compare School Research Pass and planned Family Premium benefits</caption><thead className="bg-muted"><tr><th className="p-4 text-left" scope="col">Feature</th><th className="p-4 text-left" scope="col">School Research Pass</th><th className="p-4 text-left" scope="col">Family Premium · Coming soon</th></tr></thead><tbody>{comparisons.map(row => <tr key={row[0]} className="border-t"><th scope="row" className="p-4 text-left font-medium">{row[0]}</th><td className="p-4">{row[1]}</td><td className="p-4">{row[2]}</td></tr>)}</tbody></table></div></section>
      <section className="grid md:grid-cols-2 gap-6" aria-label="Plan questions">{questions.map(([question, answer]) => <div key={question} className="space-y-2"><h3 className="font-semibold">{question}</h3><p className="text-muted-foreground text-sm">{answer}</p></div>)}</section>
    </main><Footer />
  </div>;
}
