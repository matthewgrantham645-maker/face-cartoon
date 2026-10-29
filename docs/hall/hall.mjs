import {loadMeshAvatar} from '../avatar/vendor/mesh-avatar-0.2.1.mjs?v=12';
import {buildPortrait, decodePortrait, defaultBinding, bindingFromLandmarks} from '../avatar/portrait-rig.mjs?v=12';
import {normalizeMotion, portraitPose, hallPose, HALL_STATES, HALL_ONCE} from '../avatar/portrait-motion.mjs?v=12';

const $=id=>document.getElementById(id);
const canvas=$('meshCanvas'),poster=$('poster'),note=$('note'),away=$('away'),fixLink=$('fixLink');
const ACTIVE_KEY='face-cartoon-active-portrait';
const COPY={
  speak:'说话：嘴明显开合，头跟着点。',
  listen:'倾听：闭嘴，偶尔眨眼，头和眼神会摆动。',
  welcome:'欢迎：微笑并明显点头，播完回到倾听。',
  thanks:'感谢：微笑并明显低头，播完回到倾听。',
  sing:'演唱：嘴张得更大，头跟着节拍摆。',
  leave:'离开：闭眼，画面显示暂时离开。'
};
const mediaRoot='https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
let avatar=null,motion=normalizeMotion(),stateName='listen',stateStarted=0,lastDraw=0,serial=0,currentId=null;
let mesh=null,meshPromise=null,detectToken=0;

function say(text){note.textContent=text;}
function pressed(name){
  for(const button of document.querySelectorAll('[data-hall]')){
    const on=button.dataset.hall===name;
    button.setAttribute('aria-pressed',String(on));
    button.disabled=!avatar;
  }
}
function showAway(on){away.hidden=!on;}
function knownState(name){return HALL_STATES.includes(name)?name:'listen';}
function setState(name){
  stateName=knownState(name);stateStarted=performance.now();lastDraw=0;
  pressed(stateName);showAway(stateName==='leave');say(COPY[stateName]);
  const hash='#'+stateName;
  if(location.hash!==hash)history.replaceState(null,'',hash);
}
function jumpNext(){
  if(!avatar)return;
  const index=HALL_STATES.indexOf(stateName);
  setState(HALL_STATES[(index+1)%HALL_STATES.length]);
}
function remember(id){try{if(id)localStorage.setItem(ACTIVE_KEY,id);else localStorage.removeItem(ACTIVE_KEY);}catch{}}
function fix(id){
  if(!id){fixLink.hidden=true;return;}
  fixLink.hidden=false;fixLink.href='/avatar/?portrait='+encodeURIComponent(id);
}

