/**
 * ConsumerLanding Page
 * 
 * Landing page for consumers with QR scanner interface.
 * Public route accessible without authentication.
 * 
 * Requirements: 11.1, 25.5
 */

import React from 'react';
import { QRScanner } from '../components';
import './ConsumerLanding.css';

const ConsumerLanding: React.FC = () => {
  return (
    <div className="consumer-landing">
      {/* Header */}
      <header className="consumer-header">
        <div className="consumer-header-content">
          <h1 className="consumer-logo">
            <span className="logo-icon">🌿</span>
            Green Passport
          </h1>
          <p className="consumer-tagline">
            Verify Product Sustainability
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="consumer-main">
        <QRScanner />
      </main>

      {/* Footer */}
      <footer className="consumer-footer">
        <div className="footer-content">
          <p className="footer-text">
            Green Passport provides transparent sustainability information for products.
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Green Passport. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ConsumerLanding;
