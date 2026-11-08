// This guard is loaded before the suites. Real provider traffic is never a unit test.
const original=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('External network request blocked by Family regression guard: '+url.origin);
 return original(input,init);
};
