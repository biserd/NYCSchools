import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ParentWhatsAppConnection({ userId }: { userId: string }) {
  const [consent, setConsent] = useState(false);
  const status = useQuery<{ preview: boolean; configured: boolean; assistantEnabled?:boolean; connected: boolean; phone: string | null }>({
    queryKey: ['parent-whatsapp', userId], gcTime: 0,
    queryFn: async () => (await apiRequest('GET', '/api/tuck/whatsapp')).json(),
  });
  const connect = useMutation<{ url: string; expiresAt: number }, Error>({
    mutationFn: async () => (await apiRequest('POST', '/api/tuck/whatsapp/link', { consent })).json(),
  });
  const disconnect = useMutation({ mutationFn: async () => {
    await apiRequest('POST', '/api/tuck/whatsapp/disconnect'); connect.reset(); setConsent(false); await status.refetch();
  } });
  if (status.data?.preview === false) return null;
  return <Card><CardHeader><CardTitle>Connect WhatsApp</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Dedicated NYC School Ratings number: +1 917-473-0386. Link your own WhatsApp phone to your account. Linking does not start a subscription or opt you into reminders. {status.data?.assistantEnabled?'Use the assistant preferences below to control AI and reminders.':'Connection preview only; AI and proactive delivery are not enabled yet.'}</p>
    {status.isLoading ? <p role="status">Checking connection…</p> : status.isError ? <p role="alert">Could not check WhatsApp setup.</p> : <>
      {!status.data?.configured && <p role="status">Waiting for secure Twilio configuration. Linking is disabled until setup is complete.</p>}
      {status.data?.connected ? <><p>Connected: {status.data.phone}. Send <strong>EVENTS</strong> for your next five dates, <strong>STATUS</strong> to check, or <strong>STOP</strong> to disconnect.</p><Button variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>Disconnect WhatsApp</Button></> : <>
        <label className="flex items-start gap-3 text-sm min-h-11"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); connect.reset(); }} />I want to link my WhatsApp phone to my account so I can request my family calendar dates. I can disconnect here or send STOP. This does not opt me into marketing or start a paid subscription.</label>
        <Button disabled={!status.data?.configured || !consent || connect.isPending} onClick={() => connect.mutate()}>Create secure WhatsApp link</Button>
        {connect.data && <div className="space-y-2"><p>Send the pre-filled LINK message from your own WhatsApp phone. This private link expires in 10 minutes; do not share it.</p><Button asChild><a href={connect.data.url} target="_blank" rel="nofollow noopener noreferrer">Open WhatsApp to connect</a></Button></div>}
      </>}
    </>}
    <Button variant="ghost" disabled={status.isFetching} onClick={() => { connect.reset(); void status.refetch(); }}>Refresh connection status</Button>
    {(connect.isError || disconnect.isError) && <p role="alert" className="text-destructive">{connect.error?.message || disconnect.error?.message}</p>}
  </CardContent></Card>;
}
