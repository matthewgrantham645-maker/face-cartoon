import {loadMeshAvatar,DEFAULT_LIGHTING,unpackAvatar,packAvatar} from './vendor/mesh-avatar-0.2.1.mjs?v=12';
import {DEFAULT_MOTION,normalizeMotion,portraitPose} from './portrait-motion.mjs?v=12';

const $=id=>document.getElementById(id),canvas=$('meshCanvas'),poster=$('artPoster');
let avatar=null,archiveBlob=null,loading=false,serial=0,lastDraw=0,reportAt=performance.now(),frames=0,cost=0,parameters={};
const state={apiVersion:3,active:false,canvas,ready:false,loading:false,name:'二维插画',frameRate:30,portrait:null,isPortrait:false,motion:normalizeMotion(),lastError:''};
window.IllustratedAvatar=state;
const message=text=>$('meshStatus').textContent=text;
const notify=()=>window.dispatchEvent(new Event('avatar-renderer-change'));
const motionFields={mouthScale:'portraitMouthScale',blinkResponse:'portraitBlinkResponse',gazeStrength:'portraitGazeStrength'};
function syncMotion(){
  $('portraitMotion').hidden=!state.isPortrait;
  $('exportActivePortrait').disabled=loading||!state.isPortrait||!archiveBlob;
  for(const [key,id]of Object.entries(motionFields)){
    $(id).value=state.motion[key];$(id+'Value').textContent=state.motion[key].toFixed(2);
  }
  if(state.isPortrait)$('turnStrength').value=state.motion.turnStrength;
}
function setMotion(value){
  state.motion=normalizeMotion({...state.motion,...value});
  if(avatar?.package.rig.portrait)avatar.package.rig.portrait.motion={...state.motion};
  syncMotion();
  if(state.isPortrait)window.dispatchEvent(new CustomEvent('avatar-portrait-motion',{detail:{id:state.portrait?.id||null,motion:{...state.motion}}}));
}
function applyLighting(){if(avatar)avatar.setLighting({...DEFAULT_LIGHTING,enabled:$('celLight').checked,mode:'cel',strength:.5,intensity:.48,ambient:.74,ambientColor:0xffffff,color:0xfff4e8,specular:0,rim:0,detail:.12,shadow:false});}
function select(){
  const wants=$('renderMode').value==='illustration';state.active=wants&&!!avatar;
  canvas.style.display=state.active?'block':'none';poster.style.display=wants&&!avatar?'block':'none';$('avatar').style.display=wants?'none':'block';
  $('lookDetails').hidden=wants;$('meshOptions').hidden=!wants;$('saveConfig').hidden=wants;$('defaultLook').hidden=wants;
  $('origin').textContent=wants?'当前：'+state.name+(state.isPortrait?'。摄像头表情会作用在所选图片上；口型、眨眼和视线可单独微调。':'。这是已制作并绑定的二维插画；相机负责驱动表情。'):'当前：参数角色。拍照可以提取脸型与颜色，或使用 DeepSeek 分析参数。';
  if(!wants)$('renderStats').textContent='参数曲线绘制';
  lastDraw=0;frames=0;reportAt=performance.now();syncMotion();notify();
}
async function load(source,name,portrait=null){
  const ticket=++serial;loading=true;state.loading=true;state.lastError='';message('正在加载二维角色与网格…');
  try{
    const next=await loadMeshAvatar(canvas,source,{manual:true});
    if(ticket!==serial){next.destroy();return false;}
    const previous=avatar;avatar=next;previous?.destroy();
    avatar.setAutoIdle(false);avatar.setAutoMotion(false);avatar.setSwayGain(.25);
    state.portrait=portrait;state.isPortrait=next.package.rig.portrait?.version===2;archiveBlob=source instanceof Blob?source:null;
    state.motion=normalizeMotion(next.package.rig.portrait?.motion);parameters={};
    state.ready=true;state.name=name||next.package.manifest.name;applyLighting();$('renderMode').value='illustration';select();
    message(state.isPortrait?'图片绑定已应用 · 可直接试眨眼、小幅张嘴和转头，再开启面捕。':'二维插画已就绪 · 大角度输入会柔和限幅。');
    return true;
  }catch(error){
    if(ticket!==serial)return false;state.lastError=error.message;
    message('二维角色加载失败：'+error.message+(avatar?'，继续保留当前角色。':'。已切到参数角色，可继续使用面捕。'));
    if(!avatar){$('renderMode').value='parameter';select();}console.error(error);return false;
  }finally{if(ticket===serial){loading=false;state.loading=false;syncMotion();}}
}
state.update=(pose,now)=>{
  if(!state.active||!avatar||loading||document.hidden)return;
  const elapsed=lastDraw?now-lastDraw:1000/state.frameRate;
  if(lastDraw&&elapsed<1000/state.frameRate-1)return;lastDraw=now;
  const start=performance.now(),input=state.isPortrait?portraitPose(pose,state.motion):pose;
  parameters=window.AvatarMeshBridge.mapPose(input,Number($('bodyFollow').value),Number($('turnStrength').value));
  avatar.setParameters(parameters);
  const step=Math.min(.05,Math.max(.008,elapsed/1000));avatar.advance(step,1/step);
  const ms=performance.now()-start;cost=cost?cost*.9+ms*.1:ms;frames++;
  if(now-reportAt>=1500){$('renderStats').textContent=Math.round(frames*1000/(now-reportAt))+' 帧/秒 · 提交约 '+cost.toFixed(1)+' ms/帧';frames=0;reportAt=now;}
};
state.load=load;
state.setMotion=setMotion;
state.snapshot=()=>({name:state.name,isPortrait:state.isPortrait,frameRate:state.frameRate,submitMS:cost,deformationGain:avatar?.getParameters().deformGain??1,motion:{...state.motion},parameters:{...parameters}});
state.geometry=()=>avatar?.getMeshStats?.()||[];
state.exportArchive=async()=>{
  if(!state.isPortrait||!archiveBlob||loading)return false;
  try{
    const files=unpackAvatar(new Uint8Array(await archiveBlob.arrayBuffer())),rig=JSON.parse(new TextDecoder().decode(files['rig.json']));
    rig.portrait.motion={...state.motion};files['rig.json']=new TextEncoder().encode(JSON.stringify(rig));
    const url=URL.createObjectURL(new Blob([packAvatar(files)],{type:'application/zip'})),a=document.createElement('a');
    a.href=url;a.download='my-portrait.mavatar';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);return true;
  }catch(error){message('导出失败：'+error.message);return false;}
};
$('exportActivePortrait').onclick=()=>state.exportArchive();
window.dispatchEvent(new Event('avatar-renderer-ready'));
state.useParameters=()=>{$('renderMode').value='parameter';select();};
$('renderMode').addEventListener('change',select);
$('renderFPS').addEventListener('change',()=>{state.frameRate=Number($('renderFPS').value);lastDraw=0;});
$('celLight').addEventListener('change',applyLighting);
for(const [key,id]of Object.entries(motionFields))$(id).addEventListener('input',()=>setMotion({[key]:Number($(id).value)}));
$('turnStrength').addEventListener('input',()=>{if(state.isPortrait)setMotion({turnStrength:Number($('turnStrength').value)});});
$('resetPortraitMotion').onclick=()=>setMotion(DEFAULT_MOTION);
$('defaultArt').onclick=()=>{try{localStorage.removeItem('face-cartoon-active-portrait');}catch{}load(new URL('./character/',import.meta.url).href,'已绑定二维插画示例');};
$('importAvatar').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(!/\.mavatar$/i.test(file.name)){window.dispatchEvent(new CustomEvent('avatar-import-portrait',{detail:{file}}));return;}
    if(file.size>32*1024*1024){message('请导入小于 32 MB 的 .mavatar 角色文件。');return;}
    if(await load(file,file.name.replace(/\.mavatar$/i,'')))try{localStorage.removeItem('face-cartoon-active-portrait');}catch{}
  }finally{event.target.value='';}
};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();avatar?.destroy();avatar=null;state.ready=false;$('renderMode').value='parameter';select();message('图形上下文已丢失，已切到参数角色。恢复后可重新加载插画。');});
canvas.addEventListener('webglcontextrestored',()=>message('图形功能已恢复。切回二维插画后，点“恢复插画示例”或重新导入角色。'));
window.addEventListener('visibilitychange',()=>{lastDraw=0;frames=0;reportAt=performance.now();});
window.addEventListener('pagehide',()=>{serial++;avatar?.destroy();avatar=null;state.active=false;});
select();load(new URL('./character/',import.meta.url).href,'已绑定二维插画示例');
