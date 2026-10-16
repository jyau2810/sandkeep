---
name: "砂藏 / Sandkeep"
description: "A photograph becomes a small sand-art bottle to keep."
colors:
  paper: "#f6f3ec"
  ink: "#3c372e"
  muted: "#6e624f"
  line: "#d9d1c2"
  clay: "#985235"
  clay-dark: "#78402a"
  stage: "#ece6da"
  button-text: "#fff8ed"
  frame-brown: "#8b6d4b"
  frame-mat: "#f3ead8"
typography:
  display:
    fontFamily: "'Sandkeep Serif', 'Songti SC', serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-.025em"
  brand:
    fontFamily: "'Sandkeep Serif', 'Songti SC', serif"
    fontSize: "27px"
    fontWeight: 600
    letterSpacing: ".13em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.9
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 400
  gesture:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: ".04em"
  primary-action:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: ".04em"
rounded:
  thumbnail: "2px"
  control: "3px"
spacing:
  compact: "8px"
  control-gap: "12px"
  narrow-control-gap: "14px"
  toolbar-bottom: "16px"
  control-inset: "18px"
  narrow-gutter: "22px"
  toolbar-gap: "24px"
  stage-inset: "26px"
  medium-gap: "28px"
  target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.button-text}"
    typography: "{typography.primary-action}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
    width: "168px"
  button-primary-hover:
    backgroundColor: "{colors.clay-dark}"
  button-text:
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    padding: "8px 0"
    height: "44px"
  sand-frame:
    backgroundColor: "{colors.frame-mat}"
    padding: "9px"
    width: "min(100%, 600px, calc((var(--scene-height) - 112px - var(--frame-inset)) * 5 / 3 + var(--frame-inset)))"
  bottle-gallery:
    backgroundColor: "{colors.stage}"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  gesture-hint:
    textColor: "{colors.muted}"
    typography: "{typography.gesture}"
  brand-navigation:
    textColor: "{colors.ink}"
    typography: "{typography.brand}"
---

# Design System: 砂藏 / Sandkeep

<!-- Extracted from src/styles.css, src/app.ts, src/scene.ts, src/loose-sand.ts, src/sand-motion.ts, src/sand-reservoir.ts and src/sand-transfer.ts. PRODUCT.md and .impeccable/{surface,quality-bar}.md establish the implementation context. -->

## Overview

**Creative North Star: "A personal display plinth in warm daylight"**

A quiet personal display plinth in warm daylight is the implementation’s working visual metaphor. Warm paper, brown ink and restrained terracotta controls frame the photograph as a small object to keep. The photograph supplies the tonal structure of the warm sand; the surrounding interface stays low in chroma.

This system records the built application. The user-provided cat grain reference and earliest interactive demo guide loose play. The Smithsonian and Petra photographs in [Visual references](docs/visual-references.md) guide packed sand, the filled profile and perspective. Direction seed (889eefe6), grounded candidate 5, remains the code-led personal display plinth. The user accepted the fine-grain bottle with "瓶子的效果可以了". That acceptance protects the warm sealed material, geometry, camera, glass, lighting and rotation.

The user subsequently rejected the rigid sand block disappearing during pouring and requested fine grains leaving the bottle, landing and spreading in the frame. That direction uses one route schedule across the interior, stream and flat painting. The user then rejected upward suction during assembly and requested a tilted frame pouring into a bottle below. Earlier assembly feedback rejects a frame that appears empty while the bottle continues filling, and the temporary bottle sand texture. Assembly now drains a finite source bank through the low corner on a cumulative-area schedule; its settled bottle volume uses private clones of the accepted lit fine-grain materials. Only airborne assembly grains use particles. The current interface keeps the exact headline "把回忆装进沙子里" and one bottom-center gesture hint. Rotation buttons, seam controls, the push/swirl switch and the footer are removed. The downward-pour pose separates photo yaw from the bottle tip, docks before grain departure and holds through the final landing. These changes have not received user acceptance, and an internal review does not establish that acceptance. The name 砂藏 / Sandkeep remains provisional. Reflective glass, textured cork, faceted packed sand and a contact shadow describe the rendering without a photorealism claim.

**Key Characteristics:**

