import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { ClassroomPilotPreview } from '@/components/ClassroomPilotPreview';

export default function ClassroomPilotDraftPage() {
  return <div className="flex min-h-screen flex-col bg-background">
    <AppHeader/>
    <main className="flex-1 px-4 py-8"><ClassroomPilotPreview view="draft"/></main>
    <Footer/>
  </div>;
}