async function mount(next,name,id){
  const previous=avatar;avatar=next;previous?.destroy();
  avatar.setAutoIdle(false);avatar.setAutoMotion(false);avatar.setSwayGain(.25);
  motion=normalizeMotion(next.package?.rig?.portrait?.motion);
  currentId=id;poster.hidden=true;
  canvas.setAttribute('aria-label',(name||'形象')+'的语音厅状态');
  pressed(stateName);if(!stateStarted)stateStarted=performance.now();
}
async function showSample(){
  const ticket=++serial;currentId=null;fix(null);remember(null);
  poster.src='../avatar/character/source.png';poster.hidden=false;say('正在打开示例形象…');
  markGallery(null);
  const next=await loadMeshAvatar(canvas,new URL('../avatar/character/',import.meta.url).href,{manual:true});
  if(ticket!==serial){next.destroy();return;}
  await mount(next,'示例形象',null);
  say('这是示例形象。选一张风格化自拍后，六个状态会作用在那张图上。'+COPY[stateName]);
}
async function mountPortrait(shot,binding,image,ticket){
  say('正在从这张图准备眼睛和嘴…');
  const source=image||await decodePortrait(shot.result);if(ticket!==serial)return;
  const built=await buildPortrait(source,binding,shot.styleName||shot.sourceName||'我的形象');if(ticket!==serial)return;
  const next=await loadMeshAvatar(canvas,new Blob([built.archive],{type:'application/zip'}),{manual:true});
  if(ticket!==serial){next.destroy();return;}
  await mount(next,shot.styleName||'我的形象',shot.id);
  try{await window.PortraitStore.saveBinding(shot.id,built.binding);}catch{}
  remember(shot.id);fix(shot.id);markGallery(shot.id);
  say((shot.styleName||'这张图')+'已换上。'+COPY[stateName]);
}
async function ensureMesh(){
  if(mesh)return mesh;
  if(meshPromise)return meshPromise;
  meshPromise=(async()=>{
    if(!window.FaceMesh)await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=mediaRoot+'face_mesh.js';script.crossOrigin='anonymous';
      const timeout=setTimeout(()=>{script.remove();reject(Error('五官定位组件下载超时。'));},30000);
      script.onload=()=>{clearTimeout(timeout);resolve();};
      script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('五官定位组件下载失败。'));};
      document.head.appendChild(script);
    });
    const created=new window.FaceMesh({locateFile:file=>mediaRoot+file});
    created.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.3,minTrackingConfidence:.3});
    mesh=created;return created;
  })();
  try{return await meshPromise;}catch(error){meshPromise=null;throw error;}
}
function detectPoints(image){
  const token=++detectToken;
  return ensureMesh().then(created=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{if(token===detectToken)reject(Error('五官定位超时。'));},15000);
    created.onResults(results=>{
      if(token!==detectToken)return;clearTimeout(timer);resolve(results.multiFaceLandmarks?.[0]||null);
    });
    created.send({image}).catch(error=>{if(token===detectToken){clearTimeout(timer);reject(error);}});
  }));
}
async function locateBinding(image){
  const direct=bindingFromLandmarks(await detectPoints(image),image.width,image.height);
  if(direct)return direct;
  const head=defaultBinding(image.width,image.height).head,pad=head.w*.08;
  const x=Math.max(0,Math.floor(head.x-pad)),y=Math.max(0,Math.floor(head.y-pad));
  const w=Math.min(image.width-x,Math.ceil(head.w+pad*2)),h=Math.min(image.height-y,Math.ceil(head.h+pad*2));
  const crop=document.createElement('canvas');crop.width=Math.max(256,w);crop.height=Math.round(h*crop.width/w);
  crop.getContext('2d').drawImage(image,x,y,w,h,0,0,crop.width,crop.height);
  let points=await detectPoints(crop);
  if(points)points=points.map(p=>({...p,x:(x+p.x*w)/image.width,y:(y+p.y*h)/image.height}));
  return bindingFromLandmarks(points,image.width,image.height);
}
async function showShot(shot){
  const ticket=++serial;if(!shot?.result)return;
  poster.src=shot.result;poster.hidden=false;markGallery(shot.id);fix(shot.id);
  try{
    const image=await decodePortrait(shot.result);if(ticket!==serial)return;
    let binding=shot.portraitBinding||null;
    if(binding){
      try{await mountPortrait(shot,binding,image,ticket);return;}
      catch(error){if(ticket!==serial)return;binding=null;say('已保存的五官位置用不了，正在重新定位…');}
    }else say('这张图还没有确认过五官，正在自动定位…');
    binding=await locateBinding(image);
    if(ticket!==serial)return;
    if(!binding){say('这张图没能定位五官。到面捕页校正后再回来。');fix(shot.id);return;}
    await mountPortrait(shot,binding,image,ticket);
  }catch(error){
    if(ticket===serial)say('这张图暂时没能用起来：'+error.message);
  }
}
function markGallery(id){
  const current=id||'';
  for(const button of $('gallery').querySelectorAll('button'))button.setAttribute('aria-pressed',String((button.dataset.id||'')===current));
}
function addShotButton(shot){
  const button=document.createElement('button');button.type='button';button.className='shot';button.dataset.id=shot.id;
  button.setAttribute('aria-pressed',String(shot.id===currentId));
  const img=document.createElement('img');img.src=shot.result;img.alt=shot.styleName||'已生成形象';
  const text=document.createElement('span');text.textContent=shot.styleName||'已生成形象';
  button.append(img,text);
  button.onclick=()=>showShot(shot);
  $('gallery').append(button);
}
async function gallery(){
  try{
    const shots=await window.PortraitStore.list();
    $('gallery').replaceChildren();
    const sample=document.createElement('button');sample.type='button';sample.className='shot';sample.dataset.id='';
    sample.setAttribute('aria-pressed',String(!currentId));
    const img=document.createElement('img');img.src='../avatar/character/source.png';img.alt='示例形象';
    const text=document.createElement('span');text.textContent='示例';
    sample.append(img,text);sample.onclick=()=>showSample();$('gallery').append(sample);
    for(const shot of shots)addShotButton(shot);
    $('libraryNote').textContent=shots.length?'点一张已生成的图，或上传本地的风格化自拍。':'还没有生成记录。可以上传一张风格化自拍，或先去照片生图。';
    return shots;
  }catch{
    $('libraryNote').textContent='读不到生成记录。可以上传一张本地图片。';
    return [];
  }
}
function schedule(){
  if(document.hidden)setTimeout(()=>tick(performance.now()),32);
  else requestAnimationFrame(tick);
}
function tick(now){
  schedule();
  if(!avatar)return;
  let name=stateName,seconds=stateStarted?(now-stateStarted)/1000:0;
  if(HALL_ONCE[name]&&seconds>=HALL_ONCE[name]){setState('listen');name='listen';seconds=0;}
  const elapsed=lastDraw?now-lastDraw:1000/30;
  if(lastDraw&&elapsed<1000/30-1)return;lastDraw=now;
  const pose=portraitPose(hallPose(name,seconds),motion);
  avatar.setParameters(window.AvatarMeshBridge.mapPose(pose,.35,.6));
  const step=Math.min(.05,Math.max(.008,elapsed/1000));
  avatar.advance(step,1/step);
}
for(const button of document.querySelectorAll('[data-hall]'))button.onclick=()=>setState(button.dataset.hall);
$('stage').onclick=event=>{if(event.target.closest('a,button'))return;jumpNext();};
$('stage').onkeydown=event=>{if(event.key!=='Enter'&&event.key!==' ')return;event.preventDefault();jumpNext();};
$('upload').onchange=async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(file.size>12*1024*1024){say('请选择小于 12 MB 的 PNG、JPG 或 WebP。');return;}
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)&&!(!file.type&&/\.(png|jpe?g|webp)$/i.test(file.name))){say('请选择 PNG、JPG 或 WebP。');return;}
  const url=URL.createObjectURL(file);
  try{
    const decoded=await decodePortrait(url);
    const shot={id:crypto.randomUUID?crypto.randomUUID():'hall-'+Date.now(),created:Date.now(),original:decoded.toDataURL('image/png'),result:decoded.toDataURL('image/png'),sourceName:file.name,sourceKind:'local',styleName:file.name.replace(/\.[^.]+$/,'')};
    try{await window.PortraitStore.put(shot);}catch{}
    await gallery();await showShot(shot);
  }catch(error){say('图片打不开：'+error.message);}
  finally{URL.revokeObjectURL(url);}
};
window.addEventListener('pagehide',()=>{serial++;detectToken++;avatar?.destroy();avatar=null;});
schedule();
setState(knownState(location.hash.slice(1)));
const requested=new URLSearchParams(location.search).get('portrait');
let stored=null;try{stored=localStorage.getItem(ACTIVE_KEY);}catch{}
gallery().then(async shots=>{
  const id=requested||stored;
  const shot=id?shots.find(item=>item.id===id)||await window.PortraitStore.get(id):null;
  if(shot)await showShot(shot);else await showSample();
}).catch(()=>showSample());
