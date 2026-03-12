# SVG Handler - Quick Usage Examples

## 🚀 Quick Fix for `[object Object]` Issue

### Problem
```jsx
import coffeeBean from '../images/bean.svg';
<img src={coffeeBean} alt="bean" />
// Shows: [object Object] ❌
```

### Solution
```jsx
import { bean } from './image/svgHandler';
<img src={bean} alt="bean" />
// Shows: /mapafome/_next/static/media/bean.abc123.svg ✅
```

## 📋 Common Use Cases

### 1. Simple Image Tag
```jsx
import { bean } from './image/svgHandler';

<img src={bean} alt="bean" width="30px" height="30px" />
```

### 2. Multiple Icons
```jsx
import { bean, hub, green, red } from './image/svgHandler';

<div className="icon-group">
  <img src={bean} alt="Necessitados" />
  <img src={hub} alt="Doadores" />
  <img src={green} alt="Buscar" />
  <img src={red} alt="Entrega" />
</div>
```

### 3. Icon with Label
```jsx
import { bean } from './image/svgHandler';

<span className='yellowHub'>
  Pessoa precisando de Alimento pronto
  <img width="30px" height="30px" src={bean} alt="bean" />
</span>
```

### 4. Conditional Icons
```jsx
import { bean, hub } from './image/svgHandler';

function MarkerIcon({ type }) {
  const icon = type === 'donor' ? hub : bean;
  return <img src={icon} alt={type} />;
}
```

### 5. Icon Map/Object
```jsx
import { bean, hub, green, red } from './image/svgHandler';

const ICON_MAP = {
  needFood: bean,
  donor: hub,
  pickup: green,
  delivery: red,
};

function DynamicMarker({ markerType }) {
  return <img src={ICON_MAP[markerType]} alt={markerType} />;
}
```

### 6. Icon Button
```jsx
import { bean, hub } from './image/svgHandler';

function IconButton({ onClick, label, iconType }) {
  const icons = { bean, hub };

  return (
    <button onClick={onClick}>
      <img src={icons[iconType]} alt={label} width="24px" height="24px" />
      <span>{label}</span>
    </button>
  );
}
```

### 7. List with Icons
```jsx
import { bean, hub, green, red } from './image/svgHandler';

const MARKER_TYPES = [
  { icon: bean, label: 'Pessoa precisando', color: 'yellow' },
  { icon: hub, label: 'Ponto de doação', color: 'blue' },
  { icon: green, label: 'Precisando buscar', color: 'green' },
  { icon: red, label: 'Entrega de refeição', color: 'red' },
];

function MarkerLegend() {
  return (
    <ul>
      {MARKER_TYPES.map((type) => (
        <li key={type.label} className={type.color}>
          <img src={type.icon} alt={type.label} width="20px" height="20px" />
          <span>{type.label}</span>
        </li>
      ))}
    </ul>
  );
}
```

### 8. Dynamic Icon Selection with Fallback
```jsx
import { getSvgByName, bean } from './image/svgHandler';

function SafeIcon({ iconName, alt }) {
  const iconUrl = getSvgByName(iconName) || bean; // Fallback to bean
  return <img src={iconUrl} alt={alt} />;
}
```

### 9. Check Icon Exists Before Using
```jsx
import { hasSvg, getSvgByName } from './image/svgHandler';

function ConditionalIcon({ iconName }) {
  if (!hasSvg(iconName)) {
    return <span>❌ Icon not available</span>;
  }

  return <img src={getSvgByName(iconName)} alt={iconName} />;
}
```

### 10. Background Image Style
```jsx
import { bean } from './image/svgHandler';

function MarkerWithBackground() {
  return (
    <div
      style={{
        backgroundImage: `url(${bean})`,
        backgroundSize: 'contain',
        width: '40px',
        height: '40px',
      }}
    />
  );
}
```

## 🔧 Specific File Fixes

### MainControls.js

**Line 8-11: Update imports**
```jsx
// OLD
import coffeeBean from '../images/bean.svg';
import hub from '../images/hub.svg';
import green from '../images/green.svg';
import red from '../images/red.svg';

// NEW
import { bean, hub, green, red } from './image/svgHandler';
```

**Line 108: Fix image src**
```jsx
// OLD
<img width="30px" height="30px" src={coffeeBean} alt="bean"></img>

// NEW
<img width="30px" height="30px" src={bean} alt="bean"></img>
```

### Any Component with Direct SVG Import

**Pattern to find:**
```bash
grep -r "from.*images.*\.svg" src/app/components/
```

**Pattern to replace:**
```jsx
// OLD
import iconName from '../images/icon.svg';

// NEW (adjust path as needed)
import { iconName } from './image/svgHandler';
// OR
import { iconName } from '../image/svgHandler';
```

## 🎯 Path Reference

### From different locations:

**From `components/` directory:**
```jsx
import { bean } from './image/svgHandler';
```

**From `components/googlesheets/` directory:**
```jsx
import { bean } from '../image/svgHandler';
```

**From `components/subdir/subsubdir/` directory:**
```jsx
import { bean } from '../../image/svgHandler';
```

## ✅ Migration Checklist

- [ ] Find all SVG imports: `grep -r "from.*\.svg" src/`
- [ ] Replace imports with svgHandler imports
- [ ] Update variable names if needed (e.g., `coffeeBean` → `bean`)
- [ ] Test visually - no `[object Object]` visible
- [ ] Check browser console - no errors
- [ ] Test functionality - clicks work
- [ ] Remove old unused SVG imports

## 🎨 Styling Examples

### Responsive Icon
```jsx
import { bean } from './image/svgHandler';

<img
  src={bean}
  alt="bean"
  style={{
    width: '100%',
    maxWidth: '30px',
    height: 'auto',
  }}
/>
```

### Icon with Hover Effect
```jsx
import { hub } from './image/svgHandler';

<img
  src={hub}
  alt="hub"
  className="hover-icon"
  style={{
    cursor: 'pointer',
    transition: 'transform 0.2s',
  }}
  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
/>
```

### Icon in Button
```jsx
import { green } from './image/svgHandler';

<button className="icon-button">
  <img src={green} alt="buscar" width="20px" height="20px" />
  <span>Precisando Buscar</span>
</button>
```

## 🐛 Troubleshooting

### Still seeing `[object Object]`?
✅ Check import path - should be `from './image/svgHandler'`
✅ Check you're using the string value, not the raw import
✅ Clear Next.js cache: `rm -rf .next`

### Icon not appearing?
✅ Check icon name matches export in svgHandler.js
✅ Run `getAllSvgNames()` to see available icons
✅ Check file path is correct

### Type error?
✅ SVG exports are strings, safe to use in `<img src={...}>`
✅ No need for `.toString()` or additional conversion

## 📚 Reference

- Full documentation: [README.md](./README.md)
- Helper utilities: [svgHelper.js](../svgHelper.js)
- All available icons: Run `getAllSvgNames()` in console
