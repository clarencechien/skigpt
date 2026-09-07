export function raceTime(player,elapsed){return player.finished>0?player.finished:elapsed}
export function ranking(players){return [...players].sort((a,b)=>a.finished&&b.finished?a.finished-b.finished:a.finished?-1:b.finished?1:b.s-a.s)}

// Apply authoritative player data before choosing a screen, including the final results packet.
export function reconcileRace(player,state){
 const own=state.players.find(p=>p.id===player.id);
 const next=own?{...player,...own}:player;
 const mode=state.phase==='results'||(state.phase==='race'&&next.finished>0)?'results':state.phase==='race'?'race':'join';
 return {player:next,mode};
}
// Results have no elapsed-clock fallback. Missing finishes are DNF, not a running timer.
export function resultView(player,state=null){
 const own=state?.players.find(p=>p.id===player.id)||player;
 const players=ranking(state?.players||[own]);
 return {...own,time:own.finished>0?own.finished:null,players,rank:Math.max(1,players.findIndex(p=>p.id===own.id)+1),phase:state?.phase||'results'};
}
