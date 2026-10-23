'use strict';
// Rendered-pixel regressions use a procedural test pattern, not a claimed AI portrait.
const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=18774,sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.env.PYTHON||'python',['-u','run_avatar.py','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),8000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/status',r=>r.fulfill({json:{configured:false,selfie:false}}));
  await page.goto(`http://127.0.0.1:${port}/avatar/`);await page.waitForFunction(()=>IllustratedAvatar.active);
  const data=await page.evaluate(async()=>{
   const R=await import('/avatar/portrait-rig.mjs?v=9'),c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');
   for(let y=0;y<800;y+=20)for(let a=0;a<600;a+=20){x.fillStyle=(a+y)%40?'#c9d5d9':'#e7dcd0';x.fillRect(a,y,20,20);}
   x.fillStyle='#1e334e';x.fillRect(130,480,340,320);x.fillStyle='#f0c8a5';x.beginPath();x.ellipse(300,275,116,190,0,0,Math.PI*2);x.fill();
   x.fillStyle='#29292e';x.beginPath();x.ellipse(300,140,115,77,0,0,Math.PI*2);x.fill();
   const b={version:1,width:600,height:800,method:'manual',head:{x:175,y:60,w:250,h:410},eye0:{x:224,y:241,w:58,h:9},eye1:{x:318,y:241,w:58,h:9},mouth:{x:258,y:334,w:84,h:25}};
   for(const e of [b.eye0,b.eye1]){x.fillStyle='#fff';x.beginPath();x.ellipse(e.x+e.w/2,e.y+e.h/2,e.w/2,e.h/2,0,0,Math.PI*2);x.fill();x.fillStyle='#30251f';x.beginPath();x.ellipse(e.x+e.w/2,e.y+e.h/2,5,4,0,0,Math.PI*2);x.fill();x.strokeStyle='#4b3027';x.lineWidth=1.5;x.beginPath();x.moveTo(e.x,e.y+e.h/2);x.quadraticCurveTo(e.x+e.w/2,e.y-3,e.x+e.w,e.y+e.h/2);x.stroke();}
   x.fillStyle='#ba7169';x.beginPath();x.ellipse(300,346,42,10,0,0,Math.PI*2);x.fill();x.strokeStyle='#633633';x.lineWidth=2;x.beginPath();x.moveTo(260,344);x.quadraticCurveTo(300,348,340,344);x.stroke();
   const built=await R.buildPortrait(c,b,'render-pattern');
   const ok=await IllustratedAvatar.load(new Blob([built.archive],{type:'application/zip'}),'render-pattern',{id:'pattern'});if(!ok)throw Error(IllustratedAvatar.lastError);
   window.qSource={w:600,h:800,binding:b};window.qFrames={};
   window.qCapture=label=>{const c=document.querySelector('#meshCanvas'),copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;copy.getContext('2d').drawImage(c,0,0);qFrames[label]={w:c.width,h:c.height,p:copy.getContext('2d').getImageData(0,0,c.width,c.height).data};};
   window.qRegion=(label,rect)=>{const f=qFrames[label],scale=Math.min(f.w/(600*1.05),f.h/(800*1.025)),ox=(f.w-600*scale)/2,oy=f.h-800*scale,out=[];
     for(let y=Math.ceil(oy+rect[1]*scale);y<Math.floor(oy+(rect[1]+rect[3])*scale);y++)for(let x=Math.ceil(ox+rect[0]*scale);x<Math.floor(ox+(rect[0]+rect[2])*scale);x++){const i=(y*f.w+x)*4;out.push([f.p[i],f.p[i+1],f.p[i+2],f.p[i+3]]);}return out;};
   return c.toDataURL('image/png');
  });
  async function set(values){await page.evaluate(v=>{for(const [id,value]of Object.entries(v)){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}},values);await sleep(400);}
  await set({eyeL:1,eyeR:1,mouth:0,yaw:0,pitch:0,roll:0,bodyFollow:0});await page.evaluate(()=>qCapture('neutral'));
  await set({yaw:1,pitch:.8,roll:1,bodyFollow:.5});await page.evaluate(()=>qCapture('turned'));
  const movement=await page.evaluate(()=>{
   const a=qRegion('neutral',[4,4,90,770]),b=qRegion('turned',[4,4,90,770]);let sum=0,max=0;for(let i=0;i<a.length;i++)for(let k=0;k<4;k++){const d=Math.abs(a[i][k]-b[i][k]);sum+=d;max=Math.max(max,d);}
   const f=qRegion('neutral',[225,220,150,180]),g=qRegion('turned',[225,220,150,180]);let changed=0;for(let i=0;i<f.length;i++)if(Math.abs(f[i][0]-g[i][0])+Math.abs(f[i][1]-g[i][1])+Math.abs(f[i][2]-g[i][2])>15)changed++;
   return {backgroundMax:max,backgroundMean:sum/(a.length*4),faceChanged:changed};
  });
  assert.ok(movement.backgroundMax<=2,JSON.stringify(movement));assert.ok(movement.faceChanged>100,JSON.stringify(movement));
  await set({yaw:0,pitch:0,roll:0,bodyFollow:0,eyeL:0,eyeR:0});await page.evaluate(()=>qCapture('closed'));
  const eyes=await page.evaluate(()=>[qSource.binding.eye0,qSource.binding.eye1].map(e=>{
   const rect=[e.x-2,e.y-3,e.w+4,e.h+7],open=qRegion('neutral',rect),closed=qRegion('closed',rect),bright=p=>p[0]>225&&p[1]>225&&p[2]>225,dark=p=>p[0]<135&&p[1]<120&&p[2]<110;
   return {openWhite:open.filter(bright).length,closedWhite:closed.filter(bright).length,closedLid:closed.filter(dark).length};
  }));
  for(const eye of eyes){assert.ok(eye.openWhite>30,JSON.stringify(eyes));assert.ok(eye.closedWhite<eye.openWhite*.2,JSON.stringify(eyes));assert.ok(eye.closedLid>18,JSON.stringify(eyes));}
  await set({eyeL:1,eyeR:1,mouth:1});await page.evaluate(()=>qCapture('mouth'));
  const mouth=await page.evaluate(()=>{const pixels=qRegion('mouth',[250,325,100,65]);return {white:pixels.filter(p=>p[0]>225&&p[1]>225&&p[2]>225).length,dark:pixels.filter(p=>p[0]<150&&p[1]<105&&p[2]<110).length};});
  assert.equal(mouth.white,0,'portrait mouth must not add teeth');assert.ok(mouth.dark>180,JSON.stringify(mouth));
  // Failed detection is explicit, then a three-point calibration really changes the binding.
  await page.evaluate(()=>{AvatarPortraitDetector.detect=async()=>null;});
  await page.locator('#importAvatar').setInputFiles({name:'narrow-eyes.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});
  await page.waitForFunction(()=>PortraitDiagnostics.snapshot().binding&&!PortraitDiagnostics.snapshot().detecting);
  assert.ok((await page.locator('#portraitActionStatus').textContent()).includes('原来的框没有改变'));
  await page.locator('#quickPortrait').click();
  const canvas=page.locator('#portraitEditorCanvas');
  for(const [x,y]of [[253,245.5],[347,245.5],[300,346]]){const box=await canvas.boundingBox();await canvas.click({position:{x:x/600*box.width,y:y/800*box.height}});}
  const manual=await page.evaluate(()=>PortraitDiagnostics.snapshot().binding);assert.ok(Math.abs(manual.eye0.x+manual.eye0.w/2-253)<1);assert.ok(Math.abs(manual.mouth.x+manual.mouth.w/2-300)<1);
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>!PortraitDiagnostics.snapshot().building&&IllustratedAvatar.name==='narrow-eyes',{timeout:30000});
  // A full-frame miss followed by a cropped-head hit must be remapped and applied.
  await page.evaluate(()=>{
   window.detectionCalls=0;AvatarPortraitDetector.detect=async()=>{
    if(++window.detectionCalls===1)return null;
    const p=Array.from({length:478},()=>({x:.5,y:.5,z:0})),set=(i,x,y)=>p[i]={x,y,z:0};
    for(const[i,x,y]of [[234,.18,.5],[454,.82,.5],[10,.5,.2],[152,.5,.9],[33,.28,.45],[160,.32,.43],[158,.39,.43],[133,.43,.45],[153,.39,.47],[144,.32,.47],[362,.57,.45],[385,.61,.43],[387,.68,.43],[263,.72,.45],[373,.68,.47],[380,.61,.47],[61,.39,.68],[291,.61,.68],[13,.5,.675],[14,.5,.685]])set(i,x,y);return p;
   };
  });
  await page.locator('#detectPortrait').click();await page.waitForFunction(()=>window.detectionCalls===2&&!PortraitDiagnostics.snapshot().detecting&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
  assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.method),'detected');assert.equal(await page.locator('#exportPortrait').isDisabled(),false);
  assert.ok((await page.locator('#portraitActionStatus').textContent()).includes('已应用'));
  assert.deepEqual(errors,[]);console.log('PASS: patterned background pinned under combined yaw/pitch/roll, narrow eyes retain dark closed lids with no exposed whites, mouth has no teeth, failed detection feedback, three-point calibration, cropped retry and automatic re-application.');console.log(JSON.stringify({movement,eyes,mouth}));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
