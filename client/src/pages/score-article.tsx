import {useRoute} from 'wouter';
import {AppHeader} from '@/components/AppHeader';
import {Footer} from '@/components/Footer';
import {SEOHead} from '@/components/SEOHead';
import {StructuredData} from '@/components/StructuredData';
import {getScoreArticle,scoreArticleSchema} from '@shared/score-articles';
import {ScoreArticleContent} from '@shared/ScoreArticleContent';
import NotFound from './not-found';
import '../styles/score-charts.css';
export default function ScoreArticlePage() {
  const [,params]=useRoute('/blog/:slug');
  const page=getScoreArticle(params?.slug||'');
  if(!page)return <NotFound/>;
  return <div className="min-h-screen bg-background"><SEOHead title={page.title} description={page.description} canonicalPath={`/blog/${page.slug}`} ogType="article"/><StructuredData data={scoreArticleSchema(page)}/><AppHeader stackOnMobile/><main className="max-w-5xl mx-auto px-4 py-10"><ScoreArticleContent page={page}/></main><Footer/></div>;
}
