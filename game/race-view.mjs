export function raceTime(player,elapsed){return player.finished>0?player.finished:elapsed}
export function ranking(players){return [...players].sort((a,b)=>a.finished&&b.finished?a.finished-b.finished:a.finished?-1:b.finished?1:b.s-a.s)}
