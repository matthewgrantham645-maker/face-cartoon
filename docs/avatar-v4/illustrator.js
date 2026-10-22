(function(root){
  'use strict';
  const A=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FlatAvatar;
  const mix=(hex,color,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)+parseInt(color.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  function render(ctx,input,values,w,h){
    const a=A.sanitize(input),p=A.pose(values),ink='#28242a',skin=a.skinTone;
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#faf1e2';ctx.fillRect(0,0,w,h);
    const s=Math.min(w/600,h/680);ctx.save();ctx.translate((w-s*600)/2,(h-s*680)/2);ctx.scale(s,s);
    ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=ink;ctx.lineWidth=3.8;
    function path(ops,fill,stroke=true){ctx.beginPath();for(const [op,...args]of ops)ctx[op](...args);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke)ctx.stroke();}
    // Stable shoulders, tapered lapels, and small seams give the drawing a clear
    // silhouette while the head can move independently above them.
    path([['moveTo',57,680],['lineTo',73,593],['bezierCurveTo',80,559,122,548,207,521],['lineTo',255,501],['lineTo',345,501],['lineTo',393,521],['bezierCurveTo',478,548,520,559,527,593],['lineTo',543,680],['closePath']],a.shirtColor);
    path([['moveTo',259,426],['lineTo',252,518],['quadraticCurveTo',298,553,348,518],['lineTo',341,426],['closePath']],skin);
    path([['moveTo',259,428],['lineTo',341,428],['lineTo',344,467],['quadraticCurveTo',305,502,255,477],['closePath']],mix(skin,'#a25139',.23),false);
    path([['moveTo',253,513],['lineTo',300,551],['lineTo',347,513],['lineTo',371,680],['lineTo',229,680],['closePath']],'#fffcf5');
    path([['moveTo',253,513],['lineTo',232,536],['lineTo',263,578],['lineTo',300,551]],'#fffcf5');
    path([['moveTo',347,513],['lineTo',368,536],['lineTo',337,578],['lineTo',300,551]],'#fffcf5');
    path([['moveTo',226,520],['lineTo',203,579],['lineTo',224,594],['lineTo',205,612],['lineTo',246,680]],mix(a.shirtColor,'#ffffff',.06));
    path([['moveTo',374,520],['lineTo',397,579],['lineTo',376,594],['lineTo',395,612],['lineTo',354,680]],mix(a.shirtColor,'#ffffff',.06));
    ctx.strokeStyle=mix(a.shirtColor,'#ffffff',.22);ctx.lineWidth=1.5;
    path([['moveTo',103,580],['quadraticCurveTo',94,624,91,680]],null);path([['moveTo',497,580],['quadraticCurveTo',506,624,509,680]],null);
    ctx.strokeStyle=ink;ctx.lineWidth=3.8;
    ctx.save();ctx.translate(300,456);ctx.rotate(p.roll*.26);ctx.translate(0,-164);
    const yaw=p.yaw*.53,pitch=p.pitch*.30;
    function point(x,y,z=0){
      x*=a.faceWidth;y*=a.faceLength;y+=Math.max(0,y-30)*p.mouth*.035;
      const dome=z===-30?0:18*Math.max(0,1-(x/145)**2),depth=z+dome;
      const X=x*Math.cos(yaw)+depth*Math.sin(yaw),Z=depth*Math.cos(yaw)-x*Math.sin(yaw);
      return [X*(1+Z/1800),y*Math.cos(pitch)-Z*Math.sin(pitch)+p.pitch*9];
    }
    function shape(ops,fill,stroke=true,z=0){path(ops.map(([op,...args])=>{const out=[];for(let i=0;i<args.length;i+=2)out.push(...point(args[i],args[i+1],z));return[op,...out];}),fill,stroke);}
    const volume=.94+(a.hairVolume-.8)*.3,part=a.hairPart*32;
    const H=ops=>ops.map(([op,...args])=>[op,...args.map((v,i)=>i%2?(v<-80?-80+(v+80)*volume:v):v+part*.15)]);
    const back=[['moveTo',-122,28],['bezierCurveTo',-152,-22,-151,-63,-140,-96],['quadraticCurveTo',-164,-132,-120,-161],['quadraticCurveTo',-119,-205,-64,-207],['quadraticCurveTo',-24,-239,14,-213],['quadraticCurveTo',79,-242,111,-194],['quadraticCurveTo',166,-183,151,-141],['quadraticCurveTo',179,-107,144,-71],['lineTo',124,37],['closePath']];
    const short=[['moveTo',-123,18],['quadraticCurveTo',-147,-59,-124,-111],['quadraticCurveTo',-111,-179,-20,-185],['quadraticCurveTo',70,-206,120,-152],['quadraticCurveTo',153,-108,126,22],['closePath']];
    shape(H(a.hairStyle==='short'?short:back),a.hairColor,true,0);
    for(const side of [-1,1]){
      shape([['moveTo',side*119,-9],['bezierCurveTo',side*151,-35,side*159,47,side*122,62],['closePath']],skin,true,-30);
      ctx.lineWidth=2;ctx.strokeStyle=mix(skin,ink,.32);
      shape([['moveTo',side*132,8],['quadraticCurveTo',side*145,0,side*140,26],['quadraticCurveTo',side*129,15,side*128,42]],null,true,-30);
    }
    ctx.strokeStyle=ink;ctx.lineWidth=3.8;
    const face=[['moveTo',0,-147],['bezierCurveTo',91,-148,129,-103,131,-27],['bezierCurveTo',134,34,116,83,85*a.jawWidth,118],['bezierCurveTo',56*a.jawWidth,148,23,160,0,160],['bezierCurveTo',-23,160,-56*a.jawWidth,148,-85*a.jawWidth,118],['bezierCurveTo',-116,83,-134,34,-131,-27],['bezierCurveTo',-129,-103,-91,-148,0,-147],['closePath']];
    shape(face,skin);
    ctx.save();shape(face,null,false);ctx.clip();
    shape([['moveTo',119,-62],['bezierCurveTo',135,36,112,103,58,140],['quadraticCurveTo',39,153,15,159],['bezierCurveTo',81,151,134,116,148,27],['lineTo',143,-65],['closePath']],mix(skin,'#bb6951',.16),false);
    ctx.globalAlpha=.33;
    for(const x of [-83,83]){const pos=point(x,58,9);ctx.fillStyle=mix(skin,'#e3847d',.28);ctx.beginPath();ctx.ellipse(...pos,22,9,0,0,Math.PI*2);ctx.fill();}ctx.restore();
    function eye(side,openness){
      const x=side*53*a.eyeSpacing,y=-4,ex=(a.detail?23:17)*a.eyeSize,ey=(a.detail?14:11)*a.eyeSize;
      const open=Math.max(.001,openness*(1-Math.max(0,p.smile)*.08)),tilt=a.eyeTilt*side;
      const local=(xx,yy)=>point(x+xx,y+yy+xx*tilt,23);
      const trace=()=>{ctx.beginPath();ctx.moveTo(...local(-ex,0));ctx.bezierCurveTo(...local(-ex*.45,-ey*open*1.35),...local(ex*.5,-ey*open*1.35),...local(ex,0));ctx.bezierCurveTo(...local(ex*.4,ey*open*.85),...local(-ex*.5,ey*open*.85),...local(-ex,0));};
      ctx.save();trace();ctx.clip();
      if(a.detail){ctx.fillStyle='#fffaf4';ctx.fill();}
      const center=local(p.gazeX*7,-p.gazeY*4);ctx.fillStyle=a.detail?'#5d4037':ink;
      ctx.beginPath();ctx.ellipse(...center,(a.detail?9:6)*a.eyeSize*Math.cos(yaw),12*a.eyeSize,0,0,Math.PI*2);ctx.fill();
      if(a.detail){ctx.fillStyle='#272126';ctx.beginPath();ctx.ellipse(...center,4*a.eyeSize,7*a.eyeSize,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffcf5';ctx.beginPath();ctx.arc(center[0]-2,center[1]-4,2.2,0,Math.PI*2);ctx.fill();}ctx.restore();
      ctx.strokeStyle=ink;ctx.lineWidth=a.detail?2.8:2.6;
      if(a.detail||open<.65){ctx.beginPath();ctx.moveTo(...local(-ex,0));ctx.bezierCurveTo(...local(-ex*.4,-ey*open*1.35+3*(1-open)),...local(ex*.5,-ey*open*1.35+3*(1-open)),...local(ex,0));ctx.stroke();}
      if(a.detail&&open>.25){ctx.lineWidth=1.2;ctx.strokeStyle=mix(skin,ink,.42);ctx.beginPath();ctx.moveTo(...local(-ex,0));ctx.quadraticCurveTo(...local(0,ey*open*1.3),...local(ex,0));ctx.stroke();}
      const brow=p.brow+(side<0?p.browL:p.browR),by=-31-brow*11;
      ctx.strokeStyle=mix(a.hairColor,ink,.25);ctx.lineWidth=(a.detail?4.2:5)*a.browThickness;
      shape([['moveTo',x-ex+1,by+3],['quadraticCurveTo',x-4,by-8*a.browArch,x+ex-1,by+1]],null,true,22);
    }
    eye(-1,p.eyeL);eye(1,p.eyeR);
    ctx.lineWidth=2.5;ctx.strokeStyle=mix(skin,ink,.72);
    shape([['moveTo',2,13],['quadraticCurveTo',8,32*a.noseLength,6,43*a.noseLength],['quadraticCurveTo',1,48*a.noseLength,-4,47*a.noseLength]],null,true,41);
    if(a.detail){ctx.strokeStyle=mix(skin,ink,.42);ctx.lineWidth=1.6;shape([['moveTo',-10,45*a.noseLength],['quadraticCurveTo',-14,47*a.noseLength,-9,49*a.noseLength]],null,true,37);}
    const my=91,mw=(a.detail?27:24)*a.mouthWidth*(1-p.pucker*.42)*(1+p.smile*.20),corner=my-p.smile*9;
    const height=p.mouth*38,upper=my-3-p.pucker*height*.18,lower=my+height;
    ctx.strokeStyle=ink;ctx.lineWidth=2.7;
    if(p.mouth>.015){
      const mouth=[['moveTo',-mw,corner],['bezierCurveTo',-mw*.4,upper,mw*.4,upper,mw,corner],['bezierCurveTo',mw*.78,lower+7,-mw*.78,lower+7,-mw,corner],['closePath']];
      ctx.save();shape(mouth,'#62343b',true,29);ctx.clip();
      shape([['moveTo',-mw-2,corner-4],['lineTo',mw+2,corner-4],['lineTo',mw,my+Math.min(7,height*.3)],['quadraticCurveTo',0,my+Math.min(12,height*.45),-mw,my+Math.min(7,height*.3)],['closePath']],'#fff5e9',false,29);
      shape([['moveTo',-mw*.75,lower+8],['quadraticCurveTo',0,lower-14,mw*.75,lower+8],['closePath']],'#d88286',false,29);ctx.restore();
    }else shape([['moveTo',-mw,corner],['quadraticCurveTo',0,my+p.smile*11,mw,corner]],null,true,29);
    if(a.detail){ctx.lineWidth=1.4;ctx.strokeStyle=mix(skin,'#b46c60',.4);shape([['moveTo',-11,my+height+12],['quadraticCurveTo',0,my+height+15,11,my+height+12]],null,true,25);}
    ctx.strokeStyle=ink;ctx.lineWidth=3.8;
    const fringe=a.hairStyle==='straight'?[['moveTo',-126,-65],['bezierCurveTo',-137,-131,-95,-189,-22,-189],['bezierCurveTo',61,-209,119,-159,133,-80],['lineTo',115,-45],['lineTo',71,-53],['lineTo',55,-86],['lineTo',40,-53],['lineTo',-8,-57],['lineTo',-20,-87],['lineTo',-38,-58],['lineTo',-108,-53],['lineTo',-124,22],['closePath']]:
      [['moveTo',-130,-48],['bezierCurveTo',-146,-111,-113,-169,-49,-185],['bezierCurveTo',-12,-199,25,-217,66,-200],['quadraticCurveTo',102,-201,126,-166],['quadraticCurveTo',149,-143,143,-111],['quadraticCurveTo',160,-91,136,-78],['quadraticCurveTo',156,-68,124,-49],['lineTo',119,19],['lineTo',108,-49],['quadraticCurveTo',74,-44,53,-83],['quadraticCurveTo',56,-48,28,-66],['quadraticCurveTo',8,-80,part-1,-124],['bezierCurveTo',-16+part,-88,-52,-59,-84,-62],['quadraticCurveTo',-104,-47,-116,-54],['lineTo',-124,23],['closePath']];
    const F=H(fringe).map(([op,...args])=>[op,...args.map((v,i)=>i%2&&a.hairStyle==='short'&&v<-85?-85+(v+85)*.72:v)]);
    shape(F,a.hairColor,true,6);
    ctx.save();shape(F,null,false,6);ctx.clip();
    if(a.detail){ctx.strokeStyle=mix(a.hairColor,'#ffffff',.15);ctx.lineWidth=3;
      shape(H([['moveTo',-111,-109],['bezierCurveTo',-83,-153,-31,-145,part+14,-179]]),null,true,8);
      shape(H([['moveTo',27,-191],['bezierCurveTo',76,-189,95,-164,113,-130]]),null,true,8);
      ctx.strokeStyle=mix(a.hairColor,'#000000',.25);ctx.lineWidth=2;
      shape(H([['moveTo',part+4,-153],['quadraticCurveTo',23,-105,44,-85]]),null,true,8);
    }ctx.restore();
    if(a.glasses){
      ctx.lineWidth=3;ctx.strokeStyle=a.glassesColor;
      for(const side of [-1,1]){const x=side*55,ww=a.glassesShape==='round'?44:48,hh=a.glassesShape==='round'?39:33;
        const lens=[['moveTo',x-ww,-25],['bezierCurveTo',x-ww,-43,x+ww-4,-44,x+ww,-24],['bezierCurveTo',x+ww+5,hh,x-ww-2,hh,x-ww,-25],['closePath']];
        shape(lens,null,true,32);
        ctx.save();shape(lens,null,false,32);ctx.clip();ctx.globalAlpha=.18;ctx.strokeStyle='#ffffff';ctx.lineWidth=5;shape([['moveTo',x-ww+12,-25],['lineTo',x-ww+26,-35]],null,true,33);ctx.restore();ctx.strokeStyle=a.glassesColor;ctx.lineWidth=3;
      }
      shape([['moveTo',-7,-24],['quadraticCurveTo',0,-30,7,-24]],null,true,34);
      shape([['moveTo',-104,-24],['lineTo',-128,-29]],null,true,12);shape([['moveTo',104,-24],['lineTo',128,-29]],null,true,12);
    }
    ctx.restore();ctx.restore();
  }
  A.render=render;if(typeof module!=='undefined'&&module.exports)module.exports=render;
})(typeof window!=='undefined'?window:globalThis);
