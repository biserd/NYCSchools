import { parseDocument } from 'htmlparser2';

type Node = ReturnType<typeof parseDocument>['children'][number];
const PUBLIC_STATIC = new Set(['/', '/about', '/methodology', '/safety-methodology', '/faq', '/features', '/benefits', '/pricing', '/blog', '/explore-schools', '/developers', '/developers/docs', '/contact', '/privacy', '/terms', '/release-notes', '/early-childhood', '/private-schools', '/safe-and-strong']);
export function isAgentPublicPage(path: string): boolean {
  return PUBLIC_STATIC.has(path) || /^\/(school|private-school|early-childhood|blog|compare|nyc-schools|district|neighborhood|program)\/[^/]+$/.test(path);
}

// Explicit opt-in only. Wildcards (normal browser Accept headers) keep HTML.
// Equal preference keeps HTML; an explicit markdown-only request opts in.
export function prefersMarkdown(accept: string | undefined): boolean {
  if (!accept) return false;
  const ranges = accept.toLowerCase().split(',').map(part => {
    const [type, ...params] = part.trim().split(';');
    const qParam = params.map(p => p.trim()).find(p => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    return { type: type.trim(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  const exactMarkdown = ranges.filter(r => r.type === 'text/markdown');
  const markdownQ = Math.max(0, ...exactMarkdown.map(r => r.q));
  // The most specific media range controls a representation's quality.
  const htmlRanges = ranges.filter(r => r.type === 'text/html');
  const textRanges = ranges.filter(r => r.type === 'text/*');
  const htmlQ = Math.max(0, ...(htmlRanges.length ? htmlRanges : textRanges.length ? textRanges : ranges.filter(r => r.type === '*/*')).map(r => r.q));
  return markdownQ > 0 && markdownQ > htmlQ;
}

const escapeText = (text: string) => text.replace(/\s+/g, ' ').replace(/([\\`*_\[\]<>|])/g, '\\$1');
const children = (node: Node): Node[] => 'children' in node ? node.children : [];
function find(node: Node, predicate: (node: Node) => boolean): Node | undefined {
  if (predicate(node)) return node;
  for (const child of children(node)) { const match = find(child, predicate); if (match) return match; }
}
function safeUrl(raw: string | undefined, origin: string): string | null {
  try {
    const url = new URL(raw || '', origin);
    return raw && ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href.replace(/[()<>]/g, c => encodeURIComponent(c).replace('(', '%28').replace(')', '%29')) : null;
  } catch { return null; }
}
function render(node: Node, origin: string): string {
  if (node.type === 'text') return escapeText(node.data);
  if (!('attribs' in node)) return children(node).map(child => render(child, origin)).join('');
  const tag = node.name;
  if (['script', 'style', 'noscript', 'template', 'svg', 'nav', 'form', 'button', 'input', 'select', 'textarea'].includes(tag)
    || node.attribs['aria-hidden'] === 'true' || 'hidden' in node.attribs || 'data-boot-header' in node.attribs) return '';
  const content = () => children(node).map(child => render(child, origin)).join('');
  if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${content().trim()}\n\n`;
  if (tag === 'a') {
    const label = content().trim(); const href = safeUrl(node.attribs.href, origin);
    return href && label ? `[${label}](${href})` : label;
  }
  if (tag === 'img') return node.attribs.alt ? escapeText(node.attribs.alt) : '';
  if (tag === 'br') return '\n';
  if (tag === 'hr') return '\n\n---\n\n';
  if (tag === 'strong' || tag === 'b') return `**${content().trim()}**`;
  if (tag === 'em' || tag === 'i') return `*${content().trim()}*`;
  if (tag === 'li') return `\n- ${content().trim()}\n`;
  if (tag === 'table') {
    const rows: string[][] = [];
    const visit = (item: Node) => {
      if ('name' in item && item.name === 'tr') rows.push(children(item).filter(cell => 'name' in cell && ['th', 'td'].includes(cell.name)).map(cell => render(cell, origin).trim().replace(/\s*\n\s*/g, ' / ')));
      else for (const child of children(item)) visit(child);
    };
    visit(node);
    if (!rows.length) return '';
    const width = Math.max(...rows.map(row => row.length));
    const line = (row: string[]) => `| ${Array.from({ length: width }, (_, i) => row[i] || '').join(' | ')} |`;
    return `\n\n${line(rows[0])}\n${line(Array(width).fill('---'))}\n${rows.slice(1).map(line).join('\n')}\n\n`;
  }
  const text = content();
  return ['p', 'div', 'main', 'section', 'article', 'ul', 'ol', 'dl', 'dt', 'dd', 'blockquote', 'figure', 'figcaption', 'pre'].includes(tag) ? `\n\n${text.trim()}\n\n` : text;
}

/** Convert only the existing anonymous SSR root, never arbitrary authenticated HTML. */
export function publicPageMarkdown(path: string, html: string, origin: string): string | null {
  if (!isAgentPublicPage(path)) return null;
  const doc = parseDocument(html);
  if (find(doc, n => 'attribs' in n && n.name === 'meta' && n.attribs.name?.toLowerCase() === 'robots' && /noindex/i.test(n.attribs.content || ''))) return null;
  const root = find(doc, n => 'attribs' in n && n.attribs.id === 'root' && n.attribs['data-server-rendered'] === 'true');
  if (!root) return null;
  const body = render(root, `${origin}${path}`).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return null;
  const canonical = find(doc, n => 'attribs' in n && n.name === 'link' && n.attribs.rel === 'canonical');
  const source = canonical && 'attribs' in canonical ? safeUrl(canonical.attribs.href, origin) : null;
  return `Source: ${source || `${origin}${path}`}\n\n${body}\n\n---\nPublic page content. Ratings are independent comparison aids, not official NYCPS ratings. Use the reporting years and missing-data caveats shown above; program listings do not establish current seats or admission odds.\n`;
}
