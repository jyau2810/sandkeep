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
  field: "#faf8f2"
  button-text: "#fff8ed"
  frame-brown: "#8b6d4b"
  frame-mat: "#f3ead8"
  tool-selected: "#e0d0b7"
  tool-ink: "#493a28"
  tool-line: "#b8a68c"
typography:
  display:
    fontFamily: "'Sandkeep Serif', 'Songti SC', serif"
    fontSize: "clamp(37px, 3.5vw, 54px)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-.025em"
  brand:
    fontFamily: "'Sandkeep Serif', 'Songti SC', serif"
    fontSize: "27px"
    fontWeight: 600
    letterSpacing: ".13em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: ".02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 2.05
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.7
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    fontWeight: 400
  primary-action:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: ".08em"
rounded:
  thumbnail: "2px"
  control: "3px"
  circle: "50%"
spacing:
  compact: "8px"
  small: "10px"
  control-inset: "18px"
  narrow-gutter: "22px"
  stage-inset: "26px"
  medium-gap: "28px"
  studio-gap: "42px"
  target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.button-text}"
    typography: "{typography.primary-action}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "51px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.clay-dark}"
  button-rotation:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    height: "44px"
    width: "44px"
  button-text:
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    padding: "8px 0"
  loose-tool:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 18px"
    height: "44px"
  loose-tool-selected:
    backgroundColor: "{colors.tool-selected}"
    textColor: "{colors.tool-ink}"
  sand-frame:
    backgroundColor: "{colors.frame-mat}"
    padding: "9px"
    width: "min(100%, 600px)"
  input-title:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 11px"
    height: "44px"
    width: "100%"
  bottle-gallery:
    backgroundColor: "{colors.stage}"
  brand-navigation:
    textColor: "{colors.ink}"
    typography: "{typography.brand}"
---

# Design System: 砂藏 / Sandkeep

<!-- Extracted from src/styles.css, src/app.ts, src/scene.ts and src/loose-sand.ts. PRODUCT.md and .impeccable/{surface,quality-bar}.md establish the implementation context. -->

## Overview

**Creative North Star: "A personal display plinth in warm daylight"**

A quiet personal display plinth in warm daylight is the implementation’s working visual metaphor. Warm paper, brown ink and restrained terracotta controls frame the photograph as a small object to keep. The photograph supplies the tonal structure of the warm sand; the surrounding interface stays low in chroma.

This system is extracted from the built application. The user-provided cat grain reference and earliest interactive demo guide loose play. The Smithsonian and Petra photographs recorded in [Visual references](docs/visual-references.md) guide dense packed sand, the filled profile and perspective. Direction seed (889eefe6), grounded candidate 5, remains the code-led personal display plinth. The user accepted the fine-grain bottle with “瓶子的效果可以了”, then requested warm-only presentation and a framed flat loose painting. That acceptance protects the warm sealed material, geometry, camera, glass, lighting and rotation; it does not imply acceptance of the new loose implementation. The name 砂藏 / Sandkeep remains provisional. Reflective glass, textured cork, faceted packed sand and a contact shadow describe the current rendering choices without claiming photorealism.

**Key Characteristics:**
- Warm, low-chroma interface around a photograph rendered as warm sand.
- Chinese serif display type paired with Chinese system sans controls.
- A large object stage with compact controls and visibly separated states.
- Restrained interface depth; soft lift belongs to the picture frame and material depth to the 3D object.

## Colors

The palette is warm and low in chroma, leaving the warm sand image visually prominent. The frontmatter preserves the stylesheet’s source color values and role names.

### Primary

- **Clay:** principal action, brand mark, focus ring, text-action hover and range accent.
- **Dark clay:** enabled primary-action hover.

### Neutral

