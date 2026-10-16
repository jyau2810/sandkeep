# 上架素材

2026-10-16 从正式页面 https://jyau2810.github.io/sandkeep/ 重新采集，应用构建为 `index-DKX4UAXZ.js`（提交 `7248138`）。全部来自实际页面，使用内置猫咪示例。

| 顺序 | 文件 | 内容 |
| --- | --- | --- |
| 1 | [01-cover.png](01-cover.png) | 1920×1080，最新玻璃瓶与暖调沙画，建议作为封面 |
| 2 | [02-loose-sand.png](02-loose-sand.png) | 1920×1080，默认画框模式与拨沙控件 |
| 3 | [03-sand-play.png](03-sand-play.png) | 1920×1080，拨沙与撒沙编辑、作用范围与密度滑杆 |
| 4 | [04-mobile.png](04-mobile.png) | 390×844，手机画框界面 |
| 5 | [05-demo.mp4](05-demo.mp4) | 1280×720，22.72 秒，H.264 / yuv420p / 25fps，无音轨，约 1.7 MB |

按表格顺序上传，共 5 个文件。手机截图为纵向，其他素材均为 16:9；每个文件小于 2 MB。

视频流程：默认画框 → 拨沙 → 撒沙与密度调节 → 复原 → 倾斜画框装瓶 → 拖动旋转与双击回正 → 沿瓶壁滑向瓶口并倒回画框。视频仅裁去启动等待，未加速或补绘。

已检查封面、手机布局以及视频装瓶、倒沙关键帧；采集期间没有页面异常，所有页面使用相同构建。手机素材为 Chromium 触屏模拟，不代表真机性能验收。

## 重新采集

运行 `node scripts/capture-media.mjs https://jyau2810.github.io/sandkeep/`，生成四张截图及 `work/media-capture/demo.webm`，操作时间点和裁切起点记录在同目录 `capture.json`。

将 WebM 按记录的 `trimStartSeconds` 裁去启动等待，使用 FFmpeg 的 `libx264`、`yuv420p` 和 `+faststart` 输出 `05-demo.mp4`。录制时使用独立浏览器上下文，不读取用户的照片或保存作品。
