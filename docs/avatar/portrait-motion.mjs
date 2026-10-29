// Portrait output controls are independent of camera detection sensitivity.
const clamp=(v,lo,hi,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
export const DEFAULT_MOTION=Object.freeze({mouthScale:.85,blinkResponse:1,gazeStrength:.8,turnStrength:.5});
export function normalizeMotion(value={}){
  value=value&&typeof value==='object'?value:{};
  return {mouthScale:clamp(value.mouthScale,.35,1.25,DEFAULT_MOTION.mouthScale),
    blinkResponse:clamp(value.blinkResponse,.7,1.5,DEFAULT_MOTION.blinkResponse),
    gazeStrength:clamp(value.gazeStrength,0,1,DEFAULT_MOTION.gazeStrength),
    turnStrength:clamp(value.turnStrength,.2,.6,DEFAULT_MOTION.turnStrength)};
}
export function portraitPose(pose={},motion){
  const settings=normalizeMotion(motion);
  const eye=value=>{const x=clamp(value,0,1,1);return x>=.94?1:x<=.03?0:Math.pow((x-.03)/.91,settings.blinkResponse);};
  return {...pose,eyeL:eye(pose.eyeL),eyeR:eye(pose.eyeR),
    mouth:clamp(pose.mouth,0,1,0)*settings.mouthScale,
    gazeX:clamp(pose.gazeX,-1,1,0)*settings.gazeStrength,
    gazeY:clamp(pose.gazeY,-1,1,0)*settings.gazeStrength};
}

// Short, deterministic motions for checking a binding without camera permission.
export function previewPose(name,seconds=0){
  const p={eyeL:1,eyeR:1,mouth:0,smile:0,yaw:0,pitch:0,roll:0,gazeX:0,gazeY:0,pucker:0,brow:0,browL:0,browR:0,squint:0};
  if(name==='blink')p.eyeL=p.eyeR=0;
  if(name==='wink-left')p.eyeL=0;
  if(name==='wink-right')p.eyeR=0;
  if(name==='mouth-small')p.mouth=.3;
  if(name==='mouth-open')p.mouth=.85;
  if(name==='smile'){p.smile=.9;p.squint=.4;}
  if(name==='brow'){p.brow=.85;p.browL=.4;p.browR=-.4;}
  if(name==='pucker'){p.pucker=.9;p.mouth=.28;}
  if(name==='turn-left')p.yaw=-.7;
  if(name==='turn-right')p.yaw=.7;
  if(name==='loop'){
    const t=Math.max(0,Number.isFinite(seconds)?seconds:0)%8;
    if(t<2){const x=(t-.8)/.13;p.eyeL=p.eyeR=1-Math.exp(-x*x);}
    else if(t<4)p.mouth=(1-Math.cos((t-2)*Math.PI*2))*.32;
    else if(t<7)p.yaw=Math.sin((t-4)/3*Math.PI*2)*.7;
  }
  return p;
}

// Preset voice-room states. Welcome and thanks are one-shot; the page returns to listen.
export const HALL_STATES=Object.freeze(['speak','listen','welcome','thanks','sing','leave']);
export const HALL_ONCE=Object.freeze({welcome:2.4,thanks:2.4});
function neutralPose(){
  return {eyeL:1,eyeR:1,mouth:0,smile:0,yaw:0,pitch:0,roll:0,gazeX:0,gazeY:0,pucker:0,brow:0,browL:0,browR:0,squint:0};
}
function applyBlink(pose,t,every,offset){
  const phase=t%every;
  if(phase>offset&&phase<offset+.36){const x=(phase-offset-.16)/.12;pose.eyeL=pose.eyeR=1-Math.exp(-x*x);}
}
export function hallPose(name,seconds=0){
  const t=Math.max(0,Number.isFinite(seconds)?seconds:0),p=neutralPose();
  if(name==='speak'){
    const cycle=t%0.42;
    p.mouth=(1-Math.cos(cycle/0.42*Math.PI*2))*.48;
    p.pitch=Math.sin(t*2.4)*.62;p.yaw=Math.sin(t*1.2)*.28;p.smile=.35;
    applyBlink(p,t,3.6,2.4);return p;
  }
  if(name==='listen'){
    p.gazeX=Math.sin(t*.7)*.55;p.pitch=Math.sin(t*1.1)*.38;p.yaw=Math.sin(t*.85)*.42;
    applyBlink(p,t,6.2,2.1);return p;
  }
  if(name==='welcome'){
    const rise=Math.min(1,t/.35),settle=t<1.7?1:Math.max(0,1-(t-1.7)/.7),smile=.95*rise*settle;
    p.smile=smile;p.squint=.45*smile;p.brow=.8*rise*settle;
    p.pitch=Math.sin(Math.min(t,1.5)/1.5*Math.PI)*.72*settle;
    p.yaw=Math.sin(Math.min(t,1.2)/1.2*Math.PI)*.2*settle;
    applyBlink(p,t,2.4,.15);return p;
  }
  if(name==='thanks'){
    const rise=Math.min(1,t/.3),settle=t<1.7?1:Math.max(0,1-(t-1.7)/.7);
    p.smile=.9*rise*settle;p.squint=.35*p.smile;
    p.pitch=Math.sin(Math.min(t,1.6)/1.6*Math.PI)*.85*settle;return p;
  }
  if(name==='sing'){
    const beat=t%1.6;
    p.mouth=beat<.45?(1-Math.cos(beat/.45*Math.PI))*.72:beat<.9?(1-Math.cos((beat-.45)/.45*Math.PI))*.4:.12;
    p.smile=.7;p.squint=.4;p.yaw=Math.sin(t*Math.PI/.8)*.62;p.pitch=Math.sin(t*Math.PI/.8)*.42;p.roll=Math.sin(t*Math.PI/.8)*.18;
    applyBlink(p,t,4.8,3.2);return p;
  }
  if(name==='leave'){
    const u=Math.min(1,t/.45);p.eyeL=p.eyeR=1-u;p.pitch=.45*u;return p;
  }
  return p;
}
