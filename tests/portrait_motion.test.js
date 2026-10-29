'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const {DEFAULT_MOTION,normalizeMotion,portraitPose,previewPose,hallPose,HALL_STATES,HALL_ONCE}=await import('../docs/avatar/portrait-motion.mjs');
  const {mapPose}=require('../docs/avatar/mesh-bridge.js');
  assert.deepEqual(normalizeMotion(),DEFAULT_MOTION);
  const invalid=normalizeMotion({mouthScale:Infinity,blinkResponse:-50,gazeStrength:5,turnStrength:NaN});
  assert.equal(invalid.mouthScale,.85);assert.equal(invalid.blinkResponse,.7);assert.equal(invalid.gazeStrength,1);assert.equal(invalid.turnStrength,.5);
  const input={eyeL:1,eyeR:0,mouth:.4,gazeX:1,gazeY:-1,yaw:.5};
  const output=portraitPose(input,{mouthScale:.5,gazeStrength:.25});
  assert.equal(output.eyeL,1);assert.equal(output.eyeR,0);assert.equal(output.mouth,.2);assert.equal(output.gazeX,.25);assert.equal(output.yaw,.5);assert.equal(input.mouth,.4);
  for(const blinkResponse of [.7,1,1.5]){
    let last=-1;
    for(let i=0;i<=100;i++){const p=portraitPose({eyeL:i/100,eyeR:1-i/100},{blinkResponse});assert(p.eyeL>=last);last=p.eyeL;assert(p.eyeR>=0&&p.eyeR<=1);}
    assert.equal(portraitPose({eyeL:.96},{blinkResponse}).eyeL,1,'neutral eye noise must not make a fully open eye droop');
  }
  for(const name of ['neutral','blink','wink-left','wink-right','mouth-small','mouth-open','smile','brow','pucker','turn-left','turn-right','loop'])for(let t=0;t<16;t+=.07){
    const params=mapPose(portraitPose(previewPose(name,t)));
    assert(Object.values(params).every(Number.isFinite));assert(params.mouthOpen<=1&&params.eyeLOpen<=1);
  }
  assert.equal(previewPose('wink-left').eyeR,1);assert.equal(previewPose('wink-right').eyeL,1);
  assert.deepEqual(previewPose('loop',8),previewPose('loop',0));
  assert.deepEqual(HALL_STATES,['speak','listen','welcome','thanks','sing','leave']);
  assert.equal(HALL_ONCE.welcome,2.4);assert.equal(HALL_ONCE.thanks,2.4);
  for(const name of HALL_STATES)for(let t=0;t<4;t+=.05){
    const params=mapPose(portraitPose(hallPose(name,t)));
    assert(Object.values(params).every(Number.isFinite),name);
    assert(params.mouthOpen>=0&&params.mouthOpen<=1&&params.eyeLOpen>=0&&params.eyeLOpen<=1);
  }
  assert.equal(hallPose('listen',1).mouth,0);
  assert.ok(hallPose('speak',.21).mouth>.7);
  assert.ok(Math.abs(hallPose('speak',.4).pitch)>.3);
  assert.ok(Math.abs(hallPose('listen',1.6).yaw)>.25);
  assert.ok(hallPose('welcome',.5).smile>.8);
  assert.ok(hallPose('welcome',.75).pitch>.5);
  assert.ok(hallPose('thanks',.8).pitch>.6);
  assert.equal(hallPose('leave',1).eyeL,0);assert.equal(hallPose('leave',0).eyeL,1);
  assert.ok(hallPose('leave',1).pitch>.3);
  assert.ok(hallPose('sing',.22).mouth>.5);
  assert.ok(Math.abs(hallPose('sing',.4).yaw)>.3);
  assert.equal(hallPose('unknown',1).mouth,0);
  console.log('PASS: bounded portrait output settings, independent mouth sensitivity, neutral-eye stability, continuous blink response and finite repeatable previews.');
})().catch(e=>{console.error(e);process.exitCode=1;});
