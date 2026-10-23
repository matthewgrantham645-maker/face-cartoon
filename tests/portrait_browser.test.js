'use strict';
// Browser integration; camera landmarks and image API are fixtures, real WebGL renders.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=18772,out=process.env.AVATAR_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'portrait-v8-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fixture='data:image/png;base64,'+fs.readFileSync(path.join(root,'docs/avatar/character/source.png')).toString('base64');
(async()=>{
  const server=spawn(process.env.PYTHON||'python',['-u','run_avatar.py','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;
  try{
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),8000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',reject);});
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
    const context=await browser.newContext({viewport:{width:1360,height:1000}}),page=await context.newPage(),errors=[];let paid=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/status',r=>r.fulfill({json:{configured:false,selfie:true}}));
    await page.route('**/api/selfie',r=>{paid++;return r.fulfill({json:{image:fixture}});});
    await page.addInitScript(()=>{
      window.fakeFace={open:1,mouth:.002,yaw:0};window.cameraCalls=0;window.captureClosed=0;
      function points(){
        const p=Array.from({length:478},()=>({x:.5,y:.5,z:0})),f=window.fakeFace,set=(i,x,y)=>p[i]={x,y,z:0};
        for(const[i,x,y]of [[234,.31,.46],[454,.71,.46],[10,.5,.30],[152,.5,.72],[61,.45,.617],[291,.56,.617],[13,.5,.617-f.mouth/2],[14,.5,.617+f.mouth/2],[334,.62,.37],[105,.42,.37]])set(i,x,y);
        for(const [corner0,corner1,tops,bots,xs]of [[33,133,[160,159,158],[144,145,153],[.405,.430,.455]],[362,263,[385,386,387],[380,374,373],[.575,.600,.625]]]){
          set(corner0,xs[0]-.013,.44);set(corner1,xs[2]+.013,.44);
          for(let i=0;i<3;i++){set(tops[i],xs[i],.44-.013*f.open);set(bots[i],xs[i],.44+.013*f.open);}
        }
        // Calibration uses outer landmark 130 too.
        set(130,.392,.44);return p;
      }
      window.FaceMesh=class{setOptions(){}onResults(fn){this.fn=fn;}async send(){this.fn({multiFaceLandmarks:[points()]});}};
      navigator.mediaDevices.getUserMedia=async()=>{
        window.cameraCalls++;const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');let n=0;
        const timer=setInterval(()=>{x.fillStyle=n++%2?'#ccc':'#bbb';x.fillRect(0,0,640,480);},33);const s=c.captureStream(30);s.getTracks().forEach(t=>{const stop=t.stop.bind(t);t.stop=()=>{clearInterval(timer);window.captureClosed++;stop();};});return s;
      };
    });
    await page.goto(`http://127.0.0.1:${port}/selfie/`);
    await page.locator('#upload').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(fixture.split(',')[1],'base64')});
    await page.waitForFunction(()=>!document.querySelector('#generate').disabled);await page.locator('#generate').click();
    await page.waitForFunction(()=>!document.querySelector('#useForTracking').disabled);
    await page.locator('#useForTracking').click();await page.waitForURL('**/avatar/?portrait=*');
    await page.waitForFunction(()=>window.PortraitDiagnostics?.snapshot().binding&&!window.PortraitDiagnostics.snapshot().detecting);
    assert.equal(await page.evaluate(()=>window.cameraCalls),0,'handoff must not request camera');assert.equal(paid,1,'handoff must not regenerate');
    assert.equal(await page.locator('.portrait-gallery button').count(),1);
    assert.equal((await page.evaluate(()=>PortraitDiagnostics.snapshot())).binding.method,'detected');
    await page.waitForFunction(()=>window.IllustratedAvatar?.ready);
    await page.locator('#applyPortrait').click();
    await page.waitForFunction(()=>IllustratedAvatar.portrait&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
    assert.ok(await page.evaluate(()=>IllustratedAvatar.active));assert.equal(await page.locator('#renderMode').inputValue(),'illustration');
    assert.ok((await page.locator('#origin').textContent()).includes('赛璐璐立绘'));
    await page.locator('#meshCanvas').screenshot({path:path.join(out,'neutral.png')});
    const neutral=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());
    async function slider(id,v){await page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(v));await sleep(300);}
    await slider('eyeL',0);await slider('eyeR',0);
    const blink=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());assert.notEqual(blink,neutral,'imported eye texture must respond');
    await page.locator('#meshCanvas').screenshot({path:path.join(out,'blink.png')});
    await slider('eyeL',1);await slider('eyeR',1);await slider('mouth',1);
    const mouth=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());assert.notEqual(mouth,neutral,'imported mouth must respond');
    await page.locator('#meshCanvas').screenshot({path:path.join(out,'mouth.png')});await slider('mouth',0);await slider('yaw',1);
    const turn=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());assert.notEqual(turn,neutral);await slider('yaw',0);
    await page.locator('#meshCanvas').screenshot({path:path.join(out,'turn-reset.png')});
    // Real camera path feeds the imported renderer, with synthetic landmarks.
    await page.selectOption('#trackingProfile','calibrated');await page.locator('#camera').click();
    await page.waitForFunction(()=>AvatarDiagnostics.snapshot().mode==='camera'&&!AvatarDiagnostics.snapshot().calibrating,{timeout:15000});
    await page.evaluate(()=>{fakeFace.open=0;fakeFace.mouth=.06;});await sleep(650);
    const motion=await page.evaluate(()=>AvatarDiagnostics.snapshot());assert.ok(motion.pose.eyeL<.1);assert.ok(motion.pose.mouth>.6);assert.ok(await page.evaluate(()=>IllustratedAvatar.portrait&&IllustratedAvatar.active));
    await page.locator('#stop').click();assert.equal(await page.evaluate(()=>window.captureClosed),1);
    // Save/restore edited binding. Also verify portable archive keeps the picture.
    await page.selectOption('#portraitFeature','mouth');await slider('portraitX',450);await page.locator('#applyPortrait').click();
    await page.waitForFunction(()=>!PortraitDiagnostics.snapshot().building);const saved=await page.evaluate(()=>PortraitDiagnostics.snapshot().applied.mouth.x);
    const downloadPromise=page.waitForEvent('download');await page.locator('#exportPortrait').click();const download=await downloadPromise;const archivePath=path.join(out,'portrait.mavatar');await download.saveAs(archivePath);
    const V=await import('../docs/avatar/vendor/mesh-avatar-0.2.1.mjs'),files=V.unpackAvatar(new Uint8Array(fs.readFileSync(archivePath)));assert.deepEqual(V.validateAvatarFiles(files),[]);assert.ok(files['source.png'].length>10000);
    await page.reload();await page.waitForFunction(()=>PortraitDiagnostics.snapshot().binding);
    assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),saved);assert.equal(await page.evaluate(()=>window.cameraCalls),0);
    await page.locator('#cancelPortrait').click();await page.locator('#importAvatar').setInputFiles({name:'roundtrip.mavatar',mimeType:'application/zip',buffer:fs.readFileSync(archivePath)});
    await page.waitForFunction(()=>IllustratedAvatar.name==='roundtrip'&&!IllustratedAvatar.loading);
    assert.ok(await page.evaluate(()=>IllustratedAvatar.active));
    // Import a normal downloaded image through the same role-import control.
    await page.locator('#importAvatar').setInputFiles({name:'local.png',mimeType:'image/png',buffer:Buffer.from(fixture.split(',')[1],'base64')});
    await page.waitForFunction(()=>PortraitDiagnostics.snapshot().name==='local'&&!PortraitDiagnostics.snapshot().detecting);
    await page.locator('#applyPortrait').click();await page.waitForFunction(()=>IllustratedAvatar.name==='local'&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
    const activeName=await page.evaluate(()=>IllustratedAvatar.name);
    await page.locator('#importAvatar').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('bad')});await page.waitForFunction(()=>document.querySelector('#meshStatus').textContent.includes('图片导入失败'));
    assert.equal(await page.evaluate(()=>IllustratedAvatar.name),activeName);
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.equal(paid,1);
    // Failure to detect a stylized face must leave editable boxes, not throw or replace active art.
    await page.evaluate(()=>{AvatarPortraitDetector.detect=async()=>null;});
    await page.locator('#detectPortrait').click();await page.waitForFunction(()=>document.querySelector('#portraitStatus').textContent.includes('未能可靠'));
    assert.equal(await page.evaluate(()=>IllustratedAvatar.name),'local');
    console.log('PASS: generation-to-tracking handoff, generated gallery, auto and manual binding, real WebGL blink/mouth/turn, simulated webcam driving imported image, saved binding, archive export and import, PNG import, invalid file retention and mobile layout.');console.log('Review images:',out);
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
