/**
 * Authentication Usage Examples
 * 
 * This file demonstrates how to use the AuthContext and API client
 * in your React components.
 * 
 * DO NOT import this file in production code - it's for reference only.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient, { getErrorMessage } from '../services/apiClient';
import type { Product, CreateProductRequest } from '../../../shared/types';

// ============================================================================
// Example 1: Login Component
// ============================================================================

export const LoginExample: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      // Redirect to dashboard after successful login
      window.location.href = '/dashboard';
    } catch (err) {
      // Error is already set in context
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

// ============================================================================
// Example 2: Protected Component with Auth Check
// ============================================================================

export const ProtectedComponentExample: React.FC = () => {
  const { isAuthenticated, isLoading, manufacturerId, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <div>
      <h1>Welcome, Manufacturer {manufacturerId}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

// ============================================================================
// Example 3: API Call with Automatic Token Handling
// ============================================================================

export const ProductListExample: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      // API client automatically adds Authorization header
      const response = await apiClient.get<{ products: Product[] }>('/products');
      setProducts(response.data.products);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchProducts} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Products'}
      </button>
      {error && <div className="error">{error}</div>}
      <ul>
        {products.map(product => (
          <li key={product.productId}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// Example 4: Create Product with Error Handling
// ============================================================================

export const CreateProductExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createProduct = async (productData: CreateProductRequest) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // API client automatically adds Authorization header
      const response = await apiClient.post('/products', productData);
      setSuccess(true);
      console.log('Product created:', response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => createProduct({
        name: 'Example Product',
        description: 'Example description',
        category: 'Textiles',
        lifecycleData: {
          // ... lifecycle data
        } as any,
      })} disabled={loading}>
        {loading ? 'Creating...' : 'Create Product'}
      </button>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Product created successfully!</div>}
    </div>
  );
};

// ============================================================================
// Example 5: App Setup with AuthProvider
// ============================================================================

export const AppSetupExample: React.FC = () => {
  // In your main App.tsx or index.tsx, wrap your app with AuthProvider:
  
  /*
  import { AuthProvider } from './context/AuthContext';
  
  function App() {
    return (
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }
  */

  return <div>See code comments for setup example</div>;
};

// ============================================================================
// Example 6: Listening to Auth Events
// ============================================================================

export const AuthEventListenerExample: React.FC = () => {
  React.useEffect(() => {
    // Listen for logout events (triggered by API client on auth failure)
    const handleLogout = () => {
      console.log('User logged out due to authentication failure');
      window.location.href = '/login';
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  return <div>Auth event listener active</div>;
};

// ============================================================================
// Example 7: Manual Token Refresh
// ============================================================================

export const ManualRefreshExample: React.FC = () => {
  const { refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshToken();
      console.log('Token refreshed successfully');
    } catch (err) {
      console.error('Token refresh failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleRefresh} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh Token'}
    </button>
  );
};
