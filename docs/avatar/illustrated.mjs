import {loadMeshAvatar,DEFAULT_LIGHTING} from './vendor/mesh-avatar-0.2.1.mjs?v=9';

// The runtime includes documented portrait-only patches. This adapter owns loading,
// frame pacing, local imports and the existing application's pose conversion.
const $=id=>document.getElementById(id),canvas=$('meshCanvas'),poster=$('artPoster');
let avatar=null,loading=false,serial=0,lastDraw=0,reportAt=performance.now(),frames=0,cost=0;
const state={apiVersion:2,active:false,canvas,ready:false,loading:false,name:'二维插画',frameRate:30,portrait:null,lastError:''};
window.IllustratedAvatar=state;
const message=text=>$('meshStatus').textContent=text;
const notify=()=>window.dispatchEvent(new Event('avatar-renderer-change'));

function applyLighting(){if(avatar)avatar.setLighting({...DEFAULT_LIGHTING,enabled:$('celLight').checked,mode:'cel',strength:.5,intensity:.48,ambient:.74,ambientColor:0xffffff,color:0xfff4e8,specular:0,rim:0,detail:.12,shadow:false});}
function select(){
  const wants=$('renderMode').value==='illustration';
  state.active=wants&&!!avatar;
  canvas.style.display=state.active?'block':'none';
  poster.style.display=wants&&!avatar?'block':'none';
  $('avatar').style.display=wants?'none':'block';
  $('lookDetails').hidden=wants;$('meshOptions').hidden=!wants;
  $('saveConfig').hidden=wants;$('defaultLook').hidden=wants;
  $('origin').textContent=wants?'当前：'+state.name+(state.portrait?'。使用这张图片的基础绑定，摄像头负责驱动表情。':'。这是已制作并绑定的二维插画；相机负责驱动表情。'):'当前：参数角色。拍照可以提取脸型与颜色，或使用 DeepSeek 分析参数。';
  if(!wants)$('renderStats').textContent='参数曲线绘制';
  lastDraw=0;frames=0;reportAt=performance.now();notify();
}
async function load(source,name,portrait=null){
  const ticket=++serial;loading=true;state.loading=true;state.lastError='';
  message('正在加载二维角色与网格…');
  try{
    const next=await loadMeshAvatar(canvas,source,{manual:true});
    if(ticket!==serial){next.destroy();return;}
    const previous=avatar;avatar=next;previous?.destroy();
    avatar.setAutoIdle(false);avatar.setAutoMotion(false);avatar.setSwayGain(.25);
    state.portrait=portrait;state.ready=true;state.name=name||next.package.manifest.name;applyLighting();
    $('renderMode').value='illustration';select();
    message(portrait?'图片基础绑定已应用 · 现在可开启面捕，眨眼、张嘴和小幅转头会作用在所选图片上。':'二维插画已就绪 · 侧脸形变保护已开启，可在下方调整幅度；大角度输入会柔和限幅。');
    return true;
  }catch(error){
    if(ticket!==serial)return;
    state.lastError=error.message;
    message('二维角色加载失败：'+error.message+(avatar?'，继续保留当前角色。':'。已切到参数角色，可继续使用面捕。'));
    if(!avatar){$('renderMode').value='parameter';select();}
    console.error(error);return false;
  }finally{if(ticket===serial){loading=false;state.loading=false;}}
}
state.update=(pose,now)=>{
  if(!state.active||!avatar||loading||document.hidden)return;
  const elapsed=lastDraw?now-lastDraw:1000/state.frameRate;
  if(lastDraw&&elapsed<1000/state.frameRate-1)return;
  lastDraw=now;
  const start=performance.now();
  avatar.setParameters(window.AvatarMeshBridge.mapPose(pose,Number($('bodyFollow').value),Number($('turnStrength').value)));
  const step=Math.min(.05,Math.max(.008,elapsed/1000));
  // advance() draws once per simulation step. Use exactly one draw here.
  avatar.advance(step,1/step);
  const ms=performance.now()-start;cost=cost?cost*.9+ms*.1:ms;frames++;
  if(now-reportAt>=1500){$('renderStats').textContent=Math.round(frames*1000/(now-reportAt))+' 帧/秒 · 提交约 '+cost.toFixed(1)+' ms/帧';frames=0;reportAt=now;}
};
state.load=load;
window.dispatchEvent(new Event('avatar-renderer-ready'));
state.useParameters=()=>{$('renderMode').value='parameter';select();};
$('renderMode').addEventListener('change',select);
$('renderFPS').addEventListener('change',()=>{state.frameRate=Number($('renderFPS').value);lastDraw=0;});
$('celLight').addEventListener('change',applyLighting);
$('defaultArt').onclick=()=>load(new URL('./character/',import.meta.url).href,'已绑定二维插画示例');
$('importAvatar').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(!/\.mavatar$/i.test(file.name)){window.dispatchEvent(new CustomEvent('avatar-import-portrait',{detail:{file}}));return;}if(file.size>32*1024*1024){message('请导入小于 32 MB 的 .mavatar 角色文件。');return;}await load(file,file.name.replace(/\.mavatar$/i,''));}
  finally{event.target.value='';}
};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();avatar?.destroy();avatar=null;state.ready=false;$('renderMode').value='parameter';select();message('图形上下文已丢失，已切到参数角色。恢复后可重新加载插画。');});
canvas.addEventListener('webglcontextrestored',()=>message('图形功能已恢复。切回二维插画后，点“恢复插画示例”或重新导入角色。'));
window.addEventListener('pagehide',()=>{serial++;avatar?.destroy();avatar=null;state.active=false;});
select();load(new URL('./character/',import.meta.url).href,'已绑定二维插画示例');
