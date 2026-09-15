/** R-7 quantile. Null is not zero; callers supply only observed values. */
export function quantile(values:number[],p:number):number|null {
  if(!values.length)return null;
  if(p<0||p>1||values.some(v=>!Number.isFinite(v)))throw new Error('Invalid quantile input');
  const sorted=[...values].sort((a,b)=>a-b), index=(sorted.length-1)*p, lo=Math.floor(index);
  return Math.round((sorted[lo]+(sorted[Math.ceil(index)]-sorted[lo])*(index-lo))*100)/100;
}
