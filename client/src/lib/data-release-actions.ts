import {DATA_RELEASE,DATA_RELEASE_RESOURCES} from '@shared/data-release';
export function dataReleaseActionParams(page:string,destination:string,origin:string,action?:string,resource?:string,placement?:string) {
  if(!action||!['announcement','explore_results','find_school','download','compare','signup'].includes(action))return null;
  const url=new URL(destination,origin);
  if(url.origin!==origin)return null;
  if(action==='download'&&!DATA_RELEASE_RESOURCES.some(r=>r.id===resource)&&resource!=='full_json')return null;
  return {release_path:DATA_RELEASE.path,page_path:new URL(page,origin).pathname,destination_path:url.pathname,action,resource:action==='download'?resource:undefined,placement:['homepage','blog','results','release','media_resources'].includes(placement||'')?placement:'release'};
}
