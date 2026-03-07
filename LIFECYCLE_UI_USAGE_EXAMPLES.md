# Lifecycle UI Usage Examples

## Basic Form Implementation

```typescript
import { Lifecycle_Form } from '@/components';
import { apiClient } from '@/services';

function CreateProductPage() {
  const handleSubmit = async (data: LifecycleData) => {
    try {
      const response = await apiClient.post('/products', data);
      console.log('Product created:', response.data);
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error; // Let the form handle the error
    }
  };

  const handleSaveDraft = async (data: Partial<LifecycleData>) => {
    try {
      const response = await apiClient.post('/drafts', data);
      console.log('Draft saved:', response.data);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  };

  return (
    <div className="page-container">
      <h1>Create Digital Product Passport</h1>
      <Lifecycle_Form
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
```

## Form with Initial Data (Edit Mode)

```typescript
import { useEffect, useState } from 'react';
import { Lifecycle_Form } from '@/components';
import { apiClient } from '@/services';

function EditProductPage({ productId }: { productId: string }) {
  const [initialData, setInitialData] = useState<Partial<LifecycleData>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${productId}`);
        setInitialData(response.data.lifecycle);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (data: LifecycleData) => {
    await apiClient.put(`/products/${productId}`, data);
  };

  const handleSaveDraft = async (data: Partial<LifecycleData>) => {
    await apiClient.put(`/drafts/${productId}`, data);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading product data..." />;
  }

  return (
    <Lifecycle_Form
      onSubmit={handleSubmit}
      onSaveDraft={handleSaveDraft}
      initialData={initialData}
    />
  );
}
```

## Using Toast Notifications

```typescript
import { useToast } from '@/hooks';
import { ToastContainer } from '@/components';

function MyComponent() {
  const { toasts, removeToast, success, error, warning, info } = useToast();

  const handleAction = async () => {
    try {
      // Perform action
      await someAsyncOperation();
      success('Operation completed successfully!');
    } catch (err) {
      error('Operation failed. Please try again.');
    }
  };

  const handleWarning = () => {
    warning('This action cannot be undone.');
  };

  const handleInfo = () => {
    info('New features are available!');
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <button onClick={handleAction}>Perform Action</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
}
```

## Custom Loading States

```typescript
import { useState } from 'react';
import { LoadingSpinner } from '@/components';

function DataFetchingComponent() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Fetching data..." />;
  }

  return (
    <div>
      {/* Render data */}
    </div>
  );
}
```

## Inline Loading Spinner

```typescript
function ButtonWithLoading() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button onClick={handleSubmit} disabled={submitting}>
      {submitting ? (
        <>
          <LoadingSpinner size="small" />
          <span>Submitting...</span>
        </>
      ) : (
        'Submit'
      )}
    </button>
  );
}
```

## Material Table Standalone Usage

```typescript
import { useState } from 'react';
import { MaterialTable } from '@/components';
import type { Material_Row } from '@/types';

function MaterialsEditor() {
  const [materials, setMaterials] = useState<Material_Row[]>([]);
  const [error, setError] = useState<string>();

  const handleMaterialsChange = (newMaterials: Material_Row[]) => {
    setMaterials(newMaterials);
    
    // Validate percentage sum
    const total = newMaterials.reduce((sum, m) => sum + m.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      setError(`Percentages must sum to 100% (current: ${total.toFixed(2)}%)`);
    } else {
      setError(undefined);
    }
  };

  return (
    <div>
      <h2>Edit Materials</h2>
      <MaterialTable
        materials={materials}
        onChange={handleMaterialsChange}
        error={error}
      />
    </div>
  );
}
```

## Emission Preview Standalone

```typescript
import { useState, useEffect } from 'react';
import { Emission_Preview } from '@/components';

