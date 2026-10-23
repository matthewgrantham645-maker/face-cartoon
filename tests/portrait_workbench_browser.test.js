'use strict';
// Real WebGL and IndexedDB. Camera frames are synthetic; no image API is called.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=18775,out=process.env.AVATAR_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'portrait-v11-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.env.PYTHON||'python',['-u','run_avatar.py','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),8000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];let paid=0;
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/status',r=>r.fulfill({json:{configured:false,selfie:false}}));
  await page.route('**/api/selfie',r=>{paid++;return r.fulfill({status:500,json:{error:'test must not generate'}});});
  await page.addInitScript(()=>{
   window.liveFixture={present:true,open:1,mouth:.002};window.closedTracks=0;
   window.FaceMesh=class{setOptions(){}onResults(fn){this.fn=fn;}async send(){
    if(liveFixture.delay)await new Promise(resolve=>setTimeout(resolve,liveFixture.delay));
    const f=liveFixture,p=Array.from({length:478},()=>({x:.5,y:.5,z:0})),set=(i,x,y)=>p[i]={x,y,z:0};
    for(const[i,x,y]of [[234,.31,.46],[454,.71,.46],[10,.5,.30],[152,.5,.72],[61,.45,.617],[291,.56,.617],[13,.5,.617-f.mouth/2],[14,.5,.617+f.mouth/2],[334,.62,.37],[105,.42,.37],[130,.392,.44]])set(i,x,y);
    for(const[a,b,top,bot,xs]of [[33,133,[160,159,158],[144,145,153],[.405,.430,.455]],[362,263,[385,386,387],[380,374,373],[.575,.600,.625]]]){set(a,xs[0]-.013,.44);set(b,xs[2]+.013,.44);for(let i=0;i<3;i++){set(top[i],xs[i],.44-.013*f.open);set(bot[i],xs[i],.44+.013*f.open);}}
    this.fn({multiFaceLandmarks:f.present?[p]:[]});
   }};
   navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');const timer=setInterval(()=>{ctx.fillStyle='#ccc';ctx.fillRect(0,0,640,480);},30),stream=c.captureStream(30);for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);closedTracks++;stop();};}return stream;};
  });
  await page.goto(`http://127.0.0.1:${port}/avatar/`);await page.waitForFunction(()=>IllustratedAvatar.ready);
  await page.evaluate(async()=>{
   const R=await import('/avatar/portrait-rig.mjs?v=11'),image=new Image();image.src='/avatar/character/source.png';await image.decode();
   const source=await R.decodePortrait(image.src.startsWith('data:')?image.src:await new Promise(resolve=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);resolve(c.toDataURL());}));
   const w=source.width,h=source.height,b={version:1,width:w,height:h,method:'manual',head:{x:.24*w,y:.19*h,w:.55*w,h:.56*h},eye0:{x:.392*w,y:.427*h,w:.076*w,h:.026*h},eye1:{x:.562*w,y:.427*h,w:.076*w,h:.026*h},mouth:{x:.442*w,y:.603*h,w:.126*w,h:.028*h}};
   await PortraitStore.put({id:'v11-local',created:Date.now(),styleName:'工作台验证插画',result:source.toDataURL(),portraitBinding:b});
  });
  await page.goto(`http://127.0.0.1:${port}/avatar/?portrait=v11-local`);await page.waitForFunction(()=>PortraitDiagnostics.snapshot().binding&&IllustratedAvatar.ready);
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>IllustratedAvatar.portrait?.id==='v11-local'&&!PortraitDiagnostics.snapshot().building);
  assert.equal(await page.locator('#portraitMotion').isVisible(),true);
  async function slider(id,value){await page.locator('#'+id).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);await sleep(160);}
  async function preview(name){await page.locator('[data-portrait-preview="'+name+'"]').click();await sleep(350);return await page.evaluate(()=>AvatarDiagnostics.snapshot());}
  const neutral=await preview('neutral');const neutralPNG=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());
  const closed=await preview('blink');assert(closed.pose.eyeL<.01&&closed.pose.eyeR<.01);assert.notEqual(await page.locator('#meshCanvas').evaluate(c=>c.toDataURL()),neutralPNG);
  const wink=await preview('wink-left');assert(wink.pose.eyeL<.01&&wink.pose.eyeR>.99);
  const small=await preview('mouth-small');assert(Math.abs(small.pose.mouth-.3)<.01);assert(Math.abs(small.renderer.parameters.mouthOpen-.255)<.02);
  await slider('portraitMouthScale',.4);const softer=await page.evaluate(()=>AvatarDiagnostics.snapshot());assert(softer.renderer.parameters.mouthOpen<small.renderer.parameters.mouthOpen*.6);
  await slider('portraitGazeStrength',0);await slider('gazeX',1);assert.equal(await page.evaluate(()=>IllustratedAvatar.snapshot().parameters.gazeX),0);
  assert.equal(await page.locator('[data-portrait-preview="mouth-small"]').getAttribute('aria-pressed'),'false');
  const savedMotion=await page.evaluate(async()=> (await PortraitStore.get('v11-local')).portraitBinding.motion);assert.equal(savedMotion.mouthScale,.4);assert.equal(savedMotion.gazeStrength,0);
  // A one-pixel edit in the loupe uses source pixels and invalidates the old archive.
  await page.locator('#portraitFeature').selectOption('mouth');const before=await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x);
  await page.locator('#portraitZoom').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),before+1);assert.equal(await page.locator('#exportPortrait').isDisabled(),true);assert.equal(await page.locator('#exportActivePortrait').isDisabled(),true);
  await page.locator('#undoPortrait').click();assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),before);assert.equal(await page.locator('#exportPortrait').isDisabled(),false);
  await page.locator('#redoPortrait').click();assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),before+1);
  const dragState=await page.evaluate(()=>PortraitDiagnostics.snapshot()),region=dragState.zoom,box=dragState.binding.mouth,z=await page.locator('#portraitZoom').boundingBox();
  const px=z.x+(box.x+box.w/2-region.x)/region.w*z.width,py=z.y+(box.y+box.h/2-region.y)/region.h*z.height;
  await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+20,py,{steps:5});await page.mouse.up();
  assert(Math.abs((await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x))-box.x-20/z.width*region.w)<.1,'loupe dragging must use the frozen source coordinate transform');
  await page.locator('#undoPortrait').click();assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),before+1);
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>!PortraitDiagnostics.snapshot().building);assert.equal(await page.locator('#exportPortrait').isDisabled(),false);
  fs.mkdirSync(out,{recursive:true});const promise=page.waitForEvent('download');await page.locator('#exportPortrait').click();const download=await promise,archivePath=path.join(out,'workbench.mavatar');await download.saveAs(archivePath);
  const V=await import('../docs/avatar/vendor/mesh-avatar-0.2.1.mjs'),files=V.unpackAvatar(new Uint8Array(fs.readFileSync(archivePath))),rig=JSON.parse(Buffer.from(files['rig.json']));assert.deepEqual(V.validateAvatarFiles(files),[]);assert.equal(rig.portrait.motion.mouthScale,.4);assert.equal(rig.portrait.motion.gazeStrength,0);
  await page.reload();await page.waitForFunction(()=>IllustratedAvatar.portrait?.id==='v11-local'&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
  assert.equal(await page.locator('#portraitMouthScale').inputValue(),'0.4');assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().applied.mouth.x),before+1);
  await preview('neutral');await page.locator('#meshCanvas').screenshot({path:path.join(out,'neutral.png')});await preview('mouth-open');await page.locator('#meshCanvas').screenshot({path:path.join(out,'restrained-mouth.png')});await preview('blink');await page.locator('#meshCanvas').screenshot({path:path.join(out,'blink.png')});
  await page.locator('#resetPortraitMotion').click();await slider('turnStrength',.6);
  const geometry=[];
  for(const [yaw,pitch,roll]of [[1,1,1],[-1,1,1],[1,-1,-1],[-1,-1,-1],[1,0,0],[-1,0,0],[0,1,1],[0,-1,-1]]){
   await page.evaluate(v=>{for(const [key,value]of Object.entries(v)){const e=document.getElementById(key);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}},{yaw,pitch,roll,eyeL:1,eyeR:1,mouth:.85});await sleep(400);
   geometry.push({yaw,pitch,roll,layers:await page.evaluate(()=>IllustratedAvatar.geometry())});
  }
  fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(geometry,null,2));
  const baseStats=geometry.map(g=>g.layers.find(l=>l.name==='base'));
  for(const stats of baseStats){assert.equal(stats.flipped,0,'extreme combined turns must not fold the portrait');assert(stats.minAreaRatio>.25);}
  for(const row of geometry)for(const layer of row.layers)assert.equal(layer.flipped,0,layer.name+' must keep its orientation');
  console.log('geometry:',JSON.stringify(baseStats));
  // Dropout must release expressions gradually, then allow immediate reacquisition.
  await page.locator('#trackingProfile').selectOption('official');await page.locator('#camera').click();await page.waitForFunction(()=>AvatarDiagnostics.snapshot().mode==='camera'&&AvatarDiagnostics.snapshot().inputCount>4);
  await page.evaluate(()=>{liveFixture.mouth=.06;liveFixture.open=0;});await page.waitForFunction(()=>AvatarDiagnostics.snapshot().pose.mouth>.7);
  await page.evaluate(()=>{liveFixture.present=false;});await sleep(350);const fading=await page.evaluate(()=>AvatarDiagnostics.snapshot());assert.equal(fading.presence,'recovering');assert(fading.pose.mouth>0&&fading.pose.mouth<1);
  await sleep(550);const lost=await page.evaluate(()=>AvatarDiagnostics.snapshot());assert.equal(lost.presence,'lost');assert(lost.pose.mouth<.01&&lost.pose.eyeL>.99&&lost.pose.eyeR>.99);
  await page.evaluate(()=>{liveFixture.present=true;liveFixture.mouth=.06;});await page.waitForFunction(()=>AvatarDiagnostics.snapshot().presence==='tracking'&&AvatarDiagnostics.snapshot().pose.mouth>.7);
  await page.evaluate(()=>{liveFixture.delay=500;});await sleep(80);await page.locator('#stop').click();assert.equal(await page.evaluate(()=>closedTracks),1);
  const beforeRestart=await page.evaluate(()=>AvatarDiagnostics.snapshot().inputCount);await page.locator('#camera').click();await page.evaluate(()=>{liveFixture.delay=0;});
  await page.waitForFunction(n=>AvatarDiagnostics.snapshot().mode==='camera'&&AvatarDiagnostics.snapshot().inputCount>n+3,beforeRestart);await sleep(600);assert.equal(await page.evaluate(()=>closedTracks),1,'late inference from the previous camera session must not stop the new session');
  await page.locator('#stop').click();assert.equal(await page.evaluate(()=>closedTracks),2);
  await page.locator('#defaultArt').click();await page.waitForFunction(()=>IllustratedAvatar.ready&&!IllustratedAvatar.isPortrait);assert.equal(await page.evaluate(()=>localStorage.getItem('face-cartoon-active-portrait')),null);
  await page.locator('#importAvatar').setInputFiles(archivePath);await page.waitForFunction(()=>IllustratedAvatar.name==='workbench'&&!IllustratedAvatar.loading);assert.equal(await page.locator('#portraitMouthScale').inputValue(),'0.4');
  await slider('portraitMouthScale',.65);const importedDownload=page.waitForEvent('download');await page.locator('#exportActivePortrait').click();const savedImport=await importedDownload;const savedPath=path.join(out,'retuned.mavatar');await savedImport.saveAs(savedPath);const retuned=V.unpackAvatar(new Uint8Array(fs.readFileSync(savedPath)));assert.equal(JSON.parse(Buffer.from(retuned['rig.json'])).portrait.motion.mouthScale,.65);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.equal(paid,0);assert.deepEqual(errors,[]);
  console.log('PASS: isolated expression previews, live per-portrait settings and persistence, pixel keyboard/loupe edits, undo/redo, dirty export prevention, portable settings, reload resume, graceful face loss/reacquisition, restored sample and mobile layout.');console.log('Review images:',out);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