- Warm, low-chroma interface around a photograph rendered as warm sand.
- Chinese serif display type paired with Chinese system sans controls.
- One workbench with photo selection and the primary switch above the art, one gesture hint inside it, restore beside the primary action, and a quiet reset below.
- Restrained interface depth; soft lift belongs to the picture frame and material depth to the 3D object.
- A shared grain schedule connects the temporary bottle interior, bottle-mouth stream and local deposits in the frame. Assembly drains a finite bank from a tilted frame. The pour holds the mouth above loose intermittent downward grains after any inspection yaw.

## Colors

The palette is warm and low in chroma, leaving the warm sand image visually prominent. The frontmatter preserves the stylesheet’s source values and role names.

### Primary

- **Clay:** principal switch, brand mark, focus ring and text-action hover.
- **Dark clay:** enabled primary-action hover.

### Neutral

- **Paper:** page background and scrollbar track.
- **Ink:** primary text and control content.
- **Muted brown:** supporting copy, labels and quieter actions.
- **Sand line:** header separators and subdued boundaries.
- **Stage sand:** continuous backdrop for the bottle and framed painting.
- **Warm light:** text on the clay primary action.
- **Frame brown and mat:** a warm brown rim and pale inset surrounding the loose painting.

**The Warm Sand Rule.** Let the photograph supply the tonal structure of the warm sand. Use clay for the principal action, focus and small identity accents.

## Typography

**Display Font:** bundled Sandkeep Serif, with Songti SC and generic serif fallbacks. Local font files provide regular and semibold weights (400 and 600), with `font-display: swap`. The bundled subset covers the current Chinese headline.

**Body Font:** the platform and Chinese sans stack recorded in frontmatter.

The serif gives the product name and main headline a quiet, personal character. Sans type carries actions, upload guidance and errors. The exact headline "把回忆装进沙子里" remains above the workbench. The decorative header note and explanatory introduction are removed.

### Hierarchy

- **Display:** the main headline is (36px), regular, with line height (1.5) and tight tracking.
- **Brand:** the product wordmark is (27px), semibold, with open tracking.
- **Body:** fallback guidance is (14px), regular, with line height (1.9). Upload and primary-action labels also use (14px).
- **Control:** text actions, file guidance and save status use (12px). File guidance uses line height (1.5), and save status uses (1.8).
- **Gesture:** the shared stage hint uses (13px), line height (20px) and (.04em) tracking.
- **Primary action:** (14px) regular sans with (.04em) tracking.

At widths up to (760px), the headline becomes (28px) with line height (1.6), and the brand becomes (25px). Practical copy remains at least (12px); upload and main-action labels remain (14px). There is no title field or creation-panel heading.

**The Two Type Voices Rule.** Use the bundled serif for the product name and main headline; use the system sans stack for controls and supporting copy.

## Layout

The page is centered within a maximum width of (1224px), with base horizontal padding of (48px). Its ruled header is (80px) high. The headline sits (32px) below it and (25px) above one full-width workbench. The workbench toolbar places the photo thumbnail and upload route on the left and a (168px × 48px) primary switch on the right; file guidance sits below the photo route. There is no naming field or detached creation column.

The art has a stable (460px) scene host in sealed, loose, pouring and assembling states. One gesture hint sits inside the stage, centered horizontally and (18px) above its bottom edge. It reads "左右拖动旋转" for a ready sealed bottle and "轻轻拨动，玩一会儿沙" for ready loose play. The hint is hidden during loading, transfers and fatal render failures. There is no bottom tool band.

Below the stage, feedback appears only when needed. A separate action row follows with an (8px) top margin and (28px) gap. The outlined "复原" button sits beside the primary action above the stage during ready loose play. "换回示例" stays on the right, with automatic left margin. The seam disclosure, rotation buttons, tool switch and footer are removed. Photos still process locally. Completed assembly still saves the draft to this browser, and startup restores its latest saved bottle. Saving and storage-unavailable feedback remain inline.

At widths from (1600px), scene and fallback heights become (520px), and the intro top margin becomes (38px). Up to (1100px), page padding becomes (35px), the headline top margin becomes (27px), and the English brand descriptor is hidden. Up to (760px), page padding becomes (22px), the header (64px), the primary-switch column (132px), and the scene host (420px) in all states. File guidance spans both toolbar columns. Up to (540px), the photo picker occupies the first row, guidance the second, and the right-aligned action pair the third. Up to (370px), padding becomes (16px), stage insets tighten and the upload SVG is hidden. The body minimum width is (320px).

