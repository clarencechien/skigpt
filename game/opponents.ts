import * as T from 'three';
import {createSkierGeometry,skierMaterials} from './skier-model.mjs';
import {terrain} from './physics.mjs';
import {racerColor,nearby,ghostOpacity} from './opponent-view.mjs';
// One scene render; HUD nodes never intercept the mobile tap surface.
export function createOpponents(scene:T.Scene,canvas:HTMLCanvasElement,quality="low"){
 const root=document.createElement('div');root.className='opponent-overlay';root.setAttribute('aria-hidden','true');canvas.parentElement!.append(root);
 const radar=document.createElement('div');radar.className='opponent-radar';radar.innerHTML='<span>周圍 ±45m</span><div class="radar-field"><i class="radar-self"></i></div><small>↑ 前方 · ↓ 後方</small>';root.append(radar);const field=radar.querySelector('.radar-field')!;
 const entries=new Map<string,any>();const geometry=createSkierGeometry(quality);
 function make(q:any){const color=racerColor(q.id),materials=skierMaterials(color);const group=new T.Group(),pose=new T.Group();pose.position.y=1;group.add(pose);for(const [key,g]of Object.entries(geometry)){const mesh=new T.Mesh(g as T.BufferGeometry,materials[key]);pose.add(mesh)}
 const label=document.createElement('div');label.className='opponent-label';label.style.borderColor=color;root.append(label);const dot=document.createElement('i');dot.className='radar-peer';dot.style.background=color;field.append(dot);scene.add(group);const entry={group,pose,label,dot,materials:Object.values(materials),initialized:false};entries.set(q.id,entry);return entry}
 function remove(e:any){scene.remove(e.group);e.label.remove();e.dot.remove();e.materials.forEach((m:T.Material)=>m.dispose())}
 const point=new T.Vector3(),target=new T.Vector3();
 return {update(p:any,others:any[],camera:T.PerspectiveCamera,time:number,dt:number,hidden:boolean){root.hidden=hidden;const active=others.filter(q=>q.online!==false),ids=new Set(active.map(q=>q.id));for(const [id,e]of entries)if(!ids.has(id)){remove(e);entries.delete(id)}camera.updateMatrixWorld();const close=nearby(p,active),nearIds=new Set(close.map(q=>q.id));radar.hidden=hidden||!active.length;const width=canvas.clientWidth,height=canvas.clientHeight;
 // Every on-screen skier gets a name; camera-plane distance fades the whole skier and label together.
 for(const q of [...active].sort((a,b)=>Math.abs(a.s-p.s)-Math.abs(b.s-p.s))){const e=entries.get(q.id)||make(q),air=q.air>0?Math.sin((1-q.air/1.55)*Math.PI)*6:0;target.set(terrain(q.s)+q.x,air,-q.s);if(!e.initialized||e.group.position.distanceTo(target)>35){e.group.position.copy(target);e.initialized=true}else e.group.position.lerp(target,1-Math.exp(-dt*22));e.pose.rotation.z=-(q.steer||0)*.15;e.pose.rotation.x=q.flipped&&time-q.flipAt>=0&&time-q.flipAt<.7?Math.PI*2*(time-q.flipAt)/.7:0;
 point.copy(e.group.position);point.y+=1.1;const distance=Math.hypot(camera.position.x-e.group.position.x,camera.position.z-e.group.position.z);const opacity=ghostOpacity(distance);e.materials.forEach((m:T.Material)=>{m.opacity=opacity;m.depthWrite=opacity>.95});e.group.visible=!hidden&&Math.abs(q.s-p.s)<500&&opacity>.02;
 point.copy(e.group.position);point.y+=2.35;point.project(camera);const x=(point.x+1)*width/2,y=(1-point.y)*height/2;const labelVisible=e.group.visible&&distance<140&&point.z>-1&&point.z<1&&x>20&&x<width-20&&y>85&&y<height-160;
 e.label.style.opacity=String(opacity);e.label.hidden=!labelVisible;if(labelVisible){e.label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;e.label.textContent=`${q.ai?'AI · ':''}${q.name.slice(0,16)}`}

 e.dot.hidden=!nearIds.has(q.id);if(nearIds.has(q.id)){e.dot.style.left=`${50+Math.max(-26,Math.min(26,q.x-p.x))/26*43}%`;e.dot.style.top=`${50-(q.s-p.s)/45*43}%`;e.dot.style.borderRadius=q.ai?'2px':'50%'}
 }
 },destroy(){for(const e of entries.values())remove(e);Object.values(geometry).forEach((g:any)=>g.dispose());root.remove()}};
}
