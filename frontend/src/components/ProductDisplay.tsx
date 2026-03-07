/**
 * ProductDisplay Component
 * 
 * Displays comprehensive product information including manufacturer details,
 * carbon footprint, sustainability badge, and verification status.
 * Uses white and green eco-friendly theme.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 25.1, 25.2, 25.3
 */

import React from 'react';
import type { Product, Manufacturer, ProductSerial } from '../../../shared/types';
import './ProductDisplay.css';

interface ProductDisplayProps {
  product: Product;
  manufacturer: Manufacturer;
  serial: ProductSerial;
  verified: boolean;
}

export const ProductDisplay: React.FC<ProductDisplayProps> = ({
  product,
  manufacturer,
  serial,
  verified,
}) => {
  /**
   * Format date to readable string
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Get badge color class
   */
  const getBadgeColorClass = (color: string): string => {
    switch (color.toLowerCase()) {
      case 'green':
        return 'badge-green';
      case 'yellow':
        return 'badge-yellow';
      case 'red':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  return (
    <div className="product-display">
      <div className="product-display-container">
        {/* Header Section */}
        <div className="product-header">
          <div className="product-header-content">
            <h1 className="product-name">{product.name}</h1>
            <p className="product-category">{product.category}</p>
          </div>
          
          {/* Sustainability Badge */}
          <div className={`sustainability-badge ${getBadgeColorClass(product.badge.color)}`}>
            <div className="badge-icon">
              {product.badge.color === 'green' && '🌿'}
              {product.badge.color === 'yellow' && '⚠️'}
              {product.badge.color === 'red' && '🔴'}
            </div>
            <div className="badge-content">
              <div className="badge-name">{product.badge.name}</div>
              <div className="badge-threshold">{product.badge.threshold}</div>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className={`verification-status ${verified ? 'verified' : 'failed'}`}>
          <span className="verification-icon">
            {verified ? '✓' : '✗'}
          </span>
          <span className="verification-text">
            {verified ? 'Verified Authentic' : 'Verification Failed'}
          </span>
          {verified && (
            <span className="verification-detail">
              Digital signature validated
            </span>
          )}
        </div>

        {/* Product Description */}
        <div className="product-section">
          <h2 className="section-title">Product Description</h2>
          <p className="product-description">{product.description}</p>
        </div>

        {/* Carbon Footprint */}
        <div className="product-section carbon-section">
          <h2 className="section-title">Carbon Footprint</h2>
          <div className="carbon-display">
            <div className="carbon-value">
              <span className="carbon-number">{product.carbonFootprint.toFixed(2)}</span>
              <span className="carbon-unit">kg CO₂</span>
            </div>
            <div className="carbon-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Materials:</span>
                <span className="breakdown-value">{product.carbonBreakdown.materials.toFixed(2)} kg</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Manufacturing:</span>
                <span className="breakdown-value">{product.carbonBreakdown.manufacturing.toFixed(2)} kg</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Packaging:</span>
                <span className="breakdown-value">{product.carbonBreakdown.packaging.toFixed(2)} kg</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Transport:</span>
                <span className="breakdown-value">{product.carbonBreakdown.transport.toFixed(2)} kg</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Usage:</span>
                <span className="breakdown-value">{product.carbonBreakdown.usage.toFixed(2)} kg</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Disposal:</span>
                <span className="breakdown-value">{product.carbonBreakdown.disposal.toFixed(2)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sustainability Score */}
        <div className="product-section">
          <h2 className="section-title">Sustainability Score</h2>
          <div className="score-display">
            <div className="score-value">{product.sustainabilityScore}/100</div>
            <div className="score-bar">
              <div 
                className="score-fill"
                style={{ 
                  width: `${product.sustainabilityScore}%`,
                  background: product.sustainabilityScore >= 70 
                    ? '#228b22' 
                    : product.sustainabilityScore >= 40 
                    ? '#ffa500' 
                    : '#dc3545'
                }}
              />
            </div>
          </div>
        </div>

        {/* Manufacturer Information */}
        <div className="product-section manufacturer-section">
          <h2 className="section-title">Manufacturer Information</h2>
          <div className="manufacturer-info">
            <div className="info-row">
              <span className="info-label">Company:</span>
              <span className="info-value">{manufacturer.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location:</span>
              <span className="info-value">{manufacturer.location}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Contact:</span>
              <span className="info-value">{manufacturer.contactEmail}</span>
            </div>
            {manufacturer.certifications.length > 0 && (
              <div className="info-row">
                <span className="info-label">Certifications:</span>
                <div className="certifications">
                  {manufacturer.certifications.map((cert, index) => (
                    <span key={index} className="certification-badge">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Serial Information */}
        <div className="product-section serial-section">
          <h2 className="section-title">Product Serial Information</h2>
          <div className="serial-info">
            <div className="info-row">
              <span className="info-label">Serial Number:</span>
              <span className="info-value serial-id">{serial.serialId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Generated:</span>
              <span className="info-value">{formatDate(serial.generatedAt)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Times Scanned:</span>
              <span className="info-value">{serial.scannedCount}</span>
            </div>
            {serial.lastScannedAt && (
              <div className="info-row">
                <span className="info-label">Last Scanned:</span>
                <span className="info-value">{formatDate(serial.lastScannedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="product-footer">
          <p className="footer-text">
            This Digital Product Passport provides transparent information about the product's
            environmental impact and manufacturing process.
          </p>
          <p className="footer-date">
            Last updated: {formatDate(product.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDisplay;
