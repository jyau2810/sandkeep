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
  tool-selected: "#e0d0b7"
  tool-ink: "#493a28"
  tool-line: "#b8a68c"
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
    lineHeight: 1.7
  primary-action:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: ".04em"
rounded:
  thumbnail: "2px"
  control: "3px"
  circle: "50%"
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
  button-rotation:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    height: "44px"
    width: "44px"
  button-text:
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    padding: "8px 0"
    height: "44px"
  loose-tool:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
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
  bottle-gallery:
    backgroundColor: "{colors.stage}"
  gallery-control-band:
    height: "64px"
    padding: "9px 0 10px"
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

The user subsequently rejected the rigid sand block disappearing during pouring and requested fine grains leaving the bottle, landing and spreading in the frame. The correction uses a temporary 3D grain volume and one route schedule across the interior, stream and flat painting. Decorative and repeated copy is removed. These changes have not received user acceptance, and an internal review does not establish that acceptance. The name 砂藏 / Sandkeep remains provisional. Reflective glass, textured cork, faceted packed sand and a contact shadow describe the rendering without a photorealism claim.

**Key Characteristics:**

- Warm, low-chroma interface around a photograph rendered as warm sand.
- Chinese serif display type paired with Chinese system sans controls.
- One workbench with photo selection and the primary switch above the art, and state-specific tools below.
- Restrained interface depth; soft lift belongs to the picture frame and material depth to the 3D object.
- A shared grain schedule connects the temporary bottle interior, bottle-mouth stream and local deposits in the frame.

## Colors

The palette is warm and low in chroma, leaving the warm sand image visually prominent. The frontmatter preserves the stylesheet’s source values and role names.

### Primary

- **Clay:** principal switch, brand mark, focus ring, text-action hover and range accent.
- **Dark clay:** enabled primary-action hover.

### Neutral

- **Paper:** page background and scrollbar track.
- **Ink:** primary text and control content.
- **Muted brown:** supporting copy, labels and quieter actions.
- **Sand line:** header separators and subdued boundaries.
- **Stage sand:** continuous backdrop for the bottle and framed painting.
- **Warm light:** text on the clay primary action.
- **Frame brown and mat:** a warm brown rim and pale inset surrounding the loose painting.
- **Selected tool sand and ink:** the pressed push/swirl tool uses a deeper fill and text.
- **Tool line:** joined tool boundary and central divider.

**The Warm Sand Rule.** Let the photograph supply the tonal structure of the warm sand. Use clay for the principal action, focus and small identity accents.

## Typography

**Display Font:** bundled Sandkeep Serif, with Songti SC and generic serif fallbacks. Local font files provide regular and semibold weights (400 and 600), with `font-display: swap`. The bundled subset covers the current Chinese headline.

**Body Font:** the platform and Chinese sans stack recorded in frontmatter.

The serif gives the product name and main headline a quiet, personal character. Sans type carries actions, upload guidance and errors. One headline remains above the workbench; the decorative header note and explanatory introduction are removed.

### Hierarchy

- **Display:** the main headline is (36px), regular, with line height (1.5) and tight tracking.
- **Brand:** the product wordmark is (27px), semibold, with open tracking.
- **Body:** fallback guidance is (14px), regular, with line height (1.9). Upload and primary-action labels also use (14px).
- **Control:** tools, text actions, file guidance, disclosure copy and the single privacy footer use (12px). Source line heights vary with their content, including (1.5), (1.7) and (1.8); the control role records the tool treatment.
- **Primary action:** (14px) regular sans with (.04em) tracking.

At widths up to (760px), the headline becomes (28px) with line height (1.6), and the brand becomes (25px). Practical copy remains at least (12px); upload and main-action labels remain (14px). There is no title field or creation-panel heading.

**The Two Type Voices Rule.** Use the bundled serif for the product name and main headline; use the system sans stack for controls and supporting copy.

## Layout

