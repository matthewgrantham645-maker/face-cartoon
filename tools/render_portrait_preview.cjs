'use strict';
// Record only the repository-owned example. This is renderer output, not camera footage.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=18776,frames=fs.mkdtempSync(path.join(os.tmpdir(),'portrait-preview-'));
const output=path.resolve(process.argv[2]||path.join(root,'docs/avatar/portrait-v11-preview.webm'));
(async()=>{
 const server=spawn(process.env.PYTHON||'python',['-u','run_avatar.py','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),8000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/api/status',r=>r.fulfill({json:{configured:false,selfie:false}}));
  await page.goto(`http://127.0.0.1:${port}/avatar/`);await page.waitForFunction(()=>IllustratedAvatar.ready);
  await page.evaluate(async()=>{
   const R=await import('/avatar/portrait-rig.mjs?v=11'),P=await import('/avatar/portrait-motion.mjs?v=11'),image=new Image();image.src='/avatar/character/source.png';await image.decode();
   const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);const source=await R.decodePortrait(c.toDataURL()),w=source.width,h=source.height;
   const binding={version:1,width:w,height:h,method:'manual',head:{x:.24*w,y:.19*h,w:.55*w,h:.56*h},eye0:{x:.392*w,y:.427*h,w:.076*w,h:.026*h},eye1:{x:.562*w,y:.427*h,w:.076*w,h:.026*h},mouth:{x:.442*w,y:.603*h,w:.126*w,h:.028*h}};
   const built=await R.buildPortrait(source,binding,'本仓库插画 · 第十一版');if(!await IllustratedAvatar.load(new Blob([built.archive]),'本仓库插画 · 第十一版',{id:'preview'}))throw Error(IllustratedAvatar.lastError);
   window.previewTime=0;AvatarControls.preview('录制预览',()=>P.previewPose('loop',previewTime));
  });
  for(let i=0;i<80;i++){
   await page.evaluate(t=>{previewTime=t;},i/10);await new Promise(r=>setTimeout(r,100));
   const data=await page.locator('#meshCanvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]);fs.writeFileSync(path.join(frames,String(i).padStart(3,'0')+'.png'),Buffer.from(data,'base64'));
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});
  execFileSync(process.env.FFMPEG||'ffmpeg',['-y','-loglevel','error','-framerate','10','-i',path.join(frames,'%03d.png'),'-vf','scale=360:-2:flags=lanczos','-c:v','libvpx-vp9','-b:v','0','-crf','32','-pix_fmt','yuv420p','-an',output]);
  console.log('Saved real renderer preview:',output,fs.statSync(output).size,'bytes');
 }finally{await browser?.close();server.kill();fs.rmSync(frames,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
