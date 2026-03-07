/**
 * ConsumerProduct Page
 * 
 * Product details page displaying comprehensive product information
 * after QR code scan or serial number verification.
 * Includes visual analytics and verification status.
 * 
 * Requirements: 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 14.1, 14.2, 14.3, 14.4, 25.5
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ProductDisplay, 
  LifecycleChart, 
  MaterialChart, 
  SustainabilityGauge,
  VerificationBadge 
} from '../components';
import apiClient from '../services/apiClient';
import type { Product, Manufacturer, ProductSerial } from '../../../shared/types';
import './ConsumerProduct.css';

interface VerificationResult {
  verified: boolean;
  product: Product;
  manufacturer: Manufacturer;
  serial: ProductSerial;
  error?: string;
}

const ConsumerProduct: React.FC = () => {
  const { serialId } = useParams<{ serialId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (serialId) {
      verifyProduct(serialId);
    } else {
      setError('No serial ID provided');
      setLoading(false);
    }
  }, [serialId]);

  /**
   * Verify product by serial ID
   */
  const verifyProduct = async (serial: string) => {
    try {
      setLoading(true);
      setError(null);

      // Call verify endpoint
      const response = await apiClient.get<VerificationResult>(`/verify/${serial}`);
      
      if (response.data.verified) {
        setVerificationResult(response.data);
      } else {
        setError(response.data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      if (err.response?.status === 404) {
        setError('Product not found. Please check the serial number and try again.');
      } else {
        setError(err.message || 'Failed to verify product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle back to scanner
   */
  const handleBackToScanner = () => {
    navigate('/');
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="consumer-product">
        <div className="consumer-product-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Verifying product...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error || !verificationResult) {
    return (
      <div className="consumer-product">
        <div className="consumer-product-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Product Not Found</h2>
            <p className="error-message">{error || 'Unable to load product information'}</p>
            <button 
              className="btn-back-scanner"
              onClick={handleBackToScanner}
            >
              Back to Scanner
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { verified, product, manufacturer, serial } = verificationResult;

  return (
    <div className="consumer-product">
      {/* Header */}
      <header className="consumer-product-header">
        <div className="header-content">
          <button 
            className="btn-back"
            onClick={handleBackToScanner}
            aria-label="Back to scanner"
          >
            ← Back
          </button>
          <h1 className="header-logo">
            <span className="logo-icon">🌿</span>
            Green Passport
          </h1>
          <div className="header-spacer"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="consumer-product-main">
        <div className="consumer-product-container">
          {/* Verification Badge */}
          <div className="verification-section">
            <VerificationBadge verified={verified} />
          </div>

          {/* Product Display */}
          <ProductDisplay
            product={product}
            manufacturer={manufacturer}
            serial={serial}
            verified={verified}
          />

          {/* Visual Analytics Section */}
          <div className="analytics-section">
            <h2 className="analytics-title">Environmental Impact Analysis</h2>
            
            {/* Lifecycle Emissions Chart */}
            <div className="chart-container">
              <h3 className="chart-title">Carbon Footprint Breakdown</h3>
              <LifecycleChart 
                carbonBreakdown={product.carbonBreakdown}
                totalCO2={product.carbonFootprint}
              />
            </div>

            {/* Material Composition Chart */}
            <div className="chart-container">
              <h3 className="chart-title">Material Composition</h3>
              <MaterialChart 
                materials={product.lifecycleData.materials}
              />
            </div>

            {/* Sustainability Score Gauge */}
            <div className="chart-container">
              <h3 className="chart-title">Sustainability Score</h3>
              <SustainabilityGauge 
                score={product.sustainabilityScore}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="additional-info">
            <div className="info-card">
              <h3 className="info-card-title">About This Passport</h3>
              <p className="info-card-text">
                This Digital Product Passport provides verified information about the product's
                environmental impact, materials, and manufacturing process. All data is authenticated
                using digital signatures to ensure accuracy and prevent tampering.
              </p>
            </div>

            <div className="info-card">
              <h3 className="info-card-title">Understanding the Data</h3>
              <ul className="info-list">
                <li>
                  <strong>Carbon Footprint:</strong> Total CO₂ emissions across the product lifecycle
                </li>
                <li>
                  <strong>Sustainability Score:</strong> Overall environmental performance (0-100)
                </li>
                <li>
                  <strong>Material Composition:</strong> Breakdown of materials used in production
                </li>
                <li>
                  <strong>Verification Status:</strong> Digital signature validation result
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="consumer-product-footer">
        <div className="footer-content">
          <p className="footer-text">
            Green Passport - Transparent Sustainability Information
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Green Passport. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ConsumerProduct;
