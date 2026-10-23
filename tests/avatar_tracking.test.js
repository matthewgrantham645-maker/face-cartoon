'use strict';
const assert=require('node:assert/strict'),{MotionDriver,OneEuro,measure,FacePresence}=require('../docs/avatar/tracking.js');
function fixture(open=1,aperture=.002){
 const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
 const set=(i,x,y)=>p[i]={x,y,z:0};
 for(const [i,x,y]of [[234,.25,.5],[454,.75,.5],[10,.5,.17],[152,.5,.86],[263,.68,.41],[362,.57,.41],[130,.32,.41],[133,.43,.41],[334,.62,.34],[105,.37,.34],[61,.43,.64],[291,.57,.64],[13,.5,.64-aperture/2],[14,.5,.64+aperture/2]])set(i,x,y);
 for(const [tops,bottoms,xs]of [[[387,386,385],[373,374,380],[.66,.62,.59]],[[160,159,158],[144,145,153],[.34,.37,.41]]])for(let i=0;i<3;i++){set(tops[i],xs[i],.41-.02*open);set(bottoms[i],xs[i],.41+.02*open);}
 return p;
}
const size={width:640,height:480},solved={head:{x:0,y:0,z:0},pupil:{x:0,y:0},mouth:{shape:{O:0}}};
assert(measure(fixture(),size).eyeL>.2);assert.equal(measure([],size),null);
const d=new MotionDriver();let now=0,result;
for(let i=0;i<30;i++)result=d.update(fixture(),solved,size,now+=40);
assert.equal(result.calibrating,false);assert(result.pose.eyeL>.99);assert.equal(result.pose.mouth,0);
result=d.update(fixture(0),solved,size,now+=33);assert.equal(result.pose.eyeL,0);assert.equal(result.pose.eyeR,0);
result=d.update(fixture(.4),solved,size,now+=33);assert.equal(result.pose.eyeL,0,'closed eye must not chatter at the release threshold');
for(let i=0;i<5;i++)result=d.update(fixture(1,.07),solved,size,now+=33);
assert(result.pose.eyeL>.8);assert(result.pose.mouth>.6);assert(Object.values(result.pose).every(Number.isFinite));
const moved=d.update(fixture(),{...solved,head:{x:0,y:4,z:0}},size,now+=33);assert(Math.abs(moved.pose.yaw)<.5,'a single extreme rotation must be bounded');
const canonical=new MotionDriver();let stamp=0,turned;
for(let i=0;i<30;i++)canonical.update(fixture(),solved,size,stamp+=40);
for(let i=0;i<8;i++)turned=canonical.update(fixture(),{...solved,head:{x:.1,y:.2,z:.1}},size,stamp+=40);
assert(turned.pose.yaw>0&&turned.pose.pitch<0&&turned.pose.roll<0,'personal calibration must preserve the official canonical angle directions');
const adaptive=new OneEuro(1.6,.8),fixed=new OneEuro(1.6,0);adaptive.update(0,0);fixed.update(0,0);
let av,fv;for(let i=1;i<=4;i++){av=adaptive.update(1,i*33);fv=fixed.update(1,i*33);}assert(av>fv+.08,'adaptive filtering must respond faster to deliberate movement');
const quiet=new OneEuro(1.6,.3);let input=[],output=[];for(let i=0;i<120;i++){const v=(i%2?1:-1)*.03;input.push(v);output.push(quiet.update(v,i*33));}const rms=xs=>Math.sqrt(xs.slice(20).reduce((s,x)=>s+x*x,0)/(xs.length-20));assert(rms(output)<rms(input)*.5,'stationary jitter must be reduced');
d.beginCalibration();assert(d.calibrating);assert.equal(d.baseline,null);
const presence=new FacePresence();presence.accept({eyeL:0,eyeR:1,mouth:1,yaw:.8},100);
assert.equal(presence.sample(250).pose.mouth,1,'brief occlusion must not interrupt a word');
const released=presence.sample(450);assert.equal(released.state,'recovering');assert(released.pose.eyeL>0&&released.pose.eyeL<1);assert(released.pose.mouth>0&&released.pose.mouth<1);
const lost=presence.sample(800);assert.equal(lost.state,'lost');assert.equal(lost.pose.eyeL,1);assert.equal(lost.pose.mouth,0);assert.equal(lost.pose.yaw,0);
presence.accept({mouth:.2},850);assert.equal(presence.sample(870).state,'tracking');assert.equal(presence.sample(870).pose.mouth,.2);
presence.reset();assert.equal(presence.sample(900).pose.mouth,0);assert.equal(presence.sample(900).state,'lost');
console.log('PASS: personalized eye calibration, blink hysteresis, mouth opening, spike limiting, faster deliberate movement, jitter reduction, and reset.');