Loose play has an independent, axis-aligned layer with a fixed (720 × 432px) bitmap and displayed aspect ratio (5:3). Its frame is centered within padding (52px 26px 60px), with maximum width (600px), additionally bounded by the unchanged stage height minus its (112px) vertical padding and outer frame inset. This keeps at least (22px) between the frame and gesture hint. Up to (760px), padding becomes (52px 18px 60px), the outer frame inset becomes (24px), and the action-row gap becomes (18px). Narrower than (370px), horizontal layer insets become (14px). The canvas keeps its bitmap on resize.

## Elevation & Depth

The interface uses flat fills, thin borders and tonal separation. Ordinary controls have no drop shadows. The picture frame has a soft ambient shadow (`0 9px 18px #58432926`) beneath its warm brown rim and pale mat. In the settled loose state it is front-facing and has no perspective transform or bevel texture. Its temporary transfer motion uses two-dimensional translation and scaling, with rotation during assembly. The affine transform preserves the rectangular frame. Bottle depth comes from the 3D scene.

The bottle uses a lathed glass shell and separate torus rims with a thin transparent Fresnel shader. A bundled HDR studio image supplies reflections, with low opacity across the center and stronger edge and highlight opacity. The glass remains an approximation without physical refraction. Canvas-textured cork, an opaque lathed sand body with a separate top cap, a low plinth and a radial contact shadow complete the object.

Loose play uses a native (720 × 432px) two-dimensional canvas independent of the bottle camera. Seeded samples at (1.9px) intervals become mostly (2 × 2px) hard grains with a brighter top-left pixel and seeded brown gaps. The canvas uses pixelated image rendering. Dragging pushes sand and leaves marks until explicit restore. No swirl choice is exposed. A transfer plan records each grain's current brush position, home position, local impact point and departure, mouth-crossing, landing and settling times. Pouring starts with a small central deposit near the bottom. Later grains land progressively higher and roll downward and outward toward their photo positions. Assembly starts at each grain's current brushed position, clamped only to the finite native grain footprint. A cumulative-area bank maps each position to its departure capacity. As discharged area increases, the bank moves monotonically toward the lowest corner while retaining its finite footprint. The native canvas removes each grain only at its own departure. Cancellation preserves the brushed positions. Completion restores the exact home picture.

Packed sand uses a color map and an explicit tangent-space normal atlas (1536 × about 920px) on the body, with matching maps (256 × 256px) on the cap. The atlas rasterizes compact irregular five-to-seven-sided hulls, tilted crowns and bevel faces. Local stretch is (.92 to 1.08) before the complete shape rotates through a full turn. A fine underlayer and a second pass of larger grains use pitches of (3.8px and 7.4px) on the body and (2.2px and 4px) on the cap. Each grain samples its local photo color. Interstices use that local color at (.84) brightness, with softer local-color contact shadows beneath the grains. Lower crown peaks measure (.32 to .44 × grain size), with a rim height of (.035 × grain size). Each rasterized face supplies its own sloped tangent-space normal. A standard material receives scene lighting and shadows, using normal scale (.9), roughness (.94) and metalness (0). Both maps repeat horizontally with anisotropy (4). The material disposal event releases its normal map. Packed sand has no bump map, per-grain mesh geometry or grain collisions.

The opaque profile follows the inner glass through shoulder and neck, with sand-colored support above the photograph. Height-based UVs contain the photograph once within the straight body band, using its circumference and height to preserve image proportions. The static top cap shares the packed treatment and stays at its accepted sealed height. The current pour renderer uses a temporary dense 3D point volume. Seeded angle, height and radial samples cover the inner profile, with photo-derived warm colors and shaded compact sprites. The pose and stream revision retains this material while separating picture yaw from the stage tip and replacing the target-seeking pour stream with a narrow gravity drop. Assembly instead uses private clones of the accepted body and cap materials, sharing their immutable color and normal textures and the unchanged side geometry. A temporary radial cap forms a low cone with small ripples above the landed volume. A height-to-volume lookup controls its level; only grains between mouth crossing and landing appear as small airborne particles. The accepted resting meshes and their material state are untouched. The shared immutable route schedule tracks source, external stream, airborne interior and landed mass. A separate two-dimensional stream crosses the outer wooden rim before falling into the actual bottle mouth. This sequence uses authored gravity paths and bounds, without grain collisions or a full physics simulation.

