import {clamp} from './physics.mjs';
export function gridX(index,count){return count<=1?0:(index-(count-1)/2)*Math.min(6,24/(count-1))}
export function racerColor(id){let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return `hsl(${hash%360}, 75%, 55%)`}
export function nearby(p,others){return others.filter(q=>q.online!==false&&Math.abs(q.s-p.s)<=45).map(q=>({...q,dx:q.x-p.x,ds:q.s-p.s})).sort((a,b)=>Math.abs(a.ds)-Math.abs(b.ds))}
export function ghostOpacity(distance){return clamp((distance-.8)/3.2,0,1)}
export function introCamera(p,others,aspect){const xs=[p.x,...others.filter(q=>q.online!==false).map(q=>q.x)];const lo=Math.min(...xs),hi=Math.max(...xs);const back=Math.max(10,((hi-lo)/2+2)/(Math.tan(Math.PI/5)*Math.max(.25,aspect)));return {x:(lo+hi)/2,back,pitch:-Math.atan2(2.5,back)}}