- **Paper:** page background and scrollbar track.
- **Ink:** primary text and control content.
- **Muted brown:** supporting copy, labels and quieter actions.
- **Sand line:** header separators and input strokes.
- **Stage sand:** continuous backdrop for the bottle and its gallery.
- **Field paper:** editable title surface.
- **Warm light:** text on the clay primary action.
- **Frame brown and mat:** a warm brown rim and pale inset surrounding the loose painting.
- **Selected tool sand and ink:** the pressed push/swirl tool uses a deeper fill and text.
- **Tool line:** the joined tool boundary and its central divider.

**The Warm Sand Rule.** Let the photograph supply the tonal structure of the warm sand. Use clay for the principal action, focus and small identity accents.

## Typography

**Display Font:** bundled Sandkeep Serif, with Songti SC and generic serif fallbacks. Local font files provide regular and semibold weights (400 and 600), with `font-display: swap`.

**Body Font:** the platform and Chinese sans stack recorded in frontmatter.

The serif gives the product name and main headline a quiet, personal character. Sans type carries practical choices, instructions and state changes. Preserve relative tracking and responsive sizes from the source rather than converting them into an unrelated type scale.

### Hierarchy

- **Display:** main two-line headline, using the frontmatter clamp on the base desktop layout.
- **Brand:** product wordmark, semibold with open tracking.
- **Title:** creation-panel heading.
- **Body:** introductory support copy, limited to (40ch).
- **Label:** title-field label.
- **Control:** compact text actions; the main action has a separate role. Push and swirl use (12px) regular sans text with line height (1.7).

At widths up to (1100px), the headline uses (42px). At widths up to (760px), it uses (36px) with line height (1.6), the brand becomes (25px), the panel title becomes (21px), and control text grows. At widths up to (370px), the headline is (33px). These overrides are intentional source facts, not a proportional scale.

**The Two Type Voices Rule.** Use the bundled serif for the product name and main headline; use the system sans stack for controls and supporting copy.

## Layout

The page is centered within a maximum width of (1512px), with base horizontal padding of (64px). A ruled header has a fixed height of (100px). The introduction separates the headline and short explanatory copy, followed by a two-column studio: a flexible gallery and a (320px) control column with a (42px) gap. The gallery has a (460px) scene above its ruled caption and rotation controls.

At widths from (1600px), horizontal padding becomes (70px), the controls (340px), studio gap (50px), and scene height (520px). At widths up to (1100px), padding becomes (35px), controls (285px), and gap (28px). At widths up to (760px), padding becomes (22px), the studio becomes one column with a (34px) gap, the object comes first, and the scene is (420px) high. At widths up to (370px), padding becomes (16px) and the scene (370px). The body has a minimum width of (320px). These scene heights continue to govern the sealed bottle and assembly.

Loose play has a separate, axis-aligned layer with a fixed (720 × 432px) bitmap and displayed aspect ratio (5:3). Its frame is centered inside the existing stage, with a desktop maximum width of (600px) and surrounding padding of (52px 26px 24px). At widths up to (760px), loose-only stage height is `clamp(300px, calc(60vw + 38px), 420px)`, the inset becomes (52px 18px 24px), and frame maximum width becomes (556px). A joined tool pair and explicit restore action sit beneath the canvas, before the caption. This responsive rule does not change sealed or assembling heights.

Use the observed spacing steps in frontmatter for neighboring controls. Preserve the gallery’s inset caption and top status line, and keep creation fields in a single vertical flow. Do not infer a general card grid from this one-object studio.

## Elevation & Depth

The interface uses flat fills, thin borders and tonal separation. Ordinary cards and buttons have no drop shadows. The requested picture frame has a soft ambient shadow (`0 9px 18px #58432926`) beneath its warm brown rim and pale mat. It remains front-facing, with no perspective transform or bevel texture. Bottle depth comes from the 3D scene.

The bottle uses a lathed glass shell and separate torus rims with a thin transparent Fresnel shader. A bundled HDR studio image supplies reflections, with low opacity across the center and stronger edge and highlight opacity. The glass remains an approximation without physical refraction. Canvas-textured cork, an opaque lathed sand body with a separate top cap, a low plinth and a radial contact shadow complete the object.

