import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { getParentGuide, parentGuidePath } from '@shared/parent-guides';
import type { GuideData } from '@shared/parent-guide-data';
import { ParentGuideContent } from '@shared/ParentGuideContent';

export default function ParentGuidePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const guide = getParentGuide(slug);
  const { data, isPending } = useQuery<GuideData>({ queryKey: [`/api/parent-guides/${slug}`], enabled: !!guide && (guide.kind !== 'editorial' || !!guide.shortlistMode), staleTime: 300_000,
    initialData: () => {
      const seed = guide?.shortlistMode ? document.getElementById('shortlist-guide-data') : null;
      if (seed?.getAttribute('data-slug') === slug) {
        try { return JSON.parse(seed.textContent || ''); } catch { return undefined; }
      }
    },
  });
  if (!guide) return <><SEOHead title="Guide not found" noindex /><AppHeader /><main className="container p-8"><h1>Guide not found</h1><a className="text-primary underline" href="/explore-schools">Explore school guides</a></main><Footer /></>;
  return <div className="min-h-screen flex flex-col bg-background"><SEOHead title={guide.title} description={guide.description} canonicalPath={parentGuidePath(guide)} appendSiteName={false} /><AppHeader /><main className="flex-1 container mx-auto px-4 py-8"><ParentGuideContent guide={guide} data={data} pending={isPending} /></main><Footer nofollowExternal={guide.kind === 'editorial'} /></div>;
}
