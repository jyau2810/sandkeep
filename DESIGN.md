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
  palette-selected: "#ede4d6"
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
  palette-option:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
  palette-option-selected:
    backgroundColor: "{colors.palette-selected}"
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

<!-- Extracted from src/styles.css, src/app.ts and src/scene.ts. PRODUCT.md and .impeccable/{surface,quality-bar}.md establish the implementation context. -->

## Overview

**Creative North Star: "A personal display plinth in warm daylight"**

A quiet personal display plinth in warm daylight is the implementation’s working visual metaphor. Warm paper, brown ink and restrained terracotta controls frame the photograph as a small object to keep. The photograph supplies the vivid color; the surrounding interface stays low in chroma.

This system is extracted from the rebuilt application. The user-provided cat grain reference guides loose play. The Smithsonian and Petra photographs recorded in [Visual references](docs/visual-references.md) guide the dense packed sand, filled profile and perspective. The interface and bottle remain a code-led interpretation. The name 砂藏 / Sandkeep is provisional, and the user has not accepted the full bottle. Reflective glass, textured cork, dense fine-grain sand and a contact shadow describe the current rendering choices without claiming photorealism.

**Key Characteristics:**
- Warm, low-chroma interface around a colorful personal photograph.
- Chinese serif display type paired with Chinese system sans controls.
- A large object stage with compact controls and visibly separated states.
- Restrained interface depth; material depth is concentrated in the 3D object.

## Colors

The palette is warm and low in chroma, leaving the photograph visually prominent. The frontmatter preserves the stylesheet’s source color values and role names.

### Primary

- **Clay:** principal action, brand mark, focus ring, text-action hover and range accent.
- **Dark clay:** enabled primary-action hover.

### Neutral

- **Paper:** page background and scrollbar track.
- **Ink:** primary text and control content.
- **Muted brown:** supporting copy, labels and quieter actions.
- **Sand line:** header separators, input strokes and unselected palette boundaries.
- **Stage sand:** continuous backdrop for the bottle and its gallery.
- **Field paper:** editable title surface.
- **Warm light:** text on the clay primary action.
- **Selected sand:** pressed palette-option fill; the border supplies a second state cue.

**The Photograph Color Rule.** Let the photograph supply the vivid color. Use clay for the principal action, focus and small identity accents.

## Typography

**Display Font:** bundled Sandkeep Serif, with Songti SC and generic serif fallbacks. Local font files provide regular and semibold weights (400 and 600), with `font-display: swap`.

**Body Font:** the platform and Chinese sans stack recorded in frontmatter.

The serif gives the product name and main headline a quiet, personal character. Sans type carries practical choices, instructions and state changes. Preserve relative tracking and responsive sizes from the source rather than converting them into an unrelated type scale.

### Hierarchy

- **Display:** main two-line headline, using the frontmatter clamp on the base desktop layout.
- **Brand:** product wordmark, semibold with open tracking.
- **Title:** creation-panel heading.
- **Body:** introductory support copy, limited to (40ch).
- **Label:** field legends and title-field label.
- **Control:** compact palette choices and text actions; the main action has a separate role.

At widths up to (1100px), the headline uses (42px). At widths up to (760px), it uses (36px) with line height (1.6), the brand becomes (25px), the panel title becomes (21px), and control text grows. At widths up to (370px), the headline is (33px). These overrides are intentional source facts, not a proportional scale.

**The Two Type Voices Rule.** Use the bundled serif for the product name and main headline; use the system sans stack for controls and supporting copy.

## Layout

The page is centered within a maximum width of (1512px), with base horizontal padding of (64px). A ruled header has a fixed height of (100px). The introduction separates the headline and short explanatory copy, followed by a two-column studio: a flexible gallery and a (320px) control column with a (42px) gap. The gallery has a (460px) scene above its ruled caption and rotation controls.

At widths from (1600px), horizontal padding becomes (70px), the controls (340px), studio gap (50px), and scene height (520px). At widths up to (1100px), padding becomes (35px), controls (285px), and gap (28px). At widths up to (760px), padding becomes (22px), the studio becomes one column with a (34px) gap, the object comes first, and the scene is (420px) high. At widths up to (370px), padding becomes (16px) and the scene (370px). The body has a minimum width of (320px).

Use the observed spacing steps in frontmatter for neighboring controls. Preserve the gallery’s inset caption and top status line, and keep creation fields in a single vertical flow. Do not infer a general card grid from this one-object studio.

## Elevation & Depth

The interface uses flat fills, thin borders and tonal separation. It does not use card or button drop shadows. The warm swatch alone has a small inset shadow; object depth comes from the 3D scene.

The bottle uses a lathed glass shell and separate torus rims with a thin transparent Fresnel shader. A bundled HDR studio image supplies reflections, with low opacity across the center and stronger edge and highlight opacity. The glass remains an approximation without physical refraction. Canvas-textured cork, an opaque lathed sand body with a separate top cap, a low plinth and a radial contact shadow complete the object.