Loose play uses a native (720 × 432px) two-dimensional canvas independent of the bottle camera. Seeded samples at (1.9px) intervals become mostly (2 × 2px) hard grains with a brighter top-left pixel and seeded brown gaps. The canvas uses pixelated image rendering. There is no visible 3D loose plane, raycast mapping or spring toward the photo. Push and swirl leave persistent marks until explicit restore; resizing changes display size without rebuilding the bitmap.

Packed sand uses a color map and an explicit tangent-space normal atlas (1536 × about 920px) on the body, with matching maps (256 × 256px) on the cap. The atlas rasterizes compact irregular five-to-seven-sided hulls, tilted crowns and bevel faces. Local stretch is (.92 to 1.08) before the complete shape rotates through a full turn. A fine underlayer and a second pass of larger grains use pitches of (3.8px and 7.4px) on the body and (2.2px and 4px) on the cap. Each grain samples its local photo color. Interstices use that local color at (.84) brightness, with softer local-color contact shadows beneath the grains. Lower crown peaks measure (.32 to .44 × grain size), with a rim height of (.035 × grain size). Each rasterized face supplies its own sloped tangent-space normal. A standard material receives scene lighting and shadows, using normal scale (.9), roughness (.94) and metalness (0). Both maps repeat horizontally with anisotropy (4). The material disposal event releases its normal map. Packed sand has no bump map, per-grain mesh geometry or grain collisions.

The opaque profile follows the inner glass through the shoulder and neck, with sand-colored support above the photograph. Height-based UVs contain the photograph once within the straight body band, using its circumference and height to preserve the image proportions. The top cap shares the packed material treatment. The (2,500) shader points are visible only during assembly. Material parameters and contact-shadow values are captured in the sidecar as implementation facts.

Fresh actual captures in `.impeccable/review/framed-sand` cover (1440px) desktop, (390px) mobile and the user’s (590px) viewport, with push, swirl and corresponding bottle views. The capture pass reported no overflow or browser errors. An exact PNG comparison against accepted baseline (2cf32f9) matched the warm sealed bottle from both front and turned views. The independent finish review returned `ship` with no material fixes after inspecting those captures. That review does not establish user acceptance of the new loose painting.

**The Object Depth Rule.** Keep ordinary controls flat; reserve soft elevation for the physical picture frame and material depth for the bottle, cork, grains, plinth and scene contact shadow.

## Shapes

Controls use gently softened corners from the control radius. The thumbnail is slightly tighter. Rotation buttons are circular. The painting and its frame remain rectangular and axis-aligned. The frame uses a (6px) brown border and (9px) mat inset, reduced to (5px) and (7px) on narrow screens. The stage is rectangular and unrounded, with no detached card border. Thin rules distinguish the header, gallery caption, upload route and advanced settings. Icons are small inline SVG strokes, not text glyph substitutes.

## Components

### Buttons

The main action is a full-width clay control with warm light text, an inline arrow and the primary-action typography. Its height increases to (54px) on narrow screens. Enabled hover uses dark clay. Disabled buttons retain their shape and use opacity (.48).

Rotation uses outlined circles with a minimum target of (44px), (20px) arrow icons, and a warmer fill/border on enabled hover. Text actions have a minimum height of (44px), underlined labels and clay hover. Primary and rotation controls use short state transitions (.15s).

### Loose-painting tools and frame

Push and swirl form a joined, thinly outlined pair with a shared control-radius boundary and central divider. Each tool has an explicit label and `aria-pressed` state. The selected tool uses selected-tool sand and ink; hover uses a slightly lighter sand fill. Each target is at least (44px) high, with a minimum width of (72px), reduced to (68px) on narrow screens. The adjacent underlined “聚回照片” action restores the picture explicitly. These controls appear only when loose play is ready.

The warm brown frame and pale mat hold the native (5:3) sand canvas. Its pixel renderer stays sharp while the display width responds to the stage. The frame contains no bottle-camera projection, so parallel image edges remain parallel. Warm sand is the sole offered treatment; original-color records normalize to warm when loaded, without losing the photo, title or seam setting.

