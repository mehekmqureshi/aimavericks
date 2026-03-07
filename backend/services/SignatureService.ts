import crypto from 'crypto';

/**
 * SignatureService generates digital signatures for product serials
 * using SHA256 hashing to ensure authenticity and tamper detection.
 */
export class SignatureService {
  /**
   * Generates a digital signature for a product serial.
   * 
   * @param data - The data to sign including productId, serialId, manufacturerId, carbonFootprint, and optional consumer fields
   * @returns SHA256 hash as a hexadecimal string
   * 
   * Requirements: 9.1, 9.2
   */
  generateSignature(data: {
    productId: string;
    serialId: string;
    manufacturerId: string;
    carbonFootprint: number;
    productName?: string;
    category?: string;
    color?: string;
    materialSummary?: string;
    ecoScore?: string;
  }): string {
    const { 
      productId, 
      serialId, 
      manufacturerId, 
      carbonFootprint,
      productName,
      category,
      color,
      materialSummary,
      ecoScore
    } = data;
    
    // Concatenate all fields to create the signature input
    // Include optional fields in a deterministic order
    let signatureInput = `${productId}${serialId}${manufacturerId}${carbonFootprint}`;
    
    if (productName) signatureInput += productName;
    if (category) signatureInput += category;
    if (color) signatureInput += color;
    if (materialSummary) signatureInput += materialSummary;
    if (ecoScore) signatureInput += ecoScore;
    
    // Generate SHA256 hash
    const hash = crypto.createHash('sha256');
    hash.update(signatureInput);
    
    return hash.digest('hex');
  }

  /**
   * Verifies a digital signature against the provided data.
   * 
   * @param signature - The signature to verify
   * @param data - The data that was signed
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(
    signature: string,
    data: {
      productId: string;
      serialId: string;
      manufacturerId: string;
      carbonFootprint: number;
      productName?: string;
      category?: string;
      color?: string;
      materialSummary?: string;
      ecoScore?: string;
    }
  ): boolean {
    const expectedSignature = this.generateSignature(data);
    return signature === expectedSignature;
  }
}
