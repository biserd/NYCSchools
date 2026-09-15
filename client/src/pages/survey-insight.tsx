import { useRoute } from 'wouter';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { getSurveyInsight, surveyBlogSchema } from '@shared/survey-insights';
import { StructuredData } from '@/components/StructuredData';
import { SurveyInsightContent } from '@shared/SurveyInsightContent';
import NotFound from './not-found';
export default function SurveyInsightPage() {
  const [,params] = useRoute('/blog/:slug');
  const page = getSurveyInsight(params?.slug ?? '');
  if (!page) return <NotFound />;
  return <div className="min-h-screen bg-background"><SEOHead title={page.title} description={page.description} canonicalPath={`/blog/${page.slug}`} ogType="article" /><StructuredData data={surveyBlogSchema(page)} /><AppHeader stackOnMobile /><main className="max-w-4xl mx-auto px-4 py-10"><SurveyInsightContent page={page} /></main><Footer /></div>;
}
