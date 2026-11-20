import { useQuery } from '@tanstack/react-query';
import { NysedProfileAssessmentContent } from '@shared/NysedProfileAssessmentContent';
import type { NysedProfileAssessments as AssessmentData } from '@shared/nysed-profile-assessments';

export function NysedProfileAssessments({dbn}:{dbn:string}) {
  const {data}=useQuery<AssessmentData>({queryKey:['/api/schools',dbn,'nysed-assessments'],enabled:Boolean(dbn),retry:false,staleTime:5*60_000});
  return data?<NysedProfileAssessmentContent data={data}/>:null;
}
