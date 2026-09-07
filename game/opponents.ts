import * as T from 'three';
import {terrain} from './physics.mjs';
import {racerColor,nearby,ghostOpacity} from './opponent-view.mjs';
// One scene render; HUD nodes never intercept the mobile tap surface.
export function createOpponents(scene:T.Scene,canvas:HTMLCanvasElement){
 const root=document.createElement('div');root.className='opponent-overlay';root.setAttribute('aria-hidden','true');canvas.parentElement!.append(root);
 const radar=document.createElement('div');radar.className='opponent-radar';radar.innerHTML='<span>周圍 ±45m</span><div class="radar-field"><i class="radar-self"></i></div><small>↑ 前方 · ↓ 後方</small>';root.append(radar);const field=radar.querySelector('.radar-field')!;
 const entries=new Map<string,any>();const geometries:T.BufferGeometry[]=[];const geo=(g:T.BufferGeometry)=>{geometries.push(g);return g};
 const torso=geo(new T.CapsuleGeometry(.27,.48,2,6)),head=geo(new T.SphereGeometry(.25,8,6)),limb=geo(new T.CylinderGeometry(.09,.11,.6,5)),ski=geo(new T.BoxGeometry(.16,.055,2.25)),pole=geo(new T.CylinderGeometry(.018,.018,1.25,4)),visor=geo(new T.BoxGeometry(.37,.12,.12));
 function make(q:any){const color=racerColor(q.id),suit=new T.MeshStandardMaterial({color,roughness:.85,transparent:true}),dark=new T.MeshStandardMaterial({color:0x183342,roughness:.6,transparent:true}),white=new T.MeshStandardMaterial({color:0xeaf5f7,roughness:.8,transparent:true});const group=new T.Group(),pose=new T.Group();group.add(pose);
 function part(g:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,rx=0,rz=0){const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.rotation.set(rx,0,rz);pose.add(m);return m}
 part(torso,suit,0,1.18,-.13,-.25);part(head,dark,0,1.77,-.28);part(visor,white,0,1.78,-.49);
 for(const side of [-1,1]){part(limb,dark,side*.19,.45,.05,-.35);part(limb,suit,side*.19,.88,.08,.6);part(limb,suit,side*.37,1.12,-.2,-.6,side*.2);part(ski,white,side*.23,.055,-.12);part(pole,dark,side*.51,.61,.22,-.48)}
 const label=document.createElement('div');label.className='opponent-label';label.style.borderColor=color;root.append(label);const dot=document.createElement('i');dot.className='radar-peer';dot.style.background=color;field.append(dot);scene.add(group);const entry={group,pose,label,dot,materials:[suit,dark,white],initialized:false};entries.set(q.id,entry);return entry}
 function remove(e:any){scene.remove(e.group);e.label.remove();e.dot.remove();e.materials.forEach((m:T.Material)=>m.dispose())}
 const point=new T.Vector3(),target=new T.Vector3();
 return {update(p:any,others:any[],camera:T.PerspectiveCamera,time:number,dt:number,hidden:boolean){root.hidden=hidden;const active=others.filter(q=>q.online!==false),ids=new Set(active.map(q=>q.id));for(const [id,e]of entries)if(!ids.has(id)){remove(e);entries.delete(id)}camera.updateMatrixWorld();const close=nearby(p,active),nearIds=new Set(close.map(q=>q.id));radar.hidden=hidden||!active.length;let labelRects:{x:number,y:number}[]=[];
 // Nearest racers get the limited label budget first.
 for(const q of [...active].sort((a,b)=>Math.abs(a.s-p.s)-Math.abs(b.s-p.s))){const e=entries.get(q.id)||make(q),air=q.air>0?Math.sin((1-q.air/1.55)*Math.PI)*6:0;target.set(terrain(q.s)+q.x,air,-q.s);if(!e.initialized||e.group.position.distanceTo(target)>35){e.group.position.copy(target);e.initialized=true}else e.group.position.lerp(target,1-Math.exp(-dt*22));e.pose.rotation.z=-(q.steer||0)*.15;e.pose.rotation.x=q.flipped&&time-q.flipAt>=0&&time-q.flipAt<.7?Math.PI*2*(time-q.flipAt)/.7:0;
 point.copy(e.group.position);point.y+=1.1;const distance=camera.position.distanceTo(point);const opacity=ghostOpacity(distance);e.materials.forEach((m:T.Material)=>{m.opacity=opacity;m.depthWrite=opacity>.95});e.group.visible=!hidden&&Math.abs(q.s-p.s)<500&&opacity>.02;
 point.copy(e.group.position);point.y+=2.35;point.project(camera);const x=(point.x+1)*canvas.clientWidth/2,y=(1-point.y)*canvas.clientHeight/2;const labelVisible=!hidden&&q.s>p.s+4&&q.s-p.s<140&&point.z>-1&&point.z<1&&x>70&&x<canvas.clientWidth-70&&y>180&&y<canvas.clientHeight-230&&labelRects.length<3&&!labelRects.some(r=>Math.abs(r.x-x)<140&&Math.abs(r.y-y)<34);
 e.label.hidden=!labelVisible;if(labelVisible){labelRects.push({x,y});e.label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;e.label.textContent=`${q.ai?'AI · ':''}${q.name.slice(0,10)} · ${Math.round(q.s-p.s)}m`}
 e.dot.hidden=!nearIds.has(q.id);if(nearIds.has(q.id)){e.dot.style.left=`${50+Math.max(-26,Math.min(26,q.x-p.x))/26*43}%`;e.dot.style.top=`${50-(q.s-p.s)/45*43}%`;e.dot.style.borderRadius=q.ai?'2px':'50%'}
 }
 },destroy(){for(const e of entries.values())remove(e);geometries.forEach(g=>g.dispose());root.remove()}};
}
