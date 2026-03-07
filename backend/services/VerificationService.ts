import { VerificationResult } from '../../shared/types';
import { SerialRepository } from '../repositories/SerialRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { ManufacturerRepository } from '../repositories/ManufacturerRepository';
import { SignatureService } from './SignatureService';

/**
 * VerificationService handles QR code authenticity verification
 * by validating digital signatures against stored product data.
 * 
 * Requirements: 13.1, 13.3, 13.4
 */
export class VerificationService {
  private serialRepository: SerialRepository;
  private productRepository: ProductRepository;
  private manufacturerRepository: ManufacturerRepository;
  private signatureService: SignatureService;

  constructor(
    serialRepository?: SerialRepository,
    productRepository?: ProductRepository,
    manufacturerRepository?: ManufacturerRepository,
    signatureService?: SignatureService
  ) {
    this.serialRepository = serialRepository || new SerialRepository();
    this.productRepository = productRepository || new ProductRepository();
    this.manufacturerRepository = manufacturerRepository || new ManufacturerRepository();
    this.signatureService = signatureService || new SignatureService();
  }

  /**
   * Verifies a serial ID by validating its digital signature.
   * 
   * Process:
   * 1. Retrieve serial record from database
   * 2. Retrieve associated product and manufacturer data
   * 3. Recompute digital signature from current data
   * 4. Compare stored signature with computed signature
   * 5. Return verification result with product data
   * 
   * @param serialId - The serial ID to verify
   * @returns VerificationResult with verified status and product data
   * 
   * Requirements:
   * - 13.1: Retrieve stored digital signature
   * - 13.3: Return "Verified" status when signatures match
   * - 13.4: Return "Verification Failed" when signatures don't match
   * - 13.5: Complete verification within 200ms
   */
  async verifySerial(serialId: string): Promise<VerificationResult> {
    try {
      // Step 1: Retrieve serial record
      const serial = await this.serialRepository.getSerial(serialId);
      
      if (!serial) {
        return {
          verified: false,
          error: 'Serial ID not found',
        };
      }

      // Step 2: Retrieve product data
      const product = await this.productRepository.getProduct(serial.productId);
      
      if (!product) {
        return {
          verified: false,
          error: 'Product not found',
        };
      }

      // Step 3: Retrieve manufacturer data
      const manufacturer = await this.manufacturerRepository.getManufacturer(serial.manufacturerId);
      
      if (!manufacturer) {
        return {
          verified: false,
          error: 'Manufacturer not found',
        };
      }

      // Step 4: Recompute digital signature from current data
      const computedSignature = this.signatureService.generateSignature({
        productId: serial.productId,
        serialId: serial.serialId,
        manufacturerId: serial.manufacturerId,
        carbonFootprint: product.carbonFootprint,
      });

      // Step 5: Compare stored vs computed signatures
      const verified = serial.digitalSignature === computedSignature;

      // Return verification result
      return {
        verified,
        product,
        manufacturer,
        serial,
        error: verified ? undefined : 'Digital signature verification failed - product data may have been tampered with',
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed due to an unexpected error',
      };
    }
  }
}
