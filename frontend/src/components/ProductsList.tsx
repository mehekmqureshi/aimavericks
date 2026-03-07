/**
 * ProductsList Component
 * 
 * Displays products in a table with filtering and sorting capabilities.
 * Fetches products for the authenticated manufacturer.
 * 
 * Requirements: 17.4
 */

import { useState, useEffect } from 'react';
import type { Product, Badge } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import apiClient, { getErrorMessage } from '../services/apiClient';
import './ProductsList.css';

interface ProductsListResponse {
  products: Product[];
  count: number;
}

export default function ProductsList() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch products on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetchProducts();
  }, [isAuthenticated]);

  // Apply filters and sorting when products or filter states change
  useEffect(() => {
    applyFiltersAndSort();
  }, [products, categoryFilter, badgeFilter, sortOrder]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ProductsListResponse>('/products');
      setProducts(response.data.products);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Apply badge filter
    if (badgeFilter !== 'all') {
      filtered = filtered.filter(product => product.badge.name === badgeFilter);
    }

    // Apply sorting by carbon footprint
    filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.carbonFootprint - b.carbonFootprint;
      } else {
        return b.carbonFootprint - a.carbonFootprint;
      }
    });

    setFilteredProducts(filtered);
  };

  const getUniqueCategories = (): string[] => {
    const categories = products.map(p => p.category);
    return Array.from(new Set(categories)).sort();
  };

  const getUniqueBadges = (): string[] => {
    const badges = products.map(p => p.badge.name);
    return Array.from(new Set(badges)).sort();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBadgeStyle = (badge: Badge) => {
    return {
      backgroundColor: badge.color,
      color: '#fff',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="products-list-container">
        <div className="error-state">
          <p>Please log in to view your products.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="products-list-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-list-container">
        <div className="error-state">
          <h2>Error Loading Products</h2>
          <p>{error}</p>
          <button onClick={fetchProducts} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="products-list-container">
      <div className="products-header">
        <h1>Products List</h1>
        <p className="products-count">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Filters and Sorting Controls */}
      <div className="controls-bar">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="category-filter">Category:</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="badge-filter">Badge:</label>
            <select
              id="badge-filter"
              value={badgeFilter}
              onChange={(e) => setBadgeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Badges</option>
              {getUniqueBadges().map(badge => (
                <option key={badge} value={badge}>
                  {badge}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sort-control">
          <label htmlFor="sort-order">Sort by Carbon Footprint:</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="sort-select"
          >
            <option value="asc">Low to High</option>
            <option value="desc">High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>No products found matching your filters.</p>
          {(categoryFilter !== 'all' || badgeFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setBadgeFilter('all');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Carbon Footprint</th>
                <th>Badge</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="product-name">
                    <div className="name-cell">
                      <strong>{product.name}</strong>
                      {product.description && (
                        <span className="product-description">
                          {product.description.substring(0, 60)}
                          {product.description.length > 60 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td className="carbon-footprint">
                    <strong>{product.carbonFootprint.toFixed(2)}</strong> kg CO₂
                  </td>
                  <td>
                    <span style={getBadgeStyle(product.badge)}>
                      {product.badge.name}
                    </span>
                  </td>
                  <td>{formatDate(product.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
