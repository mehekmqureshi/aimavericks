/// <reference types="node" />

/**
 * Shared TypeScript interfaces and types for Green Passport Platform
 * These types are used across backend, frontend, and infrastructure
 */

// ============================================================================
// Lifecycle Data Interfaces
// ============================================================================

/**
 * Material row entry with detailed specifications
 */
export interface Material_Row {
  name: string;
  percentage: number;              // 0-100
  weight: number;                  // in kg
  emissionFactor: number;          // kg CO2 per kg material
  countryOfOrigin: string;
  recycled: boolean;               // true = recycled, false = virgin
  certification?: string;          // optional certification
  calculatedEmission: number;      // computed: weight × emissionFactor
}

/**
 * Manufacturing data with energy consumption and emissions
 */
export interface Manufacturing_Data {
  factoryLocation: string;
  energyConsumption: number;       // kWh per piece
  energyEmissionFactor: number;    // kg CO2 per kWh
  dyeingMethod: string;
  waterConsumption: number;        // litres
  wasteGenerated: number;          // kg
  calculatedEmission: number;      // computed: energyConsumption × energyEmissionFactor
}

/**
 * Packaging data with material specifications
 */
export interface Packaging_Data {
  materialType: string;
  weight: number;                  // kg
  emissionFactor: number;          // kg CO2 per kg
  recyclable: boolean;
  calculatedEmission: number;      // computed: weight × emissionFactor
}

/**
 * Transport data with mode and distance
 */
export interface Transport_Data {
  mode: 'Road' | 'Air' | 'Ship';
  distance: number;                // km
  fuelType: string;
  emissionFactorPerKm: number;     // kg CO2 per km
  calculatedEmission: number;      // computed: distance × emissionFactorPerKm
}

/**
 * Usage phase data for consumer use
 */
export interface Usage_Data {
  avgWashCycles: number;
  washTemperature: number;         // degrees Celsius
  dryerUse: boolean;
  calculatedEmission: number;      // computed based on wash cycles, temp, dryer
}

/**
 * End of life data for disposal
 */
export interface EndOfLife_Data {
  recyclable: boolean;
  biodegradable: boolean;
  takebackProgram: boolean;
  disposalEmission: number;        // kg CO2
}

/**
 * Complete lifecycle data structure
 */
export interface LifecycleData {
  materials: Material_Row[];
  manufacturing: Manufacturing_Data;
  packaging: Packaging_Data;
  transport: Transport_Data;
  usage: Usage_Data;
  endOfLife: EndOfLife_Data;
}

// ============================================================================
// Carbon Calculation Interfaces
// ============================================================================

/**
 * Carbon footprint calculation result with breakdown
 */
export interface CarbonFootprintResult {
  totalCO2: number;
  breakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
  predictionSource?: 'ML' | 'Fallback';
  confidenceScore?: number;
}

/**
 * Sustainability badge
 */
export interface Badge {
  name: string;
  color: string;
  threshold: string;
}

// ============================================================================
// Product Interfaces
// ============================================================================

/**
 * Product entity
 */
export interface Product {
  productId: string;
  manufacturerId: string;
  name: string;
  description: string;
  category: string;
  
  // Structured Lifecycle Data
  lifecycleData: LifecycleData;
  
