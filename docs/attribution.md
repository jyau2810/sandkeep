# 素材与依赖来源

## 内置猫咪示例

`src/assets/cat.png` 是本项目原始彩砂 demo 的代码绘制插画，使用 Canvas 绘制并生成。`node scripts/generate-cat.mjs` 可以重新生成原图。运行时再按原 demo 的采样和绘制方式生成彩砂，原图本身不包含用户照片。

## 玻璃反射环境

`src/assets/studio-small-09.hdr` 来自 [Poly Haven 的 Studio Small 09](https://polyhaven.com/a/studio_small_09)，作者 Sergej Majboroda，资源页面标注 CC0。使用官方 API 提供的 1K HDR 文件，随站点打包，运行时不请求第三方素材站。玻璃采用环境反射与 Fresnel 透明轮廓近似，未模拟物理折射。

源文件地址为 https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr 。

## 字体

`brand-serif-400.ttf` 与 `brand-serif-600.ttf` 是 Google Fonts 提供的 Noto Serif SC 字符子集，仅用于品牌和标题。字体遵循 SIL Open Font License 1.1，许可证保留在 `src/assets/OFL-NotoSerif.txt`。正文使用设备自带的中文无衬线字体。

- [Noto Serif SC](https://fonts.google.com/specimen/Noto+Serif+SC)
- [Noto CJK Serif 许可证](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE)

## 代码依赖

运行时依赖 Three.js。开发依赖 Vite、TypeScript、Playwright 及 Three.js 类型。具体版本由 `package-lock.json` 锁定，许可证以各依赖包内文件为准。

- [Three.js](https://github.com/mrdoob/three.js)
- [Vite](https://github.com/vitejs/vite)
- [TypeScript](https://github.com/microsoft/TypeScript)
- [Playwright](https://github.com/microsoft/playwright)

页面图标和瓶子模型由项目代码绘制。封面、截图和演示视频均由实际运行的本项目采集。
