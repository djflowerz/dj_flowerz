---
name: Cyber-Minimalism
colors:
  surface: '#131317'
  surface-dim: '#131317'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e12'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#2a292e'
  surface-container-highest: '#353439'
  on-surface: '#e5e1e7'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e5e1e7'
  inverse-on-surface: '#303034'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#656767'
  on-tertiary-container: '#e5e6e6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131317'
  on-background: '#e5e1e7'
  surface-variant: '#353439'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Spline Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Spline Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is engineered to capture the "Nocturnal Pulse"—the intersection of elite performance and underground energy. It targets a demographic of professional DJs and high-end audio enthusiasts who demand a platform that feels as advanced as their equipment. 

The visual style blends **Cyber-Neon** aesthetics with **Modern Minimalism**. It avoids the cluttered "gamer" trope, instead opting for expansive whitespace (or rather, "blackspace"), razor-sharp typography, and translucent glass layers. The emotional response is one of exclusivity, high-octane energy, and technological sophistication.

## Colors
This design system operates exclusively in a dark mode environment to mimic the atmosphere of a club or studio. 

- **The Void (#050508):** The deepest black serves as the foundation, providing infinite depth for neon elements to pop.
- **Electric Purple (#7C3AED):** The primary driver of the brand, used for high-action items and primary brand expressions.
- **Cyber Cyan (#06B6D4):** An accent used for secondary actions, data visualization, and "live" indicators.
- **Pure White (#FFFFFF):** Used strictly for high-contrast legibility and essential iconography.

## Typography
Typography is the primary engine of energy in the design system. 

**Headlines** utilize **Space Grotesk** at a Black (900) weight. All headlines must be italicized to convey a sense of forward motion and high-velocity performance. Tight letter spacing is required for larger display sizes to create a "blocky," structural feel.

**Body Text** utilizes **Spline Sans** at a Medium (500) weight. This ensures that even in low-light environments, the text remains exceptionally legible. We avoid "Regular" (400) weights to maintain the visual weight required by the high-contrast palette.

## Layout & Spacing
The design system utilizes a **12-column fixed-grid system** for desktop, centered within the viewport. Spacing is governed by a 4px baseline, but defaults to larger increments (24px, 48px) to reinforce the "Minimalist" aspect of the brand.

Elements should feel uncrowded. Use generous "air" around cards and text blocks to ensure the neon glows have room to breathe without overlapping destructively. Content should be grouped logically within glass containers, using 80px (xl) spacing between major sections to maintain a premium, editorial feel.

## Elevation & Depth
Depth in this design system is achieved through **Glassmorphism** and **Luminescence** rather than traditional shadows.

- **Level 1 (Base):** The #050508 background.
- **Level 2 (Glass Surface):** Semi-transparent fills (White at 5-8% opacity) with a 20px to 40px backdrop blur. Borders should be a subtle 1px stroke (White at 12% opacity).
- **Level 3 (Interactive):** Elements that are hovered or active gain a "Neon Glow." This is a drop shadow with a large blur radius (30px+) using the primary purple or cyan, at 40-50% opacity.
- **Sophisticated Blurs:** Background decorative elements (spheres or abstract shapes in brand colors) should be placed behind the glass cards with 100px+ layer blurs to create a sense of atmospheric depth.

## Shapes
The shape language is defined by hyper-rounded containers. A minimum radius of **32px** is required for all primary cards and buttons. Smaller components like tags or checkboxes should scale accordingly but always maintain a "pill" or "squircle" aesthetic. This softness contrasts with the aggressive typography, creating a balanced, professional-modern look.

## Components

- **Buttons:** Primary buttons are solid Electric Purple with white text. Secondary buttons utilize the "Glass" style with a Cyan border. All buttons must have a 32px+ radius and a subtle hover glow.
- **Glass Cards:** The signature container. Must feature a 1px inner stroke for a "highlighted edge" effect. No solid backgrounds; only semi-transparent blurs.
- **Inputs:** Darker than the base background (#000000) with a 1px bottom border that glows Cyan when focused.
- **Chips/Tags:** Pill-shaped with a low-opacity Purple fill and high-contrast White text.
- **Marketplace Lists:** Large-scale list items with generous padding (24px) and subtle separators (White at 5% opacity).
- **Audio Visualizers:** Should utilize the Cyan accent color, rendered in thin 2px vertical bars with varying heights to represent high-octane energy.
- **Waveform Seekbar:** A sophisticated cyan-to-purple gradient waveform, utilizing a glass-blur "playhead" to indicate progress.