The page is centered within a maximum width of (1224px), with base horizontal padding of (48px). Its ruled header is (80px) high. The headline sits (32px) below it and (25px) above one full-width workbench. The workbench toolbar places the photo thumbnail and upload route on the left and a (168px × 48px) primary switch on the right; file guidance sits below the photo route. There is no naming field or detached creation column.

The art has a stable (460px) scene host and a ruled (64px) tool band beneath it. The same host height applies to sealed, loose, pouring and assembling states, preventing a layout jump during transfer. Rotation or loose tools occupy that shared band according to the ready state. The band stays empty during transfers; the primary button alone labels progress. Advanced seam settings and "换回示例" sit below the workbench. One footer states local photo processing and automatic saving. Decorative footer text, stage narration, repeated action hints and permanent save-success text are removed.

At widths from (1600px), scene and fallback heights become (520px), and the intro top margin becomes (38px). Up to (1100px), page padding becomes (35px), the headline top margin becomes (27px), and the English brand descriptor is hidden. Up to (760px), page padding becomes (22px), the header (64px), the primary-switch column (132px), and the scene host (420px) in all states. File guidance spans both toolbar columns. Up to (370px), padding becomes (16px), stage insets tighten and the upload SVG is hidden. The body minimum width is (320px).

Loose play has an independent, axis-aligned layer with a fixed (720 × 432px) bitmap and displayed aspect ratio (5:3). Its frame is centered within padding (52px 26px 24px), with maximum width (600px). Up to (760px), padding becomes (52px 18px 24px), frame maximum width becomes (556px), and loose tools use the whole bottom band. Narrower than (370px), horizontal layer insets become (14px). The canvas keeps its bitmap on resize.

## Elevation & Depth

The interface uses flat fills, thin borders and tonal separation. Ordinary controls have no drop shadows. The picture frame has a soft ambient shadow (`0 9px 18px #58432926`) beneath its warm brown rim and pale mat. In the settled loose state it is front-facing and has no perspective transform or bevel texture. Its temporary transfer motion uses only two-dimensional translation and scaling. Bottle depth comes from the 3D scene.

The bottle uses a lathed glass shell and separate torus rims with a thin transparent Fresnel shader. A bundled HDR studio image supplies reflections, with low opacity across the center and stronger edge and highlight opacity. The glass remains an approximation without physical refraction. Canvas-textured cork, an opaque lathed sand body with a separate top cap, a low plinth and a radial contact shadow complete the object.

Loose play uses a native (720 × 432px) two-dimensional canvas independent of the bottle camera. Seeded samples at (1.9px) intervals become mostly (2 × 2px) hard grains with a brighter top-left pixel and seeded brown gaps. The canvas uses pixelated image rendering. Push and swirl leave marks until explicit restore. A transfer plan records each grain's current brush position, home position, local impact point and departure, mouth-crossing, landing and settling times. Pouring starts with a small central deposit near the bottom. Later grains land progressively higher and roll downward and outward toward their photo positions. Assembly removes grains from their actual brushed positions when their scheduled flight starts. Cancellation preserves those positions; completion restores the exact home picture.

Packed sand uses a color map and an explicit tangent-space normal atlas (1536 × about 920px) on the body, with matching maps (256 × 256px) on the cap. The atlas rasterizes compact irregular five-to-seven-sided hulls, tilted crowns and bevel faces. Local stretch is (.92 to 1.08) before the complete shape rotates through a full turn. A fine underlayer and a second pass of larger grains use pitches of (3.8px and 7.4px) on the body and (2.2px and 4px) on the cap. Each grain samples its local photo color. Interstices use that local color at (.84) brightness, with softer local-color contact shadows beneath the grains. Lower crown peaks measure (.32 to .44 × grain size), with a rim height of (.035 × grain size). Each rasterized face supplies its own sloped tangent-space normal. A standard material receives scene lighting and shadows, using normal scale (.9), roughness (.94) and metalness (0). Both maps repeat horizontally with anisotropy (4). The material disposal event releases its normal map. Packed sand has no bump map, per-grain mesh geometry or grain collisions.

