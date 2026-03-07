/**
 * SustainabilityGauge Component
 * 
 * Gauge meter displaying sustainability score (0-100) with color gradient.
 * Uses green color theme for eco-friendly visual design.
 * 
 * Requirements: 14.3, 14.5
 */

import React from 'react';
import './SustainabilityGauge.css';

interface SustainabilityGaugeProps {
  score: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const SustainabilityGauge: React.FC<SustainabilityGaugeProps> = ({
  score,
  size = 'medium',
  showLabel = true,
}) => {
  /**
   * Clamp score between 0 and 100
   */
  const clampedScore = Math.max(0, Math.min(100, score));

  /**
   * Calculate rotation angle for gauge needle
   * Gauge spans 180 degrees (from -90 to +90)
   */
  const rotation = -90 + (clampedScore / 100) * 180;

  /**
   * Get color based on score
   */
  const getColor = (score: number): string => {
    if (score >= 70) return '#228b22'; // Green
    if (score >= 40) return '#ffa500'; // Orange
    return '#dc3545'; // Red
  };

  /**
   * Get rating text based on score
   */
  const getRating = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
  };

  /**
   * Get size class
   */
  const getSizeClass = (): string => {
    switch (size) {
      case 'small':
        return 'gauge-small';
      case 'large':
        return 'gauge-large';
      default:
        return 'gauge-medium';
    }
  };

  const color = getColor(clampedScore);
  const rating = getRating(clampedScore);

  return (
    <div className={`sustainability-gauge ${getSizeClass()}`}>
      {showLabel && (
        <div className="gauge-header">
          <h3 className="gauge-title">Sustainability Score</h3>
        </div>
      )}

      <div className="gauge-container">
        {/* SVG Gauge */}
        <svg className="gauge-svg" viewBox="0 0 200 120">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Colored arc segments */}
          {/* Red segment (0-30) */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 36"
            fill="none"
            stroke="#dc3545"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Orange segment (30-70) */}
          <path
            d="M 56 36 A 80 80 0 0 1 144 36"
            fill="none"
            stroke="#ffa500"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Green segment (70-100) */}
          <path
            d="M 144 36 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#228b22"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Progress arc */}
          <path
            d={`M 20 100 A 80 80 0 ${clampedScore > 50 ? '1' : '0'} 1 ${
              100 + 80 * Math.cos((rotation * Math.PI) / 180)
            } ${100 + 80 * Math.sin((rotation * Math.PI) / 180)}`}
            fill="none"
            stroke={color}
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Center circle */}
          <circle cx="100" cy="100" r="5" fill={color} />

          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 70 * Math.cos((rotation * Math.PI) / 180)}
            y2={100 + 70 * Math.sin((rotation * Math.PI) / 180)}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Score display */}
        <div className="gauge-score" style={{ color }}>
          <div className="score-number">{clampedScore}</div>
          <div className="score-max">/100</div>
        </div>
      </div>

      {/* Rating label */}
      <div className="gauge-rating" style={{ color }}>
        {rating}
      </div>

      {/* Scale markers */}
      <div className="gauge-scale">
        <span className="scale-marker scale-start">0</span>
        <span className="scale-marker scale-middle">50</span>
        <span className="scale-marker scale-end">100</span>
      </div>

      {/* Description */}
      {showLabel && (
        <div className="gauge-description">
          <p>
            This score reflects the overall environmental sustainability of the product
            based on carbon footprint, material choices, and lifecycle data.
          </p>
        </div>
      )}
    </div>
  );
};

export default SustainabilityGauge;
