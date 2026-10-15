import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=resolve(fileURLToPath(new URL('..',import.meta.url)));
const root=resolve(projectRoot,'dist');
const host=process.env.HOST==='0.0.0.0'?'0.0.0.0':'127.0.0.1';
const port=Number.parseInt(process.env.PORT||'4173',10);
const mime={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.ico':'image/x-icon',
  '.jpeg':'image/jpeg',
  '.jpg':'image/jpeg',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json',
  '.webp':'image/webp',
};

const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method||'')){
    res.writeHead(405,{'content-type':'text/plain; charset=utf-8','allow':'GET, HEAD'}).end('Method not allowed');
    return;
  }
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname);}
  catch{res.writeHead(400).end('Bad request');return;}
  if(pathname.includes('\\')||pathname.includes('\0')){res.writeHead(400).end('Bad request');return;}
  const relativePath=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=resolve(root,relativePath);
  if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403).end('Forbidden');return;}
  try{
    const info=await stat(target);
    if(!info.isFile()){res.writeHead(404).end('Not found');return;}
    const body=req.method==='HEAD'?null:await readFile(target);
    res.writeHead(200,{
      'content-type':mime[extname(target).toLowerCase()]||'application/octet-stream',
      'content-length':info.size,
      'cache-control':extname(target)==='.html'?'no-cache':'public, max-age=300',
      'x-content-type-options':'nosniff',
    });
    res.end(body);
  }catch(error){
    res.writeHead(error?.code==='ENOENT'?404:500,{'content-type':'text/plain; charset=utf-8'}).end(error?.code==='ENOENT'?'Not found':'Unable to read static asset');
  }
});

const announce=()=>{const address=server.address();const actualPort=address&&typeof address==='object'?address.port:port;console.log(`Static local build: http://${host}:${actualPort}/ (dist only; no API/backend)`);};
const listen=targetPort=>{server.once('listening',announce);server.listen(targetPort,host);};
server.on('error',error=>{
  if(error?.code==='EADDRINUSE'&&port!==0){
    console.warn(`Port ${port} is already in use; selecting an available local port.`);
    listen(0);
    return;
  }
  throw error;
});
listen(port);
