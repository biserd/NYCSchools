import {useEffect,useState} from 'react';
import {Link} from 'wouter';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Plus,MessageCircle,Settings2} from 'lucide-react';
import {AppHeader} from '@/components/AppHeader';
import {Footer} from '@/components/Footer';
import {SEOHead} from '@/components/SEOHead';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/hooks/useAuth';
import {useFamilyAssistant} from '@/hooks/useFamily';
import {apiRequest} from '@/lib/queryClient';
import {trackEvent} from '@/lib/analytics';
import {FamilyCalendar} from '@/components/FamilyCalendar';
import {FamilyEventComposer,type FamilyComposerSeed} from '@/components/FamilyEventComposer';
import {FamilyDraftReview} from '@/components/FamilyDraftReview';
import {FamilySettings} from '@/components/FamilySettings';
import {ParentAssistantPanel} from '@/components/ParentAssistantPanel';
import type {TuckOverview} from '@shared/tuck';

export default function TuckPage() {
 const {user,isLoading}=useAuth();
 const queries=useQueryClient();
 const [returnedFromCheckout]=useState(()=>new URLSearchParams(window.location.search).get('checkout')==='success');
 const [checkoutSessionId]=useState(()=>new URLSearchParams(window.location.search).get('session_id'));
 const [checkoutConfirmed,setCheckoutConfirmed]=useState(false);
 useEffect(()=>{
   if(!returnedFromCheckout)return;
   trackEvent('subscription_checkout_returned',{plan:'family_premium',result:'success_return'});
   window.history.replaceState(window.history.state,'','/family');
 },[returnedFromCheckout]);
 useEffect(()=>{
   if(!returnedFromCheckout||!checkoutSessionId||!/^cs_(?:test_|live_)?[A-Za-z0-9]{12,200}$/.test(checkoutSessionId))return;
   let active=true,attempts=0;
   const check=async()=>{
     try{
       const response=await fetch(`/api/family/checkout/status?session_id=${encodeURIComponent(checkoutSessionId)}`,{cache:'no-store'});
       if(!response.ok)return;
       const result=await response.json() as {status:string;value?:number;currency?:string};
       if(result.status==='paid'&&active){
         setCheckoutConfirmed(true);
         // The signed-webhook-backed status, not the URL, proves payment.
         // Refresh access even when the webhook finished after this page loaded.
         await Promise.all([queries.invalidateQueries({queryKey:['parent-assistant',user?.id]}),queries.invalidateQueries({queryKey:['family-premium-access',user?.id]}),queries.invalidateQueries({queryKey:['/api/subscription']}),queries.invalidateQueries({queryKey:['/api/auth/user']})]);
         if(['nycschoolsratings.com','www.nycschoolsratings.com'].includes(window.location.hostname)){
         const key=`nycsr_paid_checkout_${checkoutSessionId}`;
         if(!window.localStorage.getItem(key)){window.localStorage.setItem(key,'1');trackEvent('purchase',{transaction_id:checkoutSessionId,currency:(result.currency||'usd').toUpperCase(),value:result.value||0,items:[{item_id:'family_premium',item_name:'Family Premium',price:result.value||0,quantity:1}],plan:'family_premium'});}}
         return;
       }
     }catch{/* Stripe webhook, not this redirect, owns access. */}
     if(active&&++attempts<8)window.setTimeout(check,2500);
   };void check();return()=>{active=false;};
 },[returnedFromCheckout,checkoutSessionId,user?.id,queries]);
 const overview=useQuery<TuckOverview>({queryKey:['tuck-overview',user?.id],enabled:!!user,gcTime:0,refetchOnWindowFocus:'always',queryFn:async()=>(await apiRequest('GET','/api/tuck/overview')).json()});
 const assistant=useFamilyAssistant(user?.id);
 const whatsapp=useQuery<{connected:boolean}>({queryKey:['parent-whatsapp',user?.id],enabled:!!user,gcTime:0,refetchOnWindowFocus:'always',queryFn:async()=>(await apiRequest('GET','/api/tuck/whatsapp')).json()});
 const [composer,setComposer]=useState<FamilyComposerSeed|null>(null),[chat,setChat]=useState(false),[notice,setNotice]=useState(''),[settings,setSettings]=useState(false);
 const data=overview.data;
 useEffect(()=>{setComposer(null);setChat(false);setNotice('');setSettings(false);},[user?.id]);
 const openSettings=()=>{setSettings(true);window.setTimeout(()=>document.getElementById('family-settings')?.scrollIntoView({behavior:'smooth',block:'start'}),0);};
 useEffect(()=>{if(user)trackEvent('family_viewed');},[user?.id]);
 return <div className="min-h-screen flex flex-col bg-background"><SEOHead title="My Family" description="Upcoming school dates, your family plans and simple WhatsApp reminders." canonicalPath="/family" noindex/><AppHeader stackOnMobile/>
   <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 md:py-8 space-y-6">
     <header className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-2xl md:text-3xl font-bold">My Family</h1><p className="mt-1 text-sm text-muted-foreground">What’s coming up, without keeping it all in your head.</p></div><div className="flex gap-2">
       {user?<><Button onClick={()=>setComposer({})}><Plus className="w-4 h-4 mr-1"/>Add event</Button><Button variant="outline" onClick={()=>setChat(true)}><MessageCircle className="w-4 h-4 mr-1"/>Ask Assistant</Button></>:!isLoading?<><Button asChild><Link href="/login?redirect=/family">Add my own events</Link></Button><Button variant="outline" asChild><Link href="/pricing#checkout">Get reminders</Link></Button></>:<p role="status">Checking your account…</p>}
     </div></header>
     {returnedFromCheckout&&<p role="status" className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">{checkoutConfirmed&&assistant.data?.entitled?'You’re all set. Your membership features are ready.':checkoutConfirmed?<>Payment confirmed. Use the email address you entered at Stripe to access your membership. <Link href="/login?redirect=/family" className="underline">Sign in or request a fresh link</Link>.</>:<>We’re checking payment confirmation. You can use the calendar while we finish. If you checked out as a guest, we’ll email a secure sign-in link to the address you entered at Stripe.</>}</p>}
     {notice&&<p role="status" className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 p-3 text-sm">{notice}</p>}
     {user&&<><div className="flex flex-wrap justify-between items-center gap-3 text-sm"><p className={whatsapp.data?.connected?'text-green-800 dark:text-green-300':'text-muted-foreground'}>{whatsapp.data?.connected?'WhatsApp connected':assistant.data?.entitled?'Reminders are included. Connect WhatsApp when you’re ready.':'Private events are yours. Membership adds WhatsApp reminders and the assistant.'}</p><button className="min-h-11 inline-flex gap-1 items-center underline" onClick={openSettings}><Settings2 className="w-4 h-4"/>Family &amp; settings</button></div><FamilyDraftReview userId={user.id}/></>}
     {user&&overview.isError&&<p role="alert" className="rounded-lg border p-3 text-sm">Your private dates could not load. Reference dates below are still available. <button className="underline min-h-11" onClick={()=>void overview.refetch()}>Try again</button></p>}
     {user&&assistant.isError&&<p role="alert" className="text-sm">Reminder status is unavailable. Your calendar is still available. <button className="underline min-h-11" onClick={()=>void assistant.refetch()}>Check again</button></p>}
     {user&&overview.isLoading?<p role="status">Opening your calendar…</p>:<FamilyCalendar privateEvents={data?.events||[]} children={data?.children||[]} reminders={assistant.data?.reminders||[]} onSelectDate={user?(date,childId)=>setComposer({date,childId}):undefined} onSelectEvent={user?(entry,remind)=>setComposer({entry,remind}):undefined}/>}
     {user?<><details id="family-settings" open={settings} onToggle={e=>setSettings(e.currentTarget.open)} className="rounded-xl border p-4"><summary className="cursor-pointer min-h-11 flex items-center font-medium">Family &amp; settings</summary><FamilySettings userId={user.id} children={data?.children||[]} onTestReminder={()=>setComposer({test:true,remind:true})}/></details><nav className="flex flex-wrap gap-5 text-sm"><Link className="min-h-11 inline-flex items-center underline" href="/favorites">Saved schools</Link><Link className="min-h-11 inline-flex items-center underline" href="/application-tracker">Application tracker</Link><Link className="min-h-11 inline-flex items-center underline" href="/settings">Account &amp; membership</Link></nav><p className="text-xs text-muted-foreground">Your family plans are private to your account. WhatsApp sends only the reminders you request. Keep a backup for critical deadlines.</p></>:<p className="text-sm text-muted-foreground">Published NYCPS dates are free to view. Sign in to save your own private events. <Link href="/pricing#checkout" className="underline text-primary">Membership</Link> adds the assistant and reminders; you can subscribe without registering first.</p>}
   </main><Footer/>
   {user&&composer&&<FamilyEventComposer key={user.id+JSON.stringify(composer)} userId={user.id} children={data?.children||[]} seed={composer} onClose={()=>setComposer(null)} onSaved={setNotice}/>}
   {user&&<ParentAssistantPanel key={user.id} userId={user.id} open={chat} onOpenChange={setChat}/>}
 </div>;
}
