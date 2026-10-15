# 砂藏 Sandkeep

把一张回忆，藏进一瓶沙。

砂藏将照片变成彩砂，收进一只可旋转的玻璃瓶。照片环绕瓶身，左右拖动才能看完。它是一件可以在浏览器里制作、把玩的小藏品。

## 本地开发

需要 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

构建产物在 `dist/`。Vite 使用相对资源路径，可部署到 GitHub Pages 的仓库子路径。

## 部署

工作流位于 `.github/workflows/pages.yml`，推送到 `main` 后构建并发布。仓库的 Settings → Pages → Source 需设置为 GitHub Actions。

仓库地址为 [jyau2810/sandkeep](https://github.com/jyau2810/sandkeep)。正式体验地址与验收结果见 [参赛材料](submission/README.md)。

## 照片与隐私

照片在浏览器中解码、缩小并生成纹理。应用没有照片上传接口、账号或统计代码。最新完成的瓶子保存在当前浏览器的 IndexedDB 中。清理站点数据、更换浏览器或设备后不会同步恢复。GitHub Pages 负责提供静态网页，仍会处理正常的网页访问请求。

第一版暂不提供瓶子文件下载或跨设备分享。内置猫咪示例由代码绘制，字体与第三方代码来源见 [素材来源](docs/attribution.md)。

## 项目结构

- `src/domain.ts` 定义可保存的瓶子数据。
- `src/scene.ts` 管理瓶子、彩砂、动画和旋转。
- `src/app.ts` 管理制作流程与页面。
- `src/photo.ts` 校验并缩小照片。
- `src/persistence.ts` 保存当前浏览器的最新瓶子。
- `submission/` 存放报名文案、封面和演示材料。

## 验证

```sh
npx playwright install chromium
npm run build
npm test
```

测试通过生产预览访问 `/sandkeep/`，覆盖用户制作和恢复流程。具体范围及限制记录在 `docs/verification.md`。
