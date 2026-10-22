# 第三版：精细卡通绘制与个人面捕校准

启动（不需要安装 Python 依赖）：

```powershell
python run_avatar.py
```

访问 http://localhost:8000/avatar/ 。默认没有配置 DeepSeek 也能使用默认角色、自动演示、面捕和本地拍照生成。

## 本版的变化

- 保留参考图的平涂画风，重新绘制发型轮廓、刘海、眼白、虹膜、眼睑、眉毛、鼻部、嘴唇、镜框与衣领。可以切换精细卡通和极简线条。
- 角色由代码中的曲线与控制点生成，没有沿用上一版写实贴片。
- 眼睛以眼睑曲线裁剪瞳孔；嘴部是连续的贝塞尔轮廓，包含嘴角、开口和收圆控制。
- 头部绕颈部旋转，身体固定。左右转头与抬头低头通过不同部件的局部深度投影实现，不是完整三维重建。
- 使用 MediaPipe FaceMesh 478 点与 KalidoKit 1.1.5 的实际 Face.solve 求解姿态、眼睛、眉毛、视线、嘴型。
- 开启面捕后保持正面、睁眼、闭嘴约 1–2 秒，采集至少 24 帧，建立个人中性表情。眼睑、嘴部开合与眉毛由关键点相对个人基线计算，头部姿态和视线继续由 KalidoKit 求解。
- 采用 One Euro 自适应滤波：静止时减小抖动，快速动作时提高跟随速度；眨眼有闭合/重新睁开的不同阈值，防止半闭眼反复跳动。头部和视线有突变限制，丢失人脸时回到中性表情。
- 跟踪上限可选 15、20、30 次/秒，默认 30；实际速度受设备和模型耗时影响，页面显示实际接收频率与处理耗时。另有眨眼、张嘴、转头幅度调节。
- KalidoKit 随项目提供，保留其 MIT 许可头。FaceMesh 首次使用时从 CDN 下载。
- 开启相机后可拍照，也可以上传照片。脸部比例由关键点测量；本地模式只估计比例和近似肤色，发型、眼镜沿用当前设置。
- DeepSeek 分析为可选项：在网页明确勾选后，仅在生成时向本机后端提交该照片，后端请求官方视觉 API，返回受限 JSON 外观参数。
- 所有表情驱动和显示在本地运行；DeepSeek 不参与逐帧动画。
- 本地照片测量新增鼻长、嘴宽、眼角倾斜；肤色使用多个皮肤采样点的中值估计。可手动调整眼睛大小、鼻长、嘴宽和刘海分缝。
- 第二版保存在 `/avatar-v2/`，可在同一台设备上对照。

## DeepSeek 配置

当前没有接触或配置用户密钥，也没有执行真实付费 API 调用。

可以先验证动画与本地拍照效果。需要启用 AI 外观分析时，在启动服务的 PowerShell 中设置 `DEEPSEEK_API_KEY`。建议使用隐藏输入：

```powershell
$avatarSecret = Read-Host "DeepSeek API Key" -AsSecureString
$env:DEEPSEEK_API_KEY = [System.Net.NetworkCredential]::new('', $avatarSecret).Password
Remove-Variable avatarSecret
python run_avatar.py
```

密钥只保留在这个 PowerShell 进程的环境变量里，不写入前端、仓库或图片。停止后可运行：

```powershell
Remove-Item Env:DEEPSEEK_API_KEY
```

默认使用官方文档当前列出的视觉模型 `deepseek-flash`。如账户支持的模型名不同，通过 `DEEPSEEK_MODEL` 环境变量设置。必须选择支持图片输入的模型。

## 技术边界

这是参数化卡通模板，不是任意图片自动转换成完整 Live2D Cubism 模型。角色发型目前有三种模板，服装结构固定；脸型、眼睛、眼镜和颜色可以变化。DeepSeek 提取外观参数，并不生成卡通 PNG。相似度受模板与照片光照影响，需要用户实际检查。

接口适配、模拟 API、曲线渲染和模拟摄像头流程均可在没有密钥时验证。真实 DeepSeek 返回效果与真实摄像头响应仍需用户本机验证。预览 GIF 为预设动作渲染，不是摄像头录屏。

官方参考：

- https://github.com/yeemachine/kalidokit
- https://api-docs.deepseek.com/guides/vision/
- https://api-docs.deepseek.com/api/create-chat-completion/

## 回归检查

```powershell
python -m unittest discover -s tests -p "test_avatar_server.py"
node tests/avatar_model.test.js
node tests/avatar_tracking.test.js
node tests/avatar_app.test.js
```

这些检查不请求摄像头，也不调用真实 DeepSeek API。覆盖参数边界、关键点不被求解器污染、个人校准、眨眼滞回、动作响应与抖动抑制，以及模拟相机、拍照、可选 API 和关闭相机的完整状态流程。
