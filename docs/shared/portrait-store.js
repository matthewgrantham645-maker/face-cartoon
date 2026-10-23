(function(root){
  'use strict';
  const DB='selfie-visit-shots',STORE='shots';
  const validImage=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
  function open(){return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{const store=request.result.createObjectStore(STORE,{keyPath:'id'});store.createIndex('session','sessionId',{unique:false});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('浏览器记录暂时无法访问，请关闭旧页面再重试。'));
  });}
  async function read(id){const db=await open();try{return await new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE)[id?'get':'getAll'](id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
  async function list(){return (await read()).filter(s=>s&&validImage(s.result)).sort((a,b)=>b.created-a.created).slice(0,30);}
  async function get(id){if(typeof id!=='string'||!id||id.length>200)return null;const value=await read(id);return value&&validImage(value.result)?value:null;}
  async function put(shot){
    if(!shot||typeof shot.id!=='string'||!validImage(shot.result))throw Error('图片记录无效。');
    const db=await open();try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);store.put(shot);
      const request=store.getAll();request.onsuccess=()=>request.result.sort((a,b)=>b.created-a.created).slice(30).forEach(s=>store.delete(s.id));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存图片失败。'));
    });}finally{db.close();}
  }
  async function saveBinding(id,binding){
    const db=await open();try{return await new Promise((resolve,reject)=>{
      let found=false;const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),request=store.get(id);
      request.onsuccess=()=>{const shot=request.result;if(shot&&validImage(shot.result)){store.put({...shot,portraitBinding:binding});found=true;}};
      tx.oncomplete=()=>resolve(found);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存绑定失败。'));
    });}finally{db.close();}
  }
  root.PortraitStore={list,get,put,saveBinding,validImage};
})(typeof window!=='undefined'?window:globalThis);
