'use strict';
const assert=require('node:assert/strict');
const {MouthDriver,lipRatio}=require('../docs/avatar/face-response.js');
const {mapPose}=require('../docs/avatar/mesh-bridge.js');
const A=require('../docs/avatar/model.js');
const size={width:640,height:480};
function lips(ratio,yaw=0,roll=0){
  const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
  const set=(i,x,y,z=0)=>p[i]={x:.5+(x*Math.cos(roll)-y*Math.sin(roll))/640,y:.5+(x*Math.sin(roll)+y*Math.cos(roll))/480,z:z/640};
  set(61,-64*Math.cos(yaw),0,-64*Math.sin(yaw));set(291,64*Math.cos(yaw),0,64*Math.sin(yaw));
  set(13,0,-ratio*64);set(14,0,ratio*64);return p;
}
const d=new MouthDriver();
for(let i=0;i<30;i++)assert.equal(d.update(lips(.015),size,0),0);
assert(d.update(lips(.07),size,0)>.3,'small openings must move even when KalidoKit returns zero');
assert(d.update(lips(.3),size,0)>.95);assert.equal(d.update(lips(.015),size,.2),0,'closed lips must fully close');
assert(Math.abs(lipRatio(lips(.07,.7,.4),size)-.07)<1e-9,'yaw and roll must not amplify mouth width ratio');
d.calibrate();for(let i=0;i<15;i++)assert.equal(d.update(lips(.055),size),0);assert(!d.samples);
assert.equal(d.update(lips(.055),size),0);assert(d.update(lips(.11),size)>.3);
assert.equal(d.update([],size,.5,1.2),.6);assert.equal(d.update(lips(.1),size,.4,1,false),.4);
for(let x=-1;x<=1;x+=.1)for(let y=-1;y<=1;y+=.1){const p=mapPose({yaw:x,pitch:y});assert(Math.hypot(p.angleX/12,p.angleY/9.6)<=1.000001);assert(Math.abs(p.angleX)<12);}
assert(mapPose({yaw:.8}).angleX>mapPose({yaw:.4}).angleX);assert(mapPose({yaw:.8},.3,.2).angleX<mapPose({yaw:.8}).angleX);
const points=lips(0);points[10]={x:.5,y:.2,z:0};points[152]={x:.5,y:.8,z:0};points[234]={x:.3,y:.5,z:0};points[454]={x:.7,y:.5,z:0};
const pixels=new Uint8ClampedArray(640*480*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=pixels[i+1]=pixels[i+2]=150;pixels[i+3]=255;}
assert.equal(A.estimateAppearance(points,640,480,pixels,{skinTone:'#f5c9a5'}).skinTone,'#f5c9a5','ambiguous gray pixels must preserve the existing tone');
for(let i=0;i<pixels.length;i+=4){pixels[i]=200;pixels[i+1]=150;pixels[i+2]=120;}
assert.notEqual(A.estimateAppearance(points,640,480,pixels,{skinTone:'#f5c9a5'}).skinTone,'#969696');
console.log('PASS: small mouth openings, closure hysteresis, neutral calibration, yaw/roll invariance, bounded combined turns, and gray photo rejection.');