function EmissionCalculator() {
  const [breakdown, setBreakdown] = useState({
    materials: 0,
    manufacturing: 0,
    packaging: 0,
    transport: 0,
    usage: 0,
    disposal: 0
  });

  const totalCO2 = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Update breakdown based on form inputs
  const updateEmissions = (category: string, value: number) => {
    setBreakdown(prev => ({
      ...prev,
      [category]: value
    }));
  };

  return (
    <div className="calculator-layout">
      <div className="inputs">
        {/* Input forms */}
      </div>
      
      <Emission_Preview
        breakdown={breakdown}
        totalCO2={totalCO2}
      />
    </div>
  );
}
```

## Form with Custom Validation

```typescript
import { useState } from 'react';
import { Lifecycle_Form } from '@/components';
import { useToast } from '@/hooks';

function ValidatedForm() {
  const { success, error } = useToast();

  const validateData = (data: LifecycleData): boolean => {
    // Custom validation logic
    if (data.materials.length === 0) {
      error('At least one material is required');
      return false;
    }

    const totalPercentage = data.materials.reduce(
      (sum, m) => sum + m.percentage, 
      0
    );
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      error('Material percentages must sum to 100%');
      return false;
    }

    return true;
  };

  const handleSubmit = async (data: LifecycleData) => {
    if (!validateData(data)) {
      throw new Error('Validation failed');
    }

    try {
      await apiClient.post('/products', data);
      success('Product created successfully!');
    } catch (err) {
      error('Failed to create product');
      throw err;
    }
  };

  return (
    <Lifecycle_Form
      onSubmit={handleSubmit}
      onSaveDraft={async (data) => {
        // Draft doesn't need full validation
        await apiClient.post('/drafts', data);
      }}
    />
  );
}
```

## Progress Tracking

```typescript
import { useState } from 'react';
import { ProgressIndicator } from '@/components';

function MultiStepWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    'Basic Info',
    'Materials',
    'Manufacturing',
    'Transport',
    'Review'
  ];

  const handleNext = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div>
      <ProgressIndicator
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />
      
      {/* Step content */}
      
      <div className="navigation">
        <button onClick={handlePrevious} disabled={currentStep === 0}>
          Previous
        </button>
        <button onClick={handleNext} disabled={currentStep === steps.length - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## Error Boundary with Toast

```typescript
import { Component, ReactNode } from 'react';
import { useToast } from '@/hooks';

class ErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}

function App() {
  const { error } = useToast();

  return (
    <ErrorBoundary onError={(msg) => error(msg)}>
      <Lifecycle_Form {...props} />
    </ErrorBoundary>
  );
}
```

## Responsive Layout Example

```typescript
import { useState, useEffect } from 'react';
import { Lifecycle_Form } from '@/components';

function ResponsiveFormPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`form-page ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && (
        <div className="mobile-notice">
          For the best experience, use a larger screen.
        </div>
      )}
      
      <Lifecycle_Form
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
```

## Integration with React Router

```typescript
import { useNavigate, useParams } from 'react-router-dom';
import { Lifecycle_Form } from '@/components';
import { useToast } from '@/hooks';

function ProductFormPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { success } = useToast();

  const handleSubmit = async (data: LifecycleData) => {
    try {
      if (productId) {
        await apiClient.put(`/products/${productId}`, data);
        success('Product updated successfully!');
      } else {
        const response = await apiClient.post('/products', data);
        success('Product created successfully!');
        navigate(`/products/${response.data.id}`);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div>
      <button onClick={() => navigate('/products')}>
        ← Back to Products
      </button>
      
      <Lifecycle_Form
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
```

## Testing Example

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Lifecycle_Form } from '@/components';

describe('Lifecycle_Form', () => {
  it('shows success toast on successful submission', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({});
    
    render(
      <Lifecycle_Form
        onSubmit={mockSubmit}
        onSaveDraft={jest.fn()}
      />
    );

    // Fill form and submit
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Lifecycle data submitted successfully!')).toBeInTheDocument();
    });
  });

  it('shows error toast on submission failure', async () => {
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
    
    render(
      <Lifecycle_Form
        onSubmit={mockSubmit}
        onSaveDraft={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to submit form/)).toBeInTheDocument();
    });
  });
});
```