  // Carbon Metrics
  carbonFootprint: number;
  carbonBreakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
  sustainabilityScore: number;
  badge: Badge;
  predictionSource?: 'ML' | 'Fallback';
  confidenceScore?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Manufacturer entity
 */
export interface Manufacturer {
  manufacturerId: string;
  name: string;
  location: string;
  certifications: string[];
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product serial entity
 */
export interface ProductSerial {
  serialId: string;
  productId: string;
  manufacturerId: string;
  digitalSignature: string;
  qrCodeUrl: string;
  generatedAt: string;
  scannedCount: number;
  lastScannedAt?: string;
}

/**
 * Draft entity for saving incomplete product data
 */
export interface Draft {
  draftId: string;
  manufacturerId: string;
  name?: string;
  description?: string;
  category?: string;
  lifecycleData?: Partial<LifecycleData>;
  savedAt: string;
  updatedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create product request
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  lifecycleData: LifecycleData;
}

/**
 * Create product response
 */
export interface CreateProductResponse {
  productId: string;
  carbonFootprint: number;
  carbonBreakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
  sustainabilityScore: number;
  badge: Badge;
  createdAt: string;
  predictionSource?: 'ML' | 'Fallback';
  confidenceScore?: number;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  lifecycleData?: Partial<LifecycleData>;
}

/**
 * Generate QR batch request
 */
export interface GenerateQRRequest {
  productId: string;
  count: number;
}

/**
 * Generate QR batch response
 */
export interface GenerateQRResponse {
  serialIds: string[];
  zipUrl: string;
  expiresAt: string;
}

/**
 * Verify serial response
 */
export interface VerifySerialResponse {
  verified: boolean;
  product: Product;
  manufacturer: Manufacturer;
  serial: ProductSerial;
}

/**
 * AI generate description request
 */
export interface AIGenerateDescriptionRequest {
  productData: {
    name: string;
    category: string;
    materials: string[];
    manufacturingProcess: string;
  };
}

/**
 * AI generate insights request
 */
export interface AIGenerateInsightsRequest {
  productId: string;
}

/**
 * Calculate emission request (real-time)
 */
export interface CalculateEmissionRequest {
  section?: 'materials' | 'manufacturing' | 'packaging' | 'transport' | 'usage' | 'endOfLife';
  data: any;
}

/**
 * Calculate emission response
 */
export interface CalculateEmissionResponse {
  sectionEmission: number;
  totalCO2: number;
  breakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
}

/**
 * Save draft request
 */
export interface SaveDraftRequest {
  name?: string;
  description?: string;
  category?: string;
  lifecycleData?: Partial<LifecycleData>;
}

/**
 * Save draft response
 */
export interface SaveDraftResponse {
  draftId: string;
  savedAt: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Authentication result
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  manufacturerId: string;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  valid: boolean;
  manufacturerId?: string;
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error response
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Signature data for QR code generation
 */
export interface SignatureData {
  productId: string;
  serialId: string;
  manufacturerId: string;
  carbonFootprint: number;
}

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  product?: Product;
  manufacturer?: Manufacturer;
  serial?: ProductSerial;
  error?: string;
}

/**
 * QR batch result
 */
export interface QRBatchResult {
  serialIds: string[];
  qrImages: Buffer[];
  zipUrl: string;
  expiresAt: Date;
}

/**
 * Migration validation result
 */
export interface MigrationValidation {
  valid: boolean;
  carbonFootprintMatch: boolean;
  carbonDifference: number;
  errors: string[];
}

/**
 * Migration result
 */
export interface MigrationResult {
  totalProducts: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: Array<{ productId: string; error: string }>;
}

// ============================================================================
// SageMaker ML Prediction Types
// ============================================================================

/**
 * SageMaker inference request payload
 */
export interface SageMakerInferenceRequest {
  materialEmission: number;
  manufacturingEmission: number;
  packagingEmission: number;
  transportEmission: number;
  usageEmission: number;
  disposalEmission: number;
}

/**
 * SageMaker inference response
 */
export interface SageMakerInferenceResponse {
  predictedCarbon: number;
  confidenceScore: number;
}

/**
 * Carbon calculation configuration
 */
export interface CarbonCalculatorConfig {
  useSageMaker: boolean;
  sagemakerEndpointName?: string;
  fallbackOnError: boolean;
  timeoutMs: number;
}

// ============================================================================
// Legacy Data Types (for migration)
// ============================================================================

/**
 * Legacy material format (simple array of strings or basic objects)
 */
export interface LegacyMaterial {
  name: string;
  percentage?: number;
  weight?: number;
  emissionFactor?: number;
}

/**
 * Legacy lifecycle data format (unstructured or partially structured)
 */
export interface LegacyLifecycleData {
  materials?: string[] | LegacyMaterial[];
  manufacturing?: string | Partial<Manufacturing_Data>;
  packaging?: string | Partial<Packaging_Data>;
  transport?: string | Partial<Transport_Data>;
  usage?: string | Partial<Usage_Data>;
  endOfLife?: string | Partial<EndOfLife_Data>;
  // Legacy might have stored raw text descriptions
  rawDescription?: string;
}

/**
 * Legacy product format (before structured lifecycle data)
 */
export interface LegacyProduct {
  productId: string;
  manufacturerId: string;
  name: string;
  description: string;
  category: string;
  
  // Legacy lifecycle data (unstructured or partially structured)
  lifecycleData?: LegacyLifecycleData;
  
  // Carbon metrics (preserved during migration)
  carbonFootprint: number;
  carbonBreakdown?: {
    materials?: number;
    manufacturing?: number;
    packaging?: number;
    transport?: number;
    usage?: number;
    disposal?: number;
  };
  sustainabilityScore?: number;
  badge?: Badge;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
