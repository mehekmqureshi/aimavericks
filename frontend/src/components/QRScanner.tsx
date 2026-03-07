/**
 * QRScanner Component
 * 
 * Camera-based QR scanning interface with manual serial number entry.
 * Extracts serial ID from scanned QR code and calls verify API endpoint.
 * 
 * Requirements: 11.1, 11.2, 11.3
 * 
 * HTTPS Required: Camera access requires secure origin (HTTPS)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import './QRScanner.css';

interface QRScannerProps {
  onScan?: (serialId: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const [serialInput, setSerialInput] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  /**
   * Extract serial ID from QR code data
   * Supports multiple formats:
   * 1. JSON payload: {"serialId":"PROD-xxx-0001","productId":"...","signature":"..."}
   * 2. URL format: /product/PROD-xxx-0001
   * 3. Plain serial ID: PROD-xxx-0001
   */
  const extractSerialId = (data: string): string | null => {
    try {
      // Try parsing as JSON first (QR Management format)
      const parsed = JSON.parse(data);
      if (parsed.serialId) {
        return parsed.serialId;
      }
    } catch (e) {
      // Not JSON, try other formats
    }
    
    // QR code might contain full URL
    // Capture everything after /product/ until whitespace or end of string
    const urlMatch = data.match(/\/product\/([^\s]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Check if data is already in serial ID format
    // Supports alphanumeric (upper/lowercase) and dashes, must contain at least one dash
    const serialMatch = data.match(/^[A-Za-z0-9]+[A-Za-z0-9\-]*[A-Za-z0-9]+$/);
    if (serialMatch && data.includes('-')) {
      return data;
    }
    
    return null;
  };

  /**
   * Handle QR code scan result
   */
  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const data = result[0].rawValue;
      setError('');
      const serialId = extractSerialId(data);
      
      if (serialId) {
        setIsScanning(false);
        if (onScan) {
          onScan(serialId);
        } else {
          navigate(`/product/${serialId}`);
        }
      } else {
        setError('Invalid QR code format. Please scan a valid product QR code.');
      }
    }
  };

  /**
   * Handle scan error
   */
  const handleError = (error: unknown) => {
    const err = error as Error;
    console.error('QR Scanner error:', err);
    
    // Check if it's a permission error
    if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
      setError('Camera access denied. Please allow camera access in your browser settings or use manual entry below.');
    } else if (err.name === 'NotFoundError') {
      setError('No camera found on this device. Please use manual entry below.');
    } else if (err.name === 'NotReadableError') {
      setError('Camera is already in use by another application. Please close other apps and try again.');
    } else if (err.message?.includes('https') || err.message?.includes('secure')) {
      setError('Camera requires HTTPS. Please access this page via HTTPS or use manual entry below.');
    } else {
      setError('Camera error: ' + (err.message || 'Unknown error') + '. Please use manual entry below.');
    }
    
    setIsScanning(false);
  };

  /**
   * Handle manual serial number submission
   */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!serialInput.trim()) {
      setError('Please enter a serial number');
      return;
    }
    
    const trimmedInput = serialInput.trim();
    
    // Validate serial format (supports both simple and UUID-based formats)
    // Must start with alphanumeric, contain at least one dash, end with alphanumeric
    // Supports uppercase, lowercase, and numbers
    const serialPattern = /^[A-Za-z0-9]+[A-Za-z0-9\-]*[A-Za-z0-9]+$/;
    
    if (!serialPattern.test(trimmedInput) || !trimmedInput.includes('-')) {
      setError('Invalid serial number format. Expected format: PROD-xxx-0001 or PROD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-0001');
      return;
    }
    
    if (onScan) {
      onScan(trimmedInput);
    } else {
      navigate(`/product/${trimmedInput}`);
    }
  };

  /**
   * Start camera scanning
   */
  const startScanning = async () => {
    setError('');
    
    // Check if we're on HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      setError('Camera access requires HTTPS. Please access this page via HTTPS or use manual entry below.');
      return;
    }
    
    // Check camera permission
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (result.state === 'denied') {
          setError('Camera access denied. Please allow camera access in your browser settings.');
          return;
        }
      }
    } catch (err) {
      console.log('Permission API not supported, will try to access camera directly');
    }
    
    setIsScanning(true);
  };

  /**
   * Stop camera scanning
   */
  const stopScanning = () => {
    setIsScanning(false);
    setError('');
  };

  return (
    <div className="qr-scanner">
      <div className="qr-scanner-container">
        <h2 className="qr-scanner-title">Scan Product QR Code</h2>
        <p className="qr-scanner-subtitle">
          Scan the QR code on your product to view its sustainability information
        </p>

        {/* Camera Scanner Section */}
        <div className="qr-scanner-camera">
          {isScanning ? (
            <div className="camera-view">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment',
                  aspectRatio: 1
                }}
                styles={{
                  container: {
                    width: '100%',
                    maxWidth: '500px',
                    margin: '0 auto'
                  },
                  video: {
                    width: '100%',
                    borderRadius: '8px'
                  }
                }}
              />
              <button 
                className="btn-stop-scan"
                onClick={stopScanning}
              >
                Stop Scanning
              </button>
            </div>
          ) : (
            <button 
              className="btn-start-scan"
              onClick={startScanning}
            >
              <span className="scan-icon">📷</span>
              Start Camera Scan
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="qr-scanner-divider">
          <span>OR</span>
        </div>

        {/* Manual Entry Section */}
        <div className="qr-scanner-manual">
          <form onSubmit={handleManualSubmit}>
            <label htmlFor="serial-input" className="manual-label">
              Enter Serial Number Manually
            </label>
            <div className="manual-input-group">
              <input
                id="serial-input"
                type="text"
                className="manual-input"
                placeholder="e.g., PROD001-0001"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-verify"
              >
                Verify
              </button>
            </div>
            <p className="manual-hint">
              Format: PROD-xxx-0001 or PROD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-0001
            </p>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="qr-scanner-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Info Section */}
        <div className="qr-scanner-info">
          <h3>What you'll see:</h3>
          <ul>
            <li>✓ Product sustainability information</li>
            <li>✓ Carbon footprint breakdown</li>
            <li>✓ Material composition</li>
            <li>✓ Manufacturer details</li>
            <li>✓ Verification status</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
