/**
 * Enhanced QR Generator Tests
 * Tests the new consumer-facing QR code payload with comprehensive product information
 */

import { QRGenerator } from './QRGenerator';
import { SignatureService } from './SignatureService';

describe('QRGenerator - Enhanced Consumer Data', () => {
  let qrGenerator: QRGenerator;
  let signatureService: SignatureService;

  beforeEach(() => {
    signatureService = new SignatureService();
    qrGenerator = new QRGenerator(signatureService);
  });

  describe('generateBatch with enhanced product data', () => {
    it('should generate QR codes with comprehensive consumer-relevant fields', async () => {
      const productId = 'PROD-001';
      const count = 1;
      const manufacturerId = 'MFG-001';
      const carbonFootprint = 15.5;
      const productData = {
        productName: 'Organic Cotton T-Shirt',
        category: 'Apparel',
        color: 'Blue',
        materialSummary: 'Cotton 95%, Elastane 5%',
        ecoScore: 'Excellent',
        carbonBreakdown: {
          materials: 5.2,
          manufacturing: 3.8,
          packaging: 1.5,
          transport: 2.0,
          usage: 2.5,
          disposal: 0.5,
        },
        manufacturerName: 'EcoTextiles Inc',
        manufacturerLocation: 'Portland, OR',
        certifications: ['GOTS', 'Fair Trade'],
      };

      const result = await qrGenerator.generateBatch(
        productId,
        count,
        manufacturerId,
        carbonFootprint,
        productData
      );

      // Verify QR codes were generated
      expect(result.serialIds).toHaveLength(1);
      expect(result.qrImages).toHaveLength(1);
      expect(result.qrImages[0]).toBeInstanceOf(Buffer);
      expect(result.qrImages[0].length).toBeGreaterThan(0);
    }, 10000);

    it('should generate QR codes without optional fields', async () => {
      const productId = 'PROD-002';
      const count = 1;
      const manufacturerId = 'MFG-001';
      const carbonFootprint = 12.3;
      const productData = {
        productName: 'Recycled Polyester Jacket',
        category: 'Outerwear',
        materialSummary: 'Polyester 100% (Recycled)',
        ecoScore: 'Good',
        carbonBreakdown: {
          materials: 4.0,
          manufacturing: 3.0,
          packaging: 1.3,
          transport: 2.0,
          usage: 1.5,
          disposal: 0.5,
        },
        manufacturerName: 'GreenWear Co',
        manufacturerLocation: 'Seattle, WA',
        certifications: ['GRS'],
      };

      const result = await qrGenerator.generateBatch(
        productId,
        count,
        manufacturerId,
        carbonFootprint,
        productData
      );

      expect(result.serialIds).toHaveLength(1);
      expect(result.qrImages[0]).toBeInstanceOf(Buffer);
    }, 10000);

    it('should maintain backward compatibility without product data', async () => {
      const productId = 'PROD-004';
      const count = 2;
      const manufacturerId = 'MFG-001';
      const carbonFootprint = 10.0;

      const result = await qrGenerator.generateBatch(
        productId,
        count,
        manufacturerId,
        carbonFootprint
      );

      // Should still work without enhanced data
      expect(result.serialIds).toHaveLength(2);
      expect(result.qrImages).toHaveLength(2);
      expect(result.serialIds[0]).toBe('PROD-004-0001');
      expect(result.serialIds[1]).toBe('PROD-004-0002');
    }, 10000);

    it('should generate unique signatures for each serial ID', async () => {
      const productId = 'PROD-005';
      const count = 3;
      const manufacturerId = 'MFG-001';
      const carbonFootprint = 15.0;
      const productData = {
        productName: 'Bamboo Socks',
        category: 'Accessories',
        materialSummary: 'Bamboo 80%, Nylon 20%',
        ecoScore: 'Good',
        carbonBreakdown: {
          materials: 3.0,
          manufacturing: 2.0,
          packaging: 1.0,
          transport: 1.5,
          usage: 1.0,
          disposal: 0.5,
        },
        manufacturerName: 'Sustainable Goods',
        manufacturerLocation: 'Austin, TX',
        certifications: ['OEKO-TEX'],
      };

      const result = await qrGenerator.generateBatch(
        productId,
        count,
        manufacturerId,
        carbonFootprint,
        productData
      );

      // Verify all QR codes were generated
      expect(result.serialIds).toHaveLength(3);
      expect(result.qrImages).toHaveLength(3);
      
      // Each should be unique
      const uniqueSerialIds = new Set(result.serialIds);
      expect(uniqueSerialIds.size).toBe(3);
    }, 10000);

    it('should handle batch generation with enhanced data', async () => {
      const productId = 'PROD-006';
      const count = 5;
      const manufacturerId = 'MFG-001';
      const carbonFootprint = 25.5;
      const productData = {
        productName: 'Sustainable Denim Jeans',
        category: 'Bottoms',
        color: 'Indigo Blue',
        materialSummary: 'Cotton 98% (Organic), Elastane 2%',
        ecoScore: 'Excellent',
        carbonBreakdown: {
          materials: 8.0,
          manufacturing: 6.5,
          packaging: 2.0,
          transport: 4.0,
          usage: 4.0,
          disposal: 1.0,
        },
        manufacturerName: 'Denim Works',
        manufacturerLocation: 'Los Angeles, CA',
        certifications: ['GOTS', 'Fair Trade', 'B Corp'],
      };

      const result = await qrGenerator.generateBatch(
        productId,
        count,
        manufacturerId,
        carbonFootprint,
        productData
      );

      expect(result.serialIds).toHaveLength(5);
      expect(result.qrImages).toHaveLength(5);
      expect(result.serialIds[0]).toBe('PROD-006-0001');
      expect(result.serialIds[4]).toBe('PROD-006-0005');
    }, 10000);
  });
});