The opaque profile follows the inner glass through shoulder and neck, with sand-colored support above the photograph. Height-based UVs contain the photograph once within the straight body band, using its circumference and height to preserve image proportions. The top cap shares the packed treatment and stays at its accepted sealed height. During flow, the packed body and cap give way to a temporary dense 3D point volume. Seeded angle, height and radial samples cover the inner profile, with photo-derived warm colors and shaded compact grain sprites. Pouring compresses and shifts the remaining grains toward local gravity, then sends individual grains toward the neck. Assembly drops grains from the mouth and spreads them into the growing interior. The shared immutable route schedule controls mouth crossings and the remaining or accumulated bottle mass. A separate two-dimensional stream joins the projected mouth of the real moving bottle to each frame route. This sequence uses authored paths and bounds, without grain collisions or a full physics simulation.

The earlier `.impeccable/review/linked-sand` captures record the motion the user rejected. They do not validate this correction. The accepted static renderer baselines remain (8c2d986 / 2cf32f9), with (631ad5f) recording the pre-correction implementation. This documentation pass reads source only. It does not report new render parity, a browser review, a finish disposition or user acceptance.

**The Object Depth Rule.** Keep ordinary controls flat; reserve soft elevation for the physical picture frame and material depth for the bottle, cork, grains, plinth and scene contact shadow.

## Shapes

Controls use gently softened (3px) corners. The thumbnail is slightly tighter at (2px). Rotation buttons are circular. The painting and its frame remain rectangular and axis-aligned when settled. The frame uses a (6px) brown border and (9px) mat inset, reduced to (5px) and (7px) on narrow screens. The stage is rectangular and unrounded, without a detached card border. Thin rules distinguish the header and bottom control band. Icons are inline SVG strokes.

## Components

### Buttons

The main switch is a clay control with warm light text and an inline arrow. It stays (48px) high; width changes from (168px) to (132px) on narrow screens. Enabled hover uses dark clay. Its label describes the current direction: “倒出成画” or “装进瓶子”, with progress wording while busy. Disabled controls retain their shape with opacity (.48).

Rotation uses outlined circles with a (44px) target, (20px) arrows, and a warmer fill and border on enabled hover. Text actions have a minimum height of (44px), underlined (12px) labels and clay hover. Primary and rotation controls use short (.15s) state transitions.

### Loose-painting tools and frame

Push and swirl form a joined outlined pair with an explicit `aria-pressed` state. Selected tools use selected-tool sand and ink. Each target is at least (44px) high, with a minimum width of (72px), becoming (68px) on narrow screens and (62px) below (370px). The adjacent underlined “聚回照片” action restores the photo explicitly. These controls appear only in ready loose play, in the shared bottom band.

The brown frame and pale mat hold the sharp native (5:3) canvas. Warm sand is the sole offered treatment. Saved original-color records normalize to warm without losing their photograph or seam setting. New drafts carry no title; old titles remain readable only for storage compatibility and are absent from the interface.

### Inputs / Fields

Photo selection pairs a (44px) cropped square thumbnail with a visible “换张照片” label and inline upload SVG. The underlying native file picker is visually hidden; its keyboard focus outlines the visible label. It accepts JPG, PNG and WebP with visible (15 MB) guidance. Naming is removed. The clay-accented seam range is (44px) high and lives inside a native disclosure with a rotating SVG chevron. The disclosure and “换回示例” remain beneath the art.

### Cards / Containers

The bottle gallery is a flat stage-sand rectangle. Its bottom tool band shares the same surface and uses a horizontal rule. Recovery messages appear in a tinted inline area immediately below the workbench. Loading, pouring and assembling disable editing. The primary label and stage accessibility description identify transfer progress. A polite live status appears only while saving or when local saving is unavailable. Errors use `role="alert"` and provide a retry route when rendering cannot continue.

