/** Public-content-only local preview. No cookies forwarded, no write endpoints. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {renderSeoHtml} from '../server/seoRenderer';
const root=resolve('dist/public');
const index=await readFile(resolve(root,'index.html'),'utf8');
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const cache=new Map<string,string>();
createServer(async(req,res)=>{
  try {
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    const url=new URL(req.url||'/','http://localhost');
    res.setHeader('X-Robots-Tag','noindex');
    if(url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type','application/json');
      if(/^\/api\/ranking-reports\/(elementary|middle)$/.test(url.pathname)) {
        if(!cache.has(url.pathname)){const response=await fetch('https://nycschoolsratings.com'+url.pathname);if(!response.ok)throw new Error('Public ranking unavailable');cache.set(url.pathname,await response.text());}
        return res.end(cache.get(url.pathname));
      }
      res.writeHead(401);return res.end('{"message":"Anonymous read-only preview"}');
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    if(extname(file)) {
      try{const body=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');return res.end(body);}catch{res.writeHead(404).end();return;}
    }
    res.setHeader('Content-Type','text/html');
    // Ranking pages load the actual public API on the client; content pages share production SSR.
    const html=url.pathname.includes('best-nyc-')?index:await renderSeoHtml(url.pathname,index)||index;
    res.end(html);
  }catch(error){console.error(error);res.writeHead(500).end('Preview failed');}
}).listen(8798,'127.0.0.1',()=>console.log('Read-only score article preview: http://127.0.0.1:8798/blog/nys-test-results-2026'));
