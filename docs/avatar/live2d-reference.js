'use strict';
(()=>{
  const $=id=>document.getElementById(id),canvas=$('live2dCanvas');
  const coreURL='https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
  const scripts=new Map();
  let app=null,model=null,loading=null,lastDraw=0,frames=0,reportAt=0;
  let currentParameters={},appliedParameters={},inputSequence=0,renderSequence=0;
  const state=window.Live2DReference={ready:false,active:false,frames:0};
  const message=text=>$('referenceStatus').textContent=text;
  function script(src){
    if(scripts.has(src))return scripts.get(src);
    const promise=new Promise((resolve,reject)=>{
      const el=document.createElement('script');el.src=src;
      const fail=()=>{clearTimeout(timer);el.remove();scripts.delete(src);reject(Error('无法加载 '+src));};
      const timer=setTimeout(fail,25000);
      el.onload=()=>{clearTimeout(timer);resolve();};el.onerror=fail;document.head.appendChild(el);
    });scripts.set(src,promise);return promise;
  }
  function dispose(){model?.destroy();model=null;app?.destroy(false,{children:true,texture:true,baseTexture:true});app=null;state.ready=false;state.active=false;lastDraw=0;}
  async function load(){
    if(state.ready)return;if(loading)return loading;
    loading=(async()=>{
      message('正在加载 Live2D 对照；不会再次请求摄像头。');
      // Core is proprietary: use its official host or the user's SDK copy,
      // never include it in this repository or borrow an unofficial mirror.
      if(!window.Live2DCubismCore){
        if($('localCore').checked)await script('./vendor/live2dcubismcore.min.js');
        else await script('/api/live2d-core.js').catch(()=>script(coreURL));
      }
      if(!window.Live2DCubismCore)throw Error('Cubism Core 没有初始化');
      if(!window.PIXI)await script('./vendor/pixi-6.5.10.min.js');
      if(!window.PIXI?.live2d)await script('./vendor/pixi-live2d-display-0.4.0.min.js');
      const P=window.PIXI;
      app=new P.Application({view:canvas,width:600,height:680,resolution:1,autoStart:false,backgroundAlpha:0,antialias:true,preserveDrawingBuffer:true});
      app.stop();
      model=await P.live2d.Live2DModel.from('../models/hiyori/hiyori_pro_t10.model3.json',{autoInteract:false,autoUpdate:false,motionPreload:'NONE'});
      const internal=model.internalModel,core=internal.coreModel;
      // Apply the shared pose before physics. Disable idle motions, synthetic
      // blinking, breathing and mouse tracking so they cannot mask face input.
      internal.motionManager.update=()=>false;internal.eyeBlink=undefined;
      internal.updateFocus=()=>{};internal.updateNaturalMovements=()=>{};
      internal.on('beforeMotionUpdate',()=>{
        appliedParameters={};
        for(const [id,value]of Object.entries(currentParameters)){
          core.setParameterValueById(id,value);
          appliedParameters[id]=core.getParameterValueById(id);
        }
      });
      const w=model.width,h=model.height;
      model.scale.set(680*3/h);model.x=(600-w*model.scale.x)/2;model.y=-25;
      app.stage.addChild(model);state.ready=true;lastDraw=0;
      message('Hiyori 已就绪 · 与左侧共用表情和姿态，保留 Live2D 发丝物理。');
    })();
    try{await loading;}catch(error){dispose();message('Live2D 对照未就绪：'+error.message+'。主角色仍可使用；网络受限时参照下方说明放入本地 Core 后重试。');console.warn(error.message);}
    finally{loading=null;state.active=state.ready&&$('compareLive2d').checked;$('localCore').disabled=state.ready;}
  }
  async function toggle(){
    const enabled=$('compareLive2d').checked;
    $('referencePanel').hidden=!enabled;$('comparisonStage').classList.toggle('comparing',enabled);
    state.active=enabled&&state.ready;lastDraw=0;
    if(enabled)await load();
  }
  state.update=(pose,now,sequence)=>{
    if(!state.active||!model||document.hidden)return;
    const elapsed=lastDraw?now-lastDraw:1000/30;
    if(lastDraw&&elapsed<1000/30-1)return;
    lastDraw=now;currentParameters=window.AvatarKalido.live2dParameters(pose,Number($('bodyFollow').value));inputSequence=sequence;
    try{model.update(Math.min(50,elapsed));app.renderer.render(app.stage);renderSequence=inputSequence;frames++;state.frames++;}
    catch(error){dispose();message('Live2D 渲染已停止：'+error.message+'。可点重试重新加载。');return;}
    if(now-reportAt>1500){$('referenceStats').textContent=Math.round(frames*1000/(now-reportAt||1))+' 帧/秒 · 同一动作输入';frames=0;reportAt=now;}
  };
  state.snapshot=()=>({ready:state.ready,active:state.active,frames:state.frames,sequence:renderSequence,parameters:{...appliedParameters},physics:!!model?.internalModel.physics});
  $('compareLive2d').addEventListener('change',toggle);
  $('retryReference').onclick=()=>{if($('compareLive2d').checked)load();};
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();message('Live2D 图形上下文已丢失。主角色不受影响，可点重试。');});
  window.addEventListener('pagehide',dispose);
})();
