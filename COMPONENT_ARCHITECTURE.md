# Lifecycle UI Component Architecture

## 🏗️ Component Hierarchy

```
App
├── ToastContainer (Global)
│   └── Toast[] (Multiple instances)
│       ├── Icon
│       ├── Message
│       └── Close Button
│
└── Lifecycle_Form
    ├── LoadingSpinner (Conditional, Full-screen)
    │   ├── Spinner Rings (3x)
    │   └── Message
    │
    ├── ProgressIndicator
    │   └── Step[] (6 steps)
    │
    ├── Form Content (Step-based)
    │   ├── Step 0: MaterialTable
    │   │   ├── Percentage Indicator
    │   │   ├── Table
    │   │   │   ├── Header Row
    │   │   │   └── Material Rows[]
    │   │   │       ├── Material Select
    │   │   │       ├── Percentage Input
    │   │   │       ├── Weight Input
    │   │   │       ├── Emission Factor Input
    │   │   │       ├── Origin Input
    │   │   │       ├── Type Toggle
    │   │   │       ├── Certification Input
    │   │   │       ├── Calculated Emission
    │   │   │       └── Delete Button
    │   │   └── Add Material Button
    │   │
    │   ├── Step 1: Manufacturing Section
    │   ├── Step 2: Packaging Section
    │   ├── Step 3: Transport Section
    │   ├── Step 4: Usage Section
    │   └── Step 5: End of Life Section
    │
    ├── Navigation Buttons
    │   ├── Previous Button
    │   ├── Save Draft Button
    │   └── Next/Submit Button
    │
    └── Emission_Preview (Sidebar)
        ├── Header
        ├── Total Emission Card
        │   ├── Label
        │   └── Value
        ├── Badge Preview
        │   ├── Icon
        │   └── Info
        ├── Breakdown Section
        │   └── Breakdown Items[]
        │       ├── Label
        │       ├── Progress Bar
        │       └── Value
        └── Footer
```

## 🔄 Data Flow

```
User Input
    ↓
Form State (useState)
    ↓
Validation (validateCurrentStep)
    ↓
Carbon Calculation (updateCarbonBreakdown)
    ↓
Emission Preview Update
    ↓
User Action (Submit/Save)
    ↓
API Call (onSubmit/onSaveDraft)
    ↓
Loading State (isSubmitting)
    ↓
Toast Notification (success/error)
```

## 🎯 State Management

### Lifecycle_Form State
```typescript
{
  currentStep: number,
  formData: Partial<LifecycleData>,
  validationErrors: Record<string, string>,
  isSubmitting: boolean,
  carbonBreakdown: {
    materials: number,
    manufacturing: number,
    packaging: number,
    transport: number,
    usage: number,
    disposal: number
  }
}
```

### Toast State (useToast)
```typescript
{
  toasts: ToastMessage[],
  showToast: (message, type) => void,
  removeToast: (id) => void,
  success: (message) => void,
  error: (message) => void,
  warning: (message) => void,
  info: (message) => void
}
```

## 🔌 Component Props

### Lifecycle_Form
```typescript
interface Lifecycle_FormProps {
  onSubmit: (data: LifecycleData) => Promise<void>;
  onSaveDraft: (data: Partial<LifecycleData>) => Promise<void>;
  initialData?: Partial<LifecycleData>;
}
```

### MaterialTable
```typescript
interface MaterialTableProps {
  materials: Material_Row[];
  onChange: (materials: Material_Row[]) => void;
  error?: string;
}
```

### Emission_Preview
```typescript
interface Emission_PreviewProps {
  breakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
  totalCO2: number;
  badge?: Badge;
}
```

### LoadingSpinner
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}
```

### Toast
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}
```

### ToastContainer
```typescript
interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}
```

## 🎨 Styling Architecture

```
index.css (Global Variables)
    ↓
Component-specific CSS files
    ├── Lifecycle_Form.css
    ├── MaterialTable.css
    ├── Emission_Preview.css
    ├── LoadingSpinner.css
    ├── Toast.css
    └── ToastContainer.css
```

### CSS Variable Inheritance
```css
:root {
  /* Colors */
  --color-primary
  --color-primary-light
  --color-primary-dark
  
  /* Spacing */
  --spacing-xs to --spacing-2xl
  
  /* Radius */
  --radius-sm to --radius-xl
  
  /* Shadows */
  --shadow-sm to --shadow-lg
  
  /* Transitions */
  --transition-fast to --transition-slow
}
```

## 🔄 Event Flow

### Form Submission Flow
```
User clicks Submit
    ↓
validateAllSteps()
    ↓
setIsSubmitting(true)
    ↓
Show LoadingSpinner
    ↓
onSubmit(formData)
    ↓
Success → success('Submitted!')
    ↓
Error → error('Failed!')
    ↓
setIsSubmitting(false)
    ↓
Hide LoadingSpinner
```

