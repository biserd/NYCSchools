import {useEffect,useRef,useState} from 'react';
import {Link} from 'wouter';
import {useMutation,useQuery} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useFamilyAssistant,useRefreshFamily} from '@/hooks/useFamily';
import {FamilyDraftReview} from './FamilyDraftReview';
type Message={id:string;role:'user'|'assistant';content:string};
function messageText(text:string){return text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part.replace(/[).,]+$/,'')} className="underline break-all" target="_blank" rel="nofollow noopener noreferrer">{part}</a>:part);}
export function ParentAssistantPanel({userId,open,onOpenChange}:{userId:string;open:boolean;onOpenChange:(open:boolean)=>void}) {
 const status=useFamilyAssistant(userId),refresh=useRefreshFamily(userId);
 const history=useQuery<{messages:Message[]}>({queryKey:['parent-history',userId],enabled:open&&!!status.data?.entitled,gcTime:0,staleTime:0,refetchOnWindowFocus:'always',queryFn:async()=>(await apiRequest('GET','/api/tuck/assistant/history')).json()});
 const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState('');const bottom=useRef<HTMLDivElement>(null);
 const send=useMutation({mutationFn:async(message:string)=>(await apiRequest('POST','/api/tuck/assistant/message',{message})).json() as Promise<{message:string}>,onSuccess:async result=>{setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'assistant',content:result.message}]);await refresh();await history.refetch();},onError:(_error,message)=>setInput(message)});
 const clear=useMutation({mutationFn:async()=>{await apiRequest('DELETE','/api/tuck/assistant/context');},onSuccess:async()=>{setMessages([]);await history.refetch();}});
 useEffect(()=>{if(open)void refresh();},[open]);
 useEffect(()=>{if(history.data&&!send.isPending)setMessages(history.data.messages);},[history.data,send.isPending]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages.length,send.isPending]);
 function submit(message:string){if(!message.trim()||send.isPending)return;setInput('');setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'user',content:message.trim()}]);send.mutate(message.trim());}
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[calc(100%_-_1rem)] sm:max-w-2xl max-h-[92dvh] flex flex-col gap-3"><DialogHeader><DialogTitle>Parent Assistant</DialogTitle><DialogDescription>School questions and family plans, without the busywork.</DialogDescription></DialogHeader>
   {status.isLoading?<p role="status">Checking your access…</p>:status.isError||status.data?.enabled===false?<p role="alert">The assistant is unavailable right now. Your calendar is still here.</p>:!status.data?.entitled?<div className="space-y-3"><p>Membership includes the Parent Assistant and WhatsApp reminders.</p><Button asChild><Link href="/pricing">View membership</Link></Button><p className="text-sm text-muted-foreground">You can still use your private calendar.</p></div>:<>
     <div className="overflow-y-auto min-h-0 space-y-3 pr-1" role="log" aria-label="Assistant conversation">
       {history.isLoading&&<p role="status" className="text-sm">Opening your conversation…</p>}
       {history.isError&&<p className="text-sm" role="alert">Recent messages could not load. You can still ask a question.</p>}
       {!messages.length&&!history.isLoading&&<div className="space-y-3 text-sm"><p>Tell me what you need. You don’t need to set up a family first.</p><div className="flex flex-wrap gap-2">{['What school dates are coming up?','Find elementary schools on the UES'].map(example=><Button key={example} variant="outline" className="h-auto min-h-11 whitespace-normal text-left" onClick={()=>submit(example)}>{example}</Button>)}</div><p className="text-muted-foreground">Or try “Remind me tomorrow at 8am to drop off Noah.”</p></div>}
       {messages.map(message=><div key={message.id} className={`rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${message.role==='user'?'bg-primary text-primary-foreground ml-8':'bg-muted mr-4'}`}><span className="sr-only">{message.role==='user'?'You: ':'Assistant: '}</span>{messageText(message.content)}</div>)}
       {send.isPending&&<p role="status" aria-live="polite" className="text-sm text-muted-foreground animate-pulse">Thinking…</p>}
       <FamilyDraftReview userId={userId}/><div ref={bottom}/>
     </div>
     {send.isError&&<p role="alert" className="text-sm text-destructive">{send.error.message} Your request is kept below so you don’t need to retype it.</p>}
     <form className="space-y-2 border-t pt-3" onSubmit={e=>{e.preventDefault();submit(input);}}><label className="sr-only" htmlFor="parent-request">Message Parent Assistant</label><textarea id="parent-request" rows={2} maxLength={1500} className="w-full rounded-md border bg-background p-3 text-sm" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask naturally…" required/><div className="flex items-center justify-between gap-2"><Button disabled={send.isPending||!input.trim()}>{send.isPending?'Working…':'Send'}</Button><Button type="button" variant="ghost" size="sm" disabled={send.isPending||clear.isPending} onClick={()=>{if(window.confirm('Start a new conversation? Your calendar and reminders will stay.'))clear.mutate();}}>New conversation</Button></div><p className="text-[11px] text-muted-foreground">AI assistance using Cloudflare AI. Recent conversation and relevant school/calendar data provide context. Avoid sensitive child details. Changes need your confirmation.</p></form>
   </>}
 </DialogContent></Dialog>;
}
