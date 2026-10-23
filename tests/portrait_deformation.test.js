'use strict';
const assert=require('node:assert/strict');
(async()=>{
  const {portraitDeformationGain}=await import('../docs/avatar/vendor/mesh-avatar-0.2.1.mjs');
  const rest=new Float32Array([0,0,1,0,0,1]),tris=new Uint32Array([0,1,2]);
  function area(p){return(p[2]-p[0])*(p[5]-p[1])-(p[3]-p[1])*(p[4]-p[0]);}
  function check(pos){const gain=portraitDeformationGain({rest,pos,tris});assert(gain>=0&&gain<=1);for(let step=0;step<=40;step++){const t=gain*step/40,p=rest.map((v,i)=>v+(pos[i]-v)*t);assert(area(p)>=.24999,'triangle must remain oriented throughout the complete motion');}return gain;}
  assert.equal(check(new Float32Array([3,4,4,4,3,5])),1,'translation needs no restriction');
  assert(check(new Float32Array([0,0,-1,0,0,1]))<.4,'a mirrored endpoint must be limited');
  assert(check(new Float32Array([0,0,-1,0,0,-1]))<.25,'a safe endpoint can still cross a collapsed triangle on the way');
  assert.equal(check(new Float32Array([0,0,0,1,-1,0])),1,'a quarter turn does not need to be suppressed');
  let seed=41;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1000;i++)check(rest.map(v=>v+(random()-.5)*10));
  console.log('PASS: non-folding displacement preserves translations/rotations, detects intermediate collapse and retains at least 25% signed triangle area for 1,000 varied fields.');
})().catch(e=>{console.error(e);process.exitCode=1;});