### Material Addition Flow
```
User clicks "Add Material"
    ↓
Create new Material_Row
    ↓
Add to materials array
    ↓
Trigger onChange
    ↓
Update formData
    ↓
Recalculate emissions
    ↓
Update Emission_Preview
    ↓
Animate new row (slideIn)
```

### Toast Notification Flow
```
Action triggers notification
    ↓
showToast(message, type)
    ↓
Generate unique ID
    ↓
Add to toasts array
    ↓
Render Toast component
    ↓
Animate in (slideIn)
    ↓
Start auto-dismiss timer
    ↓
After duration → removeToast(id)
    ↓
Animate out
```

## 🧩 Component Dependencies

### Lifecycle_Form depends on:
- ProgressIndicator
- MaterialTable
- Emission_Preview
- LoadingSpinner
- ToastContainer
- useToast hook

### MaterialTable depends on:
- Material_Row type
- CSS animations

### Emission_Preview depends on:
- CarbonFootprintResult type
- Badge type

### Toast depends on:
- ToastType enum
- CSS animations

### LoadingSpinner depends on:
- CSS animations

## 📦 Module Structure

```
frontend/src/
├── components/
│   ├── Lifecycle_Form.tsx
│   ├── Lifecycle_Form.css
│   ├── MaterialTable.tsx
│   ├── MaterialTable.css
│   ├── Emission_Preview.tsx
│   ├── Emission_Preview.css
│   ├── LoadingSpinner.tsx
│   ├── LoadingSpinner.css
│   ├── Toast.tsx
│   ├── Toast.css
│   ├── ToastContainer.tsx
│   ├── ToastContainer.css
│   └── index.ts (exports)
│
├── hooks/
│   ├── useToast.tsx
│   └── index.ts (exports)
│
├── types/
│   └── (shared types from backend)
│
└── index.css (global styles)
```

## 🔐 Type Safety

### Type Definitions
```typescript
// From shared/types
type LifecycleData = {
  materials: Material_Row[];
  manufacturing: Manufacturing_Data;
  packaging: Packaging_Data;
  transport: Transport_Data;
  usage: Usage_Data;
  endOfLife: EndOfLife_Data;
}

type Material_Row = {
  name: string;
  percentage: number;
  weight: number;
  emissionFactor: number;
  countryOfOrigin: string;
  recycled: boolean;
  certification: string;
  calculatedEmission: number;
}

type ToastMessage = {
  id: string;
  message: string;
  type: ToastType;
}

type ToastType = 'success' | 'error' | 'warning' | 'info';
```

## 🎭 Animation Layers

```
Layer 1: Component Entry
├── fadeIn (Lifecycle_Form)
├── slideInRight (Emission_Preview)
└── slideIn (Form sections)

Layer 2: Interactive Elements
├── Hover effects (buttons, rows)
├── Focus states (inputs)
└── Active states (toggles)

Layer 3: State Changes
├── Row addition (slideIn)
├── Toast appearance (slideIn)
└── Loading spinner (spin)

Layer 4: Background Effects
└── Pulse (Emission card)
```

## 🚀 Performance Optimizations

### Render Optimization
```
React.memo() candidates:
- MaterialTable (if many rows)
- Emission_Preview (if complex calculations)
- Toast (individual instances)
```

### Calculation Optimization
```
Debounce candidates:
- updateCarbonBreakdown (on rapid input)
- Material percentage validation
```

### Animation Optimization
```
GPU acceleration:
- transform: translateZ(0)
- will-change: transform
- Use transform over position
```

## 🔍 Testing Strategy

### Unit Tests
```
Components to test:
├── LoadingSpinner (3 sizes, fullScreen)
├── Toast (4 types, auto-dismiss)
├── ToastContainer (multiple toasts)
└── useToast (all methods)
```

### Integration Tests
```
Flows to test:
├── Form submission → Toast
├── Draft save → Toast
├── Validation error → Error display
└── Material addition → Emission update
```

### E2E Tests
```
User journeys:
├── Complete form submission
├── Save and resume draft
├── Add/remove materials
└── Navigate through steps
```

## 📊 Component Metrics

### Complexity
- Lifecycle_Form: High (multi-step, validation)
- MaterialTable: Medium (dynamic rows)
- Emission_Preview: Low (display only)
- LoadingSpinner: Low (simple animation)
- Toast: Low (simple notification)

### Reusability
- LoadingSpinner: High (use anywhere)
- Toast: High (use anywhere)
- MaterialTable: Medium (lifecycle-specific)
- Emission_Preview: Medium (lifecycle-specific)
- Lifecycle_Form: Low (specific use case)

### Maintainability
- All components: High (well-documented)
- Clear separation of concerns
- Type-safe implementations
- Modular design

---

This architecture provides a solid foundation for the lifecycle data UI with clear component boundaries, type safety, and excellent user experience.
