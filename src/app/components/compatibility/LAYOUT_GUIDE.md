# MapaFome Layout Guide

## Current Layout Structure

The application uses Material-UI Grid system with a responsive layout:

```
┌─────────────────────────────────────────────────┐
│                   Header                         │
├──────────────────────────────┬──────────────────┤
│                              │                  │
│         MainMap              │   MainControls   │
│        (Left 66%)            │   (Right 33%)    │
│                              │                  │
│    • Interactive Map         │   • Filters      │
│    • Markers                 │   • Add Point    │
│    • Clusters                │   • Settings     │
│                              │                  │
├──────────────────────────────┴──────────────────┤
│                                                  │
│                  InfoPanel                       │
│                (Full Width Below)                │
│                                                  │
│    • Legend                                      │
│    • Instructions                                │
│    • Social Share                                │
│    • Credits                                     │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Grid Breakpoints

### Desktop (≥600px)
- **MainMap**: 8 columns (66.67% width)
- **MainControls**: 4 columns (33.33% width)
- **InfoPanel**: 12 columns (100% width)

### Mobile (<600px)
- **MainMap**: 12 columns (100% width) - stacks on top
- **MainControls**: 12 columns (100% width) - stacks in middle
- **InfoPanel**: 12 columns (100% width) - stacks on bottom

## Components

### 1. MainMap ([MainMap.js](components/MainMap.js:20))
- **Grid**: `<Grid item xs={12} sm={8}>`
- **Height**: 84vh
- **Position**: Left side on desktop, top on mobile
- **Contains**:
  - Interactive Leaflet map
  - Marker clusters
  - Search field
  - Layer controls

### 2. MainControls ([MainControls.js](components/MainControls.js:47))
- **Grid**: `<Grid item xs={12} sm={4}>`
- **Height**: 100% (matches MainMap)
- **Position**: Right side on desktop, middle on mobile
- **Contains**:
  - Filter dropdown
  - Add point form
  - Food type selector
  - Contact input
  - Location button

### 3. InfoPanel ([InfoPanel.js](components/InfoPanel.js:15))
- **Grid**: `<Grid item xs={12} sm={12}>`
- **Height**: Auto (content-based)
- **Position**: Below MainMap and MainControls
- **Contains**:
  - Legend with icons
  - Usage instructions
  - Social sharing buttons
  - Credits and documentation
  - Statistics table

## Responsive Behavior

### Desktop (sm and above)
```jsx
<Grid container spacing={2}>
  <Grid item xs={12} sm={8}>  {/* MainMap - 66% */}
  <Grid item xs={12} sm={4}>  {/* MainControls - 33% */}
  <Grid item xs={12} sm={12}> {/* InfoPanel - 100% */}
</Grid>
```

### Mobile (xs)
All components stack vertically at 100% width:
1. MainMap (top)
2. MainControls (middle)
3. InfoPanel (bottom)

## Key Files

- [App.js](App.js:1002-1043) - Main layout container
- [MainMap.js](components/MainMap.js) - Map component wrapper
- [map.js](components/map.js) - Refactored map implementation
- [MainControls.js](components/MainControls.js) - Control panel
- [InfoPanel.js](components/InfoPanel.js) - Information section

## Spacing

The Grid container uses `spacing={2}`, which provides:
- **8px** between grid items (Material-UI theme spacing * 2)
- Responsive gaps that adjust based on screen size

## Height Management

### MainMap & MainControls
- MainMap uses fixed height: `84vh` (84% of viewport height)
- MainControls uses percentage height: `100%` (matches parent)
- Both maintain equal heights on desktop

### InfoPanel
- Uses `auto` height based on content
- Scrolls naturally with page
- Full width ensures readability

## Customization

### To adjust column widths:

**Make map wider (75% / 25%)**:
```jsx
// MainMap.js
<Grid item xs={12} sm={9}>  {/* 75% */}

// MainControls.js
<Grid item xs={12} sm={3}>  {/* 25% */}
```

**Make equal width (50% / 50%)**:
```jsx
// Both components
<Grid item xs={12} sm={6}>  {/* 50% each */}
```

### To adjust heights:

**MainMap height** in [MainMap.js:27](components/MainMap.js:27):
```jsx
height: '84vh',  // Change to desired vh value
```

**MainControls** matches automatically with `height: '100%'`

## Best Practices

1. **Keep Grid structure in App.js** - Don't move Grid to child components
2. **Use xs={12} for mobile** - Ensures full-width stacking
3. **Maintain height consistency** - MainMap and MainControls should match
4. **InfoPanel below** - Always full width for readability
5. **Test responsive** - Check mobile and desktop breakpoints

## Notes

- ✅ Layout is already properly configured
- ✅ Comments added for clarity
- ✅ Responsive breakpoints working
- ✅ All components properly wrapped in Grid items
- ✅ InfoPanel positioned below as requested
