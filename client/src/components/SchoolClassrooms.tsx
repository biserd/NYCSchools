import { useQuery } from '@tanstack/react-query';
import { ClassroomFamilyTakeaway } from '@shared/ClassroomFamilyTakeaway';
import { ClassroomPublicTakeaway } from '@shared/ClassroomPublicTakeaway';
import { type SchoolClassroomPanel } from '@shared/classroom-panel';
import { SchoolEnrollmentVisual } from '@shared/SchoolEnrollmentVisual';
import { apiRequest } from '@/lib/queryClient';
import { CityClassSizeContent } from './CityClassSizes';

export function useSchoolClassroomData(dbn:string,enabled:boolean,userId?:string){
  return useQuery<SchoolClassroomPanel>({
    queryKey:['school-classroom-panel',dbn,userId],
    queryFn:async()=> (await apiRequest('GET',`/api/schools/${encodeURIComponent(dbn)}/classroom-panel`)).json(),
    enabled:enabled&&Boolean(dbn),retry:false,staleTime:0,gcTime:0,
  });
}

export function SchoolClassrooms({dbn,data}:{dbn:string;data:Extract<SchoolClassroomPanel,{state:'unlocked'}>}){
  const {takeaway,classes,register,teaser}=data;
  return <>
    {takeaway?<ClassroomFamilyTakeaway data={takeaway}/>:<ClassroomPublicTakeaway teaser={teaser}/>}
    {classes&&<CityClassSizeContent key={dbn} data={classes} embedded initialGrade={takeaway?.grade}/>}
    {register&&<SchoolEnrollmentVisual key={dbn+'-register'} data={register} embedded initialGrade={takeaway?.grade}/>}
  </>;
}
