import {decodePortrait,defaultBinding,normalizeBinding,bindingFromLandmarks,buildPortrait} from './portrait-rig.mjs?v=10';
const $=id=>document.getElementById(id),Store=window.PortraitStore;
let source=null,binding=null,record=null,name='',revision=0,edited=0,building=false,detecting=false,queuedDetection=0,drag=null,archive=null,appliedBinding=null,clickPoints=null;
const colors={head:'#ad70ed',eye0:'#2879ef',eye1:'#17a485',mouth:'#e86e49'};
const labels={head:'头部',eye0:'画面左眼',eye1:'画面右眼',mouth:'嘴部'};
const say=text=>{ $('portraitStatus').textContent=text; $('portraitActionStatus').textContent=text; };
async function rendererReady(){
  if(typeof window.IllustratedAvatar?.load==='function'&&window.IllustratedAvatar.apiVersion>=2)return window.IllustratedAvatar;
  return new Promise((resolve,reject)=>{
    let poll,timer;
    const cleanup=()=>{clearInterval(poll);clearTimeout(timer);window.removeEventListener('avatar-renderer-ready',check);};
    const check=()=>{if(typeof window.IllustratedAvatar?.load==='function'&&window.IllustratedAvatar.apiVersion>=2){cleanup();resolve(window.IllustratedAvatar);}};
    window.addEventListener('avatar-renderer-ready',check);poll=setInterval(check,50);
    timer=setTimeout(()=>{cleanup();const error=Error('页面的二维渲染模块版本不一致，请保存绑定并刷新页面。');error.code='RENDERER_VERSION';reject(error);},4000);
    check();
  });
}
function sync(){
  const disabled=building||!source;
  for(const id of ['applyPortrait','quickPortrait','portraitFeature','portraitX','portraitY','portraitWidth','portraitHeight'])$(id).disabled=disabled;
  $('detectPortrait').disabled=disabled||detecting;
  $('applyPortrait').textContent=building?'正在生成绑定…':'确认绑定并用于面捕';
  $('exportPortrait').disabled=!archive||!window.IllustratedAvatar?.portrait||window.IllustratedAvatar.portrait.id!==record?.id;
}
function syncFields(){if(!binding||!source)return;const b=binding[$('portraitFeature').value];$('portraitX').value=b.x/source.width*1000;$('portraitY').value=b.y/source.height*1000;$('portraitWidth').value=b.w/source.width*1000;$('portraitHeight').value=b.h/source.height*1000;sync();}
function draw(){
  if(!source)return;const c=$('portraitEditorCanvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);
  const scale=source.width/600,selected=$('portraitFeature').value;
  for(const key of ['head','eye0','eye1','mouth']){const b=binding[key];ctx.strokeStyle=colors[key];ctx.fillStyle=colors[key];ctx.lineWidth=(key===selected?2.6:1.4)*scale;ctx.setLineDash(key==='head'?[7*scale,5*scale]:[]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);ctx.font=`${12*scale}px sans-serif`;ctx.fillText(labels[key],b.x,Math.max(14*scale,b.y-5*scale));ctx.fillRect(b.x+b.w-4*scale,b.y+b.h-4*scale,8*scale,8*scale);}
}
function changeBox(key,next){
  const old=binding[key],b={...old,...next};b.w=Math.max(4,Math.min(source.width,b.w));b.h=Math.max(4,Math.min(source.height,b.h));b.x=Math.max(0,Math.min(source.width-b.w,b.x));b.y=Math.max(0,Math.min(source.height-b.h,b.y));
  if(old.contour)b.contour=old.contour.map(([x,y])=>[b.x+(x-old.x)/old.w*b.w,b.y+(y-old.y)/old.h*b.h]);binding[key]=b;binding.method='manual';edited++;draw();syncFields();
}
async function showRecord(shot,{auto=true}={}){
  if(building)return;const token=++revision;edited=0;source=null;binding=null;archive=null;appliedBinding=null;record=shot;name=shot.styleName||shot.sourceName||'我的图片';clickPoints=null;sync();
  $('portraitEditor').hidden=false;$('retryPortraitVersion').hidden=true;$('portraitTitle').textContent='确认五官 · '+name;say('正在准备图片…');
  try{
    const image=await decodePortrait(shot.result);if(token!==revision)return;source=image;
    try{binding=shot.portraitBinding?normalizeBinding(shot.portraitBinding,image.width,image.height):defaultBinding(image.width,image.height);}catch{binding=defaultBinding(image.width,image.height);}
    const c=$('portraitEditorCanvas');c.width=image.width;c.height=image.height;syncFields();draw();
    say(shot.portraitBinding?'已恢复这张图片保存的绑定。确认后可直接用于面捕。':'请检查五官框；未识别到时可拖动校正。');
    if(auto&&!shot.portraitBinding)detect();
  }catch(error){if(token===revision){source=null;binding=null;say('图片无法导入：'+error.message);sync();}}
}
async function detect(){
  if(!source||building)return;if(detecting){queuedDetection=revision;return;}const token=revision,editAt=edited,image=source;detecting=true;clickPoints=null;sync();
  try{
    let found=null;
    const head=binding.head,pad=head.w*.08,x=Math.max(0,Math.floor(head.x-pad)),y=Math.max(0,Math.floor(head.y-pad)),w=Math.min(image.width-x,Math.ceil(head.w+pad*2)),h=Math.min(image.height-y,Math.ceil(head.h+pad*2));
    for(let pass=0;pass<3&&!found;pass++){
      if(token!==revision||editAt!==edited)return;
      say('正在定位五官（'+(pass+1)+'/3）：'+['完整图片','头部裁切','增强头部对比'][pass]+'。无需开启摄像头。');
      let input=image;
      if(pass){input=document.createElement('canvas');input.width=Math.max(256,w);input.height=Math.round(h*input.width/w);const ctx=input.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,input.width,input.height);
        if(pass===2){const data=ctx.getImageData(0,0,input.width,input.height),p=data.data,hist=new Uint32Array(256);for(let i=0;i<p.length;i+=4)hist[Math.round(p[i]*.3+p[i+1]*.59+p[i+2]*.11)]++;let total=0,lo=0,hi=255;for(let i=0;i<256;i++){total+=hist[i];if(total<p.length/4*.02)lo=i;if(total<p.length/4*.98)hi=i;}for(let i=0;i<p.length;i+=4){const v=Math.max(0,Math.min(255,((p[i]*.3+p[i+1]*.59+p[i+2]*.11)-lo)*255/Math.max(1,hi-lo)));p[i]=p[i+1]=p[i+2]=v;}ctx.putImageData(data,0,0);}}
      let points=await window.AvatarPortraitDetector.detect(input);
      if(pass&&points)points=points.map(p=>({...p,x:(x+p.x*w)/image.width,y:(y+p.y*h)/image.height}));
      found=bindingFromLandmarks(points,image.width,image.height);
    }
    if(token!==revision||editAt!==edited)return;
    if(!found){say('三次尝试仍未能可靠识别人脸，原来的框没有改变。可点“三点快速标定”，依次点左眼、右眼和嘴，再确认绑定。');return;}
    binding=found;syncFields();draw();
    if(window.IllustratedAvatar?.portrait?.id===record?.id){detecting=false;await apply();}
    else say('已定位并更新预览框，尚未应用。确认位置后点击“确认绑定并用于面捕”。');
  }catch(error){if(token===revision&&editAt===edited)say('自动定位不可用：'+error.message+' 可改用“三点快速标定”。');}
  finally{detecting=false;sync();if(queuedDetection===revision&&edited===0&&!$('portraitEditor').hidden){queuedDetection=0;detect();}}
}
async function apply(){
  if(!source||building)return;let valid;try{valid=normalizeBinding(binding,source.width,source.height);}catch(error){say(error.message);return;}
  const token=revision,shot=record;edited++;building=true;sync();$('retryPortraitVersion').hidden=true;say('正在检查二维渲染器…');
  try{
    const renderer=await rendererReady();
    say('正在从这张图片构建眼睛纹理与变形网格…');
    const built=await buildPortrait(source,valid,name);if(token!==revision)return;
    const ok=await renderer.load(new Blob([built.archive],{type:'application/zip'}),name,{id:shot.id,method:valid.method,binding:built.binding});
    if(!ok)throw Error(renderer.lastError||'渲染器加载失败，请查看二维角色状态。');
    archive=built.archive;appliedBinding=built.binding;binding=built.binding;
    try{if(!await Store.saveBinding(shot.id,built.binding))throw Error();say('已应用到左侧角色。先点“自动演示”查看效果，再开启面捕；这张图片的绑定已保存。');}
    catch{say('已应用到左侧角色，可以面捕。本地记录未能保存，请导出 .mavatar 留存。');}
    draw();
  }catch(error){
    $('retryPortraitVersion').hidden=error.code!=='RENDERER_VERSION';
    say('绑定未完成：'+error.message+(error.code==='RENDERER_VERSION'?' 五官位置无需重新调整。':' 请检查提示后重试。'));
  }
  finally{building=false;sync();}
}
async function gallery(){
  $('portraitLibrary').hidden=false;$('portraitLibraryStatus').textContent='正在读取生成记录…';
  try{
    const shots=await Store.list();$('portraitGallery').replaceChildren();
    for(const shot of shots){const b=document.createElement('button'),img=document.createElement('img'),text=document.createElement('span');b.type='button';b.dataset.portraitId=shot.id;b.setAttribute('aria-pressed',String(shot.id===record?.id));img.src=shot.result;img.alt=shot.styleName||'已生成形象';img.loading='lazy';text.textContent=shot.styleName||'已生成形象';b.append(img,text);b.onclick=()=>{if(building)return;showRecord(shot);$('portraitGallery').querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));};$('portraitGallery').append(b);}
    $('portraitLibraryStatus').textContent=shots.length?'选择一张图片，确认五官位置后应用。':'还没有找到生成记录。请在同一个浏览器、同一个地址下生成图片，或直接导入本地 PNG / JPG。';
  }catch(error){$('portraitLibraryStatus').textContent='无法读取生成记录，可下载图片后直接导入。';}
}
async function importFile(file){
  if(building||!file)return;
  if(file.size>12*1024*1024){$('meshStatus').textContent='请选择小于 12 MB 的 PNG、JPG 或 WebP。';return;}
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)&&!(!file.type&&/\.(png|jpe?g|webp)$/i.test(file.name))){$('meshStatus').textContent='请选择 PNG、JPG、WebP 图片，或 .mavatar 角色。';return;}
  const url=URL.createObjectURL(file);
  try{
    const decoded=await decodePortrait(url),data=decoded.toDataURL('image/png');
    await showRecord({id:crypto.randomUUID?crypto.randomUUID():'portrait-'+Date.now(),created:Date.now(),original:data,result:data,sourceName:file.name,sourceKind:'local',styleName:file.name.replace(/\.[^.]+$/,'')});
    // Persist only after successful image decode; no image is sent to the server.
    try{await Store.put(record);}catch{}
  }catch(error){$('meshStatus').textContent='图片导入失败：'+error.message;}
  finally{URL.revokeObjectURL(url);}
}
$('quickPortrait').onclick=()=>{if(!source||building)return;edited++;clickPoints=[];say('请在预览图中点击画面左侧眼睛的中心（第 1/3 点）。');};
$('pickPortrait').onclick=gallery;$('refreshPortraits').onclick=gallery;$('detectPortrait').onclick=detect;$('applyPortrait').onclick=apply;
$('retryPortraitVersion').onclick=async()=>{
  if(!record||!source||building)return;
  try{
    const saved=normalizeBinding(binding,source.width,source.height);
    if(!await Store.saveBinding(record.id,saved))await Store.put({...record,portraitBinding:saved});
    const url=new URL(location.href);url.searchParams.set('portrait',record.id);url.searchParams.set('v','10');location.replace(url.href);
  }catch(error){say('未能保存绑定，暂未刷新。请保留当前页面，稍后重试：'+error.message);}
};
$('cancelPortrait').onclick=()=>{if(building)return;revision++;$('portraitEditor').hidden=true;};
$('portraitFeature').onchange=()=>{syncFields();draw();};
for(const [id,key,axis]of [['portraitX','x','width'],['portraitY','y','height'],['portraitWidth','w','width'],['portraitHeight','h','height']])$(id).oninput=()=>{if(!source||building)return;changeBox($('portraitFeature').value,{[key]:Number($(id).value)/1000*source[axis]});};
const editor=$('portraitEditorCanvas');
function point(event){const r=editor.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*editor.width,y:(event.clientY-r.top)/r.height*editor.height};}
editor.addEventListener('pointerdown',e=>{
  if(!source||building)return;const p=point(e);
  if(clickPoints){clickPoints.push(p);e.preventDefault();if(clickPoints.length<3){say(clickPoints.length===1?'请点击画面右侧眼睛的中心（第 2/3 点）。':'请点击闭合嘴唇的中心（第 3/3 点）。');return;}
    const eyes=clickPoints.slice(0,2).sort((a,b)=>a.x-b.x),m=clickPoints[2],dist=eyes[1].x-eyes[0].x;clickPoints=null;
    if(dist<source.width*.04||m.y<=Math.max(eyes[0].y,eyes[1].y)){say('标定点位置不合理，请重新点击三点快速标定。');return;}
    eyes.forEach((v,i)=>{binding['eye'+i]={x:v.x-dist*.23,y:v.y-dist*.055,w:dist*.46,h:dist*.11};});binding.mouth={x:m.x-dist*.4,y:m.y-dist*.07,w:dist*.8,h:dist*.14};binding.method='manual';edited++;syncFields();draw();say('三点标定完成。眼框应贴合眼睛，嘴框应贴合嘴唇，确认后点击用于面捕。');return;
  }
  const hit=14*source.width/editor.getBoundingClientRect().width;
  for(const key of ['eye0','eye1','mouth','head']){const b=binding[key],resize=Math.abs(p.x-b.x-b.w)<hit&&Math.abs(p.y-b.y-b.h)<hit;
    if(resize||(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)){edited++;$('portraitFeature').value=key;drag={key,start:p,box:{...b},resize};editor.setPointerCapture(e.pointerId);syncFields();draw();e.preventDefault();break;}}
});
editor.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;changeBox(drag.key,drag.resize?{w:drag.box.w+dx,h:drag.box.h+dy}:{x:drag.box.x+dx,y:drag.box.y+dy});});
for(const type of ['pointerup','pointercancel','lostpointercapture'])editor.addEventListener(type,()=>{drag=null;});
editor.addEventListener('keydown',e=>{if(!source||building)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();const key=$('portraitFeature').value,b=binding[key],step=e.shiftKey?10:1;changeBox(key,{x:b.x+delta[0]*step,y:b.y+delta[1]*step});});
$('exportPortrait').onclick=()=>{if(!archive)return;const url=URL.createObjectURL(new Blob([archive],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='my-portrait.mavatar';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
window.addEventListener('avatar-import-portrait',e=>importFile(e.detail.file));
window.addEventListener('avatar-renderer-change',sync);
window.addEventListener('pagehide',()=>{revision++;});
// Read-only diagnostics used by the browser test and user bug reports.
window.PortraitDiagnostics={snapshot:()=>({id:record?.id||null,name,building,detecting,binding:binding?structuredClone(binding):null,applied:appliedBinding?structuredClone(appliedBinding):null})};
const id=new URLSearchParams(location.search).get('portrait');
if(id){gallery();Store.get(id).then(shot=>{if(shot)return showRecord(shot);$('portraitLibraryStatus').textContent='找不到这张图片，记录可能已清空。请选择其他记录或导入本地图片。';}).catch(()=>{$('portraitLibrary').hidden=false;$('portraitLibraryStatus').textContent='读取失败，请使用“导入二维角色”选择下载的图片。';});}
sync();
