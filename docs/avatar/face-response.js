(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Use the inner lips, not KalidoKit's relatively large inter-eye-normalized
  // opening threshold. Mouth width includes depth to resist yaw foreshortening.
  function lipRatio(points,size){
    if(!points||points.length<468||!(size?.width>0&&size?.height>0))return null;
    const p=[61,291,13,14].map(i=>points[i]);
    if(p.some(v=>!v||![v.x,v.y].every(Number.isFinite)))return null;
    const distance=(a,b,depth)=>Math.hypot((a.x-b.x)*size.width,(a.y-b.y)*size.height,depth&&Number.isFinite(a.z)&&Number.isFinite(b.z)?(a.z-b.z)*size.width:0);
    const width=distance(p[0],p[1],true);
    if(width<8)return null;
    return clamp(distance(p[2],p[3],false)/width,0,1);
  }
  class MouthDriver {
    constructor(){this.reset();}
    reset(){this.baseline=.015;this.open=false;this.samples=null;this.ratio=null;}
    calibrate(){this.samples=[];this.open=false;}
    setBaseline(value){if(Number.isFinite(value))this.baseline=clamp(value,0,.1);}
    update(points,size,fallback=0,gain=1.35,enhanced=true){
      gain=Number.isFinite(gain)?clamp(gain,.65,2.2):1.35;
      const ratio=lipRatio(points,size);this.ratio=ratio;
      if(ratio===null)return clamp(Number.isFinite(fallback)?fallback*gain:0,0,1);
      if(this.samples){
        this.samples.push(ratio);
        if(this.samples.length>=15){
          const sorted=this.samples.slice().sort((a,b)=>a-b);
          this.setBaseline(sorted[7]);this.samples=null;
        }
        return 0;
      }
      if(!enhanced)return clamp(Number.isFinite(fallback)?fallback*gain:0,0,1);
      const delta=ratio-this.baseline;
      if(this.open){if(delta<.006)this.open=false;}else if(delta>.012)this.open=true;
      return this.open?clamp(Math.pow(Math.max(0,delta-.006)/.22,.8)*gain,0,1):0;
    }
    snapshot(){return{ratio:this.ratio,baseline:this.baseline,calibrating:!!this.samples};}
  }
  const api={lipRatio,MouthDriver};root.AvatarFaceResponse=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
