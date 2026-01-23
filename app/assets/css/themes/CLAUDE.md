# Theme Development Guide

This folder contains theme CSS files for Dokusho. Each theme provides both light and dark variants.

## Theme Structure

A theme is a CSS file that defines color variables for both light (`.theme-{id}`) and dark (`.theme-{id}.dark`) modes.

```css
/* Light variant */
.theme-{id} {
  /* Background, border, text variables */
}

/* Dark variant */
.theme-{id}.dark {
  /* Dark mode overrides */
}
```

## Required CSS Variables

Each theme must define these variables for both light and dark variants:

### Background Surfaces
| Variable | Purpose | Example (light) | Example (dark) |
|----------|---------|-----------------|----------------|
| `--ui-bg` | Page background | `oklch(0.965 0.012 85)` | `oklch(0.155 0.015 260)` |
| `--ui-bg-elevated` | Cards, elevated surfaces | `oklch(0.993 0.005 85)` | `oklch(0.205 0.018 255)` |
| `--ui-bg-muted` | Hover states, muted areas | `oklch(0.935 0.018 80)` | `oklch(0.255 0.02 255)` |

### Borders
| Variable | Purpose | Example (light) | Example (dark) |
|----------|---------|-----------------|----------------|
| `--ui-border` | Default borders | `oklch(0.88 0.02 75)` | `oklch(0.32 0.02 260)` |
| `--ui-border-muted` | Subtle borders | `oklch(0.92 0.015 80)` | `oklch(0.26 0.015 260)` |

### Text (Optional - Nuxt UI provides defaults)
| Variable | Purpose |
|----------|---------|
| `--ui-text-muted` | Secondary text |
| `--ui-text-dimmed` | Very subtle text |

### Semantic Colors (Optional - Nuxt UI provides defaults)
These can be customized per theme to change the accent colors:

| Variable | Purpose | Default Color |
|----------|---------|---------------|
| `--ui-primary` | Primary actions, links | indigo |
| `--ui-success` | Success states | emerald |
| `--ui-warning` | Warning states | amber |
| `--ui-error` | Error/danger states | red |
| `--ui-info` | Info states | sky |

### Soft Color Variants (Required)
These provide 15% opacity backgrounds for badges, highlights, etc:

| Variable | Computed From |
|----------|---------------|
| `--ui-primary-soft` | `--ui-primary` |
| `--ui-success-soft` | `--ui-success` |
| `--ui-warning-soft` | `--ui-warning` |
| `--ui-error-soft` | `--ui-error` |
| `--ui-info-soft` | `--ui-info` |
| `--color-purple-soft` | `--color-purple` |

Define them using `color-mix()`:
```css
--ui-primary-soft: color-mix(in oklch, var(--ui-primary) 15%, transparent);
```

### Custom Colors (Optional)
| Variable | Purpose |
|----------|---------|
| `--color-purple` | Custom purple for duplicates feature |

## Color Format

Use **oklch** color format for perceptual uniformity:
```
oklch(lightness chroma hue)
```

- **Lightness**: 0 (black) to 1 (white)
- **Chroma**: 0 (gray) to ~0.4 (saturated)
- **Hue**: 0-360 degrees (0=red, 120=green, 240=blue)

### Hue Guidelines
- **Warm themes**: Hue 60-100 (yellows, creams, warm browns)
- **Cool themes**: Hue 200-280 (blues, slates, cool grays)
- **Neutral themes**: Low chroma (< 0.01) with any hue

## Creating a New Theme

1. Create `{theme-id}.css` in this folder
2. Define both `.theme-{id}` and `.theme-{id}.dark` classes
3. Import in `main.css`:
   ```css
   @import "./themes/{theme-id}.css";
   ```
4. Register in `app/composables/useTheme.ts`:
   ```ts
   const availableThemes: Theme[] = [
     // ... existing themes
     {
       id: "{theme-id}",
       name: "Theme Name",
       description: "Brief description",
     },
   ]
   ```

## Example: Minimal Theme Template

