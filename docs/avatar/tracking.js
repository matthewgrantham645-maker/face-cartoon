(function(root){
  'use strict';
  const A=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FlatAvatar;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const percentile=(list,q)=>{const s=list.slice().sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*(s.length-1)))];};
  class OneEuro {
    constructor(minCutoff=1.5,beta=.3){this.minCutoff=minCutoff;this.beta=beta;this.reset();}
    reset(){this.time=null;this.value=0;this.raw=0;this.derivative=0;}
    update(value,now){
      if(this.time===null||now-this.time>1000||now<=this.time){this.time=now;this.raw=this.value=value;this.derivative=0;return value;}
      const dt=clamp((now-this.time)/1000,.001,.25),alpha=cutoff=>1/(1+1/(2*Math.PI*cutoff*dt));
      const derivative=(value-this.raw)/dt;this.derivative+=alpha(1)*(derivative-this.derivative);
      const cutoff=this.minCutoff+this.beta*Math.abs(this.derivative);
      this.value+=alpha(cutoff)*(value-this.value);this.raw=value;this.time=now;return this.value;
    }
  }
  function measure(points,size){
    if(!points||points.length!==478||!size.width||!size.height)return null;
    if(!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
    const xy=i=>({x:points[i].x*size.width,y:points[i].y*size.height});
    const dist=(i,j)=>{const a=xy(i),b=xy(j);return Math.hypot(a.x-b.x,a.y-b.y);};
    const width=dist(234,454),height=dist(10,152);if(width<size.width*.10||height<size.height*.14)return null;
    const eye=ids=>{const width=dist(ids[0],ids[1]);return width>2?(dist(ids[2],ids[5])+dist(ids[3],ids[6])+dist(ids[4],ids[7]))/(3*width):NaN;};
    const left=eye([263,362,387,386,385,373,374,380]),right=eye([130,133,160,159,158,144,145,153]);
    const mouthWidth=dist(61,291),mouthCenter=(xy(13).y+xy(14).y)/2;
    const browL=((xy(386).y+xy(374).y)/2-xy(334).y)/height;
    const browR=((xy(159).y+xy(145).y)/2-xy(105).y)/height;
    const out={eyeL:left,eyeR:right,aperture:dist(13,14)/Math.max(2,mouthWidth),mouthWidth:mouthWidth/width,
      corner:(mouthCenter-(xy(61).y+xy(291).y)/2)/Math.max(2,mouthWidth),browL,browR};
    return Object.values(out).every(Number.isFinite)?out:null;
  }
  class MotionDriver {
    constructor(){this.options={eyeGain:1,mouthGain:1,motionGain:1};this.beginCalibration();}
    setOptions(options){for(const key of Object.keys(this.options))if(Number.isFinite(options[key]))this.options[key]=clamp(options[key],.65,1.6);}
    beginCalibration(){this.samples=[];this.start=null;this.baseline=null;this.calibrating=true;this.closed={eyeL:false,eyeR:false};this.last=A.neutral();this.lastTime=null;this.filters={};
      for(const key of Object.keys(this.last))this.filters[key]=new OneEuro(key.startsWith('eye')?6:key==='mouth'?4:key.startsWith('gaze')?1.2:1.6,key.startsWith('eye')?.7:key==='mouth'?.5:.30);}
    update(points,solved,size,now){
      const m=measure(points,size);if(!m||!solved?.head)return null;
      const r={...m,yaw:solved.head.y,pitch:solved.head.x,roll:solved.head.z,gazeX:solved.pupil?.x||0,gazeY:solved.pupil?.y||0};
      if(!Object.values(r).every(Number.isFinite))return null;
      if(this.calibrating){
        if(this.start===null)this.start=now;this.samples.push(r);
        if(this.samples.length<24||now-this.start<850)return {pose:A.neutral(),calibrating:true,progress:Math.min(.98,this.samples.length/24)};
        const baseline={};for(const key in r)baseline[key]=percentile(this.samples.map(s=>s[key]),key.startsWith('eye')?.8:key==='aperture'?.2:.5);
        if(baseline.eyeL<.055||baseline.eyeR<.055){this.samples=[];this.start=null;return {pose:A.neutral(),calibrating:true,progress:0,warning:'请睁眼并检查镜片反光。'};}
        this.baseline=baseline;this.calibrating=false;this.lastTime=now;
      }
      const b=this.baseline,g=this.options;
      const openness=key=>{
        const ratio=clamp(1-(1-r[key]/Math.max(.055,b[key]))*g.eyeGain,0,1.4);
        if(this.closed[key]){if(ratio>.5)this.closed[key]=false;}else if(ratio<.31)this.closed[key]=true;
        return this.closed[key]?0:clamp((ratio-.28)/.72);
      };
      const eyeL=openness('eyeL'),eyeR=openness('eyeR');
      const mouth=clamp((r.aperture-b.aperture-.008)/.30*g.mouthGain);
      const widthChange=r.mouthWidth/Math.max(.12,b.mouthWidth)-1;
      const deadzone=(v,z)=>Math.abs(v)<z?0:Math.sign(v)*(Math.abs(v)-z);
      const next=A.pose({eyeL,eyeR,mouth,
        smile:clamp(deadzone((r.corner-b.corner)*5+widthChange*.8,.025),-.7,1),
        pucker:mouth>.06?clamp(-widthChange*3+(solved.mouth?.shape?.O||0)*.6):0,
        // Same angle convention as the official mapping; subtract only the
        // calibrated neutral pose, then apply the user's amplitude setting.
        yaw:(r.yaw-b.yaw)*180/Math.PI/30*g.motionGain,pitch:-(r.pitch-b.pitch)*180/Math.PI/30*g.motionGain,roll:-(r.roll-b.roll)*180/Math.PI/30*g.motionGain,
        gazeX:eyeL>.35&&eyeR>.35?deadzone((r.gazeX-b.gazeX)*.65,.06):this.last.gazeX,
        gazeY:eyeL>.35&&eyeR>.35?deadzone((r.gazeY-b.gazeY)*.65,.06):this.last.gazeY,
        browL:deadzone((r.browL-b.browL)*12,.025),browR:deadzone((r.browR-b.browR)*12,.025)});
      const dt=this.lastTime===null?.033:clamp((now-this.lastTime)/1000,.005,.25);
      for(const key in next){
        if(['yaw','pitch','roll','gazeX','gazeY'].includes(key))next[key]=clamp(next[key],this.last[key]-10*dt-.04,this.last[key]+10*dt+.04);
        next[key]=this.filters[key].update(next[key],now);
        // Do not smooth a detected full closure into a half-open eye.
        if(key.startsWith('eye')&&this.closed[key]){next[key]=0;this.filters[key].value=0;}
      }
      this.last=A.pose(next);this.lastTime=now;return{pose:this.last,calibrating:false,progress:1};
    }
  }
  const api={OneEuro,measure,MotionDriver};root.AvatarMotion=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
