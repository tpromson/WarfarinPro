---
name: WarfarinPro
description: Physician-directed warfarin dosing support and daily patient schedule viewer.
colors:
  primary: "#176087"
  neutral-bg: "#f8fbfc"
  neutral-text: "#17324d"
  border: "#d8e4e8"
  orange-pill: "#f59a68"
  blue-pill: "#5fa9e7"
  hold-pill: "#c24132"
  danger-bg: "#fff1f2"
  danger-text: "#9f2b21"
typography:
  display:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: "1.2"
  body:
    fontFamily: "Inter, Noto Sans Thai, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "1.5"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 13px"
  panel:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "20px"
  pill-visual:
    rounded: "{rounded.full}"
---

# Design System: WarfarinPro

## 1. Overview

**Creative North Star: "The Patient's Safety Compass" (เข็มทิศความปลอดภัยของผู้ป่วย)**

"The Patient's Safety Compass" is a design system structured to guide both clinicians and patients through high-stakes dosing workflows with absolute clarity and calm. For clinicians, it operates as a high-throughput, low-friction digital clipboard. For patients and caregivers, it acts as an immediate visual index of their daily medication schedule, eliminating any need for reading comprehension or dosing interpretation.

**Key Characteristics:**
- **Zero-Friction Utility**: Clean grid layouts, clear form fields, and minimal decorative elements.
- **Extreme Patient Legibility**: Generous typography scale, high-contrast swatches, and clear visual pill representations.
- **Calm, Clinical Safety**: Utilizing clinical blues, soft paper-like backgrounds, and warm amber/red accents reserved purely for safety alerts.

## 2. Colors

The color palette is built around trustworthy clinical blues, soft tinted neutrals that reduce eye strain, and specialized pill color codes mapped directly to standard medication strengths.

### Primary
- **Clinic Blue** (`#176087`): The interactive brand anchor. Used for buttons, active tabs, panel titles, and active selection borders.

### Neutral
- **Clinic Paper** (`#f8fbfc`): The dominant surface and card container background, presenting a soft, clinical slate feel.
- **Clinic Ink** (`#17324d`): The primary text color. Used for maximum contrast on all body text, headings, and labels.
- **Clinic Line** (`#d8e4e8`): Used for card borders, form borders, and tab separators to keep panels structured.

### Pill & Dose Strengths
- **Orange Pill** (`#f59a68` / `#f8a87c`): Represents the **2 mg** Warfarin tablet.
- **Blue Pill** (`#5fa9e7` / `#78bef7`): Represents the **3 mg** Warfarin tablet.
- **Hold Pill** (`#c24132` / `#e54b3b`): Represents a medication hold day (**0 mg**).

### Named Rules
**The Rarity of Accent Rule.** The primary `Clinic Blue` is used on less than 10% of any given screen. Its rarity is what signals interactive focus and clinical hierarchy.
**The Double-Encoding Dosing Rule.** A pill's strength must never be communicated by color alone. Every pill visual must display both its numerical dose (e.g., "2", "3") and physical split shape (e.g. half-tablet cut) to support colorblind and visually impaired users.

## 3. Typography

**Display Font:** Inter, "Noto Sans Thai", sans-serif
**Body Font:** Inter, "Noto Sans Thai", sans-serif

The system uses a single unified sans-serif stack featuring Inter for numbers/English text and Noto Sans Thai for clean, legible Thai characters. 

### Hierarchy
- **Display** (Bold (900), 34px, line-height 1.2): Used for sheet headers in Patient Mode/Elderly Mode.
- **Headline** (Bold (800), 18px, line-height 1.3): Panel titles and key section headers.
- **Title** (Bold (700), 15px, line-height 1.4): Day headings in schedules.
- **Body** (Bold (700) / Regular, 14px, line-height 1.5): Standard copy, form field values, and safety descriptions.
- **Label** (Bold (800), 12px, letter-spacing 0.05em): Uppercase secondary labels (e.g. W-code description).

### Named Rules
**The Thai Legibility Rule.** Because Noto Sans Thai requires taller vertical space for vowels and tone marks, line-heights must never fall below 1.4 for body copy and 1.2 for display text.

## 4. Elevation

WarfarinPro is flat-by-default to preserve its clinical, paper-like slate aesthetic. Depth is communicated via subtle borders and soft shadows triggered primarily by user interaction.

### Shadow Vocabulary
- **Ambient Low** (`0 2px 4px rgba(23, 96, 135, 0.15)`): Used on active buttons and segmented controls.
- **Interaction Hover** (`0 4px 8px rgba(23, 96, 135, 0.25)`): Applied on button hover states to indicate responsiveness.
- **Soft Panel** (`0 10px 25px rgba(23, 50, 77, 0.05)`): Background shadow for card panels to separate them from the clinic paper background.

### Named Rules
**The Flat-at-Rest Rule.** All surfaces remain flat and border-only in their idle state. Shadows appear only as feedback to active hover or click actions.

## 5. Components

### Buttons
- **Shape:** Rounded corners (8px radius)
- **Primary:** Background `Clinic Blue` with white text. Transition speed: `0.2s`.
- **Hover:** Darkened blue (`#114c6c`), elevated with `Interaction Hover` shadow and translated `-1px` vertically.

### Panels
- **Shape:** Soft-rounded corners (12px radius)
- **Border:** `1px solid Clinic Line` with a subtle linear gradient background.

### Day Rows (Schedule View)
- **Shape:** Soft-rounded corners (10px radius)
- **Spacing:** Inner padding of `8px 12px`.
- **States:** Hover translates the row slightly (`2px` right) and adds a soft shadow. Hold days receive a warm orange border (`#fed7aa`).

### Pill Visuals
- **Shape:** Rounded pill capsule (999px radius)
- **Texturing:** Linear gradient for depth, with a solid dividing line for half-tablets.
- **Interactive Scale:** Hovering scales the pill (`1.15x`) and rotates it slightly (`2deg`).

## 6. Do's and Don'ts

### Do:
- **Do** ensure all safety alerts (Danger, Hard Stop) use the predefined high-contrast red (`#9f2b21` on `#fff1f2` background).
- **Do** apply `text-wrap: balance` on headers and labels.
- **Do** tint neutrals toward blue/gray (`Clinic Line`) to avoid the generic beige/parchment AI default.

### Don't:
- **Don't** use purple, violet, or blue-to-pink gradients under any circumstances.
- **Don't** use side-stripe borders greater than 1px as decorative highlights on cards or day items.
- **Don't** animate or transform main images or icons on hover.
- **Don't** allow display headers to exceed `34px` outside of dedicated print/elderly layouts.
