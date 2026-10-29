(function(root){
  'use strict';
  const bound=(x,lo,hi,fallback=0)=>typeof x==='number'&&Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):fallback;
  // Image-left is eyeR in mesh-avatar's anatomical naming, and eyeL in
  // FlatAvatar's mirrored display naming. Keep this conversion at one boundary.
  function mapPose(p={},bodyFollow=.3,turnStrength=.4){
    // Mesh-avatar rotates image coordinates by -angleZ, while Cubism's Z
    // parameter has the opposite visual sign. Match screen-space motion,
    // rather than sending identical Z numbers to incompatible rig axes.
    // A single front-view illustration cannot sustain Cubism's full turn range.
    // Smooth saturation avoids a hard stop and bounds combined yaw/pitch too.
    const strength=bound(turnStrength,.2,.6,.4);
    let yaw=Math.tanh(bound(p.yaw,-1,1)*1.6),pitch=Math.tanh(bound(p.pitch,-1,1)*1.6);
    const combined=Math.max(1,Math.hypot(yaw,pitch));yaw/=combined;pitch/=combined;
    const angleX=yaw*30*strength,angleY=-pitch*24*strength,angleZ=bound(p.roll,-1,1)*24,follow=bound(bodyFollow,0,.5,0);
    const smile=bound(p.smile,-1,1),pucker=bound(p.pucker,0,1),browL=bound(p.browL,-1,1),browR=bound(p.browR,-1,1);
    return {angleX,angleY,angleZ,
      eyeROpen:bound(p.eyeL,0,1,1),eyeLOpen:bound(p.eyeR,0,1,1),
      eyeSmile:Math.min(1,Math.max(0,smile)*.75+bound(p.squint,0,1)*.45),
      gazeX:bound(p.gazeX,-1,1),gazeY:bound(p.gazeY,-1,1),
      mouthOpen:bound(p.mouth,0,1),mouthForm:bound(pucker*.9-smile*.45,-1,1),
      browY:bound(bound(p.brow,-1,1)+(browL+browR)*.5,-1,1),
      browAngle:bound(browL-browR,-1,1)*.6,
      smile,pucker,
      bodyAngleX:bound(angleX*follow,-10,10),bodyAngleZ:bound(angleZ*follow,-10,10),breath:0,blush:0,armAngle:0,handAngle:0,fingerTap:0};
  }
  root.AvatarMeshBridge={mapPose};if(typeof module!=='undefined'&&module.exports)module.exports={mapPose};
})(typeof window!=='undefined'?window:globalThis);
