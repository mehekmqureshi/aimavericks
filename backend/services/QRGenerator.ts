import QRCode from 'qrcode';
import { SignatureService } from './SignatureService';
import { QRBatchResult } from '../../shared/types';

/**
 * QRGenerator generates batch QR codes with unique serial IDs and digital signatures.
 * 
 * Requirements: 8.2, 8.3, 9.1, 9.4
 */
export class QRGenerator {
  private signatureService: SignatureService;

  constructor(signatureService: SignatureService) {
    this.signatureService = signatureService;
  }

  /**
   * Generates a batch of QR codes for a product.
   * 
   * @param productId - The product identifier
   * @param count - Number of QR codes to generate (max 1000)
   * @param manufacturerId - The manufacturer identifier
   * @param carbonFootprint - The product's carbon footprint
   * @param productData - Additional product data for consumer-facing QR codes
   * @returns QRBatchResult containing serial IDs and QR images
   * 
   * Requirements: 8.2, 8.3, 8.4, 8.5, 9.1, 9.4
   */
  async generateBatch(
    productId: string,
    count: number,
    manufacturerId: string,
    carbonFootprint: number,
    productData?: {
      productName: string;
      category: string;
      color?: string;
      materialSummary: string;
      ecoScore: string;
    }
  ): Promise<QRBatchResult> {
    // Validate count
    if (count > 1000) {
      throw new Error('Batch count cannot exceed 1000');
    }

    if (count < 1) {
      throw new Error('Batch count must be at least 1');
    }

    const serialIds: string[] = [];
    const qrImages: Buffer[] = [];

    // Generate each QR code
    for (let i = 0; i < count; i++) {
      // Generate serial ID with format: productId-paddedIndex
      const paddedIndex = String(i + 1).padStart(4, '0');
      const serialId = `${productId}-${paddedIndex}`;
      serialIds.push(serialId);

      // Generate digital signature with all data
      const signatureData: any = {
        productId,
        serialId,
        manufacturerId,
        carbonFootprint,
      };

      // Add optional product data to signature if provided
      if (productData) {
        signatureData.productName = productData.productName;
        signatureData.category = productData.category;
        signatureData.materialSummary = productData.materialSummary;
        signatureData.ecoScore = productData.ecoScore;
        if (productData.color) {
          signatureData.color = productData.color;
        }
      }

      const digitalSignature = this.signatureService.generateSignature(signatureData);

      // Create QR code data payload with consumer-relevant fields
      const qrPayload: any = {
        serialId,
        productId,
        manufacturerId,
        signature: digitalSignature,
      };

      // Add consumer-facing data if provided
      if (productData) {
        qrPayload.productName = productData.productName;
        qrPayload.category = productData.category;
        qrPayload.materialSummary = productData.materialSummary;
        qrPayload.ecoScore = productData.ecoScore;
        qrPayload.carbonFootprint = carbonFootprint;
        if (productData.color) {
          qrPayload.color = productData.color;
        }
      }

      const qrData = JSON.stringify(qrPayload);

      // Generate QR code image as buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
      });

      qrImages.push(qrBuffer);
    }

    // Return result (zipUrl and expiresAt will be set by S3Service)
    return {
      serialIds,
      qrImages,
      zipUrl: '', // Will be populated by S3Service
      expiresAt: new Date(), // Will be populated by S3Service
    };
  }

  /**
   * Generates a single serial ID with the correct format.
   * 
   * @param productId - The product identifier
   * @param index - The index (1-based)
   * @returns Formatted serial ID
   * 
   * Requirements: 8.3
   */
  generateSerialId(productId: string, index: number): string {
    const paddedIndex = String(index).padStart(4, '0');
    return `${productId}-${paddedIndex}`;
  }
}