The earlier `.impeccable/review/linked-sand` captures record the rejected block motion. The user also rejected upward suction, then the prematurely empty frame and mismatched temporary bottle sand in subsequent assembly versions. Earlier capture sets and previous ship verdicts do not validate this consistency and material correction. The accepted static renderer baselines remain (8c2d986 / 2cf32f9), with (631ad5f) recording the implementation before the fine-flow correction. This documentation pass reads source only. It does not report new render parity, a browser review, a finish disposition or user acceptance.

**The Object Depth Rule.** Keep ordinary controls flat; reserve soft elevation for the physical picture frame and material depth for the bottle, cork, grains, plinth and scene contact shadow.

## Shapes

Controls use gently softened (3px) corners. The thumbnail is slightly tighter at (2px). The painting and its frame remain rectangular and axis-aligned when settled. The frame uses a (6px) brown border and (9px) mat inset, reduced to (5px) and (7px) on narrow screens. The stage is rectangular and unrounded, without a detached card border. A thin rule distinguishes the header. Icons are inline SVG strokes.

## Components

### Buttons

The main switch is a clay control with warm light text and an inline arrow. It stays (48px) high; width changes from (168px) to (132px) on narrow screens. Enabled hover uses dark clay. Its label describes the current direction: “倒出成画” or “装进瓶子”, with progress wording while busy. Disabled controls retain their shape with opacity (.48).

Text actions have a minimum height of (44px), underlined (12px) labels and clay hover. The primary action uses a short (.15s) background transition. The secondary "复原" button has an outlined (72px × 48px) footprint, becoming at least (66px) wide on narrow screens. Its border is warm brown and hover adds a sand tint. The action pair uses a (12px) gap, becoming (10px) below (760px). Rotation remains available through horizontal dragging and the focused stage's arrow keys.

### Loose painting and frame

Dragging the native canvas pushes sand directly. The push/swirl switch is removed. The outlined "复原" button restores the photo explicitly beside "装进瓶子" above the stage. It is hidden while loose play is unavailable. The reset action stays on that row's right side.

The brown frame and pale mat hold the sharp native (5:3) canvas. Warm sand is the sole offered treatment. Saved original-color records normalize to warm without losing their photograph or stored seam setting. The seam setting is no longer editable in the interface. New drafts carry no title. Old titles remain readable only for storage compatibility.

### Gesture hint

A single noninteractive hint uses muted text and a horizontal-arrow SVG. Its (18px) icon sits (9px) from the label. The hint has no background, border or shadow, uses `pointer-events: none`, and stays centered (18px) above the stage bottom in both ready states. The focusable scene references it with `aria-describedby`.

### Inputs / Fields

Photo selection pairs a (44px) cropped square thumbnail with a visible “换张照片” label and inline upload SVG. The underlying native file picker is visually hidden; its keyboard focus outlines the visible label. It accepts JPG, PNG and WebP with visible (15 MB) guidance. Naming and the seam disclosure are removed. "换回示例" is an underlined text action below the art on the right.

### Cards / Containers

The bottle gallery is a flat stage-sand rectangle with the gesture hint overlaid at its bottom center. Recovery messages appear in a tinted inline area below the stage and above the action row. Loading, pouring and assembling disable editing. The primary label and stage accessibility description identify transfer progress. A polite live status appears only while saving or when local saving is unavailable. Errors use `role="alert"` and provide a retry route when rendering cannot continue.

### Navigation

A single home link combines an outlined bottle mark, Chinese serif name and small English descriptor. The descriptor uses (12px) semibold sans and is hidden up to (1100px). There is no multi-route navigation system to extrapolate.

### Bottle stage and linked material motion

The focusable sealed stage retains vertical touch scrolling (`touch-action: pan-y`). Only the loose canvas uses `touch-action: none`, direct bitmap coordinates and pointer capture. Push uses swept segments within a (28px) bitmap radius and damped motion without a home spring. The application exposes no swirl tool. Explicit restore uses per-grain delay and cubic easing over (820ms), finishing by about (980ms). The loose loop sleeps when settled.

The pour keeps the existing (2900ms) duration and accepted static materials. Picture inspection yaw stays local while the whole bottle tips in stage space. The mouth docks above the receiver before the first scheduled departure and holds through the final landing. Seeded unequal emission packets create real gaps in source discharge. Fixed sparse representatives accelerate downward with varied flight times, slight lateral separation and exact shared impacts. Rough arrival heights and two small asynchronous slides grow an irregular bed before the exact native picture settles. There is no frame-random deletion of airborne grains. The preparation pose must fit the cork and reserve the bottom gesture-hint area. The frozen production build has actual captures at 1440px, 390px and 590px, including rotated-pour samples. Internal verification does not establish user acceptance.

