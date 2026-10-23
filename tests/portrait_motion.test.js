'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const {DEFAULT_MOTION,normalizeMotion,portraitPose,previewPose}=await import('../docs/avatar/portrait-motion.mjs');
  const {mapPose}=require('../docs/avatar/mesh-bridge.js');
  assert.deepEqual(normalizeMotion(),DEFAULT_MOTION);
  const invalid=normalizeMotion({mouthScale:Infinity,blinkResponse:-50,gazeStrength:5,turnStrength:NaN});
  assert.equal(invalid.mouthScale,.85);assert.equal(invalid.blinkResponse,.7);assert.equal(invalid.gazeStrength,1);assert.equal(invalid.turnStrength,.4);
  const input={eyeL:1,eyeR:0,mouth:.4,gazeX:1,gazeY:-1,yaw:.5};
  const output=portraitPose(input,{mouthScale:.5,gazeStrength:.25});
  assert.equal(output.eyeL,1);assert.equal(output.eyeR,0);assert.equal(output.mouth,.2);assert.equal(output.gazeX,.25);assert.equal(output.yaw,.5);assert.equal(input.mouth,.4);
  for(const blinkResponse of [.7,1,1.5]){
    let last=-1;
    for(let i=0;i<=100;i++){const p=portraitPose({eyeL:i/100,eyeR:1-i/100},{blinkResponse});assert(p.eyeL>=last);last=p.eyeL;assert(p.eyeR>=0&&p.eyeR<=1);}
    assert.equal(portraitPose({eyeL:.96},{blinkResponse}).eyeL,1,'neutral eye noise must not make a fully open eye droop');
  }
  for(const name of ['neutral','blink','wink-left','wink-right','mouth-small','mouth-open','turn-left','turn-right','loop'])for(let t=0;t<16;t+=.07){
    const params=mapPose(portraitPose(previewPose(name,t)));
    assert(Object.values(params).every(Number.isFinite));assert(params.mouthOpen<=1&&params.eyeLOpen<=1);
  }
  assert.equal(previewPose('wink-left').eyeR,1);assert.equal(previewPose('wink-right').eyeL,1);
  assert.deepEqual(previewPose('loop',8),previewPose('loop',0));
  console.log('PASS: bounded portrait output settings, independent mouth sensitivity, neutral-eye stability, continuous blink response and finite repeatable previews.');
})().catch(e=>{console.error(e);process.exitCode=1;});
