/**
 * VerificationBadge Component
 * 
 * Displays verification status with visual indicators.
 * Shows "Verified" with green indicator or "Verification Failed" with red indicator.
 * 
 * Requirements: 13.3, 13.4
 */

import React from 'react';
import './VerificationBadge.css';

interface VerificationBadgeProps {
  verified: boolean;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  verificationTime?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verified,
  size = 'medium',
  showDetails = false,
  verificationTime,
}) => {
  /**
   * Get size class
   */
  const getSizeClass = (): string => {
    switch (size) {
      case 'small':
        return 'badge-small';
      case 'large':
        return 'badge-large';
      default:
        return 'badge-medium';
    }
  };

  /**
   * Format verification time
   */
  const formatTime = (timeString?: string): string => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`verification-badge ${
        verified ? 'verified' : 'failed'
      } ${getSizeClass()}`}
    >
      <div className="badge-content">
        {/* Icon */}
        <div className="badge-icon">
          {verified ? (
            <svg
              className="icon-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg
              className="icon-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="badge-text">
          <div className="badge-status">
            {verified ? 'Verified Authentic' : 'Verification Failed'}
          </div>
          {showDetails && (
            <div className="badge-details">
              {verified ? (
                <>
                  <p className="detail-line">
                    ✓ Digital signature validated
                  </p>
                  <p className="detail-line">
                    ✓ Product data integrity confirmed
                  </p>
                  <p className="detail-line">
                    ✓ Manufacturer identity verified
                  </p>
                  {verificationTime && (
                    <p className="detail-time">
                      Verified: {formatTime(verificationTime)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="detail-line">
                    ✗ Digital signature mismatch
                  </p>
                  <p className="detail-line">
                    ✗ Product data may have been tampered
                  </p>
                  <p className="detail-warning">
                    ⚠️ This product may not be authentic. Contact the manufacturer
                    for verification.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security indicator */}
      <div className="security-indicator">
        <div className="indicator-dot" />
        <span className="indicator-text">
          {verified ? 'Secure' : 'Insecure'}
        </span>
      </div>
    </div>
  );
};

export default VerificationBadge;
