import {racer,step,course,clamp} from '../game/physics.mjs';
import {gridX} from '../game/opponent-view.mjs';
import {writeFileSync} from 'node:fs';
// Controlled skill differences, zero obstacle collisions. Not a human playtest.
const ramps=course(7).filter(o=>o.type==='ramp');
function simulate(mixed){const players=Array.from({length:6},(_,i)=>({...racer('p'+i,'Player '+(i+1)),x:gridX(i,6)}));const samples=[];let checks=0,near=0;
for(let k=1;k<=6000;k++){const time=k*.05;for(let i=0;i<6;i++){const p=players[i],target=ramps.find(o=>o.s>p.s),eligible=target&&(!mixed||ramps.indexOf(target)%(i+1)===0);step(p,{steer:eligible?clamp(target.x/12,-1,1):1,tap:k%4===0,shake:eligible&&target.s-p.s<Math.max(3,p.speed*.3)},.05,time,ramps)}
if(k%20===0){for(const p of players.filter(p=>!p.finished)){checks++;if(players.some(q=>q!==p&&!q.finished&&Math.abs(q.s-p.s)<=45))near++}if(k%200===0)samples.push({seconds:time,positions:players.map(p=>Math.round(p.s)),tiers:players.map(p=>p.tier)})}if(players.every(p=>p.finished))break}
return {scenario:mixed?'Different ramp success':'Equal ramp success',nearPeerWithin45mFraction:near/checks,finishSeconds:players.map(p=>+p.finished.toFixed(2)),impacts:players.map(p=>p.impactSeq),samples};}
const result={scope:'Six deterministic scripted racers; same real physics, seed 7 ramps only; no obstacle collisions, no player collisions, no network. Scripted skill profiles are illustrative, not measured human behavior.',cases:[simulate(false),simulate(true)]};writeFileSync('docs/qa/six-player/simulation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
