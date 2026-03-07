/**
 * QRManagement Component
 * 
 * Interface for generating batch QR codes for products.
 * Allows manufacturers to select a product and generate up to 1000 QR codes.
 * 
 * Requirements: 8.1, 8.5, 10.4
 */

import { useState, useEffect } from 'react';
import type { Product, GenerateQRRequest, GenerateQRResponse } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import apiClient, { getErrorMessage } from '../services/apiClient';
import './QRManagement.css';

interface ProductsListResponse {
  products: Product[];
  count: number;
}

export default function QRManagement() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [batchCount, setBatchCount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [generatedSerialIds, setGeneratedSerialIds] = useState<string[]>([]);

  // Fetch products on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingProducts(false);
      return;
    }

    fetchProducts();
  }, [isAuthenticated]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    setError(null);

    try {
      const response = await apiClient.get<ProductsListResponse>('/products');
      setProducts(response.data.products);
      
      // Auto-select first product if available
      if (response.data.products.length > 0) {
        setSelectedProductId(response.data.products[0].productId);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const validateBatchCount = (count: number): boolean => {
    setValidationError(null);

    if (count <= 0) {
      setValidationError('Batch count must be greater than 0');
      return false;
    }

    if (count > 1000) {
      setValidationError('Batch count cannot exceed 1000 QR codes');
      return false;
    }

    if (!Number.isInteger(count)) {
      setValidationError('Batch count must be a whole number');
      return false;
    }

    return true;
  };

  const handleBatchCountChange = (value: string) => {
    const count = parseInt(value, 10);
    
    if (isNaN(count)) {
      setBatchCount(0);
      setValidationError('Please enter a valid number');
      return;
    }

    setBatchCount(count);
    validateBatchCount(count);
  };

  const handleGenerateQR = async () => {
    // Clear previous results
    setError(null);
    setValidationError(null);
    setDownloadUrl(null);
    setExpiresAt(null);
    setGeneratedSerialIds([]);

    // Validate inputs
    if (!selectedProductId) {
      setValidationError('Please select a product');
      return;
    }

    if (!validateBatchCount(batchCount)) {
      return;
    }

    setIsLoading(true);

    try {
      const request: GenerateQRRequest = {
        productId: selectedProductId,
        count: batchCount,
      };

      const response = await apiClient.post<GenerateQRResponse>(
        '/qr/generate',
        request
      );

      // Set download URL and metadata
      setDownloadUrl(response.data.zipUrl);
      setExpiresAt(response.data.expiresAt);
      setGeneratedSerialIds(response.data.serialIds);

      // Show success message
      console.log(`Successfully generated ${response.data.serialIds.length} QR codes`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error generating QR codes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatExpiryTime = (expiryString: string): string => {
    const expiryDate = new Date(expiryString);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  };

  const getSelectedProduct = (): Product | undefined => {
    return products.find(p => p.productId === selectedProductId);
  };

  if (!isAuthenticated) {
    return (
      <div className="qr-management-container">
        <div className="error-state">
          <p>Please log in to generate QR codes.</p>
        </div>
      </div>
    );
  }

  if (isLoadingProducts) {
    return (
      <div className="qr-management-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="qr-management-container">
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

  if (products.length === 0) {
    return (
      <div className="qr-management-container">
        <div className="empty-state">
          <h2>No Products Available</h2>
          <p>You need to create a product before generating QR codes.</p>
          <p>Go to "Create DPP" to add your first product.</p>
        </div>
      </div>
    );
  }

  const selectedProduct = getSelectedProduct();

  return (
    <div className="qr-management-container">
      <div className="qr-header">
        <h1>QR Code Management</h1>
        <p className="qr-subtitle">
          Generate batch QR codes for your products (max 1000 per batch)
        </p>
      </div>

      <div className="qr-form-card">
        <div className="form-section">
          <h2>Generate QR Codes</h2>

          {/* Product Selector */}
          <div className="form-group">
            <label htmlFor="product-select">Select Product</label>
            <select
              id="product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="product-select"
              disabled={isLoading}
            >
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name} - {product.category}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="product-info">
              <h3>Product Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{selectedProduct.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{selectedProduct.category}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Carbon Footprint:</span>
                  <span className="info-value">
                    {selectedProduct.carbonFootprint.toFixed(2)} kg CO₂
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Badge:</span>
                  <span
                    className="badge-pill"
                    style={{
                      backgroundColor: selectedProduct.badge.color,
                      color: '#fff',
                    }}
                  >
                    {selectedProduct.badge.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Batch Count Input */}
          <div className="form-group">
            <label htmlFor="batch-count">Number of QR Codes</label>
            <input
              id="batch-count"
              type="number"
              min="1"
              max="1000"
              value={batchCount}
              onChange={(e) => handleBatchCountChange(e.target.value)}
              className={`batch-input ${validationError ? 'input-error' : ''}`}
              disabled={isLoading}
              placeholder="Enter quantity (1-1000)"
            />
            <p className="input-hint">Maximum 1000 QR codes per batch</p>
            {validationError && (
              <p className="validation-error">{validationError}</p>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateQR}
            disabled={isLoading || !selectedProductId || !!validationError}
            className="generate-btn"
          >
            {isLoading ? (
              <>
                <span className="btn-spinner"></span>
                Generating QR Codes...
              </>
            ) : (
              'Generate QR Codes'
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Download Section */}
        {downloadUrl && (
          <div className="download-section">
            <div className="success-banner">
              <svg
                className="success-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3>QR Codes Generated Successfully!</h3>
                <p>
                  Generated {generatedSerialIds.length} QR codes for{' '}
                  {selectedProduct?.name}
                </p>
              </div>
            </div>

            <div className="download-card">
              <h3>Download ZIP File</h3>
              <p className="download-info">
                Your QR codes are ready for download. The download link will
                expire in {expiresAt && formatExpiryTime(expiresAt)}.
              </p>

              <a
                href={downloadUrl}
                download="qr-codes.zip"
                className="download-link-btn"
              >
                <svg
                  className="download-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download QR Codes ZIP
              </a>

              <div className="serial-ids-section">
                <h4>Generated Serial IDs</h4>
                <div className="serial-ids-list">
                  {generatedSerialIds.slice(0, 10).map((serialId) => (
                    <span key={serialId} className="serial-id-chip">
                      {serialId}
                    </span>
                  ))}
                  {generatedSerialIds.length > 10 && (
                    <span className="serial-id-chip more-indicator">
                      +{generatedSerialIds.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
