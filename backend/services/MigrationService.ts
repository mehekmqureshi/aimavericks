/**
 * MigrationService - Converts legacy product data to structured lifecycle format
 * 
 * This service handles migration from the old unstructured lifecycle data format
 * to the new structured format with detailed Material_Row, Manufacturing_Data, etc.
 * 
 * Key Requirements:
 * - Preserve carbon footprint within 0.01 kg tolerance
 * - Map legacy fields to new structured interfaces
 * - Provide default values for missing fields
 * - Validate migration results
 */

import {
  Product,
  LegacyProduct,
  LegacyMaterial,
  LegacyLifecycleData,
  LifecycleData,
  Material_Row,
  Manufacturing_Data,
  Packaging_Data,
  Transport_Data,
  Usage_Data,
  EndOfLife_Data,
  MigrationValidation,
  MigrationResult,
  Badge
} from '../../shared/types';

export class MigrationService {
  /**
   * Detect schema version of a product
   */
  detectSchemaVersion(product: any): 'legacy' | 'structured' {
    // Check if product has structured lifecycle data
    if (!product.lifecycleData) {
      return 'legacy';
    }

    const lifecycle = product.lifecycleData;

    // Check if materials array has Material_Row structure
    if (lifecycle.materials && Array.isArray(lifecycle.materials)) {
      const firstMaterial = lifecycle.materials[0];
      
      // Legacy: materials are strings or simple objects without calculatedEmission
      if (typeof firstMaterial === 'string' || !firstMaterial?.calculatedEmission) {
        return 'legacy';
      }
    }

    // Check if manufacturing has calculatedEmission field
    if (lifecycle.manufacturing && typeof lifecycle.manufacturing === 'object') {
      if (!lifecycle.manufacturing.calculatedEmission) {
        return 'legacy';
      }
    }

    // If all checks pass, it's structured
    return 'structured';
  }

  /**
   * Migrate a legacy product to the new structured format
   */
  migrateProduct(legacyProduct: LegacyProduct): Product {
    // Convert legacy lifecycle data to structured format
    const structuredLifecycleData = this.convertLifecycleData(
      legacyProduct.lifecycleData,
      legacyProduct.carbonBreakdown
    );

    // Create migrated product
    const migratedProduct: Product = {
      productId: legacyProduct.productId,
      manufacturerId: legacyProduct.manufacturerId,
      name: legacyProduct.name,
      description: legacyProduct.description,
      category: legacyProduct.category,
      lifecycleData: structuredLifecycleData,
      carbonFootprint: legacyProduct.carbonFootprint,
      carbonBreakdown: this.ensureCarbonBreakdown(legacyProduct.carbonBreakdown),
      sustainabilityScore: legacyProduct.sustainabilityScore || this.calculateDefaultScore(legacyProduct.carbonFootprint),
      badge: legacyProduct.badge || this.assignDefaultBadge(legacyProduct.carbonFootprint),
      createdAt: legacyProduct.createdAt,
      updatedAt: new Date().toISOString()
    };

    return migratedProduct;
  }

  /**
   * Convert legacy lifecycle data to structured format
   */
  private convertLifecycleData(
    legacyData: LegacyLifecycleData | undefined,
    carbonBreakdown: any
  ): LifecycleData {
    const breakdown = carbonBreakdown || {};

    return {
      materials: this.convertMaterials(legacyData?.materials, breakdown.materials),
      manufacturing: this.convertManufacturing(legacyData?.manufacturing, breakdown.manufacturing),
      packaging: this.convertPackaging(legacyData?.packaging, breakdown.packaging),
      transport: this.convertTransport(legacyData?.transport, breakdown.transport),
      usage: this.convertUsage(legacyData?.usage, breakdown.usage),
      endOfLife: this.convertEndOfLife(legacyData?.endOfLife, breakdown.disposal)
    };
  }

  /**
   * Convert legacy materials to Material_Row array
   */
  private convertMaterials(
    legacyMaterials: string[] | LegacyMaterial[] | undefined,
    totalEmission: number = 0
  ): Material_Row[] {
    if (!legacyMaterials || legacyMaterials.length === 0) {
      // Return default material if none provided
      return [{
        name: 'Unknown Material',
        percentage: 100,
        weight: 0.1,
        emissionFactor: totalEmission / 0.1 || 2.0,
        countryOfOrigin: 'Unknown',
        recycled: false,
        calculatedEmission: totalEmission || 0.2
      }];
    }

    // Handle string array (simplest legacy format)
    if (typeof legacyMaterials[0] === 'string') {
      const materialNames = legacyMaterials as string[];
      const percentagePerMaterial = 100 / materialNames.length;
      const emissionPerMaterial = totalEmission / materialNames.length;

      return materialNames.map(name => ({
        name,
        percentage: percentagePerMaterial,
        weight: 0.1,
        emissionFactor: emissionPerMaterial / 0.1 || 2.0,
        countryOfOrigin: 'Unknown',
        recycled: false,
        calculatedEmission: emissionPerMaterial
      }));
    }

    // Handle LegacyMaterial array
    const materials = legacyMaterials as LegacyMaterial[];
    const totalPercentage = materials.reduce((sum, m) => sum + (m.percentage || 0), 0);
    const needsPercentageNormalization = totalPercentage === 0 || Math.abs(totalPercentage - 100) > 0.1;

    return materials.map((legacyMat) => {
      const percentage = needsPercentageNormalization 
        ? 100 / materials.length 
        : legacyMat.percentage || 0;
      
      const weight = legacyMat.weight || 0.1;
      const emissionFactor = legacyMat.emissionFactor || 2.0;
      const calculatedEmission = weight * emissionFactor;

      return {
        name: legacyMat.name,
        percentage,
        weight,
        emissionFactor,
        countryOfOrigin: 'Unknown',
        recycled: false,
        calculatedEmission
      };
    });
  }

