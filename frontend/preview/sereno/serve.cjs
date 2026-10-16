const http=require('http');
const fs=require('fs');
const path=require('path');
const dir=path.join(__dirname,'dist');
const files={'/preview.js':['preview.js','text/javascript'],'/ciak/logo.webp':['ciak/logo.webp','image/webp']};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method!=='GET' || url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
  const [file,type]=files[url.pathname] || ['index.html','text/html; charset=utf-8'];
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
  fs.createReadStream(path.join(dir,file)).pipe(res);
}).listen(4178,'127.0.0.1',()=>console.log('Anteprima locale: http://127.0.0.1:4178/partner'));
