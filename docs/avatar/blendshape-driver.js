(function(root){
  'use strict';
  // Screen-left matches the mirrored preview: the subject's left eye is eyeL.
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function score(categories,name){
    let value=0;
    if(Array.isArray(categories)){
      const found=categories.find(item=>item&&item.categoryName===name);
      value=found?Number(found.score):0;
    }else if(categories&&typeof categories==='object')value=Number(categories[name]);
    return Number.isFinite(value)?clamp(value,0,1):0;
  }
  function rise(value,dead,span){return clamp((value-dead)/span,0,1);}
  function expressionFromBlendshapes(categories){
    const s=name=>score(categories,name);
    const eyeL=clamp(1-rise(s('eyeBlinkLeft'),.02,.45)+rise(s('eyeWideLeft'),.05,1)*.15,0,1);
    const eyeR=clamp(1-rise(s('eyeBlinkRight'),.02,.45)+rise(s('eyeWideRight'),.05,1)*.15,0,1);
    const inner=rise(s('browInnerUp'),.04,.62);
    const left=rise(s('browOuterUpLeft'),.04,.62)*.65+inner*.35-rise(s('browDownLeft'),.04,.62);
    const right=rise(s('browOuterUpRight'),.04,.62)*.65+inner*.35-rise(s('browDownRight'),.04,.62);
    const brow=clamp((left+right)/2,-1,1);
    const smileRaw=(s('mouthSmileLeft')+s('mouthSmileRight'))/2-(s('mouthFrownLeft')+s('mouthFrownRight'))/2;
    const smile=Math.abs(smileRaw)<.04?0:clamp(smileRaw/.62,-1,1);
    return {eyeL,eyeR,brow,browL:clamp(left-brow,-1,1),browR:clamp(right-brow,-1,1),
      smile,pucker:Math.max(rise(s('mouthPucker'),.04,.62),rise(s('mouthFunnel'),.04,.62)),
      jaw:rise(s('jawOpen'),.03,.45),
      squint:Math.max(rise(s('cheekSquintLeft'),.04,.62),rise(s('cheekSquintRight'),.04,.62),rise(s('eyeSquintLeft'),.04,.62),rise(s('eyeSquintRight'),.04,.62)),
      gazeX:clamp(((s('eyeLookOutLeft')+s('eyeLookInRight'))-(s('eyeLookInLeft')+s('eyeLookOutRight')))*.85,-1,1),
      gazeY:clamp(((s('eyeLookUpLeft')+s('eyeLookUpRight'))-(s('eyeLookDownLeft')+s('eyeLookDownRight')))*.85,-1,1)};
  }
  const api={expressionFromBlendshapes,score};
  root.AvatarBlend=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
