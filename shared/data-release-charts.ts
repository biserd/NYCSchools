import {scoreMoverData as data} from './generated/score-movers-2026';

export const releaseSubjectSamples = [
  {label:'ELA',years:'Spring 2025 to spring 2026',report:data.assessments.ela},
  {label:'Math',years:'Spring 2025 to spring 2026',report:data.assessments.math},
  {label:'US History Regents',years:'Reporting years 2025 to 2026',report:data.regents['us-history']},
  {label:'Global History Regents',years:'Reporting years 2025 to 2026',report:data.regents['global-history']},
];

export const releaseSchoolExamples = [
  {subject:'ELA proficiency',years:'Spring tests',row:data.assessments.ela.gains.find(r=>r.dbn==='17K722')!},
  {subject:'Math proficiency',years:'Spring tests',row:data.assessments.math.gains.find(r=>r.dbn==='14K380')!},
  {subject:'US History Regents: pass rate at 65+',years:'Reporting years',row:data.regents['us-history'].gains.find(r=>r.dbn==='29Q327')!},
];

export const RELEASE_CHARTS = {
  directions:{
    id:'release-change-directions',title:'Share of eligible schools that improved, declined or stayed unchanged',height:340,
    summary:'Each bar represents its own matched subject sample. ELA: 720 declines out of 843; math: 394 declines out of 761; US History: 233 increases out of 291; Global History: 177 declines out of 314.',
    spec:{type:'horizontalStackedBar100',y:'Subject',x:['Declined','Unchanged','Improved'],
      xLabel:'Share of each eligible subject sample (%)',showLegend:false,
      colors:{Declined:'#b45309',Unchanged:'#64748b',Improved:'#2563eb'}},
    rows:releaseSubjectSamples.map(({label,report})=>({Subject:`${label} (n=${report.eligible})`,Declined:report.decreased,Unchanged:report.unchanged,Improved:report.increased})),
  },
  medians:{
    id:'release-median-changes',title:'Median school change: ELA fell, US History Regents rose',height:340,
    summary:'Median changes in percentage points: ELA -7.4, math -0.3, US History Regents +6.4, Global History Regents -0.8. These are medians of different school-level samples, not citywide student rates.',
    spec:{type:'horizontalBar',y:'Subject',x:'Change',xLabel:'Median change (percentage points)',
      xDomain:[-8,8],showValues:true,showLegend:false,colors:{Change:'#2563eb'},
      valueFormat:{style:'decimal',maximumFractionDigits:1},
      referenceLines:[{axis:'x',value:0,label:'No change'}]},
    rows:releaseSubjectSamples.map(({label,report})=>({Subject:`${label} (n=${report.eligible})`,Change:report.medianChange})),
  },
  examples:{
    id:'release-school-examples',title:'Three featured schools: their 2025 and 2026 results',height:390,
    summary:'Selected gains, not a school ranking. New Heights ELA: 34.5% to 51.3%; P.S. 380 math: 46.3% to 82.1%; Eagle Academy for Young Men III US History Regents pass rate at 65+: 33.7% to 78.8%.',
    spec:{type:'horizontalBar',y:'School and measure',x:['2025','2026'],xLabel:'Published proficiency or pass rate (%)',
      xDomain:[0,100],showValues:true,showLegend:true,
      valueFormat:{style:'decimal',maximumFractionDigits:1},colors:{'2025':'#64748b','2026':'#2563eb'}},
    rows:releaseSchoolExamples.map(({subject,row})=>({'School and measure':`${row.name}: ${subject}`,'2025':row.previous,'2026':row.current})),
  },
};
