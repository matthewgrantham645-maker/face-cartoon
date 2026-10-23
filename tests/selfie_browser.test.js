"use strict";
// Run with Playwright installed. Set CHROME_PATH for a system/headless-shell binary.
// All image API responses and camera frames are fixtures; no paid requests occur.
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {spawn} = require("node:child_process");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const port = 18771;
(async()=>{
  const server=spawn(process.env.PYTHON || "python",["-u","run_avatar.py","--port",String(port)],{cwd:root,stdio:["ignore","pipe","pipe"]});
  let browser;
  try {
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("server timeout")),8000);server.stdout.once("data",()=>{clearTimeout(timer);resolve();});server.once("error",reject);});
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
    const page=await browser.newPage(), errors=[], requests=[];
    page.on("pageerror",e=>errors.push(e.message));
    let configured=true, fail=false;
    await page.route("**/api/status",r=>r.fulfill({json:{configured:false,selfie:configured}}));
    await page.addInitScript(()=>{
      window.cameraCalls=0;window.stoppedCameras=0;
      navigator.mediaDevices.getUserMedia=async()=>{
        window.cameraCalls++;
        if(window.denyCamera)throw new DOMException("denied","NotAllowedError");
        const c=document.createElement("canvas");c.width=640;c.height=480;
        const ctx=c.getContext("2d");ctx.fillStyle="#b6cbe6";ctx.fillRect(0,0,640,480);
        const stream=c.captureStream(20);
        stream.getTracks().forEach(t=>{const stop=t.stop.bind(t);t.stop=()=>{window.stoppedCameras++;stop();};});return stream;
      };
    });
    await page.goto(`http://127.0.0.1:${port}/selfie/`);
    await page.waitForFunction(()=>document.querySelectorAll(".style-option").length===24);
    assert.equal(await page.evaluate(()=>window.cameraCalls),0);
    assert.equal(await page.locator("#generate").isDisabled(),true);
    const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=600;c.height=800;const x=c.getContext("2d");x.fillStyle="#cddbe8";x.fillRect(0,0,600,800);return c.toDataURL("image/png");});
    await page.route("**/api/selfie",async r=>{
      requests.push(r.request().postDataJSON());
      await new Promise(resolve=>setTimeout(resolve,100));
      await r.fulfill({status:fail?502:200,json:fail?{error:"测试：服务暂不可用"}:{image:png}});
    });
    const fixture={name:"test-photo.png",mimeType:"image/png",buffer:Buffer.from(png.split(",")[1],"base64")};
    await page.locator("#upload").setInputFiles(fixture);
    await page.waitForFunction(()=>!document.querySelector("#generate").disabled);
    assert.equal(requests.length,0);assert.equal(await page.evaluate(()=>window.cameraCalls),0);
    await page.locator('[data-style-id="ghibli"]').click();
    await page.locator("#generate").click();
    await page.waitForFunction(()=>!document.querySelector("#generate").disabled);
    await page.locator(".shot").first().waitFor();
    assert.equal(requests.length,1);assert.ok(requests[0].prompt.includes("吉卜力"));assert.ok(requests[0].prompt.includes("嘴唇闭合"));assert.ok(requests[0].image.startsWith("data:image/jpeg"));
    await page.locator('[data-style-id="pixel-portrait"]').click();
    await page.locator("#portraitMode").uncheck();
    assert.equal(requests.length,1);
    await page.locator("#generate").click();
    await page.waitForFunction(()=>document.querySelectorAll(".shot").length===2);
    assert.equal(requests[1].image,requests[0].image);assert.ok(!requests[1].prompt.includes("构图和表情以此要求为准"));
    await page.locator(".shot").last().click();
    assert.ok((await page.locator("#prompt").inputValue()).includes("吉卜力"));
    assert.equal(await page.locator("#portraitMode").isChecked(),true);
    assert.equal(requests.length,2);
    // Legacy history rows without a matching selected preset must also be recallable.
    await page.evaluate(async()=>{
      const d=await new Promise((resolve,reject)=>{const r=indexedDB.open("selfie-visit-shots",1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
      await new Promise((resolve,reject)=>{const t=d.transaction("shots","readwrite"),s=t.objectStore("shots");const r=s.getAll();r.onsuccess=()=>{const v=r.result[0];v.id="legacy";v.styleId="";v.basePrompt="旧版提示词";v.created=Date.now()+100;s.put(v);};t.oncomplete=resolve;t.onerror=reject;});d.close();
    });
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll(".shot").length===3);
    assert.equal(await page.evaluate(()=>window.cameraCalls),0);assert.equal(requests.length,2);
    await page.locator(".shot").first().click();assert.equal(await page.locator("#prompt").inputValue(),"旧版提示词");
    const old=await page.locator("#result").getAttribute("src");fail=true;
    await page.locator("#generate").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("测试："));
    assert.equal(await page.locator("#result").getAttribute("src"),old);fail=false;
    await page.locator("#sourceCamera").click();await page.waitForFunction(()=>!document.querySelector("#shutter").disabled);
    assert.equal(await page.evaluate(()=>window.cameraCalls),1);
    await page.locator("#shutter").click();assert.equal(await page.evaluate(()=>window.stoppedCameras),1);assert.equal(requests.length,3);
    await page.locator("#generate").click();await page.waitForFunction(()=>document.querySelectorAll(".shot").length===4);
    assert.equal(requests.length,4);
    await page.locator("#sourceUpload").click();await page.evaluate(()=>window.denyCamera=true);
    await page.locator("#sourceCamera").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("权限"));
    await page.locator("#sourceUpload").click();await page.locator("#upload").setInputFiles(fixture);
    await page.waitForFunction(()=>!document.querySelector("#generate").disabled);
    const original=await page.locator("#frozen").getAttribute("src");
    await page.locator("#upload").setInputFiles({name:"bad.png",mimeType:"image/png",buffer:Buffer.from("invalid")});
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("无法读取"));
    assert.equal(await page.locator("#frozen").getAttribute("src"),original);
    // Custom editing, saving and updating must never dereference a null selection.
    await page.locator("details").first().locator("summary").click();
    await page.locator("#prompt").fill("自定义线条");await page.locator("#styleName").fill("测试风格");await page.locator("#saveStyle").click();
    await page.locator("#prompt").fill("修改后的自定义线条");await page.locator("#updateStyle").click();
    assert.ok((await page.locator("#status").textContent()).includes("已保存"));
    await page.locator("#deleteStyle").click();assert.equal(await page.locator("#updateStyle").isDisabled(),true);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"mobile horizontal overflow");
    await page.locator("#categories").getByRole("button",{name:"全部",exact:true}).click();
    await page.screenshot({path:path.join(root,"../selfie-v7-mobile.png"),fullPage:true});
    await page.setViewportSize({width:1440,height:1050});
    await page.screenshot({path:path.join(root,"../selfie-v7-desktop.png"),fullPage:true});
    configured=false;await page.locator("details").nth(1).locator("summary").click();await page.locator("#refreshKey").click();
    await page.waitForFunction(()=>document.querySelector("#keyState").textContent.includes("未配置"));assert.equal(await page.locator("#generate").isDisabled(),true);
    assert.equal(await page.locator("#choosePhoto").isDisabled(),false);
    await page.locator("#clearHistory").click();await page.waitForFunction(()=>document.querySelectorAll(".shot").length===0);
    assert.deepEqual(errors,[]);console.log("selfie browser ok: upload/camera, 24 presets, request prompts, history, retry, permissions, custom CRUD, mobile, missing key");
  } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
