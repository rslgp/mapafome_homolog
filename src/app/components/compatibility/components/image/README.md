# SVG Handler - Usage Guide

## Overview
The `svgHandler.js` provides centralized SVG imports that are automatically converted to URL strings, solving the Next.js `[object Object]` issue.

## Quick Start

### Method 1: Named Imports (Recommended)
```jsx
import { bean, hub, green, red } from './image/svgHandler';

// Use directly in img tags
<img src={bean} alt="bean" width="30px" height="30px" />
<img src={hub} alt="hub" width="30px" height="30px" />
```

### Method 2: Default Import
```jsx
import svgs from './image/svgHandler';

<img src={svgs.bean} alt="bean" />
<img src={svgs.hub} alt="hub" />
```

### Method 3: Dynamic Selection
```jsx
import { getSvgByName } from './image/svgHandler';

const iconName = 'bean'; // Could come from props or state
const iconUrl = getSvgByName(iconName);

<img src={iconUrl} alt={iconName} />
```

## Available SVGs

| Name | Description | Original File |
|------|-------------|--------------|
| `bean` | Coffee bean icon | bean.svg |
| `beanOld` | Old bean icon | beanold.svg |
| `hub` | Hub/donor icon (blue) | hub.svg |
| `green` | Green marker icon | green.svg |
| `red` | Red marker icon | red.svg |
| `currentLocation` | Large location marker | currentLocation.svg |
| `currentLocationSmall` | Small location marker | currentLocationSmall.svg |
| `insta` | Instagram icon | insta.svg |
| `qr` | QR code icon | qr.svg |

## Usage Examples

### Example 1: MainControls.js (Fixed)

**Before (Broken):**
```jsx
import coffeeBean from '../images/bean.svg';

<img width="30px" height="30px" src={coffeeBean} alt="bean" />
// Shows: [object Object]
```

**After (Fixed):**
```jsx
import { bean } from './image/svgHandler';

<img width="30px" height="30px" src={bean} alt="bean" />
// Shows: /mapafome/_next/static/media/bean.abc123.svg
```

### Example 2: Multiple Icons
```jsx
import { bean, hub, green, red } from './image/svgHandler';

function MarkerLegend() {
  return (
    <div>
      <div>
        <img src={bean} alt="Necessitados" />
        <span>Pessoa precisando</span>
      </div>
      <div>
        <img src={hub} alt="Doadores" />
        <span>Ponto de doação</span>
      </div>
      <div>
        <img src={green} alt="Buscar" />
        <span>Precisando buscar</span>
      </div>
      <div>
        <img src={red} alt="Entrega" />
        <span>Entrega de refeição</span>
      </div>
    </div>
  );
}
```

### Example 3: Dynamic Icon Selection
```jsx
import { getSvgByName, hasSvg } from './image/svgHandler';

function DynamicIcon({ iconType, alt }) {
  const iconUrl = getSvgByName(iconType);

  if (!iconUrl) {
    return <span>Icon not found</span>;
  }

  return <img src={iconUrl} alt={alt} />;
}

// Usage
<DynamicIcon iconType="bean" alt="Bean icon" />
<DynamicIcon iconType="hub" alt="Hub icon" />
```

### Example 4: Check if SVG Exists
```jsx
import { hasSvg, getAllSvgNames } from './image/svgHandler';

// Check if an icon exists
if (hasSvg('bean')) {
  // Use the icon
}

// Get all available icons
const availableIcons = getAllSvgNames();
console.log(availableIcons);
// ['bean', 'beanOld', 'hub', 'green', 'red', 'currentLocation', ...]
```

### Example 5: With React Components
```jsx
import { bean, hub } from './image/svgHandler';

function IconButton({ type, label, onClick }) {
  const iconMap = {
    bean: bean,
    hub: hub,
  };

  return (
    <button onClick={onClick}>
      <img src={iconMap[type]} alt={label} width="24px" height="24px" />
      <span>{label}</span>
    </button>
  );
}
```

