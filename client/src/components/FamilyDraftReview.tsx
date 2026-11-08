import {Link} from 'wouter';
import {useMutation,useQuery} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Button} from '@/components/ui/button';
import {useFamilyAssistant,useRefreshFamily} from '@/hooks/useFamily';
import {trackEvent} from '@/lib/analytics';
import {ParentWhatsAppConnection} from './ParentWhatsAppConnection';
export function FamilyDraftReview({userId}:{userId:string}){return <DraftReview key={userId} userId={userId}/>;}
function DraftReview({userId}:{userId:string}) {
 const status=useFamilyAssistant(userId),refresh=useRefreshFamily(userId);
 const connection=useQuery<{connected:boolean}>({queryKey:['parent-whatsapp',userId],gcTime:0,queryFn:async()=>(await apiRequest('GET','/api/tuck/whatsapp')).json()});
 const action=useMutation({mutationFn:async({id,confirm}:{id:string;confirm:boolean})=>{
   const res=await apiRequest(confirm?'POST':'DELETE',`/api/tuck/assistant/drafts/${id}${confirm?'/confirm':''}`);return res.json() as Promise<{message:string}>;
 },onSuccess:async(_result,variables)=>{trackEvent('family_draft_reviewed',{action:variables.confirm?'confirm':'discard'});await refresh();}});
 const drafts=status.data?.pendingDrafts||[];
 return <>{drafts.map(d=>{
   const needsConnection=!!d.reminderAt&&!d.preserveReminder&&!connection.data?.connected,paused=status.data?.enabled===false||!!d.reminderAt&&!d.preserveReminder&&!status.data?.deliveryEnabled;
   return <div key={d.draftId} className="rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3" data-testid="family-pending-draft">
     <h2 className="font-semibold">Ready for your review</h2><p className="whitespace-pre-wrap text-sm">{d.summary}</p>
     <p className="text-xs text-muted-foreground">Not saved yet. Review by {new Date(d.expiresAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}.</p>
     {needsConnection&&<ParentWhatsAppConnection userId={userId}/>}
     {!status.data?.entitled&&<p className="text-sm">This draft needs an active membership. <Link href="/pricing" className="underline">View membership</Link>, or discard it and keep using your manual calendar.</p>}
     {paused&&<p role="status" className="text-sm">WhatsApp delivery is temporarily unavailable. This reminder has not been scheduled.</p>}
     <div className="flex flex-wrap gap-2"><Button disabled={action.isPending||needsConnection||paused||!status.data?.entitled} onClick={()=>action.mutate({id:d.draftId,confirm:true})}>{d.operation==='delete'?'Confirm removal':'Confirm & save'}</Button><Button variant="outline" disabled={action.isPending} onClick={()=>action.mutate({id:d.draftId,confirm:false})}>Discard</Button></div>
   </div>;
 })}{action.isError&&<p role="alert" className="text-destructive">{action.error.message}</p>}{action.isSuccess&&<p role="status" className="text-sm">{action.data.message}</p>}</>;
}
