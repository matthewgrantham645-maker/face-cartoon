import {decodePortrait,defaultBinding,normalizeBinding,bindingFromLandmarks,buildPortrait} from './portrait-rig.mjs';
const $=id=>document.getElementById(id),Store=window.PortraitStore;
let source=null,binding=null,record=null,name='',revision=0,edited=0,building=false,detecting=false,queuedDetection=0,drag=null,archive=null,appliedBinding=null;
const colors={head:'#ad70ed',eye0:'#2879ef',eye1:'#17a485',mouth:'#e86e49'};
const labels={head:'头部',eye0:'画面左眼',eye1:'画面右眼',mouth:'嘴部'};
const say=text=>$('portraitStatus').textContent=text;
function sync(){
  const disabled=building||!source;
  for(const id of ['applyPortrait','portraitFeature','portraitX','portraitY','portraitWidth','portraitHeight'])$(id).disabled=disabled;
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
  if(building)return;const token=++revision;edited=0;source=null;binding=null;archive=null;appliedBinding=null;record=shot;name=shot.styleName||shot.sourceName||'我的图片';sync();
  $('portraitEditor').hidden=false;$('portraitTitle').textContent='确认五官 · '+name;say('正在准备图片…');
  try{
    const image=await decodePortrait(shot.result);if(token!==revision)return;source=image;
    try{binding=shot.portraitBinding?normalizeBinding(shot.portraitBinding,image.width,image.height):defaultBinding(image.width,image.height);}catch{binding=defaultBinding(image.width,image.height);}
    const c=$('portraitEditorCanvas');c.width=image.width;c.height=image.height;syncFields();draw();
    say(shot.portraitBinding?'已恢复这张图片保存的绑定。确认后可直接用于面捕。':'请检查五官框；未识别到时可拖动校正。');
    if(auto&&!shot.portraitBinding)detect();
  }catch(error){if(token===revision){source=null;binding=null;say('图片无法导入：'+error.message);sync();}}
}
async function detect(){
  if(!source||building)return;if(detecting){queuedDetection=revision;return;}const token=revision,editAt=edited,image=source;detecting=true;sync();say('正在尝试自动定位五官；也可以直接拖动校正，不需要开启摄像头。');
  try{
    const points=await window.AvatarPortraitDetector.detect(image);
    if(token!==revision||editAt!==edited)return;
    const found=bindingFromLandmarks(points,image.width,image.height);
    if(!found){say('这张画风未能可靠识别人脸。请拖动眼睛、嘴部和头部框，再确认绑定。');return;}
    binding=found;syncFields();draw();say('已定位五官。请检查框是否贴合眼睛与闭合嘴唇，确认后用于面捕。');
  }catch(error){if(token===revision&&editAt===edited)say('自动定位不可用：'+error.message+' 可以直接拖动校正后使用。');}
  finally{detecting=false;sync();if(queuedDetection===revision&&edited===0&&!$('portraitEditor').hidden){queuedDetection=0;detect();}}
}
async function apply(){
  if(!source||building)return;let valid;try{valid=normalizeBinding(binding,source.width,source.height);}catch(error){say(error.message);return;}
  const token=revision,shot=record;edited++;building=true;sync();say('正在从这张图片构建眼睛纹理与变形网格…');
  try{
    const built=await buildPortrait(source,valid,name);if(token!==revision)return;
    if(!window.IllustratedAvatar?.load)throw Error('二维渲染器尚未就绪，请稍后重试。');
    const ok=await window.IllustratedAvatar.load(new Blob([built.archive],{type:'application/zip'}),name,{id:shot.id,method:valid.method,binding:built.binding});
    if(!ok)throw Error('渲染器加载失败，请查看二维角色状态。');
    archive=built.archive;appliedBinding=built.binding;binding=built.binding;
    try{if(!await Store.saveBinding(shot.id,built.binding))throw Error();say('已应用到左侧角色。先点“自动演示”查看效果，再开启面捕；这张图片的绑定已保存。');}
    catch{say('已应用到左侧角色，可以面捕。本地记录未能保存，请导出 .mavatar 留存。');}
    draw();
  }catch(error){say('绑定未完成：'+error.message+' 请检查位置后重试。');}
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
$('pickPortrait').onclick=gallery;$('refreshPortraits').onclick=gallery;$('detectPortrait').onclick=detect;$('applyPortrait').onclick=apply;
$('cancelPortrait').onclick=()=>{if(building)return;revision++;$('portraitEditor').hidden=true;};
$('portraitFeature').onchange=()=>{syncFields();draw();};
for(const [id,key,axis]of [['portraitX','x','width'],['portraitY','y','height'],['portraitWidth','w','width'],['portraitHeight','h','height']])$(id).oninput=()=>{if(!source||building)return;changeBox($('portraitFeature').value,{[key]:Number($(id).value)/1000*source[axis]});};
const editor=$('portraitEditorCanvas');
function point(event){const r=editor.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*editor.width,y:(event.clientY-r.top)/r.height*editor.height};}
editor.addEventListener('pointerdown',e=>{
  if(!source||building)return;const p=point(e),hit=14*source.width/editor.getBoundingClientRect().width;
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
