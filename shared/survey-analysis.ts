import data from './survey-analysis.generated.json';
import type { SurveyInstrument } from './surveys';
export const surveyAnalysis = data;
export const instrumentNames:Record<SurveyInstrument,string> = {'k12-family':'K–12 families','k12-teacher':'K–12 teachers','k12-student':'K–12 students','b5-family':'Birth-to-5 families','b5-teacher':'Birth-to-5 teachers'};
export const analysisFor = (instrument:SurveyInstrument) => data.releases.find(r=>r.instrument===instrument)!;
export const topicFor = (instrument:SurveyInstrument,label:string) => analysisFor(instrument).topics.find(t=>t.label===label);
export const fmt = (v:number|null) => v===null?'Not reported':v.toLocaleString('en-US',{maximumFractionDigits:1});
export const pct = (n:number,d:number) => d?Math.round(n/d*1000)/10:0;
