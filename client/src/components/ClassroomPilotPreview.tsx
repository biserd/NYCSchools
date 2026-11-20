import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ClassroomPilotDistrict, ClassroomPilotDraft, ClassroomPilotSchool } from '@shared/ClassroomPilotContent';
import { hasClassroomPilot, PILOT_API, type PilotData } from '@shared/classroomPilot';

export function ClassroomPilotPreview({view}:{view:'school'|'district'|'draft'|'article'}) {
  const enabled = hasClassroomPilot();
  const article = view==='draft'||view==='article';
  const {data,isPending,isError} = useQuery<PilotData>({queryKey:[PILOT_API],enabled,retry:false,staleTime:60_000});
  const ready = Boolean(data);
  useEffect(()=>{
    if (!enabled || !ready || article) return;
    const section = view === 'school' ? 'enrollment-and-class-size' : 'kindergarten-class-size';
    if (window.location.hash === '#' + section) document.getElementById(section)?.scrollIntoView();
    if (view === 'school' && window.location.hash === '#enrollment-by-grade') document.getElementById('enrollment-by-grade')?.scrollIntoView();
  },[enabled,ready,view,article]);
  if (!enabled) return article ? <p>Classroom data is temporarily unavailable.</p> : null;
  if (!data) {
    if (!article) return null;
    return <p role="status">{isPending ? 'Loading verified data…' : isError ? 'Classroom data is temporarily unavailable.' : 'No classroom data available.'}</p>;
  }
  if (view === 'school') return <ClassroomPilotSchool data={data}/>;
  if (view === 'district') return <ClassroomPilotDistrict data={data}/>;
  return <ClassroomPilotDraft data={data} showTitle={view==='draft'}/>;
}
