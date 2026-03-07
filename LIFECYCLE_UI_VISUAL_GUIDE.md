# Lifecycle UI Visual Guide

## Color Palette

### Primary Colors
```css
--color-primary: #2563eb        /* Blue 600 - Main brand color */
--color-primary-light: #3b82f6  /* Blue 500 - Hover states */
--color-primary-dark: #1e40af   /* Blue 800 - Active states */
--color-primary-hover: #1d4ed8  /* Blue 700 - Button hover */
```

### Secondary Colors
```css
--color-secondary: #0ea5e9      /* Sky 500 - Accents */
--color-accent: #8b5cf6         /* Violet 500 - Special highlights */
```

### Semantic Colors
```css
--color-success: #10b981        /* Green 500 - Success states */
--color-warning: #f59e0b        /* Amber 500 - Warning states */
--color-error: #ef4444          /* Red 500 - Error states */
```

### Neutral Colors
```css
--color-text: #1e293b           /* Slate 800 - Primary text */
--color-text-light: #64748b     /* Slate 500 - Secondary text */
--color-text-lighter: #94a3b8   /* Slate 400 - Tertiary text */
--color-bg: #ffffff             /* White - Main background */
--color-bg-light: #f8fafc       /* Slate 50 - Light background */
--color-bg-lighter: #f1f5f9     /* Slate 100 - Lighter background */
--color-border: #e2e8f0         /* Slate 200 - Borders */
--color-border-light: #cbd5e1   /* Slate 300 - Light borders */
```

## Component Styling

### Buttons

#### Primary Button
- Background: Linear gradient from `#2563eb` to `#1d4ed8`
- Text: White
- Shadow: `0 4px 12px rgba(37, 99, 235, 0.25)`
- Hover: Lifts 2px with enhanced shadow
- Icons: Integrated with 16x16 SVGs

#### Secondary Button
- Background: White
- Border: 2px solid `#e2e8f0`
- Text: `#1e293b`
- Hover: Light blue background with primary border

#### Draft Button
- Background: Linear gradient from `#eff6ff` to `#dbeafe`
- Border: 2px solid `#3b82f6`
- Text: `#2563eb`
- Hover: Transforms to primary gradient

### Form Fields

#### Input/Select
- Border: 2px solid `#e2e8f0`
- Border Radius: 6px
- Padding: 12px 14px
- Hover: Border changes to `#3b82f6` with subtle shadow
- Focus: Border `#2563eb` with 4px glow

#### Toggle Buttons
- Default: White background with border
- Active: Blue gradient with white text
- Shadow on active: `0 4px 12px rgba(37, 99, 235, 0.3)`

### Material Table

#### Table Header
- Background: Linear gradient from `#f8fafc` to `#f1f5f9`
- Text: Uppercase, 12px, bold, `#1e293b`
- Border: 2px solid `#e2e8f0`

#### Table Rows
- Hover: Light blue background `#f8fafc` with shadow
- Animation: Slide in from left on addition
- Border: 1px solid `#f1f5f9`

#### Percentage Indicator
- Valid: Green text `#10b981`
- Invalid: Red text `#ef4444`
- Background: Gradient with border
- Font Size: 24px bold

### Emission Preview Panel

#### Total Emission Card
- Background: Blue gradient with pulse animation
- Text: White, 36px bold
- Shadow: `0 8px 20px rgba(37, 99, 235, 0.25)`
- Animated overlay effect

#### Breakdown Items
- Background: Light gradient `#f8fafc` to white
- Border: 1px solid `#cbd5e1`
- Hover: Slides right 4px with blue border
- Progress bar: Blue gradient with glow

#### Badge Preview
- Border: 2px solid (color-coded)
- Background: White to light gray gradient
- Icon: 44px circle with shadow
- Hover: Lifts 2px

### Toast Notifications

#### Success Toast
- Border Left: 4px solid `#10b981`
- Icon Background: `#d1fae5` (green tint)
- Icon Color: `#10b981`

#### Error Toast
- Border Left: 4px solid `#ef4444`
- Icon Background: `#fee2e2` (red tint)
- Icon Color: `#ef4444`

#### Warning Toast
- Border Left: 4px solid `#f59e0b`
- Icon Background: `#fef3c7` (amber tint)
- Icon Color: `#f59e0b`

#### Info Toast
- Border Left: 4px solid `#3b82f6`
- Icon Background: `#dbeafe` (blue tint)
- Icon Color: `#3b82f6`

### Loading Spinner
- Ring Colors: Primary, Primary Light, Secondary
- Animation: 1.2s cubic-bezier rotation
- Sizes: 24px (small), 40px (medium), 60px (large)
- Overlay: White 90% opacity with blur

## Animations

### fadeIn
```css
Duration: 0.3-0.4s
Easing: ease-out
Effect: Opacity 0→1, translateY(20px)→0
```

### slideIn
```css
Duration: 0.3s
Easing: ease-out
Effect: Opacity 0→1, translateX(-10px)→0
```

### slideInRight
```css
Duration: 0.4s
Easing: ease-out
Effect: Opacity 0→1, translateX(20px)→0
```

### pulse
```css
Duration: 3s
Easing: ease-in-out
Loop: infinite
Effect: Scale 1→1.1, Opacity 0.5→0.8
```

### shake
```css
Duration: 0.5s
Easing: ease-in-out
Effect: translateX oscillation
```

## Spacing System

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
```

## Border Radius

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

## Shadows

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.15)
```

## Typography

### Headings
- H2: 20-22px, bold (700), primary color
- H3: 18-20px, bold (700), primary color
- H4: 14px, bold (700), uppercase

### Body Text
- Primary: 14-16px, medium (500), `#1e293b`
- Secondary: 13-14px, medium (500), `#64748b`
- Tertiary: 12px, medium (500), `#94a3b8`

### Labels
- Form Labels: 14px, semi-bold (600), `#1e293b`
- Table Headers: 12px, bold (700), uppercase

## Responsive Breakpoints

### Desktop (> 1200px)
- Side-by-side layout
- Full-width tables
- Sticky sidebar

### Tablet (768px - 1200px)
- Stacked layout
- Full-width components
- Static sidebar

### Mobile (< 768px)
- Single column
- Reduced padding
- Simplified tables
- Full-width buttons

## Best Practices

1. Always use CSS variables for colors
2. Apply transitions for smooth interactions
3. Use box-shadow for depth, not borders
4. Implement hover states for all interactive elements
5. Ensure 4.5:1 contrast ratio for text
6. Use semantic HTML elements
7. Add ARIA labels for accessibility
8. Test on multiple screen sizes
9. Optimize animations for performance
10. Keep loading states consistent
