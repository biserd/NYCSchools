/** Navigation anchors only: never changes forms, fetches, scripts, mailto or tel. */
export function isExternalWebLink(href:string|null,base:string):boolean {
  if(!href)return false;
  try {const target=new URL(href,base),local=new URL(base);return /^https?:$/.test(target.protocol)&&target.origin!==local.origin&&!['nycschoolsratings.com','www.nycschoolsratings.com'].includes(target.hostname.toLowerCase());}catch{return false;}
}
export function externalRel(rel:string|null):string {
  const tokens=(rel??'').toLowerCase().split(/\s+/).filter(t=>t&&t!=='opener');
  return [...new Set([...tokens,'nofollow','noopener','noreferrer'])].join(' ');
}
