/**
 * QR Verification Service
 * Validates and verifies QR code payloads with enhanced consumer data
 */

import { SignatureService } from './SignatureService';

export interface QRPayload {
  serialId: string;
  productId: string;
  manufacturerId: string;
  signature: string;
  productName?: string;
  category?: string;
  color?: string;
  materialSummary?: string;
  ecoScore?: string;
  carbonFootprint?: number;
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  payload?: QRPayload;
}

/**
 * Service for verifying QR code payloads
 */
export class QRVerificationService {
  private signatureService: SignatureService;

  constructor(signatureService: SignatureService) {
    this.signatureService = signatureService;
  }

  /**
   * Verifies a QR code payload
   * 
   * @param qrData - The QR code data string (JSON)
   * @returns Verification result with validity status and any errors
   */
  verifyQRCode(qrData: string): VerificationResult {
    const errors: string[] = [];

    // Step 1: Parse JSON
    let payload: QRPayload;
    try {
      payload = JSON.parse(qrData);
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid JSON format'],
      };
    }

    // Step 2: Validate required fields
    if (!payload.serialId) {
      errors.push('Missing required field: serialId');
    }
    if (!payload.productId) {
      errors.push('Missing required field: productId');
    }
    if (!payload.manufacturerId) {
      errors.push('Missing required field: manufacturerId');
    }
    if (!payload.signature) {
      errors.push('Missing required field: signature');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        payload,
      };
    }

    // Step 3: Validate signature format
    if (!/^[a-f0-9]{64}$/.test(payload.signature)) {
      errors.push('Invalid signature format (expected 64-character hex string)');
      return {
        isValid: false,
        errors,
        payload,
      };
    }

    // Step 4: Verify digital signature
    // Note: carbonFootprint is required for signature verification
    // If not in payload, signature verification will fail
    const signatureData: any = {
      productId: payload.productId,
      serialId: payload.serialId,
      manufacturerId: payload.manufacturerId,
      carbonFootprint: payload.carbonFootprint || 0,
    };

    // Add optional fields if present
    if (payload.productName) signatureData.productName = payload.productName;
    if (payload.category) signatureData.category = payload.category;
    if (payload.color) signatureData.color = payload.color;
    if (payload.materialSummary) signatureData.materialSummary = payload.materialSummary;
    if (payload.ecoScore) signatureData.ecoScore = payload.ecoScore;

    const isSignatureValid = this.signatureService.verifySignature(
      payload.signature,
      signatureData
    );

    if (!isSignatureValid) {
      errors.push('Invalid signature - data may have been tampered with');
      return {
        isValid: false,
        errors,
        payload,
      };
    }

    // All checks passed
    return {
      isValid: true,
      errors: [],
      payload,
    };
  }

  /**
   * Extracts consumer-facing information from a verified QR code
   * 
   * @param qrData - The QR code data string (JSON)
   * @returns Consumer information if valid, null otherwise
   */
  extractConsumerInfo(qrData: string): {
    productName?: string;
    category?: string;
    color?: string;
    materialSummary?: string;
    ecoScore?: string;
    carbonFootprint?: number;
  } | null {
    const result = this.verifyQRCode(qrData);
    
    if (!result.isValid || !result.payload) {
      return null;
    }

    return {
      productName: result.payload.productName,
      category: result.payload.category,
      color: result.payload.color,
      materialSummary: result.payload.materialSummary,
      ecoScore: result.payload.ecoScore,
      carbonFootprint: result.payload.carbonFootprint,
    };
  }

  /**
   * Validates that a QR code belongs to a specific product
   * 
   * @param qrData - The QR code data string (JSON)
   * @param expectedProductId - The expected product ID
   * @returns true if QR code is valid and matches the product
   */
  validateProductMatch(qrData: string, expectedProductId: string): boolean {
    const result = this.verifyQRCode(qrData);
    
    if (!result.isValid || !result.payload) {
      return false;
    }

    return result.payload.productId === expectedProductId;
  }

  /**
   * Validates that a QR code belongs to a specific manufacturer
   * 
   * @param qrData - The QR code data string (JSON)
   * @param expectedManufacturerId - The expected manufacturer ID
   * @returns true if QR code is valid and matches the manufacturer
   */
  validateManufacturerMatch(qrData: string, expectedManufacturerId: string): boolean {
    const result = this.verifyQRCode(qrData);
    
    if (!result.isValid || !result.payload) {
      return false;
    }

    return result.payload.manufacturerId === expectedManufacturerId;
  }
}
