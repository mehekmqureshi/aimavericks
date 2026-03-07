/**
 * Enhanced Signature Service Tests
 * Tests signature generation and verification with consumer-facing data
 */

import { SignatureService } from './SignatureService';

describe('SignatureService - Enhanced Data', () => {
  let signatureService: SignatureService;

  beforeEach(() => {
    signatureService = new SignatureService();
  });

  describe('generateSignature with enhanced data', () => {
    it('should generate consistent signatures with all fields', () => {
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

      const signature1 = signatureService.generateSignature(data);
      const signature2 = signatureService.generateSignature(data);

      // Signatures should be consistent
      expect(signature1).toBe(signature2);
      
      // Signature should be a valid SHA256 hex string (64 characters)
      expect(signature1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different signatures for different product names', () => {
      const baseData = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        category: 'Apparel',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature1 = signatureService.generateSignature({
        ...baseData,
        productName: 'Organic Cotton T-Shirt',
      });

      const signature2 = signatureService.generateSignature({
        ...baseData,
        productName: 'Regular Cotton T-Shirt',
      });

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different categories', () => {
      const baseData = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature1 = signatureService.generateSignature({
        ...baseData,
        category: 'Apparel',
      });

      const signature2 = signatureService.generateSignature({
        ...baseData,
        category: 'Outerwear',
      });

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures with and without color', () => {
      const baseData = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
      };

      const signature1 = signatureService.generateSignature(baseData);

      const signature2 = signatureService.generateSignature({
        ...baseData,
        color: 'Blue',
      });

      expect(signature1).not.toBe(signature2);
    });

    it('should maintain backward compatibility without optional fields', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);

      // Should generate a valid signature
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signatures with all fields', () => {
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
      const isValid = signatureService.verifySignature(signature, data);

      expect(isValid).toBe(true);
    });

    it('should reject signatures with tampered product name', () => {
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
      const tamperedData = { ...data, productName: 'Fake Product' };
      const isValid = signatureService.verifySignature(signature, tamperedData);

      expect(isValid).toBe(false);
    });

    it('should reject signatures with tampered eco score', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Good',
      };

      const signature = signatureService.generateSignature(data);

      // Tamper with eco score
      const tamperedData = { ...data, ecoScore: 'Excellent' };
      const isValid = signatureService.verifySignature(signature, tamperedData);

      expect(isValid).toBe(false);
    });

    it('should reject signatures with tampered carbon footprint', () => {
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

      // Tamper with carbon footprint
      const tamperedData = { ...data, carbonFootprint: 5.0 };
      const isValid = signatureService.verifySignature(signature, tamperedData);

      expect(isValid).toBe(false);
    });

    it('should verify signatures without optional fields', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
      };

      const signature = signatureService.generateSignature(data);
      const isValid = signatureService.verifySignature(signature, data);

      expect(isValid).toBe(true);
    });

    it('should handle missing optional fields consistently', () => {
      const dataWithColor = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const dataWithoutColor = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const signatureWithColor = signatureService.generateSignature(dataWithColor);
      const signatureWithoutColor = signatureService.generateSignature(dataWithoutColor);

      // Signatures should be different
      expect(signatureWithColor).not.toBe(signatureWithoutColor);

      // Each should verify correctly
      expect(signatureService.verifySignature(signatureWithColor, dataWithColor)).toBe(true);
      expect(signatureService.verifySignature(signatureWithoutColor, dataWithoutColor)).toBe(true);

      // Cross-verification should fail
      expect(signatureService.verifySignature(signatureWithColor, dataWithoutColor)).toBe(false);
      expect(signatureService.verifySignature(signatureWithoutColor, dataWithColor)).toBe(false);
    });
  });

  describe('Security properties', () => {
    it('should generate different signatures for different serial IDs', () => {
      const baseData = {
        productId: 'PROD-001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const signature1 = signatureService.generateSignature({
        ...baseData,
        serialId: 'PROD-001-0001',
      });

      const signature2 = signatureService.generateSignature({
        ...baseData,
        serialId: 'PROD-001-0002',
      });

      expect(signature1).not.toBe(signature2);
    });

    it('should be deterministic for the same input', () => {
      const data = {
        productId: 'PROD-001',
        serialId: 'PROD-001-0001',
        manufacturerId: 'MFG-001',
        carbonFootprint: 15.5,
        productName: 'Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 100%',
        ecoScore: 'Good',
      };

      const signatures = Array.from({ length: 10 }, () =>
        signatureService.generateSignature(data)
      );

      // All signatures should be identical
      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBe(1);
    });
  });
});
