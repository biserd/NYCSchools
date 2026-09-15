import type { SurveyInstrument } from './surveys';
export type SurveyCenterIdentity = {id:number;locCode:string;semsCode:string|null};
export function matchSurveyIdentity(sourceId:string,instrument:SurveyInstrument,schoolIds:Set<string>,centers:SurveyCenterIdentity[]) {
  const id=sourceId.trim().toUpperCase();
  const candidates=instrument.startsWith('b5-')?centers.filter(c=>c.locCode.trim().toUpperCase()===id):[];
  if(candidates.length>1) throw new Error(`Ambiguous official center code ${id}`);
  const center=candidates[0];
  const sems=center?.semsCode?.trim().toUpperCase();
  const direct=schoolIds.has(id)?id:null;
  const bridged=sems&&schoolIds.has(sems)?sems:null;
  if(direct&&bridged&&direct!==bridged) throw new Error(`Conflicting canonical identity ${id}`);
  return {schoolDbn:direct??bridged,centerId:center?.id??null,method:direct?'dbn':center?bridged?'loc_code_sems_code':'loc_code':'unmatched'};
}