### Inputs / Fields

The title field uses field paper, a sand-line stroke, control-radius corners and an inset of (8px 11px). It grows from (44px) to (48px) high on narrow screens. The photo route pairs a square, cropped thumbnail with an underlined upload label; keyboard focus on the visually hidden file input outlines the visible label. Native range input uses clay as its accent and a (44px) height. Advanced seam controls live in a native disclosure with a rotating inline SVG chevron.

### Cards / Containers

The bottle gallery is a flat stage-sand rectangle. Its bottom caption shares the same surface, separated by a thin horizontal rule rather than elevation. Recovery messages appear in a tinted inline area near the action. Loading and assembly disable editing; the state line and polite live status announce progress and saving. Errors use `role="alert"` and offer a retry route when rendering cannot continue.

### Navigation

A single home link combines an outlined bottle mark, Chinese serif name and small English descriptor. The English descriptor is hidden up to (1100px). There is no tab or multi-route navigation system to extrapolate.

### Bottle stage and motion

The focusable sealed stage retains vertical touch scrolling (`touch-action: pan-y`). Only the loose canvas uses `touch-action: none`, direct bitmap coordinates and pointer capture, so mouse, pen and touch can manipulate sand while scrolling remains available outside it. Push applies swept segments within a (28px) bitmap radius and damps motion without a home spring. Swirl acts within a (160px) radius, with decaying angular motion after release. Selecting swirl previews it for (1100ms). Explicit restore uses per-grain delay and cubic easing over (820ms), finishing by about (980ms). The loose loop sleeps when its motion has settled.

Assembly lasts (2600ms). The native painting is suspended while temporary flying points follow the established level-dependent smoothstep paths with an arc and swirl. An upward clipping plane reveals the full-size sand body, while the cap follows the fill height and profile radius. The (32°) perspective camera retains the established aspect-aware assembly and sealed fits. Assembly blends distance and elevation from (.094 × distance) to (.45 × distance) above its look point. This camera covers glass, cork, sand, plinth and contact shadow; it does not project the loose painting.

A sealed bottle turns around its vertical axis while preserving the photograph. Arrow controls and the stage’s left/right keys each turn it by (π/5); pointer release uses bounded, decaying rotation inertia. Rendering stops when no interaction remains active.

Reduced motion removes CSS transitions and sealed release inertia and presents the sealed object immediately on assembly. Direct loose manipulation remains available; the swirl preview shortens to (180ms) and explicit restore is immediate. Hidden pages pause loose rendering and complete any bottle assembly.

All interactive elements use a clay focus outline (2px) with an offset (5px); the stage moves that offset inside (-5px). The joined loose tools keep their focus offset inside (-4px). The visible upload-label focus treatment uses an offset (3px). Preserve these alternatives to pointer interaction.

## Do's and Don'ts

### Do:

- **Do** use the existing paper, ink, muted, line, clay and stage roles instead of introducing parallel surface colors.
- **Do** preserve the bundled serif headline and system sans control relationship.
- **Do** keep interactive targets at least the observed 44px height or diameter, with the existing clay focus treatment.
- **Do** place the object before creation controls when the studio becomes one column.
- **Do** preserve the finished photograph while turning the bottle and respect reduced motion.

### Don't:

- **Don't** extend the picture frame’s soft shadow into ordinary controls or introduce rounded floating panels.
- **Don't** reintroduce an original-color selector or use the photograph’s source colors as competing interface accents.
- **Don't** blur the loose field's hard pixel grains, top-left highlights or dark gaps.
- **Don't** copy the loose field's dark gaps onto packed sand. Keep packed grain variation near its local photo color.
- **Don't** alter the accepted warm sealed renderer to tune loose play; the two presentations have separate rendering and input.
- **Don't** treat bottle acceptance as approval of the new framed painting or claim photorealism from the reference photographs.