Assembly lasts (4000ms). The frame starts shrinking and lifting before it rotates clockwise to (28°). Its bottom-right corner becomes the outlet above an upright bottle. The tray and mouth reach their transfer poses before grains move and hold those poses throughout flow. Actual brushed positions are clamped to the native footprint (x:1–717px, y:1–429px). A cumulative-area bank assigns each position a capacity and cross-bank position. Removing that capacity steadily moves the finite bank toward the low corner, instead of collapsing it to a thin edge before its scheduled departures. Discharge runs from (880ms) to at most (3240ms). The stream bridges the native canvas, mat and outer wooden rim, then falls (26px) from the outer corner into the projected mouth.

Each grain crosses the mouth (60ms) after leaving the native canvas and lands a further (100–180ms) later. The route envelope ends with the last mouth crossing by (3300ms), landing by (3400ms) and settling by (3440ms). These short flight intervals connect the still-visible source bank to the rising bottle volume. Source, external stream, airborne interior and landed fractions come from the same event times. Landed mass, rather than an independent animation clock, drives the temporary lit packed volume from the bottom upward. A (1024-step) inner-profile volume lookup places its level, and a (24-ring × 96-sector) cap forms a low radial cone with small ripples; mound height tapers to zero as the bottle fills. The airborne point limits are (.45–1.2px), and those points disappear at landing. At (3500ms), the temporary assembly meshes give way to the unchanged accepted packed body and cap. The bottle starts returning to its resting pose at (3560ms), after flow ends. The empty frame leaves and the cork closes. Transient frame opacity accompanies its exit.

Both directions keep the accepted (32°) sealed camera fit throughout their transient bottle poses: distance is `max(9.4, 8.5/aspect)`, elevation is `.45 × distance` above the look point at `(0,.32,0)`. The independent flat canvas never uses that projection. Completion or cancellation resets the temporary bottle pose, cork offset, frame transform, point volume and stream layers, and restores the packed material state. A completed transfer leaves the same finished photo in its destination state.

A sealed bottle turns around its vertical axis while preserving the photo. The focused stage's left and right arrow keys each turn it by (π/5). Pointer release uses bounded, decaying rotation inertia. Visible rotation buttons are removed. Rendering stops when no interaction remains active. Reduced motion removes CSS transitions and release inertia and reaches the destination immediately for both switches. Manual loose push remains available, and restore is immediate. Hidden pages complete active transfers and pause loose rendering.

Interactive elements use a (2px) clay focus outline with (5px) offset. The stage uses an inside offset (-5px), and the visible upload-label treatment uses (3px). Preserve keyboard alternatives to direct pointer interaction.

## Do's and Don'ts

### Do:

- **Do** use the existing paper, ink, muted, line, clay and stage roles instead of introducing parallel surface colors.
- **Do** preserve the bundled serif headline and system sans control relationship.
- **Do** keep interactive targets at least the observed 44px height, with the existing clay focus treatment.
- **Do** place photo selection and the primary switch above the art, with one state-specific gesture hint inside its bottom center, restore next to the main switch and a quiet reset below.
- **Do** retain one scene height through each ready and transfer state at the active breakpoint.
- **Do** preserve the finished photograph while turning the bottle and respect reduced motion.
- **Do** hold the tilted frame outlet above the actual mouth during assembly, then return the bottle to its accepted resting renderer after the last grain settles.

### Don't:

- **Don't** extend the picture frame’s soft shadow into ordinary controls or introduce rounded floating panels.
- **Don't** reintroduce naming or an original-color selector into this workflow.
- **Don't** blur the loose field's hard pixel grains, top-left highlights or dark gaps.
- **Don't** copy the loose field's dark gaps onto packed sand. Keep packed grain variation near its local photo color.
- **Don't** alter the accepted warm sealed renderer to tune loose play or transient transfer poses.
- **Don't** drain a clipped photographic block or reveal the whole frame independently of grain landings.
- **Don't** pull assembly grains upward from the frame or add a tilt over the old suction path.
- **Don't** hide the source bank before its scheduled departures or render settled assembly sand as a sparse point cloud.
- **Don't** treat the earlier bottle acceptance as approval of the new interface or transfer sequence, or claim photorealism from the reference photographs.
