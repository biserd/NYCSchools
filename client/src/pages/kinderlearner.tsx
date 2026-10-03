import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { StructuredData } from '@/components/StructuredData';
import { KinderLearnerContent } from '@shared/KinderLearnerContent';
import { KINDERLEARNER, KINDERLEARNER_PAGES, getKinderLearnerPage, kinderLearnerSchemas } from '@shared/kinderlearner';
import NotFound from './not-found';
import { KINDERLEARNER_INFO_PAGES, getKinderLearnerInfoPage, kinderLearnerInfoSchemas } from '@shared/kinderlearner-info';
import { KinderLearnerInfoContent } from '@shared/KinderLearnerInfoContent';
import { initializeAttribution, trackEvent } from '@/lib/analytics';

export default function KinderLearnerPage() {
  const [location] = useLocation();
  const page = getKinderLearnerPage(location);
  const infoPage = getKinderLearnerInfoPage(location);
  useLayoutEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewport?.getAttribute('content');
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0');
    // The Worker puts this in <head> for direct loads; SPA navigation needs it too.
    if (!document.querySelector('link[data-kinderlearner]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = KINDERLEARNER.stylesheet;
      link.dataset.kinderlearner = 'true'; document.head.appendChild(link);
    }
    return () => {
      if (previousViewport) viewport?.setAttribute('content', previousViewport);
    };
  }, []);
  useEffect(() => {
    // Direct SSR loads do not mount the main app's page-view component.
    if (document.getElementById('root')?.dataset.kinderlearnerStandalone === 'true') {
      initializeAttribution();
      trackEvent('page_view', { page_location: window.location.href, page_path: location, page_title: document.title });
    }
  }, [location]);
  if (infoPage) {
    const meta = KINDERLEARNER_INFO_PAGES[infoPage];
    return <><SEOHead title={meta.title} description={meta.description} canonicalPath={meta.path} appendSiteName={false}/>{kinderLearnerInfoSchemas(infoPage).map((data,i)=><StructuredData key={i} data={data}/>)}<KinderLearnerInfoContent page={infoPage}/></>;
  }
  if (!page) return <NotFound/>;
  const meta = KINDERLEARNER_PAGES[page];
  return <><SEOHead title={meta.title} description={meta.description} canonicalPath={meta.path} appendSiteName={false}/>{kinderLearnerSchemas(page).map((data,i)=><StructuredData key={i} data={data}/>)}<KinderLearnerContent page={page}/></>;
}