### Navigation

A single home link combines an outlined bottle mark, Chinese serif name and small English descriptor. The descriptor uses (12px) semibold sans and is hidden up to (1100px). There is no multi-route navigation system to extrapolate.

### Bottle stage and linked material motion

The focusable sealed stage retains vertical touch scrolling (`touch-action: pan-y`). Only the loose canvas uses `touch-action: none`, direct bitmap coordinates and pointer capture. Push uses swept segments within a (28px) bitmap radius and damped motion without a home spring. Swirl acts within a (160px) radius, with decaying angular motion after release. Selecting swirl previews it for (1100ms). Explicit restore uses per-grain delay and cubic easing over (820ms), finishing by about (980ms). The loose loop sleeps when settled.

Pouring lasts (2900ms). The real bottle lifts from its plinth, uncorks, scales down and tips through (115°). Its packed body switches to the temporary point volume during tipping. Individual grains slide toward the neck and leave at their scheduled mouth-crossing time. The projected mouth supplies the stream origin. Grains land near the central pile in the framed native canvas, then roll down and outward until the photograph is complete. The frame settles into its rectangular resting pose. The bottle exits before loose interaction resumes.

Assembly lasts (2800ms). Each current loose grain departs from its actual brushed position and follows its scheduled route toward the real bottle mouth. Interior point grains appear after the matching mouth crossing, fall and spread into the growing fill. Once all routes finish, the accepted packed body and cap return, the frame leaves, the bottle reaches its resting pose and the cork closes. The stream uses a subset of the same routes. Transient frame opacity accompanies grain movement.

Both directions keep the accepted (32°) sealed camera fit throughout their transient bottle poses: distance is `max(9.4, 8.5/aspect)`, elevation is `.45 × distance` above the look point at `(0,.32,0)`. The independent flat canvas never uses that projection. Completion or cancellation resets the temporary bottle pose, cork offset, frame transform, point volume and stream layers, and restores the packed material state. A completed transfer leaves the same finished photo in its destination state.

A sealed bottle turns around its vertical axis while preserving the photo. Arrow controls and the stage’s left/right keys each turn it by (π/5); pointer release uses bounded, decaying rotation inertia. Rendering stops when no interaction remains active. Reduced motion removes CSS transitions and release inertia and reaches the destination immediately for both switches. Manual loose manipulation remains available; swirl preview shortens to (180ms) and restore is immediate. Hidden pages complete active transfers and pause loose rendering.

Interactive elements use a (2px) clay focus outline with (5px) offset. The stage uses an inside offset (-5px), joined tools (-4px), and the visible upload-label treatment (3px). Preserve keyboard alternatives to direct pointer interaction.

## Do's and Don'ts

### Do:

- **Do** use the existing paper, ink, muted, line, clay and stage roles instead of introducing parallel surface colors.
- **Do** preserve the bundled serif headline and system sans control relationship.
- **Do** keep interactive targets at least the observed 44px height or diameter, with the existing clay focus treatment.
- **Do** place photo selection and the primary switch above the art, with the relevant rotation or sand tools directly below.
- **Do** retain one scene height through each ready and transfer state at the active breakpoint.
- **Do** preserve the finished photograph while turning the bottle and respect reduced motion.

### Don't:

- **Don't** extend the picture frame’s soft shadow into ordinary controls or introduce rounded floating panels.
- **Don't** reintroduce naming or an original-color selector into this workflow.
- **Don't** blur the loose field's hard pixel grains, top-left highlights or dark gaps.
- **Don't** copy the loose field's dark gaps onto packed sand. Keep packed grain variation near its local photo color.
- **Don't** alter the accepted warm sealed renderer to tune loose play or transient transfer poses.
- **Don't** drain a clipped photographic block or reveal the whole frame independently of grain landings.
- **Don't** treat the earlier bottle acceptance as approval of the new interface or transfer sequence, or claim photorealism from the reference photographs.
