import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original model: five merged material batches shared by all racers; no texture downloads.
export function createSkierGeometry(quality='low'){
 const segments=quality==='high'?16:quality==='medium'?12:8;
 const buckets={suit:[],cream:[],dark:[],accent:[],lens:[]};
 function add(key,g,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){g.scale(sx,sy,sz);g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();flat.deleteAttribute('uv');buckets[key].push(flat)}
 function oval(key,x,y,z,sx,sy,sz){add(key,new T.SphereGeometry(1,segments,Math.max(6,segments/2)),x,y,z,sx,sy,sz)}
 function box(key,x,y,z,w,h,d,r=.04,rx=0){add(key,new RoundedBoxGeometry(w,h,d,1,r),x,y,z,1,1,1,rx)}
 function bone(key,a,b,r1,r2){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const g=new T.CylinderGeometry(r2,r1,delta.length(),segments,1);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));const mid=start.add(end).multiplyScalar(.5);add(key,g,...mid.toArray())}
 // Tailored puffer silhouette, waist taper and cream shoulder yoke.
 box('suit',0,1.22,-.13,.65,.65,.4,.12,-.19);
 oval('suit',0,1.01,-.06,.30,.17,.21);
 box('cream',0,1.46,-.18,.66,.13,.38,.05,-.19);
 box('dark',0,.94,-.03,.54,.06,.37,.02);
 box('cream',0,1.25,-.344,.021,.40,.018,.007,-.19);
 for(const side of [-1,1]){
  box('accent',side*.19,1.13,-.344,.12,.025,.022,.007,-.15);
  // Hip -> knee forward -> ankle: linked joints, rather than floating tubes.
  const hip=[side*.18,.94,.02],knee=[side*.24,.56,-.23],ankle=[side*.25,.23,.02];
  bone('dark',hip,knee,.15,.13);oval('dark',...knee,.135,.135,.135);bone('dark',knee,ankle,.12,.105);
  box('cream',side*.25,.2,-.07,.25,.30,.40,.055);box('dark',side*.25,.072,-.08,.27,.06,.45,.015);
  for(const y of [.22,.30])box('accent',side*.25,y,-.272,.19,.035,.018,.006);
  const shoulder=[side*.34,1.43,-.17],elbow=[side*.48,1.13,-.1],hand=[side*.5,1.03,-.43];
  oval('suit',...shoulder,.17,.18,.17);bone('suit',shoulder,elbow,.145,.12);oval('suit',...elbow,.125,.125,.125);bone('suit',elbow,hand,.115,.09);oval('dark',...hand,.095,.1,.105);
  // Poles extend from the hands back to the snow, with baskets and handles.
  bone('dark',[side*.5,1.08,-.44],[side*.62,.09,.61],.017,.012);
  oval('dark',side*.61,.15,.55,.072,.012,.072);
  // Shaped ski planform plus genuinely upturned tips.
  const shape=new T.Shape();shape.moveTo(-.105,.91);shape.lineTo(-.083,-.75);shape.quadraticCurveTo(-.09,-1.3,0,-1.4);shape.quadraticCurveTo(.09,-1.3,.083,-.75);shape.lineTo(.105,.91);shape.quadraticCurveTo(0,1.02,-.105,.91);
  const g=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,curveSegments:6});const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getY(i),y=.045-a.getZ(i)+Math.pow(Math.max(0,-z-.91),2)*.85;a.setXYZ(i,x,y,z)}g.computeVertexNormals();add('accent',g,side*.25,.02,0);
  box('cream',side*.25,.083,-.65,.12,.016,.35,.006);box('dark',side*.25,.10,.2,.20,.09,.12,.018);
 }
 // Neck gaiter, matte helmet shell, wraparound lens and continuous goggle strap.
 oval('dark',0,1.60,-.25,.16,.15,.15);
 oval('dark',0,1.74,-.31,.235,.24,.235);
 add('cream',new T.SphereGeometry(1,segments,8,0,Math.PI*2,0,Math.PI*.61),0,1.78,-.31,.27,.28,.265);
 oval('dark',0,1.74,-.31,.278,.075,.271);
 box('dark',0,1.77,-.551,.44,.19,.09,.055);
 box('lens',0,1.78,-.597,.385,.133,.055,.045);
 box('cream',-.09,1.809,-.628,.13,.018,.008,.006);
 for(const x of [-.095,.095])box('dark',x,1.993,-.38,.025,.014,.12,.005);
 // Back silhouette is deliberately readable in first-person pursuit.
 box('accent',0,1.24,.126,.43,.43,.20,.085,-.15);
 box('cream',0,1.26,.233,.035,.31,.018,.006,-.15);
 for(const side of [-1,1])box('dark',side*.225,1.30,.055,.055,.43,.065,.018,-.15);
 const result={};for(const [key,list]of Object.entries(buckets)){const merged=mergeGeometries(list);list.forEach(g=>g.dispose());merged.translate(0,-1,0);result[key]=merged}
 return result;
}
export function skierMaterials(color){return {suit:new T.MeshStandardMaterial({color,roughness:.83,transparent:true}),cream:new T.MeshStandardMaterial({color:0xf0eee2,roughness:.8,transparent:true}),dark:new T.MeshStandardMaterial({color:0x203a48,roughness:.75,transparent:true}),accent:new T.MeshStandardMaterial({color:0x45888a,roughness:.66,transparent:true}),lens:new T.MeshStandardMaterial({color:0xe99850,metalness:.45,roughness:.22,transparent:true})}}
