'use strict';
// Exercise the UI state machine with a synthetic camera, tracker and API.
// This does not measure browser rendering or real camera/model quality.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../docs/avatar');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let now=0,nextFrame,stopped=0,apiCalls=0,draws=0,open=1,aperture=.002;
const pixels=new Uint8ClampedArray(640*480*4).fill(180);
const elements={};
const context2d={drawImage(){},getImageData(){return{data:pixels};}};
function element(){return{value:'1',checked:false,disabled:false,textContent:'',style:{},classList:{toggle(){}},handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},getContext(){return context2d;},toDataURL(){return'data:image/jpeg;base64,AA==';}};}
for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements[id]=element();
elements.avatar.width=600;elements.avatar.height=680;elements.captureRate.value='30';elements.trackingProfile.value='calibrated';elements.bodyFollow.value='.3';
Object.assign(elements.video,{videoWidth:640,videoHeight:480,readyState:4,currentTime:0,play:async()=>{}});
const saved=new Map();
function points(){
 const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
 const set=(i,x,y)=>p[i]={x,y,z:0};
 for(const [i,x,y]of [[234,.25,.5],[454,.75,.5],[10,.5,.17],[152,.5,.86],[263,.68,.41],[362,.57,.41],[130,.32,.41],[133,.43,.41],[334,.62,.34],[105,.37,.34],[61,.43,.64],[291,.57,.64],[13,.5,.64-aperture/2],[14,.5,.64+aperture/2]])set(i,x,y);
 for(const [tops,bottoms,xs]of [[[387,386,385],[373,374,380],[.66,.62,.59]],[[160,159,158],[144,145,153],[.34,.37,.41]]])for(let i=0;i<3;i++){set(tops[i],xs[i],.41-.02*open);set(bottoms[i],xs[i],.41+.02*open);}
 return p;
}
let rendered;
const sandbox={console,setTimeout,clearTimeout,Blob,URL,AbortSignal,performance:{now:()=>now},
 document:{getElementById:id=>{assert(elements[id],`Missing UI element ${id}`);return elements[id];},createElement:()=>element()},
 navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}},
 localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
 requestAnimationFrame:fn=>nextFrame=fn,addEventListener(){},
 FaceMesh:class{setOptions(){}onResults(fn){this.result=fn;}async send(){this.result({multiFaceLandmarks:[points()]});}},
 Kalidokit:{Face:{solve(copy){copy[0].x=320;return{head:{x:0,y:0,z:0},pupil:{x:0,y:0},mouth:{x:0,y:0,shape:{O:0}}};}}},
 fetch:async(url,options)=>{if(url==='/api/status')return{ok:true,json:async()=>({configured:true})};assert.equal(url,'/api/appearance');apiCalls++;assert(JSON.parse(options.body).image.startsWith('data:image/jpeg'));return{ok:true,json:async()=>({appearance:{hairStyle:'short',hairColor:'#111122',faceWidth:9,noseLength:9}})};}
};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const file of ['model.js','tracking.js','kalido-driver.js','mesh-bridge.js'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox);
sandbox.FlatAvatar.render=(_ctx,_a,p)=>{draws++;rendered={...p};};
vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8'),sandbox);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function frames(count){for(let i=0;i<count;i++){now+=50;elements.video.currentTime+=.05;nextFrame(now);await settle();}}
(async()=>{
 await settle();assert.equal(elements.useAI.disabled,false);
 await elements.camera.onclick();assert.equal(elements.capture.disabled,false);
 await frames(30);assert.match(elements.status.textContent,/校准完成/);
 open=0;aperture=.07;await frames(8);assert(rendered.eyeL<.01);assert(rendered.mouth>.6);
 elements.eyeGain.value='1.2';elements.eyeGain.handlers.input();
 open=1;aperture=.002;
 await elements.capture.onclick();assert.equal(apiCalls,0);assert(saved.has('flat-avatar-v2'));assert.equal(elements.snapshot.style.display,'block');
 await frames(30);assert.match(elements.status.textContent,/校准完成/);
 elements.useAI.checked=true;await elements.capture.onclick();assert.equal(apiCalls,1);
 const appearance=JSON.parse(saved.get('flat-avatar-v2'));assert.equal(appearance.hairStyle,'short');assert.equal(appearance.hairColor,'#111122');assert(appearance.faceWidth<=1.2);assert(appearance.noseLength<=1.2);
 elements.trackingProfile.value='official';elements.trackingProfile.handlers.change();
 assert.equal(elements.calibrate.disabled,true);assert.equal(elements.eyeGain.disabled,true);
 sandbox.Kalidokit.Face.solve=()=>({head:{x:0,y:.2,z:0,degrees:{x:0,y:12,z:0}},eye:{l:1,r:0},pupil:{x:.5,y:0},mouth:{x:.2,y:.7,shape:{O:.3}}});
 await frames(8);assert(rendered.eyeL<.01);assert(rendered.eyeR>.99);assert(rendered.mouth>.69);assert(Math.abs(rendered.yaw-.4)<.01);
 const d=sandbox.AvatarDiagnostics.snapshot();assert.equal(d.profile,'official');assert(d.inputCount>60);assert.equal(d.calibrating,false);assert(Math.abs(d.mesh.bodyAngleX-3.6)<.05);
 elements.stop.onclick();assert.equal(stopped,1);assert.equal(elements.capture.disabled,true);
 const before=apiCalls;elements.demo.onclick();await frames(10);assert(draws>70);assert.equal(apiCalls,before);
 console.log('PASS: camera calibration, live expressions, local photo generation, optional API geometry protection, stopping, and demo without API calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
