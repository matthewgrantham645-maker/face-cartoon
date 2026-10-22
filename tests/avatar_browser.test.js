'use strict';
// Optional real-browser checks. Requires Playwright and an installed Chromium.
// Camera landmarks are synthetic; this does not assess real face tracking.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.AVATAR_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'avatar-review-'));
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function setSlider(page,id,value){await page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);await sleep(220);}
(async()=>{
 const server=spawn(process.env.AVATAR_PYTHON||'python',['-u','run_avatar.py','--port','18765'],{cwd:root,stdio:['ignore','pipe','pipe']});
 let browser;try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server startup timeout')),10000);server.stdout.once('data',()=>{clearTimeout(t);resolve();});server.once('error',e=>{clearTimeout(t);reject(e);});});
  browser=await chromium.launch({...(process.env.AVATAR_BROWSER_PATH?{executablePath:process.env.AVATAR_BROWSER_PATH}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:18765/avatar/');
  await page.waitForFunction(()=>window.IllustratedAvatar?.active,{timeout:20000});
  await page.screenshot({path:path.join(out,'page.png'),fullPage:true});
  for(const [name,id,value]of [['left','yaw',-1],['right','yaw',1],['blink','eyeL',0],['mouth','mouth',1]]){
   await setSlider(page,id,value);await page.locator('#meshCanvas').screenshot({path:path.join(out,name+'.png')});await setSlider(page,id,id.startsWith('eye')?1:0);
  }
  await page.locator('#celLight').check();await sleep(300);await page.locator('#meshCanvas').screenshot({path:path.join(out,'cel.png')});await page.locator('#celLight').uncheck();
  await page.selectOption('#renderMode','parameter');await assert.doesNotReject(()=>page.locator('#avatar').waitFor({state:'visible'}));
  await page.selectOption('#renderMode','illustration');await page.selectOption('#renderFPS','60');
  const R=await import(pathToFileURL(path.join(root,'docs/avatar/vendor/mesh-avatar-0.2.1.mjs')).href),files=Object.create(null),character=path.join(root,'docs/avatar/character');
  for(const name of fs.readdirSync(character,{recursive:true})){const file=path.join(character,name);if(fs.statSync(file).isFile()&&(name==='avatar.json'||name==='rig.json'||name.startsWith('built'+path.sep)))files[name.split(path.sep).join('/')]=new Uint8Array(fs.readFileSync(file));}
  const archive=Buffer.from(R.packAvatar(files));
  await page.setInputFiles('#importAvatar',{name:'round-trip.mavatar',mimeType:'application/zip',buffer:archive});
  await page.waitForFunction(()=>window.IllustratedAvatar?.ready&&!window.IllustratedAvatar.loading&&window.IllustratedAvatar.name==='round-trip');
  await page.setInputFiles('#importAvatar',{name:'invalid.mavatar',mimeType:'application/zip',buffer:Buffer.from('invalid archive')});
  await page.waitForFunction(()=>document.querySelector('#meshStatus').textContent.includes('继续保留当前角色'));
  assert(await page.evaluate(()=>window.IllustratedAvatar.active));
  const downloadPromise=page.waitForEvent('download');await page.click('#savePNG');const download=await downloadPromise;await download.saveAs(path.join(out,'export.png'));assert(fs.statSync(path.join(out,'export.png')).size>10000);
  await page.click('#demo');await sleep(500);assert.match(await page.locator('#engine').innerText(),/自动演示/);
  await page.evaluate(()=>{
   let open=1,aperture=.002;window.testFace={set:(o,a)=>{open=o;aperture=a;}};
   function points(){const p=Array.from({length:478},()=>({x:.5,y:.5,z:0})),set=(i,x,y)=>p[i]={x,y,z:0};for(const[i,x,y]of[[234,.25,.5],[454,.75,.5],[10,.5,.17],[152,.5,.86],[263,.68,.41],[362,.57,.41],[130,.32,.41],[133,.43,.41],[334,.62,.34],[105,.37,.34],[61,.43,.64],[291,.57,.64],[13,.5,.64-aperture/2],[14,.5,.64+aperture/2]])set(i,x,y);for(const[t,b,xs]of[[[387,386,385],[373,374,380],[.66,.62,.59]],[[160,159,158],[144,145,153],[.34,.37,.41]]])for(let i=0;i<3;i++){set(t[i],xs[i],.41-.02*open);set(b[i],xs[i],.41+.02*open);}return p;}
   window.FaceMesh=class{setOptions(){}onResults(fn){this.fn=fn;}async send(){this.fn({multiFaceLandmarks:[points()]});}};
   window.Kalidokit={Face:{solve:()=>({head:{x:0,y:0,z:0},pupil:{x:0,y:0},mouth:{x:0,y:0,shape:{O:0}}})}};
   const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');let t=0;const timer=setInterval(()=>{g.fillStyle=t++%2?'#bbbbbb':'#cccccc';g.fillRect(0,0,640,480);},33);
   navigator.mediaDevices.getUserMedia=async()=>c.captureStream(30);window.addEventListener('pagehide',()=>clearInterval(timer));
  });
  await page.selectOption('#trackingProfile','calibrated');await page.click('#camera');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('校准完成'),{timeout:20000});
  await page.evaluate(()=>testFace.set(0,.07));await sleep(500);assert(Number(await page.locator('#eyeL').inputValue())<.05);assert(Number(await page.locator('#mouth').inputValue())>.6);await page.click('#stop');assert(await page.locator('#capture').isDisabled());
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
  await fallback.goto('http://127.0.0.1:18765/avatar/');await fallback.waitForFunction(()=>document.querySelector('#renderMode').value==='parameter');assert(await fallback.locator('#avatar').isVisible());
  await page.evaluate(()=>document.querySelector('#meshCanvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>document.querySelector('#renderMode').value==='parameter');assert(await page.locator('#avatar').isVisible());
  console.log('PASS: real WebGL rendering, pose controls, cel lighting, local archive import and rejection, PNG export, simulated camera calibration, mobile layout, and WebGL fallback.');console.log('Review images:',out);
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
