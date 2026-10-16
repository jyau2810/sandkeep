# 砂藏

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript, Vite, and Three.js. A browser-only build deploys to GitHub Pages. The implementation chooses this stack within the user's request to start building the agreed static application.

## Users

People trying a small creative tool during a company 1024 event. They bring a personal photograph and create a collectible virtual sand-art bottle.

## Product purpose

A photo becomes colored sand and assembles around the inside of a transparent bottle. Users drag horizontally to rotate the bottle and discover the complete image around its circumference.

## Operating context

Desktop browsers and mobile browsers. An individual competition entry links to the hosted application. Submission text and actual product media live in submission/.

## Capabilities and constraints

- One photograph forms one complete image around the bottle.
- A narrow decorative sand strip bridges the image seam.
- Both presentation switches connect visibly through the bottle mouth. Pouring tips and uncorks the real bottle, deposits grains into the frame and empties the bottle. Assembly collects the current loose grains, streams them into the mouth, fills the bottle and closes the cork. Rotating the completed bottle does not scatter it.
- Only the warm sand treatment is offered. Existing saved original-color records are read as warm without losing their photograph or title.
- Disassembly shows a framed rectangular front-facing sand painting. Dragging pushes the grains and leaves marks until explicit restore. Loose input and rendering are isolated from the accepted bottle.
- Naming is removed from the interface. Old record titles remain readable solely for storage compatibility; new drafts have an empty title.
- A single workbench places photo selection and the primary switch above the art. One shared hint below the art explains drag rotation or push interaction. Seam settings, visible rotation buttons, swirl choices and the local-processing footer are removed. Necessary actions, errors and upload limits remain.
- The latest bottle is saved locally on this browser.
- Photos are processed locally, without uploading them to a server.
- GitHub Pages hosts a static build. The application requires no backend or account.
- Download and export features are deferred at the user's request.
- Actual supported devices must be verified before submission claims are written.

## Brand commitments

The provisional implementation name is 砂藏, Sandkeep. It has not been finalized by the user. UI copy is Chinese. The user approved the earlier granular-image experiment and the physical sand-bottle metaphor. The supplied cat screenshot remains the loose-sand interaction reference. The third version's visible grains were positively received, but the user disliked its perspective and black speckles. The fourth version corrected the filled profile and perspective using real bottled-sand photographs, but the user explicitly rejected its smoother sand surface as a regression. In a controlled comparison with identical framing, the user explicitly selected B, the visibly independent irregular grains. The user then requested stronger grain depth. The current refinement adds broader irregular grains and explicit crown and bevel normals, while preserving locally colored interstices, the filled shape and camera. The latest feedback asks for finer, more natural sand that keeps the faceted depth while avoiding rice-like elongated bodies. The refinement uses compact fully rotated shapes, finer underpacking and a mix of visible grain sizes. The user subsequently accepted the fine-grain bottle with “瓶子的效果可以了” and requested warm-only presentation. This freezes the warm bottle material, geometry, camera, glass and rotation. The next request adds a frame and removes the trapezoid in loose presentation. Acceptance of the bottle does not imply acceptance of the new loose implementation.

## Evidence on hand

The accepted interactive experiment used a local illustration and approximately 85,000 points. It verified two-dimensional interaction only. It is not evidence of production three-dimensional performance. There are no user testimonials, usage metrics, or verified production benchmarks.

## Product principles

- Make the photograph recognizable as it travels around the bottle.
- Make the bottle feel worth keeping.
- Prefer a small number of finished interactions.
- Keep personal images on the user's device.
- Preserve the completed sand picture while it is being viewed.

## Latest motion correction

The user rejected the clipped photographic plug during pouring. Moving sand must leave the interior as fine grains, cross the bottle mouth, fall into the frame and spread gradually from local deposits. Assembly must also show grains entering and accumulating. This request does not reopen the accepted resting bottle material. A new motion implementation is not user-accepted merely because tests or an internal review pass.

## Gravity-fed assembly requirement

The user rejected upward suction during packing. The frame must lift and tilt, with grains sliding under screen gravity to its lower corner and falling into an upright bottle below. The interior fills gradually from the bottom. A tilted frame over the old upward arc still fails. This changes only assembly; the accepted resting bottle remains frozen, and the previous frame-deposition pour is preserved.


## 装瓶连续性修正

用户指出画框已经显空，瓶子仍有沙流入，并且动画中的瓶内沙质感不对。装瓶过程中需保留有面积的待倒沙堆，让画框余沙、瓶口沙流与已落定沙量共同变化。落定沙面沿用已认可瓶子的细砂材质、法线与光照，空中细沙单独运动。静止瓶子的材质、几何、镜头与灯光保持原样。

## 倒沙方向与界面精简

标题为“把回忆装进沙子里”。瓶子仅通过拖动和键盘旋转。平面模式仅保留拨沙与明确复原。两个模式共用画面底部的提示样式，动画期间隐藏提示。倒出前，瓶口移到画框中央上方并朝下，细沙沿重力下落。照片的环绕角度独立于整瓶倾倒，任意旋转后倒出都保持正确方向。已认可的静止瓶子和装瓶过程保持不变。