## Helper Functions

### `getSvgByName(name)`
Get SVG URL by name. Returns `null` if not found.

```jsx
const url = getSvgByName('bean');
// Returns: "/mapafome/_next/static/media/bean.abc123.svg"
```

### `hasSvg(name)`
Check if SVG exists. Returns `boolean`.

```jsx
const exists = hasSvg('bean'); // true
const notExists = hasSvg('nonexistent'); // false
```

### `getAllSvgNames()`
Get array of all available SVG names.

```jsx
const names = getAllSvgNames();
// ['bean', 'beanOld', 'hub', 'green', 'red', ...]
```

## Migration Guide

### Updating Existing Code

**Step 1:** Replace direct SVG imports
```jsx
// OLD
import coffeeBean from '../images/bean.svg';
import hub from '../images/hub.svg';

// NEW
import { bean, hub } from './image/svgHandler';
```

**Step 2:** Update img src attributes
```jsx
// OLD
<img src={coffeeBean} alt="bean" />

// NEW
<img src={bean} alt="bean" />
```

**Step 3:** Update variable names (optional, for consistency)
```jsx
// If you used 'coffeeBean' variable, rename to 'bean' throughout
// Or use alias import:
import { bean as coffeeBean } from './image/svgHandler';
```

## Files to Update

Run this search to find files that need updating:

```bash
# Find SVG imports
grep -r "from.*images.*\.svg" src/app/components/

# Find img tags with SVG variables
grep -r '<img.*src={[^"}]*}' src/app/components/
```

Common files that likely need updates:
- ✅ **map.js** - Already updated (uses mapConstants)
- ✅ **mapConstants.js** - Already updated (uses svgHelper)
- ⚠️ **MainControls.js** - Needs update (line 108)
- Check other components for direct SVG imports

## Testing

After migration, verify:

1. **Visual Check**: All icons display correctly (not `[object Object]`)
2. **Console Check**: No errors in browser console
3. **Functionality**: Click handlers on icon buttons work
4. **Map Markers**: All map markers render with correct icons

## Advanced: Adding New SVGs

When you add a new SVG to the `images` folder:

**Step 1:** Import the SVG in `svgHandler.js`
```javascript
import newIconSvg from '../../images/newIcon.svg';
```

**Step 2:** Add to the `svgs` object
```javascript
export const svgs = {
  // ... existing icons
  newIcon: getSvgSrc(newIconSvg),
};
```

**Step 3:** Add to named exports
```javascript
export const {
  // ... existing exports
  newIcon,
} = svgs;
```

**Step 4:** Update this README with the new icon

## Troubleshooting

### Issue: Still seeing `[object Object]`
- ✅ Make sure you're importing from `./image/svgHandler`, not directly from `../images/`
- ✅ Check that you're using the exported string, not the raw import

### Issue: Icon not found / `null`
- ✅ Check spelling of icon name
- ✅ Run `getAllSvgNames()` to see available icons
- ✅ Make sure the SVG is imported and exported in `svgHandler.js`

### Issue: Import path error
- ✅ Adjust relative path based on your file location
- From `components/`: `import { bean } from './image/svgHandler'`
- From `components/googlesheets/`: `import { bean } from '../image/svgHandler'`

## Benefits

✅ **No more `[object Object]`** - All SVGs properly converted
✅ **Single source of truth** - All SVG imports in one place
✅ **Type-safe** - Named exports catch typos at build time
✅ **Easy to maintain** - Add new SVGs in one location
✅ **Better performance** - No duplicate imports across files
✅ **Cleaner code** - No need for `getSvgSrc()` everywhere

## Related Files

- [svgHelper.js](../svgHelper.js) - Low-level SVG URL extraction
- [mapConstants.js](../mapConstants.js) - Uses svgHandler for map icons
- [SVG_IMPORT_FIX.md](../SVG_IMPORT_FIX.md) - Detailed explanation of the issue