```css
/* {Theme Name} Theme */

/* Light variant */
.theme-{id} {
  /* Backgrounds */
  --ui-bg: oklch(0.97 0.005 240);
  --ui-bg-elevated: oklch(0.99 0.002 240);
  --ui-bg-muted: oklch(0.94 0.008 240);

  /* Borders */
  --ui-border: oklch(0.85 0.01 240);
  --ui-border-muted: oklch(0.90 0.008 240);

  /* Custom colors */
  --color-purple: oklch(0.55 0.2 285);

  /* Soft variants (required) */
  --color-purple-soft: color-mix(in oklch, var(--color-purple) 15%, transparent);
  --ui-primary-soft: color-mix(in oklch, var(--ui-primary) 15%, transparent);
  --ui-success-soft: color-mix(in oklch, var(--ui-success) 15%, transparent);
  --ui-warning-soft: color-mix(in oklch, var(--ui-warning) 15%, transparent);
  --ui-error-soft: color-mix(in oklch, var(--ui-error) 15%, transparent);
  --ui-info-soft: color-mix(in oklch, var(--ui-info) 15%, transparent);
}

/* Dark variant */
.theme-{id}.dark {
  /* Backgrounds */
  --ui-bg: oklch(0.15 0.015 240);
  --ui-bg-elevated: oklch(0.20 0.018 240);
  --ui-bg-muted: oklch(0.25 0.02 240);

  /* Borders */
  --ui-border: oklch(0.32 0.02 240);
  --ui-border-muted: oklch(0.26 0.015 240);

  /* Custom colors */
  --color-purple: oklch(0.7 0.16 280);

  /* Soft variants (required - redefine for dark mode) */
  --color-purple-soft: color-mix(in oklch, var(--color-purple) 15%, transparent);
  --ui-primary-soft: color-mix(in oklch, var(--ui-primary) 15%, transparent);
  --ui-success-soft: color-mix(in oklch, var(--ui-success) 15%, transparent);
  --ui-warning-soft: color-mix(in oklch, var(--ui-warning) 15%, transparent);
  --ui-error-soft: color-mix(in oklch, var(--ui-error) 15%, transparent);
  --ui-info-soft: color-mix(in oklch, var(--ui-info) 15%, transparent);
}
```

## Example: Theme with Custom Accent Colors

You can give each theme its own personality by customizing semantic colors:

```css
/* Forest Theme - Nature-inspired greens */

.theme-forest {
  /* Backgrounds - warm off-white */
  --ui-bg: oklch(0.97 0.01 120);
  --ui-bg-elevated: oklch(0.99 0.005 120);
  --ui-bg-muted: oklch(0.94 0.015 120);

  /* Borders */
  --ui-border: oklch(0.85 0.02 120);

  /* Custom primary - forest green */
  --ui-primary: oklch(0.45 0.15 145);

  /* Harmonized semantic colors */
  --ui-success: oklch(0.55 0.18 140);
  --ui-warning: oklch(0.75 0.15 85);
  --ui-error: oklch(0.55 0.2 25);
  --ui-info: oklch(0.55 0.12 200);
}

.theme-forest.dark {
  /* Dark backgrounds */
  --ui-bg: oklch(0.15 0.02 140);
  --ui-bg-elevated: oklch(0.20 0.025 140);
  --ui-bg-muted: oklch(0.25 0.03 140);

  /* Borders */
  --ui-border: oklch(0.30 0.03 140);

  /* Brighter primary for dark mode */
  --ui-primary: oklch(0.65 0.18 145);

  /* Brighter semantic colors for dark mode */
  --ui-success: oklch(0.70 0.18 140);
  --ui-warning: oklch(0.80 0.15 85);
  --ui-error: oklch(0.70 0.2 25);
  --ui-info: oklch(0.70 0.12 200);
}
```

**Note:** When customizing `--ui-primary`, the soft variants (`--ui-primary-soft`, etc.) defined in `main.css` will automatically adapt since they use `color-mix()` with the variable.

## Testing

1. Select your theme in Settings > Theme
2. Toggle between light/dark modes
3. Verify:
   - Cards are visually distinct from background
   - Text is readable in both modes
   - Borders are visible but subtle
   - Hover states are noticeable
