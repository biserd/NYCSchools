import { useRef, useState, type ComponentType } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Keep the launcher available immediately without loading the chat UI or its
// authenticated queries. Once opened, retain the component and conversation.
export function DeferredChatBot() {
  const [Chat, setChat] = useState<ComponentType<{ initialOpen?: boolean }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);

  async function open() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const module = await import("./ChatBot");
      setChat(() => module.ChatBot);
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (Chat) return <Chat initialOpen />;
  return <>
    {failed && <p role="alert" className="fixed bottom-24 right-6 z-50 max-w-64 rounded-lg border bg-background p-3 text-sm shadow-lg">Chat couldn't load. Tap the chat button to retry.</p>}
    <Button onClick={open} disabled={loading} size="icon"
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90"
      data-testid="button-chat-open" aria-busy={loading}
      aria-label={loading ? "Loading AI Assistant chat" : "Open AI Assistant chat"}>
      {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <MessageCircle className="w-7 h-7" />}
    </Button>
  </>;
}
