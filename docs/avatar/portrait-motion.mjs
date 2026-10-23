// Portrait output controls are independent of camera detection sensitivity.
const clamp=(v,lo,hi,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
export const DEFAULT_MOTION=Object.freeze({mouthScale:.85,blinkResponse:1,gazeStrength:.5,turnStrength:.4});
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
  const p={eyeL:1,eyeR:1,mouth:0,smile:0,yaw:0,pitch:0,roll:0,gazeX:0,gazeY:0,pucker:0,brow:0,browL:0,browR:0};
  if(name==='blink')p.eyeL=p.eyeR=0;
  if(name==='wink-left')p.eyeL=0;
  if(name==='wink-right')p.eyeR=0;
  if(name==='mouth-small')p.mouth=.3;
  if(name==='mouth-open')p.mouth=.85;
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
