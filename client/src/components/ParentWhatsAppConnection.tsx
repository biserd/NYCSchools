import {useEffect,useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Button} from '@/components/ui/button';
import {trackEvent} from '@/lib/analytics';
import {useRefreshFamily} from '@/hooks/useFamily';
export function ParentWhatsAppConnection({userId,onConnected}:{userId:string;onConnected?:()=>void}) {
 const [consent,setConsent]=useState(false);
 const refresh=useRefreshFamily(userId);
 const status=useQuery<{preview:boolean;configured:boolean;assistantEnabled?:boolean;connected:boolean;phone:string|null}>({queryKey:['parent-whatsapp',userId],gcTime:0,refetchOnWindowFocus:'always',queryFn:async()=>(await apiRequest('GET','/api/tuck/whatsapp')).json()});
 const connect=useMutation<{url:string;expiresAt:number},Error>({mutationFn:async()=>(await apiRequest('POST','/api/tuck/whatsapp/link',{consent})).json()});
 const disconnect=useMutation({mutationFn:async()=>{await apiRequest('POST','/api/tuck/whatsapp/disconnect');},onSuccess:async()=>{connect.reset();setConsent(false);await status.refetch();await refresh();}});
 useEffect(()=>{
   if(!connect.data||status.data?.connected)return;
   const deadline=Math.min(connect.data.expiresAt,Date.now()+120000);
   const tick=window.setInterval(()=>{if(Date.now()>deadline){window.clearInterval(tick);return;}if(document.visibilityState==='visible')void status.refetch();},4000);
   const returned=()=>{if(document.visibilityState==='visible')void status.refetch();};document.addEventListener('visibilitychange',returned);
   return()=>{window.clearInterval(tick);document.removeEventListener('visibilitychange',returned);};
 },[connect.data,status.data?.connected]);
 useEffect(()=>{if(status.data?.connected&&connect.data){trackEvent('family_whatsapp_connected');connect.reset();void refresh();onConnected?.();}},[status.data?.connected]);
 if(status.data?.preview===false)return null;
 return <div className="space-y-3" data-testid="whatsapp-connection">
   {status.isLoading?<p role="status">Checking WhatsApp…</p>:status.isError?<p role="alert">WhatsApp status is unavailable. <button className="underline min-h-11" onClick={()=>void status.refetch()}>Try again</button></p>:status.data?.connected?<><p className="text-sm font-medium text-green-800 dark:text-green-300">WhatsApp connected · {status.data.phone}</p><p className="text-xs text-muted-foreground">Only reminders you request are sent. Reply STOP at any time.</p><details><summary className="cursor-pointer py-2 text-sm underline">Manage connection</summary><Button variant="outline" disabled={disconnect.isPending} onClick={()=>{if(window.confirm('Disconnect WhatsApp and cancel upcoming reminders?'))disconnect.mutate();}}>Disconnect WhatsApp</Button></details></>:<>
     <h3 className="font-semibold">Connect WhatsApp once</h3><p className="text-sm text-muted-foreground">Then choose reminders right from your calendar. No marketing messages.</p>
     {!status.data?.configured?<p role="status">WhatsApp setup is temporarily unavailable. You can still save calendar events.</p>:<>
       <label className="flex items-start gap-3 min-h-11 text-sm"><input className="h-5 w-5 mt-1 shrink-0" type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);connect.reset();}}/><span>I agree to link my WhatsApp and receive only the reminders I request. I can send STOP to disconnect.</span></label>
       {!connect.data?<Button type="button" disabled={!consent||connect.isPending} onClick={()=>connect.mutate()}>{connect.isPending?'Preparing…':'Connect my WhatsApp'}</Button>:<div className="space-y-2"><Button asChild><a href={connect.data.url} target="_blank" rel="nofollow noopener noreferrer">Open WhatsApp to connect</a></Button><p className="text-xs text-muted-foreground">Send the prefilled message. We’ll update this page when you return. Link expires in 10 minutes.</p><button className="text-sm underline min-h-11" onClick={()=>void status.refetch()}>I sent it, check connection</button></div>}
     </>}
   </>}
   {(connect.isError||disconnect.isError)&&<p role="alert" className="text-sm text-destructive">{connect.error?.message||disconnect.error?.message}</p>}
 </div>;
}