  /**
   * Convert legacy manufacturing data to Manufacturing_Data
   */
  private convertManufacturing(
    legacyManufacturing: string | Partial<Manufacturing_Data> | undefined,
    totalEmission: number = 0
  ): Manufacturing_Data {
    // Handle string format
    if (typeof legacyManufacturing === 'string') {
      return {
        factoryLocation: legacyManufacturing,
        energyConsumption: 2.5,
        energyEmissionFactor: 0.8,
        dyeingMethod: 'Standard',
        waterConsumption: 50,
        wasteGenerated: 0.02,
        calculatedEmission: totalEmission || 2.0
      };
    }

    // Handle partial object format
    const legacy = legacyManufacturing || {};
    const energyConsumption = legacy.energyConsumption || 2.5;
    const energyEmissionFactor = legacy.energyEmissionFactor || (totalEmission / energyConsumption) || 0.8;

    return {
      factoryLocation: legacy.factoryLocation || 'Unknown',
      energyConsumption,
      energyEmissionFactor,
      dyeingMethod: legacy.dyeingMethod || 'Standard',
      waterConsumption: legacy.waterConsumption || 50,
      wasteGenerated: legacy.wasteGenerated || 0.02,
      calculatedEmission: totalEmission || (energyConsumption * energyEmissionFactor)
    };
  }

  /**
   * Convert legacy packaging data to Packaging_Data
   */
  private convertPackaging(
    legacyPackaging: string | Partial<Packaging_Data> | undefined,
    totalEmission: number = 0
  ): Packaging_Data {
    // Handle string format
    if (typeof legacyPackaging === 'string') {
      return {
        materialType: legacyPackaging,
        weight: 0.05,
        emissionFactor: totalEmission / 0.05 || 0.9,
        recyclable: true,
        calculatedEmission: totalEmission || 0.045
      };
    }

    // Handle partial object format
    const legacy = legacyPackaging || {};
    const weight = legacy.weight || 0.05;
    const emissionFactor = legacy.emissionFactor || (totalEmission / weight) || 0.9;

    return {
      materialType: legacy.materialType || 'Cardboard',
      weight,
      emissionFactor,
      recyclable: legacy.recyclable !== undefined ? legacy.recyclable : true,
      calculatedEmission: totalEmission || (weight * emissionFactor)
    };
  }

  /**
   * Convert legacy transport data to Transport_Data
   */
  private convertTransport(
    legacyTransport: string | Partial<Transport_Data> | undefined,
    totalEmission: number = 0
  ): Transport_Data {
    // Handle string format
    if (typeof legacyTransport === 'string') {
      const mode = legacyTransport.toLowerCase().includes('air') ? 'Air' 
        : legacyTransport.toLowerCase().includes('ship') ? 'Ship' 
        : 'Road';
      
      return {
        mode,
        distance: 1000,
        fuelType: 'Diesel',
        emissionFactorPerKm: totalEmission / 1000 || 0.1,
        calculatedEmission: totalEmission || 100
      };
    }

    // Handle partial object format
    const legacy = legacyTransport || {};
    const distance = legacy.distance || 1000;
    const emissionFactorPerKm = legacy.emissionFactorPerKm || (totalEmission / distance) || 0.1;

    return {
      mode: legacy.mode || 'Road',
      distance,
      fuelType: legacy.fuelType || 'Diesel',
      emissionFactorPerKm,
      calculatedEmission: totalEmission || (distance * emissionFactorPerKm)
    };
  }

  /**
   * Convert legacy usage data to Usage_Data
   */
  private convertUsage(
    legacyUsage: string | Partial<Usage_Data> | undefined,
    totalEmission: number = 0
  ): Usage_Data {
    // Handle string format
    if (typeof legacyUsage === 'string') {
      return {
        avgWashCycles: 50,
        washTemperature: 30,
        dryerUse: false,
        calculatedEmission: totalEmission || 15.0
      };
    }

    // Handle partial object format
    const legacy = legacyUsage || {};

    return {
      avgWashCycles: legacy.avgWashCycles || 50,
      washTemperature: legacy.washTemperature || 30,
      dryerUse: legacy.dryerUse !== undefined ? legacy.dryerUse : false,
      calculatedEmission: totalEmission || 15.0
    };
  }

