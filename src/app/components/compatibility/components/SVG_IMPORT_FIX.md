# SVG Import Fix for Next.js

## Problem
When importing SVG files in Next.js, they are imported as objects (with `.src` property), not as direct URL strings. Using them directly in `<img src={...}>` results in `[object Object]`.

## Solution
Use the `getSvgSrc()` helper or `<SvgImage>` component from `svgHelper.js`.

## Method 1: Using getSvgSrc() helper (Recommended)

### Before (Broken):
```jsx
import coffeeBean from '../images/bean.svg';

<img width="30px" height="30px" src={coffeeBean} alt="bean" />
// Result: src="[object Object]"
```

### After (Fixed):
```jsx
import coffeeBean from '../images/bean.svg';
import { getSvgSrc } from './svgHelper';

<img width="30px" height="30px" src={getSvgSrc(coffeeBean)} alt="bean" />
// Result: src="/mapafome/_next/static/media/bean.abc123.svg"
```

## Method 2: Using SvgImage component (Alternative)

```jsx
import coffeeBean from '../images/bean.svg';
import { SvgImage } from './svgHelper';

<SvgImage src={coffeeBean} alt="bean" width="30px" height="30px" />
```

## Fix for MainControls.js (Line 108)

### Current Code:
```jsx
<span className='yellowHub'>
  Pessoa precisando de Alimento pronto
  <img width="30px" height="30px" src={coffeeBean} alt="bean"></img>
</span>
```

### Fixed Code:
```jsx
import { getSvgSrc } from './svgHelper';

<span className='yellowHub'>
  Pessoa precisando de Alimento pronto
  <img width="30px" height="30px" src={getSvgSrc(coffeeBean)} alt="bean"></img>
</span>
```

### Or use the component:
```jsx
import { SvgImage } from './svgHelper';

<span className='yellowHub'>
  Pessoa precisando de Alimento pronto
  <SvgImage src={coffeeBean} alt="bean" width="30px" height="30px" />
</span>
```

## Why This Happens

Next.js processes static imports (like SVGs) through webpack and returns an object:
```javascript
// What you import:
import coffeeBean from '../images/bean.svg';

// What Next.js actually gives you:
coffeeBean = {
  src: "/mapafome/_next/static/media/bean.abc123.svg",
  height: 100,
  width: 100,
  blurDataURL: "..."
}
```

The `getSvgSrc()` helper extracts the `.src` property (or `.default` for older Next.js versions).

## Automatic Fix Applied

The refactored map components already use this fix:
- ✅ [mapConstants.js:32](mapConstants.js#L32) - All ICONS use `getSvgSrc()`
- ✅ [map.js](map.js) - All markers render correctly
- ✅ [MarkerGroup.js](MarkerGroup.js) - Uses icons from constants
- ✅ [SearchField.js](SearchField.js) - Uses icons from constants

## Files That May Need Fixing

Search for SVG imports used in `<img>` tags without the helper:

```bash
# Find all SVG imports
grep -r "from.*\.svg" src/

# Find all img tags with src={variable}
grep -r "<img.*src={" src/
```

Common files that might need fixing:
- MainControls.js (confirmed issue on line 108)
- Any other component using SVG imports directly

## Testing

After applying the fix, verify:
1. SVG images display correctly (not `[object Object]`)
2. Browser console shows no errors
3. Map markers render properly
4. Icon buttons display correctly

## Reference

- Helper utility: [svgHelper.js](svgHelper.js)
- Example usage: [mapConstants.js](mapConstants.js)
- Next.js static imports: https://nextjs.org/docs/basic-features/static-file-serving
