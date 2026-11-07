import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { StructuredData } from '@/components/StructuredData';
import { ChatGPTPluginContent } from '@shared/ChatGPTPluginContent';
import { CHATGPT_PLUGIN, chatgptPluginSchemas } from '@shared/chatgpt-plugin';
import { trackEvent } from '@/lib/analytics';
const schemas = chatgptPluginSchemas();

export default function ChatGPTPage() {
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title={CHATGPT_PLUGIN.title} description={CHATGPT_PLUGIN.description} canonicalPath={CHATGPT_PLUGIN.path} appendSiteName={false} />
    {schemas.map((data,index)=><StructuredData key={index} data={data} />)}
    <AppHeader stackOnMobile />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-10">
      <ChatGPTPluginContent onOpen={placement=>trackEvent('chatgpt_plugin_open',{placement})} onCopy={example=>trackEvent('chatgpt_prompt_copy',{example})} />
    </main>
    <Footer />
  </div>;
}
