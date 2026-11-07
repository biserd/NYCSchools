import React, { useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Copy, GitCompare, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { CHATGPT_FAQS, CHATGPT_PLUGIN, CHATGPT_PROMPTS } from './chatgpt-plugin';

type Props = { onOpen?: (placement: string) => void; onCopy?: (example: number) => void };

export function ChatGPTPluginContent({ onOpen, onCopy }: Props) {
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState(false);
  async function copyPrompt(index: number) {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPTS[index].prompt);
      setCopied(index); setCopyError(false); onCopy?.(index);
    } catch { setCopyError(true); }
  }
  return <div className="space-y-10 md:space-y-14">
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><a href="/" className="hover:underline">Home</a><span aria-hidden="true"> / </span><span>ChatGPT plugin</span></nav>
    <section className="rounded-3xl border border-blue-800 bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800 p-6 text-white shadow-lg md:p-10" aria-labelledby="chatgpt-title">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-200">NYC School Ratings for ChatGPT</p>
          <h1 id="chatgpt-title" className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">Find and compare NYC schools in ChatGPT.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-blue-100">Start with a question. Build a shortlist. Understand the tradeoffs with school records, source years and links you can check.</p>
          <a href={CHATGPT_PLUGIN.url} target="_blank" rel="noopener noreferrer nofollow" onClick={()=>onOpen?.('hero')} data-testid="chatgpt-plugin-install" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-blue-950 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Open plugin in ChatGPT<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
          <p className="mt-3 text-sm leading-relaxed text-blue-100">Public school research. No NYC School Ratings subscription required.</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
          <MessageCircle className="mb-3 h-7 w-7 text-sky-200" aria-hidden="true" />
          <p className="text-sm font-medium text-sky-200">Start with a question like this</p>
          <blockquote className="mt-3 text-xl font-medium leading-relaxed">“Find public elementary schools in District 2 and show me the sources.”</blockquote>
          <ul className="mt-5 space-y-2 text-sm text-blue-100">{['Matching school records','Profile links and reporting years','Clear notes when data is missing'].map(item=><li className="flex gap-2" key={item}><Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" aria-hidden="true" />{item}</li>)}</ul>
        </div>
      </div>
    </section>

    <section aria-labelledby="plugin-capabilities">
      <h2 id="plugin-capabilities" className="text-2xl font-bold">From a broad search to a useful comparison</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{[
        { Icon:Search, title:'Find schools that fit', text:'Search by borough, district, grade, district or charter school type, and recorded programs such as 2-K, 3-K, pre-K and dual language.' },
        { Icon:GitCompare, title:'Compare 2 to 4 schools', text:'Look at available academic and survey measures side by side. Keep grade ranges, reporting years and missing data in view.' },
        { Icon:BookOpen, title:'Follow the evidence', text:'Ask about a school by name or DBN. Open its full profile, check the sources, and separate our comparison score from official measures.' },
      ].map(({Icon,title,text})=><article key={title} className="rounded-xl border bg-card p-5"><Icon className="mb-4 h-6 w-6 text-blue-700 dark:text-sky-300" aria-hidden="true" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
    </section>

    <section aria-labelledby="plugin-setup" className="rounded-2xl border bg-blue-50/60 p-6 dark:bg-blue-950/20">
      <h2 id="plugin-setup" className="text-2xl font-bold">Get started in three steps</h2>
      <ol className="mt-5 grid gap-5 md:grid-cols-3">{[
        ['Open the listing','Follow the button above to NYC School Ratings in ChatGPT. Sign in to ChatGPT if prompted.'],
        ['Install the plugin','Use the installation control on the listing and follow any prompts. Availability depends on your ChatGPT account and workspace.'],
        ['Start a new conversation','Ask ChatGPT to use NYC School Ratings, or type @ and select the plugin. Add a district or borough, your child’s grade, and the programs that matter.'],
      ].map(([title,text],i)=><li key={title}><span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white" aria-hidden="true">{i+1}</span><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></li>)}</ol>
      <p className="mt-5 text-sm text-muted-foreground">Installation help: <a href="https://learn.chatgpt.com/docs/plugins" target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">OpenAI’s plugin guide</a>.</p>
    </section>

    <section aria-labelledby="plugin-prompts">
      <h2 id="plugin-prompts" className="text-2xl font-bold">Try these questions</h2>
      <p className="mt-2 text-muted-foreground">Copy a starting point, then tailor it to your family. These are example requests, not pre-generated school recommendations.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{CHATGPT_PROMPTS.map((example,index)=><article key={example.label} className="flex flex-col rounded-xl border bg-card p-5"><h3 className="font-semibold">{example.label}</h3><p className="my-3 flex-1 text-sm leading-relaxed text-muted-foreground">{example.prompt}</p><button type="button" onClick={()=>copyPrompt(index)} aria-label={`Copy prompt: ${example.label}`} className="inline-flex min-h-11 self-start items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">{copied===index?<Check className="h-4 w-4" aria-hidden="true" />:<Copy className="h-4 w-4" aria-hidden="true" />}{copied===index?'Copied':'Copy prompt'}</button></article>)}</div>
      <p role="status" className="mt-2 min-h-5 text-sm text-muted-foreground">{copyError?'Could not copy automatically. Select the question text and copy it instead.':copied!==null?'Prompt copied. Paste it into a ChatGPT conversation with NYC School Ratings selected.':''}</p>
    </section>

    <section aria-labelledby="plugin-boundaries" className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-blue-700 dark:text-sky-300" aria-hidden="true" /><div><h2 id="plugin-boundaries" className="text-2xl font-bold">Useful research, with clear limits</h2><p className="mt-3 leading-relaxed text-muted-foreground">The plugin reads public school information. It does not change ratings, enroll children, guarantee seats or calculate admissions odds. A missing score is not a zero. Early-childhood-only providers do not receive K–12 academic scores.</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Our ratings are independent, not official NYCPS or NYSED ratings. The plugin does not access private calendars, messages, subscriber accounts or billing. Do not share children’s personal information or account credentials in a school-search request.</p><p className="mt-4 text-sm"><a href="/methodology" className="text-primary underline underline-offset-2">How our ratings work</a><span aria-hidden="true"> · </span><a href="/privacy" className="text-primary underline underline-offset-2">Privacy policy</a><span aria-hidden="true"> · </span><a href="/terms" className="text-primary underline underline-offset-2">Terms</a></p></div></div>
    </section>

    <section aria-labelledby="plugin-next-step">
      <h2 id="plugin-next-step" className="text-2xl font-bold">A conversation is the starting point</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">Use the plugin to explore public records, then open school profiles to investigate further. For maps, visit the <a href="/map" className="text-primary underline">school map</a>. For your own calendar, WhatsApp reminders and included KinderLearner Pro, explore <a href="/pricing" className="text-primary underline">Family Premium</a>. Those private features are separate from this plugin.</p>
    </section>

    <section aria-labelledby="plugin-faq"><h2 id="plugin-faq" className="text-2xl font-bold">Questions before you connect?</h2><div className="mt-5 divide-y rounded-xl border bg-card px-5">{CHATGPT_FAQS.map(faq=><details key={faq.question} className="py-4"><summary className="min-h-11 cursor-pointer content-center font-semibold">{faq.question}</summary><p className="pb-2 pt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p></details>)}</div></section>
    <section className="rounded-2xl border bg-card p-6 text-center"><h2 className="text-2xl font-bold">Bring your next school question to ChatGPT.</h2><a href={CHATGPT_PLUGIN.url} target="_blank" rel="noopener noreferrer nofollow" onClick={()=>onOpen?.('closing')} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Open NYC School Ratings in ChatGPT<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a><p className="mt-4 text-sm text-muted-foreground">Need help? <a href="/contact" className="text-primary underline">Contact the NYC School Ratings team</a>.</p></section>
  </div>;
}
