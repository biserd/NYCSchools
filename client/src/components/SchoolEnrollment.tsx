import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hasClassroomPilot } from '@shared/classroomPilot';
import { isEnrollmentDbn,type SchoolEnrollment as Register } from '@shared/school-enrollment';
import { SchoolEnrollmentVisual } from '@shared/SchoolEnrollmentVisual';

export function SchoolEnrollment({dbn}:{dbn:string}){
  const enabled=isEnrollmentDbn(dbn)&&hasClassroomPilot();
  const {data}=useQuery<Register|null>({queryKey:['/api/schools',dbn,'enrollment-snapshots'],enabled,retry:false,staleTime:5*60_000});
  useEffect(()=>{
    if(data&&window.location.hash==='#enrollment-by-grade')document.getElementById('enrollment-by-grade')?.scrollIntoView();
  },[data,dbn]);
  return data?<SchoolEnrollmentVisual key={dbn} data={data}/>:null;
}
