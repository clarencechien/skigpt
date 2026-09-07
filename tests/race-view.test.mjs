import {test} from 'node:test';import assert from 'node:assert/strict';import {raceTime,ranking,reconcileRace,resultView} from '../game/race-view.mjs';import {racer,step} from '../game/physics.mjs';import {QUALITY} from '../game/quality.mjs';
test('personal finish display frozen while other players continue',()=>{const p={finished:42.31};assert.equal(raceTime(p,42.31),42.31);assert.equal(raceTime(p,300),42.31);assert.equal(raceTime({finished:0},-3),-3);assert.equal(ranking([{id:'b',s:7200,finished:44},{id:'a',s:7200,finished:42.31}])[0].id,'a')});
test('impact has stable obstacle id and increments only on collision',()=>{let p=racer('a','a');p.speed=44;step(p,{tap:true},.05,1,[{id:9,x:0,s:1,type:'tree'}]);assert.equal(p.impactId,9);assert.equal(p.impactSeq,1);step(p,{},.05,1.05,[]);assert.equal(p.impactSeq,1)});
test('quality tiers increase bounded visual budgets only',()=>{assert.equal(QUALITY.low.flakes,0);assert.ok(QUALITY.high.debris>QUALITY.medium.debris);assert.ok(QUALITY.medium.debris>QUALITY.low.debris);assert.ok(QUALITY.high.layers>QUALITY.low.layers);assert.equal(QUALITY.high.shadows,true)});

test('simultaneous finishes, DNF and reset use authoritative state without a results clock',()=>{
 const players=[{id:'a',s:7200,finished:42},{id:'b',s:7200,finished:42}];const state={phase:'results',players};
 for(const id of ['a','b']){const next=reconcileRace({id,finished:0},state);assert.equal(next.mode,'results');assert.equal(resultView(next.player,state).time,42)}
 const dnf={phase:'results',players:[players[0],{id:'b',s:6000,finished:0}]};const next=reconcileRace({id:'b',finished:0},dnf);assert.equal(next.mode,'results');assert.equal(resultView(next.player,dnf).time,null);
 const reset=reconcileRace({id:'a',finished:42},{phase:'lobby',players:[{id:'a',s:0,finished:0}]});assert.equal(reset.mode,'join');assert.equal(reset.player.finished,0);assert.equal(raceTime(reset.player,1),1);
 assert.equal(resultView({id:'solo',finished:25}).time,25);
});
