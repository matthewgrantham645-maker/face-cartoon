'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {mapPose}=require('../docs/avatar/mesh-bridge.js');
const neutral=mapPose();assert.equal(neutral.eyeROpen,1);assert.equal(neutral.eyeLOpen,1);assert.equal(neutral.angleX,0);
const wink=mapPose({eyeL:0,eyeR:1});assert.equal(wink.eyeROpen,0);assert.equal(wink.eyeLOpen,1);
const bad=mapPose({yaw:99,pitch:Infinity,roll:NaN,eyeL:-9,mouth:8,pucker:1,smile:-1});
assert(Object.values(bad).every(Number.isFinite));assert.equal(bad.angleX,24);assert(bad.angleY===0);assert.equal(bad.eyeROpen,0);assert.equal(bad.mouthOpen,1);assert.equal(bad.mouthForm,1);
assert(mapPose({pucker:1}).mouthForm>mapPose({smile:1}).mouthForm,'round and wide mouth shapes must have distinct targets');
(async()=>{
 const root=path.join(__dirname,'../docs/avatar/character');
 const R=await import('../docs/avatar/vendor/mesh-avatar-0.2.1.mjs');
 const files=Object.create(null);for(const filename of fs.readdirSync(root,{recursive:true})){const full=path.join(root,filename);if(fs.statSync(full).isFile()&&(filename==='avatar.json'||filename==='rig.json'||filename==='source.png'||filename.startsWith('built'+path.sep)))files[filename.split(path.sep).join('/')]=new Uint8Array(fs.readFileSync(full));}
 assert.deepEqual(R.validateAvatarFiles(files),[]);
 const bytes=R.packAvatar(files);const unpacked=R.unpackAvatar(bytes);assert.deepEqual(R.validateAvatarFiles(unpacked),[]);
 assert.equal(JSON.parse(Buffer.from(unpacked['rig.json'])).eyes.length,2);
 const rig=JSON.parse(fs.readFileSync(path.join(root,'rig.json')));assert.equal(rig.image.width,1254);assert(rig.mesh.fine.cell>=8,'avoid needlessly dense CPU meshes');
 console.log('PASS: mirrored eye mapping, finite bounded poses, mouth shape axis, complete runtime assets, and portable archive round trip.');
})().catch(e=>{console.error(e);process.exitCode=1;});
