'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const R=await import('../docs/avatar/portrait-rig.mjs'),V=await import('../docs/avatar/vendor/mesh-avatar-0.2.1.mjs');
  for(const [w,h]of [[1024,1024],[640,1024],[1024,640]]){
    const b=R.defaultBinding(w,h),rig=R.rigForBinding(b,w,h);assert.deepEqual(V.validateRig(rig),[]);
    assert.equal(rig.eyes.length,2);assert.deepEqual(rig.portrait,{version:2,teeth:false});
    const malformed=structuredClone(rig);malformed.portrait.teeth=true;assert.ok(V.validateRig(malformed).some(e=>e.includes("teeth=false")));assert.equal(rig.eyes[0].top.length,24);
    assert.ok(rig.eyes[0].x1<rig.eyes[1].x0);
    const resized=R.normalizeBinding(b,w/2,h/2);assert.equal(resized.eye0.w,b.eye0.w/2);
    const bad=structuredClone(b);bad.mouth.y=0;assert.throws(()=>R.normalizeBinding(bad,w,h),/嘴部/);
    const reversed=structuredClone(b);[reversed.eye0,reversed.eye1]=[reversed.eye1,reversed.eye0];assert.throws(()=>R.normalizeBinding(reversed,w,h),/颠倒/);
    const invalid=structuredClone(b);invalid.eye0.w=NaN;assert.throws(()=>R.normalizeBinding(invalid,w,h),/无效/);
  }
  assert.equal(R.bindingFromLandmarks(null,1024,1024),null);assert.equal(R.bindingFromLandmarks(Array(478).fill({x:.5,y:.5}),1024,1024),null);
  console.log('PASS: portrait geometry validation, image scaling, eye curves, invalid and ambiguous face rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
