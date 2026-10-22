(function(root){
  'use strict';
  const bound=(x,lo,hi,fallback=0)=>typeof x==='number'&&Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):fallback;
  // Image-left is eyeR in mesh-avatar's anatomical naming, and eyeL in
  // FlatAvatar's mirrored display naming. Keep this conversion at one boundary.
  function mapPose(p={}){
    return {angleX:bound(p.yaw,-1,1)*24,angleY:-bound(p.pitch,-1,1)*20,angleZ:-bound(p.roll,-1,1)*26,
      eyeROpen:bound(p.eyeL,0,1,1),eyeLOpen:bound(p.eyeR,0,1,1),
      eyeSmile:Math.max(0,bound(p.smile,-1,1))*.3,
      gazeX:bound(p.gazeX,-1,1),gazeY:bound(p.gazeY,-1,1),
      mouthOpen:bound(p.mouth,0,1),mouthForm:bound(bound(p.pucker,0,1)*.9-bound(p.smile,-1,1)*.45,-1,1),
      browY:bound((bound(p.brow,-1,1)+bound(p.browL,-1,1)+bound(p.browR,-1,1))*.5,-1,1),
      browAngle:0,bodyAngleX:0,bodyAngleZ:0,breath:0,blush:0,armAngle:0,handAngle:0,fingerTap:0};
  }
  root.AvatarMeshBridge={mapPose};if(typeof module!=='undefined'&&module.exports)module.exports={mapPose};
})(typeof window!=='undefined'?window:globalThis);
