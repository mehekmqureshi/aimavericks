/**
 * QR Verification Service Tests
 */

import { QRVerificationService } from './QRVerificationService';
import { SignatureService } from './SignatureService';

describe('QRVerificationService', () => {
  let verificationService: QRVerificationService;
  let signatureService: SignatureService;

  beforeEach(() => {
    signatureService = new SignatureService();
    verificationService = new QRVerificationService(signatureService);
  });

  describe('verifyQRCode', () => {
    it('should verify valid QR code with all fields', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.payload).toEqual(qrPayload);
    });

    it('should verify valid QR code without optional fields', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject QR code with invalid JSON', () => {
      const qrData = 'invalid json {';

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should reject QR code with missing serialId', () => {
      const qrPayload = {
        productId: 'PROD-001',
        manufacturerId: 'MFG-001',
        signature: 'abc123',
      };
      const qrData = JSON.stringify(qrPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: serialId');
    });

    it('should reject QR code with missing productId', () => {
      const qrPayload = {
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        signature: 'abc123',
      };
      const qrData = JSON.stringify(qrPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: productId');
    });

    it('should reject QR code with invalid signature format', () => {
      const qrPayload = {
        serialId: 'PROD-001-0001',
        productId: 'PROD-001',
        manufacturerId: 'MFG-001',
        signature: 'invalid',
      };
      const qrData = JSON.stringify(qrPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signature format (expected 64-character hex string)');
    });

    it('should reject QR code with tampered product name', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature = signatureService.generateSignature(data);
      
      // Tamper with product name
      const tamperedPayload = { 
        ...data, 
        productName: 'Fake Product',
        signature 
      };
      const qrData = JSON.stringify(tamperedPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signature - data may have been tampered with');
    });

    it('should reject QR code with tampered eco score', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const signature = signatureService.generateSignature(data);
      
      // Tamper with eco score
      const tamperedPayload = { 
        ...data, 
        ecoScore: 'Excellent',
        signature 
      };
      const qrData = JSON.stringify(tamperedPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signature - data may have been tampered with');
    });

    it('should reject QR code with tampered carbon footprint', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const signature = signatureService.generateSignature(data);
      
      // Tamper with carbon footprint
      const tamperedPayload = { 
        ...data, 
        carbonFootprint: 5.0,
        signature 
      };
      const qrData = JSON.stringify(tamperedPayload);

      const result = verificationService.verifyQRCode(qrData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signature - data may have been tampered with');
    });
  });

  describe('extractConsumerInfo', () => {
    it('should extract consumer info from valid QR code', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const info = verificationService.extractConsumerInfo(qrData);

      expect(info).toEqual({
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
        carbonFootprint: 15.5,
      });
    });

    it('should return null for invalid QR code', () => {
      const qrData = 'invalid json';

      const info = verificationService.extractConsumerInfo(qrData);

      expect(info).toBeNull();
    });

    it('should return null for tampered QR code', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        ecoScore: 'Good',
      };

      const signature = signatureService.generateSignature(data);
      
      // Tamper with data
      const tamperedPayload = { 
        ...data, 
        ecoScore: 'Excellent',
        signature 
      };
      const qrData = JSON.stringify(tamperedPayload);

      const info = verificationService.extractConsumerInfo(qrData);

      expect(info).toBeNull();
    });
  });

  describe('validateProductMatch', () => {
    it('should validate matching product ID', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const isValid = verificationService.validateProductMatch(qrData, 'PROD-001');

      expect(isValid).toBe(true);
    });

    it('should reject non-matching product ID', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const isValid = verificationService.validateProductMatch(qrData, 'PROD-002');

      expect(isValid).toBe(false);
    });

    it('should reject invalid QR code', () => {
      const qrData = 'invalid json';

      const isValid = verificationService.validateProductMatch(qrData, 'PROD-001');

      expect(isValid).toBe(false);
    });
  });

  describe('validateManufacturerMatch', () => {
    it('should validate matching manufacturer ID', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const isValid = verificationService.validateManufacturerMatch(qrData, 'MFG-001');

      expect(isValid).toBe(true);
    });

    it('should reject non-matching manufacturer ID', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const qrPayload = { ...data, signature };
      const qrData = JSON.stringify(qrPayload);

      const isValid = verificationService.validateManufacturerMatch(qrData, 'MFG-002');

      expect(isValid).toBe(false);
    });
  });
});