Loose play uses a CPU-painted pixel field. Seeded samples at (1.9px) intervals become mostly (2 × 2px) hard grains with a brighter top-left pixel and dark gaps. A nearest-filtered canvas texture preserves those edges on the loose plane.

Packed sand uses a separate body map (1536px wide) with fine brightness variation around each local photo color and a slight bump map. A fully rough standard material receives scene lighting and shadows. The opaque profile follows the inner glass through the shoulder and neck, with sand-colored support above the photograph. Height-based UVs contain the photograph once within the straight body band, using its circumference and height to preserve the image proportions. The top cap shares the packed material treatment. The (2,500) shader points are visible only during assembly. Material parameters and contact-shadow values are captured in the sidecar as implementation facts.

**The Object Depth Rule.** Keep interface surfaces flat; express material depth through the bottle, cork, grains, plinth and scene contact shadow.

## Shapes

Controls use gently softened corners from the control radius. The thumbnail is slightly tighter. Rotation buttons and color swatches are circular. The stage is rectangular and unrounded, with no detached card border. Thin rules distinguish the header, gallery caption, upload route and advanced settings. Icons are small inline SVG strokes, not text glyph substitutes.

## Components

### Buttons

The main action is a full-width clay control with warm light text, an inline arrow and the primary-action typography. Its height increases to (54px) on narrow screens. Enabled hover uses dark clay. Disabled buttons retain their shape and use opacity (.48).

Rotation uses outlined circles with a minimum target of (44px), (20px) arrow icons, and a warmer fill/border on enabled hover. Text actions have a minimum height of (44px), underlined labels and clay hover. Primary and rotation controls use short state transitions (.15s).

### Palette choices

Two equal-width options use thin borders, circular visual swatches and pressed state through `aria-pressed`. Selected fill and a darker border provide a visible state beyond the swatch. Minimum option height grows from (44px) to (48px) at the narrow breakpoint. The original swatch uses a conic color blend; the warm swatch uses a sand fill with an inset shadow.

### Inputs / Fields

The title field uses field paper, a sand-line stroke, control-radius corners and an inset of (8px 11px). It grows from (44px) to (48px) high on narrow screens. The photo route pairs a square, cropped thumbnail with an underlined upload label; keyboard focus on the visually hidden file input outlines the visible label. Native range input uses clay as its accent and a (44px) height. Advanced seam controls live in a native disclosure with a rotating inline SVG chevron.

### Cards / Containers

The bottle gallery is a flat stage-sand rectangle. Its bottom caption shares the same surface, separated by a thin horizontal rule rather than elevation. Recovery messages appear in a tinted inline area near the action. Loading and assembly disable editing; the state line and polite live status announce progress and saving. Errors use `role="alert"` and offer a retry route when rendering cannot continue.

### Navigation

A single home link combines an outlined bottle mark, Chinese serif name and small English descriptor. The English descriptor is hidden up to (1100px). There is no tab or multi-route navigation system to extrapolate.

### Bottle stage and motion

The focusable stage retains vertical touch scrolling (`touch-action: pan-y`). In the loose state, pointer dragging stirs positions in the CPU-painted grain field and they settle back. Assembly lasts (2600ms). Temporary flying points follow level-dependent smoothstep paths with an arc and swirl. An upward clipping plane reveals the full-size sand body, while the cap follows the fill height and profile radius.

The (32°) perspective camera has separate aspect-aware fits for the loose plane and sealed bottle. Assembly blends both distance and elevation. The sealed camera sits above its look point by (0.45 × distance), compared with (0.094 × distance) in loose play. One projection covers the glass, cork, sand, plinth and contact shadow.

A sealed bottle turns around its vertical axis while preserving the photograph. Arrow controls and the stage’s left/right keys each turn it by (π/5); pointer release uses bounded, decaying rotation inertia. Rendering stops when no interaction remains active.

Reduced motion removes CSS transitions, disables loose stirring and inertia, and presents the sealed object immediately on assembly. The scene also completes assembly when the page becomes hidden.

All interactive elements use a clay focus outline (2px) with an offset (5px); the stage moves that offset inside (-5px). The visible upload-label focus treatment uses an offset (3px). Preserve these alternatives to pointer interaction.

## Do's and Don'ts

### Do:

- **Do** use the existing paper, ink, muted, line, clay and stage roles instead of introducing parallel surface colors.
- **Do** preserve the bundled serif headline and system sans control relationship.
- **Do** keep interactive targets at least the observed 44px height or diameter, with the existing clay focus treatment.
- **Do** place the object before creation controls when the studio becomes one column.
- **Do** preserve the finished photograph while turning the bottle and respect reduced motion.

### Don't:

- **Don't** add card shadows or rounded floating panels to the currently flat interface.
- **Don't** use the scene’s photo colors as competing interface accents.
- **Don't** blur the loose field's hard pixel grains, top-left highlights or dark gaps.
- **Don't** copy the loose field's dark gaps onto packed sand. Keep packed grain variation near its local photo color.
- **Don't** treat the loose-grain reference or real-bottle photographs as user approval of the full bottle.
