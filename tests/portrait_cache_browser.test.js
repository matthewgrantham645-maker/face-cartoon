'use strict';
// Regression: an old cached renderer has update() but no load(), while the
// current binding UI is already visible. No image-generation requests occur.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=18773;
(async()=>{
 const server=spawn(process.env.PYTHON||'python',['-u','run_avatar.py','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),8000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let oldRequests=0,newRequests=0,paid=0;
  const oldRenderer=fs.readFileSync(path.join(root,'docs/avatar/illustrated.mjs'),'utf8').replace('state.load=load;','');
  await page.route('**/avatar/illustrated.mjs*',r=>{
   const u=new URL(r.request().url());if(!u.search){oldRequests++;return r.fulfill({body:oldRenderer,contentType:'text/javascript',headers:{'Cache-Control':'max-age=86400'}});}
   newRequests++;return r.continue();
  });
  await page.route('**/api/status',r=>r.fulfill({json:{configured:false,selfie:false}}));
  await page.route('**/api/selfie',r=>{paid++;return r.fulfill({status:500,json:{error:'must not call'}});});
  await page.addInitScript(()=>{window.FaceMesh=class{setOptions(){}onResults(f){this.f=f;}async send(){this.f({multiFaceLandmarks:[]});}};});
  await page.goto(`http://127.0.0.1:${port}/home/`);
  assert.equal(await page.evaluate(async()=>{const s=await (await fetch('/avatar/illustrated.mjs',{cache:'force-cache'})).text();return s.includes('state.load=load;');}),false);
  await page.goto(`http://127.0.0.1:${port}/avatar/`);await page.waitForFunction(()=>IllustratedAvatar.active);
  assert.equal(await page.evaluate(()=>typeof IllustratedAvatar.load),'function');assert.equal(oldRequests,1);assert.equal(newRequests,1);
  const before=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL());
  // A visible marker distinguishes the imported picture from the default artwork.
  const data=await page.evaluate(async()=>{const img=new Image();img.src='/avatar/character/source.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.fillStyle='#1c73b4';x.fillRect(15,15,250,90);return c.toDataURL('image/png');});
  const file={name:'after-cache.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')};
  await page.locator('#importAvatar').setInputFiles(file);await page.waitForFunction(()=>PortraitDiagnostics.snapshot().binding&&!PortraitDiagnostics.snapshot().detecting);
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>IllustratedAvatar.name==='after-cache'&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
  assert.equal(await page.locator('#exportPortrait').isDisabled(),false);assert.notEqual(await page.locator('#meshCanvas').evaluate(c=>c.toDataURL()),before);
  // Reproduce an already-open mixed-version page and exercise lossless recovery.
  await page.evaluate(()=>{IllustratedAvatar.load=undefined;});
  await page.locator('#portraitFeature').selectOption('mouth');
  await page.locator('#portraitX').evaluate(el=>{el.value='447';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const edited=await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x);
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>document.querySelector('#portraitActionStatus').textContent.includes('版本不一致'),{timeout:10000});
  assert.equal(await page.locator('#retryPortraitVersion').isVisible(),true);
  assert.equal(await page.evaluate(()=>IllustratedAvatar.name),'after-cache');
  await page.locator('#retryPortraitVersion').click();await page.waitForURL('**/avatar/?portrait=*&v=8.1');
  await page.waitForFunction(()=>PortraitDiagnostics.snapshot().binding&&IllustratedAvatar.ready);
  assert.equal(await page.evaluate(()=>PortraitDiagnostics.snapshot().binding.mouth.x),edited);
  assert.equal(await page.evaluate(()=>typeof IllustratedAvatar.load),'function');
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>IllustratedAvatar.name==='after-cache'&&!PortraitDiagnostics.snapshot().building,{timeout:30000});
  assert.equal(await page.locator('#exportPortrait').isDisabled(),false);
  // A renderer that is still loading must be awaited, rather than rejected.
  await page.evaluate(()=>{const load=IllustratedAvatar.load;IllustratedAvatar.load=undefined;setTimeout(()=>{IllustratedAvatar.load=load;dispatchEvent(new Event('avatar-renderer-ready'));},500);});
  await page.locator('#applyPortrait').click();await page.waitForFunction(()=>!PortraitDiagnostics.snapshot().building);
  assert.ok((await page.locator('#portraitActionStatus').textContent()).includes('已应用'));
  assert.equal(await page.locator('#retryPortraitVersion').isHidden(),true);assert.equal(paid,0);assert.deepEqual(errors,[]);
  console.log('PASS: versioned renderer bypasses stale cache, role image changes and export enables, missing load() produces visible recovery, saved binding survives refresh, delayed readiness is awaited, zero paid requests.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
