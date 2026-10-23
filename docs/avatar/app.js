'use strict';
(()=>{
  const $=id=>document.getElementById(id),A=FlatAvatar;
  const canvas=$('avatar'),ctx=canvas.getContext('2d'),video=$('video');
  const poseFields=['eyeL','eyeR','mouth','smile','yaw','pitch','roll','gazeX'];
  const lookFields=['hairStyle','hairColor','skinTone','shirtColor','glasses','glassesShape','faceWidth','hairVolume','detail','hairPart','eyeSize','noseLength','mouthWidth'];
  let appearance=A.sanitize(),mode='manual',target=A.neutral(),shown=A.neutral(),stream=null,tracker=null,loadPromise=null;
  let lastTick=performance.now(),lastUI=0,startAt=0,lastSent=0,lastVideo=-1,lastFace=0;
  let latestPoints=null,pendingFrame=null,purpose='live',frameResult=null,starting=false,generating=false,epoch=0;
  let calibrating=false,frameCount=0,lastReport=0,inferenceMS=0,inputCount=0,poseSequence=0;
  const motion=new AvatarMotion.MotionDriver(),mouthDriver=new AvatarFaceResponse.MouthDriver();
  let pendingAppearance=null,pendingOrigin='';
  const mediaRoot='https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
  const say=text=>$('status').textContent=text;
  try{const stored=localStorage.getItem('flat-avatar-v2');if(stored){appearance=A.sanitize(JSON.parse(stored));$('origin').textContent='当前：已保存的角色参数。';}}catch{}
  function syncLook(){for(const name of lookFields)if(name==='glasses')$(name).checked=appearance[name];else $(name).value=appearance[name];}
  function remember(){try{localStorage.setItem('flat-avatar-v2',JSON.stringify(appearance));}catch{}}
  function setMode(next){mode=next;for(const id of ['manual','demo','camera'])$(id).classList.toggle('active',id===next);if(next==='manual')say('手动控制 · 滑块改变眼睑、嘴型和姿态的曲线。');if(next==='demo'){startAt=performance.now();say('自动演示 · 预设表情与转头，不代表正在跟踪。');}}
  function reset(){target=A.neutral();setMode('manual');syncPose();}
  function syncPose(){for(const name of poseFields){$(name).value=shown[name];$(name+'Value').textContent=shown[name].toFixed(2);}}
  function stop(){epoch++;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;latestPoints=null;motion.beginCalibration();mouthDriver.reset();calibrating=false;$('capture').disabled=$('calibrate').disabled=$('calibrateMouth').disabled=$('stop').disabled=true;if(mode==='camera'){reset();say('摄像头已关闭。');}updateEngine();}
  const isOfficial=()=>$('trackingProfile').value==='official';
  function profileControls(){
    const official=isOfficial();
    $('calibrate').disabled=!stream||official;
    $('calibrateMouth').disabled=!stream;
    for(const id of ['eyeGain','motionGain'])$(id).disabled=official;
    $('mouthGain').disabled=false;
    $('profileHelp').textContent=official?'KalidoKit 姿态与眼睛映射，下方可启用小幅张嘴增强。灵敏度对两种映射均生效；闭嘴不归零时点“校准闭嘴”。':'个人校准：开启后保持正面、睁眼、闭嘴约 1–2 秒；可独立调整张嘴灵敏度。';
  }
  function calibrate(){motion.beginCalibration();calibrating=!isOfficial();target=A.neutral();profileControls();say(calibrating?'正在校准：请正视镜头、睁眼、闭嘴约 1–2 秒。':'参考官方映射已接入 · 可以眨眼、说话、转头和移动视线。');}
  function receive(results){
    frameResult=results.multiFaceLandmarks?.[0]||null;
    if(purpose!=='live'||!stream)return;
    if(!frameResult)return;
    latestPoints=frameResult.map(p=>({...p}));
    if(mode!=='camera'){lastFace=performance.now();return;}
    // Face.solve mutates its landmark argument into pixel coordinates. Always
    // pass a fresh copy; capture and appearance estimation keep normalized data.
    const solved=A.solveFace(latestPoints,{width:video.videoWidth,height:video.videoHeight},Kalidokit);
    if(!solved)return;
    if(![solved.head?.x,solved.head?.y,solved.head?.z,solved.mouth?.x,solved.mouth?.y].every(Number.isFinite))return;
    const wasCalibrating=calibrating,now=performance.now();
    const result=isOfficial()?{pose:AvatarKalido.fromKalido(solved,Kalidokit.Face.stabilizeBlink?((eyes,y)=>Kalidokit.Face.stabilizeBlink(eyes,y)):undefined),calibrating:false}:motion.update(latestPoints,solved,{width:video.videoWidth,height:video.videoHeight},now);
    if(!result)return;lastFace=now;frameCount++;inputCount++;calibrating=result.calibrating;
    if(wasCalibrating&&!calibrating)mouthDriver.setBaseline(motion.baseline?.aperture);
    const wasMouthCalibrating=!!mouthDriver.samples;
    const mouth=mouthDriver.update(latestPoints,{width:video.videoWidth,height:video.videoHeight},result.pose.mouth,Number($('mouthGain').value),$('sensitiveMouth').checked);
    target=A.pose({...result.pose,mouth:calibrating?0:mouth});
    if(wasMouthCalibrating&&!mouthDriver.samples)say('闭嘴校准完成 · 小幅张嘴即可驱动口型。');
    if(result.warning)say(result.warning);
    if(wasCalibrating&&!calibrating){frameCount=0;lastReport=now;say('个人校准完成 · 可以眨眼、说话、转头和移动视线。');}
  }
  async function loadTracker(){
    if(tracker)return;if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      if(!window.FaceMesh)await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=mediaRoot+'face_mesh.js';script.crossOrigin='anonymous';
        const timeout=setTimeout(()=>{script.remove();reject(Error('跟踪组件下载超时，请检查网络后重试。'));},30000);
        script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('跟踪组件下载失败；手动与演示模式仍可使用。'));};document.head.appendChild(script);
      });
      if(!window.Kalidokit?.Face)throw Error('KalidoKit 未加载，请重新更新仓库。');
      tracker=new FaceMesh({locateFile:file=>mediaRoot+file});tracker.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});tracker.onResults(receive);
    })();
    try{await loadPromise;}catch(error){tracker=null;throw error;}finally{loadPromise=null;}
  }
  async function send(image,kind){purpose=kind;frameResult=null;const start=performance.now();await tracker.send({image});if(kind==='live')inferenceMS=inferenceMS?inferenceMS*.85+(performance.now()-start)*.15:performance.now()-start;return frameResult?frameResult.map(p=>({...p})):null;}
  // Reuse the same detector, serializing still-image work with camera frames.
  // No camera permission or external image-generation request is involved.
  window.AvatarPortraitDetector={detect:async image=>{
    if(generating||starting)throw Error('面捕组件正在准备，请稍后重试定位。');
    generating=true;
    try{await loadTracker();if(pendingFrame)await pendingFrame;return await send(image,'portrait');}
    finally{purpose='live';generating=false;lastFace=performance.now();}
  }};
  function updateEngine(){ const art=window.IllustratedAvatar?.active?'二维插画网格':'参数曲线';$('engine').textContent=mode==='camera'&&stream?art+' · 面捕':art+(mode==='demo'?' · 自动演示':' · 手动'); }
  window.addEventListener('avatar-renderer-change',updateEngine);
  async function startCamera(){
    if(starting)return;if(generating){say('正在定位图片或准备照片，请稍候再开启面捕。');return;}if(stream){setMode('camera');calibrate();updateEngine();return;}
    starting=true;$('camera').disabled=true;const token=++epoch;say('正在加载面捕组件并请求摄像头…');
    try{
      await loadTracker();if(token!==epoch)return;
      if(!navigator.mediaDevices?.getUserMedia)throw Error('请通过 localhost 打开页面并允许摄像头权限。');
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30}}});
      if(token!==epoch){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;await video.play();
      if(token!==epoch)return;
      $('capture').disabled=$('calibrate').disabled=$('stop').disabled=false;lastVideo=-1;lastFace=performance.now();frameCount=0;lastReport=lastFace;
      setMode('camera');calibrate();updateEngine();
    }catch(error){stop();setMode('manual');say(error.name==='NotAllowedError'?'摄像头权限未获允许，可先使用自动演示。':error.message);console.error(error);}finally{starting=false;$('camera').disabled=false;}
  }
  function snapshot(source){const out=document.createElement('canvas');const iw=source.videoWidth||source.naturalWidth||source.width,ih=source.videoHeight||source.naturalHeight||source.height;
    if(!iw||!ih)throw Error('照片尚未准备好。');const fit=Math.min(1,960/iw,1280/ih);out.width=Math.max(1,Math.round(iw*fit));out.height=Math.max(1,Math.round(ih*fit));out.getContext('2d').drawImage(source,0,0,out.width,out.height);return out;}
  async function generateFrom(source){
    if(generating||starting)return;generating=true;pendingAppearance=null;$('photoPreview').hidden=true;$('capture').disabled=true;$('upload').disabled=true;say('正在提取照片并准备预览，当前角色保持不变…');
    try{
      const photo=snapshot(source);await loadTracker();if(pendingFrame)await pendingFrame;
      const points=await send(photo,'capture');if(!points)throw Error('照片中没有检测到清晰人脸，请使用正面、单人照片。');
      const width=Math.abs(points[454].x-points[234].x),height=Math.abs(points[152].y-points[10].y);
      if(width<.14||height<.18)throw Error('照片中的人脸太小，请靠近镜头再拍；当前角色已保留。');
      const photoPose=A.solveFace(points,{width:photo.width,height:photo.height},Kalidokit);
      if(!photoPose||![photoPose.head?.x,photoPose.head?.y].every(Number.isFinite)||Math.abs(photoPose.head.y)>.45||Math.abs(photoPose.head.x)>.4)throw Error('请使用正面、平视的照片，侧脸提取容易失真；当前角色已保留。');
      const pixels=photo.getContext('2d').getImageData(0,0,photo.width,photo.height).data;
      let candidate=A.estimateAppearance(points,photo.width,photo.height,pixels,appearance);
      const dataURL=photo.toDataURL('image/jpeg',.86);let ai=false,warning='';
      if($('useAI').checked){
        say('正在通过 DeepSeek 分析发型、眼镜和外观…');
        try{
          const response=await fetch('/api/appearance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:dataURL}),signal:AbortSignal.timeout(75000)});
          const result=await response.json();if(!response.ok)throw Error(result.error||'外观分析失败');
          // Geometry comes from measured landmarks; the AI contributes bounded
          // appearance choices, never executable drawing code.
          candidate=A.sanitize({...candidate,...result.appearance,faceWidth:candidate.faceWidth,jawWidth:candidate.jawWidth,eyeSpacing:candidate.eyeSpacing,eyeTilt:candidate.eyeTilt,noseLength:candidate.noseLength,mouthWidth:candidate.mouthWidth});ai=true;
        }catch(error){warning=' DeepSeek 分析未成功，本次使用本地比例生成。';$('apiStatus').textContent=warning+' '+error.message;console.warn(error.message);}
      }
      pendingAppearance=candidate;pendingOrigin=ai?'当前：照片比例 + DeepSeek 外观参数，经预览后应用。':'当前：照片提取的简化参数角色，经预览后应用。';
      $('snapshot').src=dataURL;$('snapshot').style.display='block';
      const preview=$('photoPreviewCanvas');A.render(preview.getContext('2d'),candidate,A.neutral(),preview.width,preview.height);$('photoPreview').hidden=false;
      say('提取预览已准备好，当前插画保持不变。此预览是简化模板，不是高质量插画生成。'+warning);
    }catch(error){say(error.message);console.error(error);}finally{generating=false;$('capture').disabled=!stream;$('upload').disabled=false;}
  }
  function tick(now){
    const dt=Math.max(0,Math.min(100,now-lastTick));lastTick=now;
    if(mode==='demo'){
      const t=(now-startAt)/1000,blink=Math.exp(-Math.pow(((t%3.2)-.8)/.065,2));
      target=A.pose({eyeL:1-blink,eyeR:1-blink,mouth:Math.max(0,Math.sin(t*5))*.8,smile:.35,yaw:Math.sin(t*.9)*.72,pitch:Math.sin(t*.63)*.35,roll:Math.sin(t*.75)*.28,gazeX:Math.sin(t*1.2)*.6,gazeY:Math.sin(t*.7)*.25,brow:Math.max(0,Math.sin(t*.8))*.3,pucker:Math.max(0,Math.sin(t*3))*.5});
    }
    if(stream&&!generating){
      if(mode==='camera'&&now-lastFace>700){target=A.neutral();if(now-lastFace>1600)say('暂未看清人脸，角色回到中性表情。请面对镜头。');}
      // Do not wait for currentTime to change. Some local cameras keep it at 0,
      // which previously froze the character after the first frame.
      if(!pendingFrame&&video.readyState>=2&&video.videoWidth>0&&now-lastSent>=1000/Number($('captureRate').value)){
        lastSent=now;lastVideo=video.currentTime;
        pendingFrame=send(video,'live').catch(error=>{stop();say('面捕失败：'+error.message);console.error(error);}).finally(()=>pendingFrame=null);
      }
      if(mode==='camera'&&!calibrating&&now-lastFace<700&&now-lastReport>2000){say('面捕驱动中 · '+Math.round(frameCount*1000/(now-lastReport))+' 次/秒 · 处理约 '+Math.round(inferenceMS)+' ms/帧');frameCount=0;lastReport=now;}
    }
    // Personal mode already uses One Euro filtering in MotionDriver. Applying
    // another interpolation here made expressions unnecessarily slow.
    if(mode==='camera'&&!isOfficial())shown={...target};
    else for(const key in shown){const tau=mode==='camera'?(key.startsWith('eye')?20:key==='mouth'?25:40):(key.startsWith('eye')?16:key==='mouth'?35:70);shown[key]+=(target[key]-shown[key])*(1-Math.exp(-dt/tau));}
    poseSequence++;
    if(window.IllustratedAvatar?.active)window.IllustratedAvatar.update(shown,now);
    else A.render(ctx,appearance,shown,canvas.width,canvas.height);
    window.Live2DReference?.update(shown,now,poseSequence);
    if(now-lastUI>100){if(mode!=='manual')syncPose();else for(const name of poseFields)$(name+'Value').textContent=shown[name].toFixed(2);$('motionReadout').textContent=(isOfficial()?'官方映射':'个人校准')+' · 角度 '+[shown.yaw*30,-shown.pitch*30,-shown.roll*30].map(v=>v.toFixed(1)).join(' / ')+'° · 眼睛 '+shown.eyeL.toFixed(2)+' / '+shown.eyeR.toFixed(2)+' · 张嘴 '+shown.mouth.toFixed(2)+(mode==='camera'?' · 输入距今 '+Math.round(now-lastFace)+' ms':' · 预设/手动输入');lastUI=now;}
    requestAnimationFrame(tick);
  }
  for(const name of poseFields)$(name).addEventListener('input',()=>{setMode('manual');target=A.pose({...shown,...Object.fromEntries(poseFields.map(k=>[k,Number($(k).value)]))});updateEngine();});
  for(const name of lookFields)$(name).addEventListener('input',()=>{appearance=A.sanitize({...appearance,[name]:name==='glasses'?$(name).checked:['faceWidth','hairVolume','detail','hairPart','eyeSize','noseLength','mouthWidth'].includes(name)?Number($(name).value):$(name).value});remember();});
  for(const id of ['eyeGain','motionGain'])$(id).addEventListener('input',()=>motion.setOptions({[id]:Number($(id).value)}));
  $('trackingProfile').addEventListener('change',()=>{profileControls();if(stream&&mode==='camera')calibrate();});
  $('manual').onclick=()=>{setMode('manual');target={...shown};syncPose();updateEngine();};$('demo').onclick=()=>{setMode('demo');updateEngine();};$('camera').onclick=startCamera;
  $('reset').onclick=()=>{reset();syncPose();updateEngine();};$('stop').onclick=stop;$('calibrate').onclick=()=>{setMode('camera');calibrate();updateEngine();};
  $('capture').onclick=()=>generateFrom(video);
  $('calibrateMouth').onclick=()=>{if(!stream)return;setMode('camera');mouthDriver.calibrate();say('请自然闭嘴约半秒，正在校准嘴部零点…');updateEngine();};
  $('applyPhoto').onclick=()=>{if(!pendingAppearance)return;appearance=pendingAppearance;pendingAppearance=null;syncLook();remember();window.IllustratedAvatar?.useParameters();$('origin').textContent=pendingOrigin;$('photoPreview').hidden=true;say('已应用预览中的参数角色。可在角色类型中切回二维插画。');};
  $('discardPhoto').onclick=()=>{pendingAppearance=null;$('photoPreview').hidden=true;say('已保留当前角色，提取结果未应用。');};
  $('upload').onchange=async event=>{const file=event.target.files[0];if(!file)return;if(file.size>12*1024*1024){say('请上传小于 12 MB 的照片。');event.target.value='';return;}const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();await generateFrom(img);}catch(error){say('无法读取照片：'+error.message);}finally{URL.revokeObjectURL(url);event.target.value='';}};
  $('defaultLook').onclick=()=>{appearance=A.sanitize();syncLook();remember();$('origin').textContent='当前：默认角色，尚未从照片生成。';};
  function download(href,name){const a=document.createElement('a');a.href=href;a.download=name;a.click();}
  $('savePNG').onclick=()=>download((window.IllustratedAvatar?.active?window.IllustratedAvatar.canvas:canvas).toDataURL('image/png'),'my-flat-avatar.png');
  $('saveConfig').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:3,appearance},null,2)],{type:'application/json'}));download(url,'my-avatar.json');setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.AvatarDiagnostics={snapshot:()=>({version:6,mode,profile:$('trackingProfile').value,sequence:poseSequence,inputCount,calibrating,inferenceMS,inputAgeMS:mode==='camera'?Math.round(performance.now()-lastFace):null,pose:{...shown},target:{...target},mouthResponse:mouthDriver.snapshot(),mesh:window.AvatarMeshBridge.mapPose(shown,Number($('bodyFollow').value),Number($('turnStrength').value)),reference:window.Live2DReference?.snapshot()||null})};
  $('saveDiagnostics').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(window.AvatarDiagnostics.snapshot(),null,2)],{type:'application/json'}));download(url,'avatar-motion-diagnostics.json');setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('pagehide',stop);
  fetch('/api/status').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
    $('useAI').disabled=!data.configured;$('apiStatus').textContent=data.configured?'DeepSeek 已配置。勾选后，拍照或上传生成时才发送该照片。':'DeepSeek 未配置：可先使用本地拍照生成和全部动画功能。';
  }).catch(()=>{$('apiStatus').textContent='当前是纯静态服务。运行 python run_avatar.py 后可配置 DeepSeek；本地生成和动画仍可用。';});
  syncLook();profileControls();requestAnimationFrame(tick);
})();

