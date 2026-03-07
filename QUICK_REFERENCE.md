# Lifecycle UI - Quick Reference Card

## 🎨 Colors

```css
/* Primary Blue */
--color-primary: #2563eb
--color-primary-light: #3b82f6
--color-primary-dark: #1e40af

/* Semantic */
--color-success: #10b981
--color-error: #ef4444
--color-warning: #f59e0b
```

## 🧩 Components

### Lifecycle Form
```tsx
<Lifecycle_Form
  onSubmit={async (data) => { /* ... */ }}
  onSaveDraft={async (data) => { /* ... */ }}
  initialData={existingData}
/>
```

### Toast Notifications
```tsx
const { success, error, warning, info } = useToast();
success('Operation completed!');
error('Something went wrong');
```

### Loading Spinner
```tsx
<LoadingSpinner 
  size="medium" 
  message="Loading..." 
  fullScreen={true} 
/>
```

### Toast Container
```tsx
const { toasts, removeToast } = useToast();
<ToastContainer toasts={toasts} onRemove={removeToast} />
```

## 📐 Spacing

```css
4px   8px   16px   24px   32px   48px
xs    sm    md     lg     xl     2xl
```

## 🎭 Animations

```css
fadeIn: 0.3s ease-out
slideIn: 0.3s ease-out
pulse: 3s infinite
```

## 📱 Breakpoints

```
Mobile:  < 768px
Tablet:  768px - 1200px
Desktop: > 1200px
```

## 🔘 Button Variants

```tsx
className="btn-primary"   // Blue gradient
className="btn-secondary" // White with border
className="btn-draft"     // Light blue
```

## ✅ Validation

```tsx
// Automatic validation on:
- Material percentage sum (must = 100%)
- Required fields
- Numeric ranges
- Step completion
```

## 🎯 Key Features

✅ Real-time emission preview
✅ Dynamic material rows
✅ Toast notifications
✅ Loading indicators
✅ Form validation
✅ Responsive design
✅ Smooth animations
✅ Professional blue theme

## 📦 Exports

```tsx
// Components
import { 
  Lifecycle_Form,
  LoadingSpinner,
  Toast,
  ToastContainer 
} from '@/components';

// Hooks
import { useToast } from '@/hooks';
```

## 🚀 Quick Start

```tsx
import { Lifecycle_Form, ToastContainer } from '@/components';
import { useToast } from '@/hooks';

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Lifecycle_Form
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </>
  );
}
```

## 🐛 Common Fixes

**Toasts not showing?**
→ Add `<ToastContainer />` to your app

**Wrong colors?**
→ Check `index.css` color variables

**No animations?**
→ Ensure CSS files are imported

**Loading not working?**
→ Make sure functions are async

## 📚 Documentation

- `LIFECYCLE_UI_IMPROVEMENTS.md` - Features
- `LIFECYCLE_UI_VISUAL_GUIDE.md` - Design
- `LIFECYCLE_UI_USAGE_EXAMPLES.md` - Examples
- `LIFECYCLE_UI_MIGRATION_GUIDE.md` - Migration
- `LIFECYCLE_UI_COMPLETE_SUMMARY.md` - Full docs

## 💡 Pro Tips

1. Use `useToast` hook for notifications
2. Add icons to buttons for better UX
3. Test on mobile devices
4. Use loading states for async operations
5. Validate early and often
6. Keep animations smooth (60fps)
7. Follow the design system
8. Use semantic HTML

## ⚡ Performance

- GPU-accelerated animations
- Optimized re-renders
- Debounced calculations
- Lazy loading support

## ♿ Accessibility

- ARIA labels ✓
- Keyboard navigation ✓
- Focus indicators ✓
- Screen reader friendly ✓
- Color contrast WCAG AA ✓

---

**Need help?** Check the full documentation files!
