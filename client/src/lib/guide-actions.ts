export function guideActionParams(guidePath: string, destination: string, origin: string, placement?: string) {
  const url = new URL(destination, origin);
  if (url.origin !== origin) return null;
  const action = /^\/(school|private-school)\//.test(url.pathname) ? 'profile'
    : /^\/compare(?:\/|$)/.test(url.pathname) ? 'compare'
    : url.pathname === '/favorites' ? 'saved_schools'
    : url.pathname === '/recommendations' ? 'shortlist'
    : url.pathname === '/family' ? 'reminders' : null;
  return action ? {
    guide_path: new URL(guidePath, origin).pathname,
    destination_path: url.pathname,
    action,
    placement: placement === 'intro' || placement === 'shortlist' ? placement : 'content',
  } : null;
}
