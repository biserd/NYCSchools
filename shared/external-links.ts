/** Navigation anchors only: never changes forms, fetches, scripts, mailto or tel. */
export function isOwnedKinderLearnerLink(href:string|null):boolean {
  if(!href)return false;
  try {const url=new URL(href);return url.protocol==='https:'&&['kinderlearner.com','www.kinderlearner.com'].includes(url.hostname.toLowerCase());}catch{return false;}
}
export function isExternalWebLink(href:string|null,base:string):boolean {
  if(!href)return false;
  try {const target=new URL(href,base),local=new URL(base);return /^https?:$/.test(target.protocol)&&target.origin!==local.origin&&!['nycschoolsratings.com','www.nycschoolsratings.com'].includes(target.hostname.toLowerCase());}catch{return false;}
}
export function externalRel(rel:string|null,href:string|null=null):string {
  const owned=isOwnedKinderLearnerLink(href);
  const tokens=(rel??'').toLowerCase().split(/\s+/).filter(t=>t&&t!=='opener'&&(!owned||!['nofollow','noreferrer'].includes(t)));
  return [...new Set([...tokens,...(owned?[]:['nofollow']),'noopener',...(owned?[]:['noreferrer'])])].join(' ');
}
