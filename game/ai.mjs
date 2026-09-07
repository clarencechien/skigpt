import {racer,clamp} from './physics.mjs';
export const AI_ID='ai-companion';
export function companion(){return {...racer(AI_ID,'小雪 · AI 陪跑'),ai:true}}
export function aiInput(p,time,objects,humanTier=2){const ramp=objects.find(o=>o.type==='ramp'&&o.s>p.s);const period=Math.floor(time*2),triesRamp=ramp&&ramp.id%4===0;let target=triesRamp?ramp.x:Math.sin(time*.37)*6;const threat=objects.find(o=>o.type!=='ramp'&&o.s>p.s&&o.s-p.s<30&&Math.abs(o.x-target)<2);if(threat&&period%5!==0)target=clamp(threat.x+(threat.x>0?-3:3),-10,10);return {steer:clamp((target+Math.sin(time*1.1)*.8)/12,-1,1),tap:time>1.8&&time%2<.32,shake:p.tier<Math.min(3,humanTier)&&p.air>.65&&p.air<1.1&&p.lastRamp%4===0}}
