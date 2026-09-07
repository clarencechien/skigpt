export const SECURITY_HEADERS={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)'
};
export function secureResponse(response,req){
 if(response.status===101)return response;
 const headers=new Headers(response.headers);for(const [key,value] of Object.entries(SECURITY_HEADERS))headers.set(key,value);
 const u=new URL(req.url);headers.set('Content-Security-Policy',SECURITY_HEADERS['Content-Security-Policy'].replace("connect-src 'self'",`connect-src 'self' ${u.protocol==='https:'?'wss:':'ws:'}//${u.host}`));
 if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/host'))headers.set('Cache-Control',u.pathname==='/host'||u.pathname==='/host/'?'private, no-store':'no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export async function readTicketBody(req){
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))throw Error('JSON required');
 if(Number(req.headers.get('Content-Length'))>1024)throw Error('Too large');
 const reader=req.body?.getReader();if(!reader)throw Error('Body required');let size=0,chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024)throw Error('Too large');chunks.push(value)} }finally{await reader.cancel()}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}const body=JSON.parse(new TextDecoder().decode(bytes));
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['id','name','resume','host'].includes(k)))throw Error('Invalid body');
 if(!['id','resume','host'].every(k=>body[k]===undefined||(typeof body[k]==='string'&&/^[A-Za-z0-9_-]{0,64}$/.test(body[k])))||typeof body.id!=='string'||!body.id||typeof body.name!=='string'||body.name.length>64)throw Error('Invalid body');return body;
}
export async function ticketHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
