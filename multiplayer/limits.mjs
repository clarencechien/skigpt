// Token buckets are bounded records; no per-message durable storage writes.
export function take(bucket,rate,burst,now=Date.now()){
 bucket.tokens=Math.min(burst,(bucket.tokens??burst)+Math.max(0,now-(bucket.at??now))*rate/1000);bucket.at=now;
 if(bucket.tokens<1)return false;bucket.tokens--;return true;
}
export function validJoin(u){return u.search.length<=512&&['id','resume','host'].every(k=>!u.searchParams.has(k)||/^[A-Za-z0-9_-]{0,64}$/.test(u.searchParams.get(k)))&&(u.searchParams.get('name')||'').length<=64}
export function message(data){if(typeof data!=='string'||data.length>512||new TextEncoder().encode(data).length>512)return null;try{const m=JSON.parse(data);if(!m||typeof m!=='object'||Array.isArray(m)||!['input','pong','start','reset','close'].includes(m.type))return null;if(m.type==='input'&&(!Number.isFinite(m.steer)||Math.abs(m.steer)>1||typeof m.tap!=='boolean'||typeof m.shake!=='boolean'))return null;if(m.type==='pong'&&(typeof m.nonce!=='string'||m.nonce.length>64))return null;return m}catch{return null}}
export async function edgeLimit(binding,key){try{if(!binding)return new Response('Rate limiter unavailable',{status:503});if(!(await binding.limit({key:'skigpt:'+key})).success)return new Response('Too many requests',{status:429,headers:{'Retry-After':'60'}})}catch{return new Response('Rate limiter unavailable',{status:503})}return null}
