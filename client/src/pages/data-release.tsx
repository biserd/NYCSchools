import {AppHeader} from '@/components/AppHeader';
import {Footer} from '@/components/Footer';
import {SEOHead} from '@/components/SEOHead';
import {StructuredData} from '@/components/StructuredData';
import {DATA_RELEASE,dataReleaseSchema} from '@shared/data-release';
import {DataReleaseContent} from '@shared/DataReleaseContent';
import '../styles/score-charts.css';
export default function DataReleasePage() {
  return <div className="min-h-screen bg-background"><SEOHead title={DATA_RELEASE.title} description={DATA_RELEASE.description} canonicalPath={DATA_RELEASE.path} ogType="article"/><StructuredData data={dataReleaseSchema()}/><AppHeader stackOnMobile/><main className="max-w-5xl mx-auto px-4 py-10"><DataReleaseContent/></main><Footer/></div>;
}
