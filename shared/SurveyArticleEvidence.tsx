import React from 'react';
import { CoverageEvidence, ScoreDistribution, SurveyBars, TopicEvidence } from './SurveyCharts';
import { analysisFor, fmt, instrumentNames, pct } from './survey-analysis';
export function SurveyArticleEvidence({id}:{id?:string}) {
  switch(id){
    case 'coverage':return <CoverageEvidence/>;
    case 'family-overview':case 'family-topics':return <TopicEvidence instrument="k12-family" title="Family trust is high; involvement and facilities sit lower" labels={['Parent-Teacher Trust','Inclusive Leadership',"Family Satisfaction with Child's Education",'Outreach to Parents','Parent Involvement in School','School Facilities and Services']}/>;
    case 'family-distribution':return <ScoreDistribution instrument="k12-family" label="Family Satisfaction with Child's Education"/>;
    case 'teacher-topics':return <TopicEvidence instrument="k12-teacher" title="Teacher experience varies substantially by topic" labels={['Instructional Leadership','Peer Collaboration','Quality of Professional Development','Teacher Influence','Classroom Behavior','Preventing Bullying']}/>;
    case 'teacher-distribution':return <ScoreDistribution instrument="k12-teacher" label="Teacher Influence"/>;
    case 'student-topics':return <TopicEvidence instrument="k12-student" title="Safety, trust and personal support are distinct signals" labels={['Safety','Preventing Bullying','Student-Teacher Trust','Guidance','Personal Attention and Support','Academic Press']}/>;
    case 'student-distribution':return <ScoreDistribution instrument="k12-student" label="Personal Attention and Support"/>;
    case 'student-settings':return <SurveyBars title="Students report feeling safer in classrooms" subtitle="Official citywide individual-question favorable responses, 2026. Not the school-level Safety topic score. Source: NYCPS citywide report." unit="%" tone="violet" rows={[{label:'Classrooms',value:92},{label:'Hallways and cafeterias',value:87},{label:'Locker rooms and bathrooms',value:84}]}/>;
    case 'borough':return <SurveyBars title="Family participation rose in four boroughs" subtitle="Official geographic-district response rates. Blue bars = 2026; dark markers = 2025. Excludes District 75 and charters. Source: citywide report, p. 3." unit="%" rows={[{label:'Manhattan',value:50,secondary:47,note:'2025: 47% → 2026: 50% · +3 percentage points'},{label:'Bronx',value:54,secondary:53,note:'2025: 53% → 2026: 54% · +1 percentage point'},{label:'Brooklyn',value:53,secondary:51,note:'2025: 51% → 2026: 53% · +2 percentage points'},{label:'Queens',value:52,secondary:48,note:'2025: 48% → 2026: 52% · +4 percentage points'},{label:'Staten Island',value:46,secondary:48,note:'2025: 48% → 2026: 46% · −2 percentage points'}]}/>;
    case 'b5-family':return <TopicEvidence instrument="b5-family" title="Birth-to-5 families: positive feedback, little room at the top" labels={["Family Satisfaction with Child's Education",'Parent-Teacher Trust','Outreach to Parents','Parent Involvement in School','School Facilities and Services',"Building Families' Capacity as their Child's Primary Advocate"]}/>;
    case 'b5-family-distribution':return <ScoreDistribution instrument="b5-family" label="Family Satisfaction with Child's Education"/>;
    case 'b5-coverage':return <SurveyBars title="Published teacher feedback covers a much smaller subset" subtitle="Percentage of each Birth-to-5 file's records with any published topic score—not a response rate." unit="%" tone="teal" rows={(['b5-family','b5-teacher'] as const).map(i=>{const r=analysisFor(i);return{label:instrumentNames[i],value:pct(r.withScores,r.rows),note:`${fmt(r.withScores)} of ${fmt(r.rows)} records have scores; ${fmt(r.rows-r.withScores)} have none`};})}/>;
    case 'b5-teacher':return <TopicEvidence instrument="b5-teacher" title="Birth-to-5 teachers: what the reporting subset says" labels={['Early Childhood Instruction','Peer Collaboration','Instructional Leadership','Teacher Influence','Classroom Behavior','Quality of Student Discussion']}/>;
    default:return null;
  }
}
