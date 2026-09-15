import { externalRel, isExternalWebLink } from '@shared/external-links';
/** Covers React routes, rendered Markdown and Leaflet popups without per-page drift. */
export function installExternalLinkPolicy(root:HTMLElement) {
  const originals=new WeakMap<HTMLAnchorElement,{rel:string|null;target:string|null;appliedRel:string}>();
  function update(anchor:HTMLAnchorElement) {
    if(isExternalWebLink(anchor.getAttribute('href'),window.location.href)){
      const rel=externalRel(anchor.getAttribute('rel'));
      if(!originals.has(anchor)) originals.set(anchor,{rel:anchor.getAttribute('rel'),target:anchor.getAttribute('target'),appliedRel:rel});
      if(anchor.getAttribute('rel')!==rel)anchor.setAttribute('rel',rel);
      if(anchor.getAttribute('target')!=='_blank')anchor.setAttribute('target','_blank');
    }else{
      const original=originals.get(anchor);
      if(original){
        if(anchor.getAttribute('rel')===original.appliedRel){if(original.rel===null)anchor.removeAttribute('rel');else anchor.setAttribute('rel',original.rel);}
        if(anchor.getAttribute('target')==='_blank'){if(original.target===null)anchor.removeAttribute('target');else anchor.setAttribute('target',original.target);}
        originals.delete(anchor);
      }
    }
  }
  function visit(node:Node){if(node instanceof HTMLAnchorElement)update(node);if(node instanceof Element)node.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(update);}
  visit(root);
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'&&record.target instanceof HTMLAnchorElement)update(record.target);else record.addedNodes.forEach(visit);}});
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['href','rel','target']});
  return ()=>observer.disconnect();
}
