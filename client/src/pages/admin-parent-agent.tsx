import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useLocation} from 'wouter';
import {RefreshCcw,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {AppHeader} from '@/components/AppHeader';
import {SEOHead} from '@/components/SEOHead';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';

type CountRow={count:number|string;[key:string]:string|number};
type Run={created_at:number;model:string;action:string;tool:string;outcome:string;duration_ms:number;location_kind:string|null;location_label:string|null;grade_level:string|null;result_count:number;used_context:number};
interface Overview {now:number;windowDays:number;summary:{total:number;successful:number;avg_duration_ms:number;results:number}|null;actions:CountRow[];tools:CountRow[];models:CountRow[];recent:Run[];privacy:string}

const shortModel=(value:string)=>value.split('/').pop()||value;
const formatTime=(value:number)=>new Date(value).toLocaleString('en-US',{dateStyle:'short',timeStyle:'short'});

export default function AdminParentAgentPage(){
  const {isLoading:authLoading,isAuthenticated}=useAuth();
  const [,setLocation]=useLocation();
  const query=useQuery<Overview>({queryKey:['/api/admin/parent-agent/overview'],enabled:isAuthenticated,refetchInterval:60_000});
  useEffect(()=>{if(!authLoading&&!isAuthenticated)setLocation('/login');},[authLoading,isAuthenticated,setLocation]);
  if(authLoading||(!query.data&&!query.error))return <><SEOHead title="Parent Assistant Admin" description="Private administration page." canonicalPath="/admin/parent-agent" noindex/><AppHeader/><main className="max-w-7xl mx-auto px-4 py-8"><Skeleton className="h-10 w-72 mb-5"/><Skeleton className="h-96"/></main></>;
  if(!isAuthenticated)return null;
  const forbidden=(query.error as any)?.status===403||(query.error as any)?.message?.includes('403');
  if(forbidden)return <><SEOHead title="Parent Assistant Admin" description="Private administration page." canonicalPath="/admin/parent-agent" noindex/><AppHeader/><main className="max-w-3xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Admin access required</h1></main></>;
  if(query.error||!query.data)return <><SEOHead title="Parent Assistant Admin" description="Private administration page." canonicalPath="/admin/parent-agent" noindex/><AppHeader/><main className="max-w-3xl mx-auto px-4 py-16"><h1 className="text-2xl font-semibold">Telemetry unavailable</h1><p className="text-muted-foreground mt-2">{String((query.error as Error)?.message||'Unknown error')}</p></main></>;
  const data=query.data,summary=data.summary||{total:0,successful:0,avg_duration_ms:0,results:0};
  const success=Number(summary.total)?Math.round(Number(summary.successful||0)/Number(summary.total)*100):0;
  return <div className="min-h-screen bg-background"><SEOHead title="Parent Assistant Admin" description="Private administration page." canonicalPath="/admin/parent-agent" noindex/><AppHeader/><main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
    <div className="flex items-start justify-between gap-4 mb-6"><div><h1 className="text-2xl md:text-3xl font-semibold">Parent Assistant operations</h1><p className="text-sm text-muted-foreground mt-1">Intent, tool, routing and outcome telemetry—without private conversation content.</p></div><Button variant="outline" onClick={()=>query.refetch()} disabled={query.isFetching}><RefreshCcw className={`w-4 h-4 mr-2 ${query.isFetching?'animate-spin':''}`}/>Refresh</Button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card><CardHeader className="pb-2"><CardDescription>Runs (7 days)</CardDescription><CardTitle className="text-3xl">{Number(summary.total||0).toLocaleString()}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Successful</CardDescription><CardTitle className="text-3xl">{success}%</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Average latency</CardDescription><CardTitle className="text-3xl">{Number(summary.avg_duration_ms||0).toLocaleString()} ms</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>School results</CardDescription><CardTitle className="text-3xl">{Number(summary.results||0).toLocaleString()}</CardTitle></CardHeader></Card>
    </div>
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      {([['Actions',data.actions,'action'],['Tools',data.tools,'tool'],['Models',data.models,'model']] as const).map(([title,rows,key])=><Card key={title}><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.length?rows.map((row,i)=><div className="flex justify-between gap-3 text-sm" key={i}><span className="truncate">{key==='model'?shortModel(String(row[key])):String(row[key])}</span><Badge variant="secondary">{Number(row.count)}</Badge></div>):<span className="text-sm text-muted-foreground">No runs yet</span>}</CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle>Recent runs</CardTitle><CardDescription>{data.privacy}</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Model</TableHead><TableHead>Intent</TableHead><TableHead>Tool</TableHead><TableHead>Filters</TableHead><TableHead>Results</TableHead><TableHead>Outcome</TableHead><TableHead>Latency</TableHead></TableRow></TableHeader><TableBody>{data.recent.map((run,i)=><TableRow key={`${run.created_at}-${i}`}><TableCell className="whitespace-nowrap">{formatTime(run.created_at)}</TableCell><TableCell>{shortModel(run.model)}</TableCell><TableCell>{run.action}</TableCell><TableCell>{run.tool}</TableCell><TableCell>{[run.location_label,run.grade_level].filter(Boolean).join(' · ')||'—'}{run.used_context?<Badge variant="outline" className="ml-2">context</Badge>:null}</TableCell><TableCell>{run.result_count}</TableCell><TableCell><Badge variant={run.outcome==='ok'?'secondary':'destructive'}>{run.outcome}</Badge></TableCell><TableCell>{run.duration_ms} ms</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="w-4 h-4"/>The dashboard intentionally excludes messages, responses, phone numbers, emails and child records.</div>
  </main></div>;
}
