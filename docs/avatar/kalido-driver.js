(function(root){
  'use strict';
  const clamp=(n,lo=-1,hi=1,fallback=0)=>Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;
  // Canonical pose: angles are expressed as fractions of 30 degrees. Eye names
  // are screen sides, matching the existing UI; anatomical names are converted
  // only at renderer boundaries. This follows the KalidoKit Live2D example.
  function fromKalido(r={},stabilizeBlink){
    const h=r.head||{},degrees=h.degrees||{},deg=k=>Number.isFinite(degrees[k])?degrees[k]:clamp(h[k],-Math.PI,Math.PI)*180/Math.PI;
    let eyes={l:clamp(r.eye?.l,0,1,1),r:clamp(r.eye?.r,0,1,1)};
    if(typeof stabilizeBlink==='function')eyes=stabilizeBlink({...eyes},clamp(h.y,-Math.PI,Math.PI))||eyes;
    return {eyeL:clamp(eyes.r,0,1,1),eyeR:clamp(eyes.l,0,1,1),
      yaw:clamp(deg('y')/30),pitch:clamp(-deg('x')/30),roll:clamp(-deg('z')/30),
      mouth:clamp(r.mouth?.y,0,1),smile:clamp(r.mouth?.x),
      pucker:clamp((r.mouth?.shape?.O||0)+(r.mouth?.shape?.U||0),0,1),
      gazeX:clamp(r.pupil?.x),gazeY:clamp(r.pupil?.y),brow:clamp(r.brow),browL:0,browR:0};
  }
  function live2dParameters(p={},bodyFollow=.3){
    const angleX=clamp(p.yaw)*30,angleY=-clamp(p.pitch)*30,angleZ=-clamp(p.roll)*30,follow=clamp(bodyFollow,0,.5,.3);
    return {ParamAngleX:angleX,ParamAngleY:angleY,ParamAngleZ:angleZ,
      ParamBodyAngleX:clamp(angleX*follow,-10,10),ParamBodyAngleY:clamp(angleY*follow,-10,10),ParamBodyAngleZ:clamp(angleZ*follow,-10,10),
      ParamEyeROpen:clamp(p.eyeL,0,1,1),ParamEyeLOpen:clamp(p.eyeR,0,1,1),
      ParamEyeBallX:clamp(p.gazeX),ParamEyeBallY:clamp(p.gazeY),
      ParamMouthOpenY:clamp(p.mouth,0,1),ParamMouthForm:clamp(.3+clamp(p.smile),-1,1),
      ParamBrowLY:clamp((p.brow||0)+(p.browR||0)),ParamBrowRY:clamp((p.brow||0)+(p.browL||0))};
  }
  const api={fromKalido,live2dParameters};root.AvatarKalido=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
