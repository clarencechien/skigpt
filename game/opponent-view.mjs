import {clamp} from './physics.mjs';
export function gridX(index,count){return count<=1?0:(index-(count-1)/2)*Math.min(6,24/(count-1))}
export function racerColor(id){let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return id==='ai-companion'?'#e87849':['#e87849','#4c8d98','#b77577','#d4a34f','#788da8','#79988a'][hash%6]}
export function nearby(p,others){return others.filter(q=>q.online!==false&&Math.abs(q.s-p.s)<=45).map(q=>({...q,dx:q.x-p.x,ds:q.s-p.s})).sort((a,b)=>Math.abs(a.ds)-Math.abs(b.ds))}
export function ghostOpacity(distance){const t=clamp((distance-3)/9,0,1);return t*t*(3-2*t)}
export function introCamera(p,others,aspect){const xs=[p.x,...others.filter(q=>q.online!==false).map(q=>q.x)];const lo=Math.min(...xs),hi=Math.max(...xs);const back=Math.max(10,((hi-lo)/2+2)/(Math.tan(Math.PI/5)*Math.max(.25,aspect)));return {x:(lo+hi)/2,back,pitch:-Math.atan2(2.5,back)}}
