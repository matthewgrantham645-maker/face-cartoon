import {FaceLandmarker,FilesetResolver} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17';

const GOOGLE='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const CDN_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const localWasm=new URL('./vendor/tasks-wasm/',import.meta.url).href;
const localModel=new URL('./vendor/face_landmarker.task',import.meta.url).href;
let session=null,creating=null;

function slash(url){return url.endsWith('/')?url:url+'/';}
async function reachable(url){
  try{
    const response=await fetch(url,{method:'GET',headers:{Range:'bytes=0-15'}});
    if(!response.ok&&response.status!==206)return false;
    const bytes=new Uint8Array(await response.arrayBuffer());
    return bytes.length>=2&&bytes[0]!==0x3c;
  }catch{return false;}
}
async function wasmBase(){return await reachable(new URL('vision_wasm_internal.wasm',slash(localWasm)))?slash(localWasm):CDN_WASM;}
async function create(){
  if(session)return session;
  if(creating)return creating;
  creating=(async()=>{
    const fileset=await FilesetResolver.forVisionTasks(await wasmBase());
    const models=[localModel,'/api/face-landmarker.task',GOOGLE];
    let last=Error('面部混合形状初始化失败。');
    for(const modelAssetPath of models){
      if(modelAssetPath===localModel&&!await reachable(localModel))continue;
      for(const delegate of ['GPU','CPU']){
        try{
          const landmarker=await FaceLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath,delegate},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});
          session={landmarker,delegate};return session;
        }catch(error){last=error;}
      }
    }
    throw last;
  })();
  try{return await creating;}finally{if(!session)creating=null;}
}
function detectVideo(video,timestamp){
  if(!session||!video)return null;
  const result=session.landmarker.detectForVideo(video,timestamp);
  const landmarks=result.faceLandmarks?.[0];
  if(!landmarks||landmarks.length<478)return null;
  return {landmarks,blendshapes:result.faceBlendshapes?.[0]?.categories||[],delegate:session.delegate};
}
function describe(){return session?.delegate||'';}
window.AvatarLandmarker={create,detectVideo,describe};
