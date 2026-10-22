'use strict';
// Real Cubism/Pixi rendering with a synthetic camera and solver. An optional
// AVATAR_CORE_PATH supplies a legitimately obtained Core for offline QA only;
// otherwise the real local server fetches the official hosting URL.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.AVATAR_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'avatar-live2d-'));
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function slider(page,id,value){
  await page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await page.waitForFunction(({id,value})=>Math.abs(AvatarDiagnostics.snapshot().pose[id]-value)<.015,{id,value},{timeout:20000});
  await sleep(150);
}
(async()=>{
  const server=spawn(process.env.AVATAR_PYTHON||'python',['-u','run_avatar.py','--port','18766'],{cwd:root,stdio:['ignore','pipe','pipe']});
  let browser;
  try{
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server startup timeout')),10000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',e=>{clearTimeout(t);reject(e);});});
    browser=await chromium.launch({...(process.env.AVATAR_BROWSER_PATH?{executablePath:process.env.AVATAR_BROWSER_PATH}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
    const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[],coreRequests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('core.js')||r.url().includes('core.min.js'))coreRequests.push(r.url());});
    if(process.env.AVATAR_CORE_PATH)await page.route('**/api/live2d-core.js',route=>route.fulfill({path:process.env.AVATAR_CORE_PATH,contentType:'text/javascript'}));
    await page.goto('http://127.0.0.1:18766/avatar/');
    await page.waitForFunction(()=>IllustratedAvatar.active);
    assert.equal(coreRequests.length,0,'reference dependencies must be lazy');
    await page.locator('#compareLive2d').check();
    await page.waitForFunction(()=>Live2DReference.ready&&Live2DReference.frames>2,null,{timeout:50000});
    assert.equal(coreRequests.length,1);
    assert(await page.evaluate(()=>Live2DReference.snapshot().physics),'real Cubism physics must remain active');
    await page.locator('#comparisonStage').screenshot({path:path.join(out,'compare-neutral.png')});
    for(const [name,id,value]of [['left','yaw',-.8],['right','yaw',.8],['up','pitch',-.7],['down','pitch',.7],['wink','eyeL',0],['mouth','mouth',.8],['tilt','roll',.6]]){
      await slider(page,id,value);
      await page.waitForFunction(({id,value})=>{
        const d=AvatarDiagnostics.snapshot(),p=d.reference.parameters;
        const actual=id==='yaw'?p.ParamAngleX/30:id==='pitch'?-p.ParamAngleY/30:id==='roll'?-p.ParamAngleZ/30:id==='eyeL'?p.ParamEyeROpen:p.ParamMouthOpenY;
        return Math.abs(actual-value)<.02;
      },{id,value},{timeout:20000});
      await page.locator('#comparisonStage').screenshot({path:path.join(out,'compare-'+name+'.png')});
      await slider(page,id,id==='eyeL'?1:0);
    }
    const beforePause=await page.evaluate(()=>Live2DReference.frames);
    await page.locator('#compareLive2d').uncheck();await sleep(400);
    const paused=await page.evaluate(()=>Live2DReference.frames);assert(paused-beforePause<=2);
    await sleep(400);assert.equal(await page.evaluate(()=>Live2DReference.frames),paused);
    await page.locator('#compareLive2d').check();await sleep(200);assert.equal(coreRequests.length,1,'reopening must reuse the same model');
    // A single fake camera, tracker and solve feed both real renderers.
    await page.evaluate(()=>{
      window.camStats={acquire:0,instances:0,sends:0,solves:0};
      window.facePacket={head:{x:.05,y:.2,z:.1,degrees:{x:3,y:12,z:6}},eye:{l:1,r:0},pupil:{x:.4,y:-.2},mouth:{x:.2,y:.7,shape:{O:.2}},brow:.1};
      const points=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
      window.FaceMesh=class{constructor(){camStats.instances++;}setOptions(){}onResults(fn){this.fn=fn;}async send(){camStats.sends++;this.fn({multiFaceLandmarks:facePacket?[points]:[]});}};
      Kalidokit.Face.solve=()=>{camStats.solves++;return structuredClone(facePacket);};
      const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');let t=0;
      const timer=setInterval(()=>{g.fillStyle=t++%2?'#bbb':'#ccc';g.fillRect(0,0,640,480);},33);
      navigator.mediaDevices.getUserMedia=async()=>{camStats.acquire++;return c.captureStream(30);};
      window.addEventListener('pagehide',()=>clearInterval(timer));
    });
    await page.click('#camera');
    await page.waitForFunction(()=>{const d=AvatarDiagnostics.snapshot();return d.inputCount>3&&d.pose.eyeL<.015&&d.reference.parameters.ParamMouthOpenY>.68;},null,{timeout:20000});
    const shared=await page.evaluate(()=>({d:AvatarDiagnostics.snapshot(),c:camStats}));
    assert.equal(shared.c.acquire,1);assert.equal(shared.c.instances,1);assert(shared.c.sends-shared.c.solves<=1);
    assert.equal(shared.d.profile,'official');assert.equal(shared.d.calibrating,false);
    assert(Math.abs(shared.d.mesh.angleX-12)<.1);assert(Math.abs(shared.d.reference.parameters.ParamAngleX-12)<.1);
    assert(Math.abs(shared.d.mesh.bodyAngleX-shared.d.reference.parameters.ParamBodyAngleX)<.02);
    assert(Math.abs(shared.d.mesh.angleZ+shared.d.reference.parameters.ParamAngleZ)<.02,'renderer roll axes must adapt their signs');
    assert(Math.abs(shared.d.mesh.bodyAngleZ+shared.d.reference.parameters.ParamBodyAngleZ)<.02);
    assert(shared.d.reference.sequence<=shared.d.sequence);assert(shared.d.reference.parameters.ParamEyeLOpen>.98);
    assert(await page.locator('#calibrate').isDisabled());assert(await page.locator('#eyeGain').isDisabled());
    await page.locator('#comparisonStage').screenshot({path:path.join(out,'compare-shared-input.png')});
    const downloadPromise=page.waitForEvent('download');
    await page.locator('summary').filter({hasText:'动作诊断'}).click();await page.click('#saveDiagnostics');
    const download=await downloadPromise;await download.saveAs(path.join(out,'diagnostics.json'));
    const diagnostic=JSON.parse(fs.readFileSync(path.join(out,'diagnostics.json')));assert.equal(diagnostic.version,5);assert(!JSON.stringify(diagnostic).includes('data:image'));
    await page.evaluate(()=>{facePacket=null;});
    await page.waitForFunction(()=>Math.abs(AvatarDiagnostics.snapshot().pose.yaw)<.02,null,{timeout:20000});
    await page.click('#stop');assert(await page.locator('#capture').isDisabled());
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'compare-mobile.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    // A reference dependency failure leaves the main illustration usable.
    const failed=await browser.newPage();
    await failed.route('**/api/live2d-core.js',route=>route.abort());await failed.route('https://cubism.live2d.com/**',route=>route.abort());
    await failed.goto('http://127.0.0.1:18766/avatar/');await failed.waitForFunction(()=>IllustratedAvatar.active);
    await failed.locator('#compareLive2d').check();await failed.waitForFunction(()=>document.querySelector('#referenceStatus').textContent.includes('未就绪'));
    assert(await failed.evaluate(()=>IllustratedAvatar.active));assert.equal(await failed.evaluate(()=>Live2DReference.ready),false);
    await failed.unroute('**/api/live2d-core.js');
    if(process.env.AVATAR_CORE_PATH)await failed.route('**/api/live2d-core.js',route=>route.fulfill({path:process.env.AVATAR_CORE_PATH,contentType:'text/javascript'}));
    await failed.locator('summary').filter({hasText:'对照加载与重试'}).click();await failed.click('#retryReference');
    await failed.waitForFunction(()=>Live2DReference.ready,null,{timeout:50000});
    assert(await failed.evaluate(()=>IllustratedAvatar.active));
    console.log('PASS: genuine Cubism rendering and physics, shared head/body/eye/mouth mapping, lazy load and pause, one camera/tracker/solve, neutral on face loss, numeric diagnostics, mobile layout, failure isolation and retry.');
    console.log('Review images:',out);
  }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
