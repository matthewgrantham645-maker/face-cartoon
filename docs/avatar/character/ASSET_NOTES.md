# 第四版插画素材

此角色由本次会话的摄像头截图与卡通画风参考制作。生成使用 ChatGPT 内置 imagegen，不使用项目后端或用户的 API 密钥。仓库内的 `source.png` 是准备给网页显示和离线图层构建的压缩副本；不包含摄像头原始照片或上游 Miko 样例角色。

`rig.draft.json` / `rig.json` 使用本图 1254 × 1254 像素坐标，眼睛开口与编辑范围通过放大网格检查。图层由 Mesh Avatar Studio 的离线工具构建，闭合/半闭/微笑眼睛由同一个运行时在原图坐标中渲染并裁切。嘴部开口来自第二次图像编辑，并在局部区域准备宽、窄和半开口型，边缘皮肤保持固定。PNG 调色板压缩减小首次加载量；所有表情与转脸在本地运行。

这是一份已经制作与绑定的角色素材。它不意味着本项目已经具备照片自动生成插画、任意图片自动绑定或完整三维重建能力。更换素材可使用 Mesh Avatar Studio，完成绑定后导出 `.mavatar` 并在页面导入。

## 原画生成提示词

Create a polished 2D hand-drawn cartoon portrait asset for a lightweight animated webcam avatar. Reference image 1: ONLY the real person on the LEFT webcam panel is the identity reference; ignore all UI and ignore the processed panel on the right. Reference image 2: visual style reference, especially black wavy hair, clean black outlines, warm flat skin colors, glasses, black jacket and white collar. Draw this young East Asian adult man as a professional editorial / animated-film 2D illustration, retaining his broad rectangular rounded eyeglasses, voluminous slightly messy wavy black hair, facial proportions and likeness. Front facing, head straight, shoulders level, camera exactly frontal. Head and shoulders bust centered with complete hair silhouette and generous transparent padding at top/sides. Neutral relaxed expression, mouth closed with a small dark drawn line, both eyes normally open looking forward; brown irises and discreet white eye areas, not doll eyes. Attractive refined drawing with varied confident ink linework, broad well-designed hair locks and a few muted flat cel shadows. Clear readable eyebrows above frames. Black casual blazer over open white shirt collar. No realism, no photographic texture, no 3D gloss, no painterly noise, no giant chibi head, no text/UI/watermark, no background. Keep the nose and mouth unobscured, glasses frames thin enough to see eyes. This is a single final illustration, not a sheet or comparison. Genuine transparent background. Prefer square composition suitable for a 1024x1024 rig.

## 张嘴素材编辑提示词

Edit target: this exact transparent 1254x1254 illustrated portrait used in a mesh animation rig. Change ONLY the mouth and lips within the very small mouth area, bounded by x=540..730, y=720..840. Keep ALL other pixels, portrait position, dimensions, head shape, nose, glasses, eyes, hair, jacket and transparent background identical. Draw a natural open-mouth speaking 'ah' shape in exactly the same 2D illustration style, mouth centered near x=632,y=778. Upper lip near y=756, lower lip near y=814, total mouth width about 115 px. Natural slim lip outlines, a modest strip of upper teeth, dark warm mouth interior and a small subtle tongue, no grin, no huge teeth. Do not move chin or alter facial expression elsewhere. This is an animation expression variant, not a new portrait. Preserve exact image size, framing and transparent alpha outside the character.
