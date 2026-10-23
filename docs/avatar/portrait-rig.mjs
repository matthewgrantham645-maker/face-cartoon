// Browser-side base rig for a single portrait; original image textures are retained.
// Geometry targets the existing MIT mesh-avatar runtime; it does not create Cubism files.
import {packAvatar,validateRig} from './vendor/mesh-avatar-0.2.1.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ellipse=(cx,cy,rx,ry)=>({cx,cy,rx:Math.max(1,rx),ry:Math.max(1,ry)});
const clone=value=>JSON.parse(JSON.stringify(value));
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
export function defaultBinding(w,h){
  return {version:1,width:w,height:h,head:{x:w*.20,y:h*.06,w:w*.60,h:h*.59},
    eye0:{x:w*.325,y:h*.315,w:w*.13,h:h*.045},eye1:{x:w*.545,y:h*.315,w:w*.13,h:h*.045},
    mouth:{x:w*.425,y:h*.48,w:w*.15,h:h*.04},method:'estimate'};
}
export function normalizeBinding(value,w,h){
  if(!value||value.version!==1)throw Error('五官绑定格式无效。');
  const out={version:1,width:w,height:h,method:value.method==='detected'?'detected':'manual'};
  const sx=w/Number(value.width),sy=h/Number(value.height);
  if(!Number.isFinite(sx+sy)||sx<=0||sy<=0)throw Error('五官绑定尺寸无效。');
  for(const key of ['head','eye0','eye1','mouth']){
    const b=value[key];if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)throw Error('五官区域无效。');
    const bw=clamp(b.w*sx,Math.max(3,w*.006),w*.98),bh=clamp(b.h*sy,Math.max(3,h*.004),h*.98);
    out[key]={x:clamp(b.x*sx,0,w-bw),y:clamp(b.y*sy,0,h-bh),w:bw,h:bh};
    if(Array.isArray(b.contour)&&b.contour.length>=4&&b.contour.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))out[key].contour=b.contour.map(([x,y])=>[clamp(x*sx,0,w),clamp(y*sy,0,h)]);
  }
  const a=out.eye0,b=out.eye1,m=out.mouth;
  if(a.x+a.w/2>=b.x+b.w/2)throw Error('两只眼睛左右颠倒，请调整到画面左眼、画面右眼。');
  if(Math.abs(a.y+a.h/2-b.y-b.h/2)>out.head.h*.3)throw Error('两眼高度差过大，请校正区域。');
  if(m.y+m.h/2<=Math.max(a.y+a.h/2,b.y+b.h/2))throw Error('嘴部应在眼睛下方，请校正区域。');
  return out;
}
export function bindingFromLandmarks(points,w,h){
  if(!Array.isArray(points)||points.length<468||points.slice(0,468).some(p=>!p||![p.x,p.y].every(Number.isFinite)))return null;
  const coord=i=>[points[i].x*w,points[i].y*h];
  const box=(indices,padx=0,pady=0)=>{const p=indices.map(coord),xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);let x=Math.min(...xs),y=Math.min(...ys),bw=Math.max(...xs)-x,bh=Math.max(...ys)-y;return {x:x-bw*padx,y:y-bh*pady,w:bw*(1+padx*2),h:Math.max(h*.008,bh*(1+pady*2))};};
  const ids=[[33,160,158,133,153,144],[362,385,387,263,373,380]];
  const eyes=ids.map(indices=>({...box(indices),contour:indices.map(coord)})).sort((a,b)=>a.x-b.x);
  const face=box([234,454,10,152]);
  if(face.w<w*.10||face.h<h*.12||face.w>w*.95||face.h>h*.95||eyes.some(e=>e.w<w*.015||e.h>e.w*.9))return null;
  const mouth=box([61,291,13,14],.08,.25);mouth.h=Math.max(mouth.h,h*.016);
  // Face Mesh's forehead excludes hair; include a conservative margin above it.
  const value={version:1,width:w,height:h,method:'detected',head:{x:face.x-face.w*.17,y:face.y-face.h*.35,w:face.w*1.34,h:face.h*1.42},eye0:eyes[0],eye1:eyes[1],mouth};
  try{return normalizeBinding(value,w,h);}catch{return null;}
}
function opening(box){
  if(box.contour)return box.contour;
  return Array.from({length:32},(_,i)=>{const t=i*Math.PI/16;return [box.x+box.w/2+box.w/2*Math.cos(t),box.y+box.h/2+box.h/2*Math.sin(t)];});
}
function curves(poly){
  const x0=Math.min(...poly.map(p=>p[0])),x1=Math.max(...poly.map(p=>p[0])),top=[],bot=[];
  for(let i=0;i<24;i++){
    const x=x0+(x1-x0)*clamp(i/23,.002,.998),ys=[];
    poly.forEach(([ax,ay],j)=>{const [bx,by]=poly[(j+1)%poly.length];if(ax!==bx&&(ax-x)*(bx-x)<=0)ys.push(ay+(by-ay)*(x-ax)/(bx-ax));});
    if(ys.length<2)throw Error('眼睛轮廓不完整，请重新调整眼睛区域。');top.push(Math.min(...ys));bot.push(Math.max(...ys));
  }
  for(const i of [0,23])top[i]=bot[i]=(top[i]+bot[i])/2;
  return {x0,x1,top,bot};
}
export function rigForBinding(input,w,h){
  const b=normalizeBinding(input,w,h),head=b.head,ex=b.eye0,ey=b.eye1,m=b.mouth;
  const hx=head.x+head.w/2,hy=head.y+head.h/2,chin=Math.max(m.y+m.h*2,head.y+head.h*.92);
  const eyes=[ex,ey].map(e=>{const poly=opening(e);return {opening:poly,roi:[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]],...curves(poly)};});
  const rig={version:1,image:{width:w,height:h},head:{...ellipse(hx,hy,head.w/2,head.h/2),shiftX:head.w*.065,shiftY:head.h*.035,pivotX:hx,pivotY:chin,maxRoll:.10,weightBand:[chin,Math.max(chin+4,Math.min(h,chin+head.h*.28))],turnBand:[chin,Math.max(chin+5,Math.min(h,chin+head.h*.3))]},
    body:{pivotX:w/2,pivotY:h*1.15,maxRoll:.02,breathBand:[h*.78,h],rollBand:[h*.75,h],chest:ellipse(w/2,h*.9,w*.25,h*.13),shoulders:[ellipse(w*.2,h*.86,w*.12,h*.12),ellipse(w*.8,h*.86,w*.12,h*.12)]},
    face:{nose:ellipse((ex.x+ex.w+ey.x)/2,(ex.y+ex.h+m.y)/2,head.w*.09,head.h*.13),mouth:ellipse(m.x+m.w/2,m.y+m.h/2,m.w*.8,m.h*3),eyeA:ellipse(ex.x+ex.w/2,ex.y+ex.h/2,ex.w*.8,ex.h*1.6),eyeB:ellipse(ey.x+ey.w/2,ey.y+ey.h/2,ey.w*.8,ey.h*1.6),earL:ellipse(head.x+head.w*.12,hy,head.w*.08,head.h*.15),earR:ellipse(head.x+head.w*.88,hy,head.w*.08,head.h*.15),
      brow:{...ellipse(hx,Math.min(ex.y,ey.y)-head.h*.04,head.w*.36,head.h*.04),band:[Math.min(ex.y,ey.y)-head.h*.03,Math.min(ex.y,ey.y)]},jaw:{...ellipse(m.x+m.w/2,chin,head.w*.22,head.h*.12),band:[m.y+m.h,Math.max(m.y+m.h+2,chin)]}},
    eyes,mouth:{cx:m.x+m.w/2,cy:m.y+m.h/2,angle:0,halfLen:Math.max(3,m.w*.80),bow:0,area:{...ellipse(m.x+m.w/2,m.y+m.h/2,m.w,m.h*4),angle:0}},
    cheeks:[[ex.x+ex.w/2,m.y-m.h*2],[ey.x+ey.w/2,m.y-m.h*2]],strands:[],
    mesh:{baseCell:24,fine:{x0:Math.floor(head.x),x1:Math.ceil(head.x+head.w),y0:Math.floor(Math.min(ex.y,ey.y)-h*.04),y1:Math.ceil(Math.min(h,chin+h*.04)),cell:10},handCell:16,tasselCell:10,eyeBallCell:5,eyeCell:4,spriteCell:6},
    view:{padTop:.025,padSide:.025,gazeCenter:[hx,(ex.y+ey.y+ex.h/2+ey.h/2)/2]}};
  const errors=validateRig(rig);if(errors.length)throw Error(errors.join('\n'));return rig;
}
export async function decodePortrait(source){
  if(!/^(data:image\/(png|jpeg|webp);base64,|blob:)/.test(source))throw Error('仅接受本地图片。');
  const image=new Image();image.src=source;await image.decode();
  if(image.naturalWidth<64||image.naturalHeight<64||image.naturalWidth*image.naturalHeight>40000000)throw Error('图片尺寸不合适，请使用 64 像素以上、4000 万像素以内的图片。');
  const scale=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
  const c=makeCanvas(Math.round(image.naturalWidth*scale),Math.round(image.naturalHeight*scale));c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;
}
const jsonBytes=value=>new TextEncoder().encode(JSON.stringify(value));
async function pngBytes(canvas){return new Uint8Array(await (await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片编码失败。')),'image/png'))).arrayBuffer());}
function bounds(e,w,h){const pad=3;const x=Math.max(0,Math.floor(e.x-pad)),y=Math.max(0,Math.floor(e.y-pad));return [x,y,Math.max(1,Math.min(w-x,Math.ceil(e.w+pad*2))),Math.max(1,Math.min(h-y,Math.ceil(e.h+pad*2)))];}
function interpolate(a,t){const x=clamp(t,0,1)*23,i=Math.min(22,Math.floor(x));return a[i]+(a[i+1]-a[i])*(x-i);}
function eyeLayers(source,base,box,eye){
  const rect=bounds(box,source.width,source.height),[x0,y0,w,h]=rect;
  const original=source.getContext('2d').getImageData(x0,y0,w,h),data=original.data;
  // Continue surrounding skin through the small eye region. Original eye texture
  // is overlaid again at rest; no replacement cartoon face is drawn.
  const samples=[];
  for(let x=0;x<w;x++)for(const y of [0,h-1]){const p=(y*w+x)*4;if(data[p+3]>180)samples.push([data[p],data[p+1],data[p+2]]);}
  if(!samples.length)throw Error('眼睛区域周围没有有效像素，请校正区域。');
  samples.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));const skin=samples[Math.floor(samples.length*.65)];
  let fill=new Float32Array(w*h*3),next=new Float32Array(fill.length),mask=new Uint8Array(w*h);
  const parts={ball:makeCanvas(w,h),lash:makeCanvas(w,h),low:makeCanvas(w,h),crease:makeCanvas(1,1)},pixels={};
  for(const k of ['ball','lash','low'])pixels[k]=new ImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,p=i*4,gx=x+x0,gy=y+y0,u=(gx-eye.x0)/(eye.x1-eye.x0),top=interpolate(eye.top,u),bot=interpolate(eye.bot,u);
    const core=u>=0&&u<=1&&gy>=top-1&&gy<=bot+1;
    const contrast=(skin[0]+skin[1]+skin[2]-data[p]-data[p+1]-data[p+2])/3;
    const ink=gx>=box.x-1&&gx<=box.x+box.w+1&&gy>=box.y-2&&gy<=box.y+box.h+2&&contrast>22;
    const part=core?'ball':ink?(gy<=(top+bot)/2?'lash':'low'):null;
    mask[i]=part?1:0;
    for(let k=0;k<3;k++)fill[i*3+k]=part?skin[k]:data[p+k];
    if(part){for(let k=0;k<4;k++)pixels[part].data[p+k]=data[p+k];}
  }
  // A bounded harmonic fill respects nearby shading without Python/OpenCV.
  for(let n=0;n<90;n++){
    next.set(fill);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!mask[i])continue;for(let k=0;k<3;k++)next[i*3+k]=(fill[(i-1)*3+k]+fill[(i+1)*3+k]+fill[(i-w)*3+k]+fill[(i+w)*3+k])*.25;}
    [fill,next]=[next,fill];
  }
  const patch=new ImageData(new Uint8ClampedArray(data),w,h);
  for(let i=0;i<w*h;i++)if(mask[i])for(let k=0;k<3;k++)patch.data[i*4+k]=Math.round(fill[i*3+k]);
  base.getContext('2d').putImageData(patch,x0,y0);
  for(const k of ['ball','lash','low'])parts[k].getContext('2d').putImageData(pixels[k],0,0);
  return {parts,rect};
}
export async function buildPortrait(source,input,name='我的生成形象'){
  const w=source.width,h=source.height,binding=normalizeBinding(input,w,h),rig=rigForBinding(binding,w,h);
  const base=makeCanvas(w,h);base.getContext('2d').drawImage(source,0,0);
  const files=Object.create(null),layers={},eyes=[];
  const jobs=[];
  for(let i=0;i<2;i++){
    const built=eyeLayers(source,base,binding['eye'+i],rig.eyes[i]);
    for(const [part,c]of Object.entries(built.parts)){const key=`eye${i}_${part}`;layers[key]=part==='crease'?[0,0,1,1]:built.rect;jobs.push(pngBytes(c).then(bytes=>files[`built/${key}.png`]=bytes));}
    const {x0,x1,top,bot}=rig.eyes[i];eyes.push({x0,x1,top,bot});
  }
  const hairmask=makeCanvas(w,h); // No fabricated hair dynamics for an unknown picture.
  files['avatar.json']=jsonBytes({format:'mesh-avatar',version:1,name,source:'source.png',author:'User portrait, browser base rig'});
  files['rig.json']=jsonBytes(rig);files['built/layers.json']=jsonBytes({version:1,size:[w,h],build:'portrait-v8',layers,eyes});
  jobs.push(pngBytes(base).then(b=>files['built/base.png']=b),pngBytes(hairmask).then(b=>files['built/hairmask.png']=b),pngBytes(source).then(b=>files['source.png']=b));
  await Promise.all(jobs);const archive=packAvatar(files);
  return {archive,binding:clone(binding),rig};
}
