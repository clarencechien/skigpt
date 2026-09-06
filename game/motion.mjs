const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rad=Math.PI/180;
export function portraitRoll(beta,gamma){
 if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
 // Project gravity onto the display plane instead of using Euler gamma alone.
 const y=Math.sin(beta*rad),x=Math.cos(beta*rad)*Math.sin(gamma*rad);
 return Math.abs(y)<.35?gamma:Math.atan2(x,Math.abs(y))/rad;
}
export class MotionControls{
 constructor(){this.reset();this.lastGesture=-Infinity;this.gravity=null;this.lastMotion=0;this.motionSeen=false;this.orientationSeen=false;this.strikes=0}
 reset(){this.center=null;this.roll=null;this.steer=0;this.lastOrientation=0;this.pitch=null;this.pitchStart=0;this.pitchTime=0}
 orientation(e,now){const roll=portraitRoll(e.beta,e.gamma);if(roll===null)return false;this.orientationSeen=true;const dt=this.lastOrientation?Math.min(.1,(now-this.lastOrientation)/1000):.016;this.lastOrientation=now;this.center??=roll;this.roll??=roll;this.roll+=(roll-this.roll)*(1-Math.exp(-dt*12));let delta=this.roll-this.center;this.steer=Math.sign(delta)*clamp((Math.abs(delta)-2)/18,0,1);
 // Pitch-only fallback for devices that deliver orientation but no motion.
 let gesture=false;if(Number.isFinite(e.beta)){if(!this.pitchTime||now-this.pitchTime>250){this.pitchStart=e.beta;this.pitchTime=now}let swing=Math.abs(e.beta-this.pitchStart);if(swing>17&&swing<70&&now-this.lastMotion>400&&now-this.lastGesture>650){gesture=true;this.lastGesture=now;this.pitchTime=0}}
 return gesture}
 motion(e,now){let dt=this.lastMotion?Math.min(.1,(now-this.lastMotion)/1000):.016;let a=e.acceleration,g=e.accelerationIncludingGravity;const has=v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]));let power=0;
 if(has(a)){power=Math.hypot(a.y,a.z,a.x*.35);this.motionSeen=true}
 else if(has(g)){this.gravity??={...g};let dx=g.x-this.gravity.x,dy=g.y-this.gravity.y,dz=g.z-this.gravity.z;power=Math.hypot(dy,dz,dx*.35);const f=1-Math.exp(-dt*3);for(const k of ['x','y','z'])this.gravity[k]+=(g[k]-this.gravity[k])*f;this.motionSeen=true}
 const pitch=Math.abs(e.rotationRate?.beta||0);if(pitch>0)this.motionSeen=true;if(!this.motionSeen)return false;this.lastMotion=now;
 // Require a short sustained impulse; isolated screen-tap spikes do not qualify.
 const candidate=power>5.2||(pitch>105&&power>2)||pitch>170;
 this.strikes=candidate?this.strikes+1:0;
 if(this.strikes>=2&&now-this.lastGesture>650){this.lastGesture=now;this.strikes=0;return true}return false}
}