  /**
   * Convert legacy end of life data to EndOfLife_Data
   */
  private convertEndOfLife(
    legacyEndOfLife: string | Partial<EndOfLife_Data> | undefined,
    totalEmission: number = 0
  ): EndOfLife_Data {
    // Handle string format
    if (typeof legacyEndOfLife === 'string') {
      const recyclable = legacyEndOfLife.toLowerCase().includes('recycle');
      const biodegradable = legacyEndOfLife.toLowerCase().includes('biodegradable');
      
      return {
        recyclable,
        biodegradable,
        takebackProgram: false,
        disposalEmission: totalEmission || 0.5
      };
    }

    // Handle partial object format
    const legacy = legacyEndOfLife || {};

    return {
      recyclable: legacy.recyclable !== undefined ? legacy.recyclable : true,
      biodegradable: legacy.biodegradable !== undefined ? legacy.biodegradable : false,
      takebackProgram: legacy.takebackProgram !== undefined ? legacy.takebackProgram : false,
      disposalEmission: totalEmission || 0.5
    };
  }

  /**
   * Ensure carbon breakdown has all required fields
   */
  private ensureCarbonBreakdown(breakdown: any): {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  } {
    return {
      materials: breakdown?.materials || 0,
      manufacturing: breakdown?.manufacturing || 0,
      packaging: breakdown?.packaging || 0,
      transport: breakdown?.transport || 0,
      usage: breakdown?.usage || 0,
      disposal: breakdown?.disposal || 0
    };
  }

  /**
   * Calculate default sustainability score based on carbon footprint
   */
  private calculateDefaultScore(carbonFootprint: number): number {
    // Simple inverse relationship: lower carbon = higher score
    // Score range: 0-100
    if (carbonFootprint < 4) return 85;
    if (carbonFootprint < 7) return 60;
    return 35;
  }

  /**
   * Assign default badge based on carbon footprint
   */
  private assignDefaultBadge(carbonFootprint: number): Badge {
    if (carbonFootprint < 4) {
      return {
        name: 'Environment Friendly',
        color: 'green',
        threshold: '< 4 kg'
      };
    }
    if (carbonFootprint <= 7) {
      return {
        name: 'Moderate Impact',
        color: 'yellow',
        threshold: '4-7 kg'
      };
    }
    return {
      name: 'High Impact',
      color: 'red',
      threshold: '> 7 kg'
    };
  }

  /**
   * Validate migration results
   */
  validateMigration(original: LegacyProduct, migrated: Product): MigrationValidation {
    const errors: string[] = [];

    // Validate carbon footprint preservation (within 0.01 kg tolerance)
    const carbonDifference = Math.abs(original.carbonFootprint - migrated.carbonFootprint);
    const carbonFootprintMatch = carbonDifference <= 0.01;

    if (!carbonFootprintMatch) {
      errors.push(`Carbon footprint mismatch: original=${original.carbonFootprint}, migrated=${migrated.carbonFootprint}, difference=${carbonDifference}`);
    }

    // Validate basic fields
    if (original.productId !== migrated.productId) {
      errors.push('Product ID mismatch');
    }
    if (original.manufacturerId !== migrated.manufacturerId) {
      errors.push('Manufacturer ID mismatch');
    }
    if (original.name !== migrated.name) {
      errors.push('Product name mismatch');
    }

    // Validate lifecycle data structure
    if (!migrated.lifecycleData) {
      errors.push('Missing lifecycle data in migrated product');
    } else {
      if (!migrated.lifecycleData.materials || migrated.lifecycleData.materials.length === 0) {
        errors.push('Missing materials in migrated lifecycle data');
      }
      if (!migrated.lifecycleData.manufacturing) {
        errors.push('Missing manufacturing data in migrated lifecycle data');
      }
      if (!migrated.lifecycleData.packaging) {
        errors.push('Missing packaging data in migrated lifecycle data');
      }
      if (!migrated.lifecycleData.transport) {
        errors.push('Missing transport data in migrated lifecycle data');
      }
      if (!migrated.lifecycleData.usage) {
        errors.push('Missing usage data in migrated lifecycle data');
      }
      if (!migrated.lifecycleData.endOfLife) {
        errors.push('Missing end of life data in migrated lifecycle data');
      }
    }

    return {
      valid: errors.length === 0,
      carbonFootprintMatch,
      carbonDifference,
      errors
    };
  }

  /**
   * Execute batch migration for multiple products
   */
  async executeBatchMigration(products: LegacyProduct[]): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalProducts: products.length,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: []
    };

    for (const legacyProduct of products) {
      try {
        // Migrate product
        const migratedProduct = this.migrateProduct(legacyProduct);

        // Validate migration
        const validation = this.validateMigration(legacyProduct, migratedProduct);

        if (!validation.valid) {
          result.failedMigrations++;
          result.errors.push({
            productId: legacyProduct.productId,
            error: `Validation failed: ${validation.errors.join(', ')}`
          });
        } else {
          result.successfulMigrations++;
        }
      } catch (error) {
        result.failedMigrations++;
        result.errors.push({
          productId: legacyProduct.productId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }
}
