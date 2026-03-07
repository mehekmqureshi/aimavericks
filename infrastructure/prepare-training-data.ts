/**
 * Training Data Preparation Script
 * 
 * Prepares training data from seeded products for SageMaker XGBoost
 * Exports CSV format with features and target variable
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Product } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

interface TrainingDataConfig {
  region: string;
  productsTableName: string;
  outputS3Bucket: string;
  outputS3Key: string;
  localOutputPath?: string;
}

export class TrainingDataPreparation {
  private dynamoClient: DynamoDBDocumentClient;
  private s3Client: S3Client;
  private config: TrainingDataConfig;

  constructor(config: Partial<TrainingDataConfig> = {}) {
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      productsTableName: config.productsTableName || 'Products',
      outputS3Bucket: config.outputS3Bucket || process.env.TRAINING_DATA_BUCKET || '',
      outputS3Key: config.outputS3Key || 'training-data/carbon-training.csv',
      localOutputPath: config.localOutputPath || './training-data.csv',
    };

    const dynamoClient = new DynamoDBClient({ region: this.config.region });
    this.dynamoClient = DynamoDBDocumentClient.from(dynamoClient);
    this.s3Client = new S3Client({ region: this.config.region });
  }

  /**
   * Full data preparation workflow
   */
  async prepare(): Promise<void> {
    console.log('Starting training data preparation...');

    try {
      // Step 1: Fetch products from DynamoDB
      console.log('Step 1: Fetching products from DynamoDB...');
      const products = await this.fetchProducts();
      console.log(`Found ${products.length} products`);

      if (products.length === 0) {
        throw new Error('No products found. Please seed data first.');
      }

      // Step 2: Transform to training format
      console.log('Step 2: Transforming to training format...');
      const trainingData = this.transformToTrainingData(products);

      // Step 3: Generate CSV
      console.log('Step 3: Generating CSV...');
      const csv = this.generateCSV(trainingData);

      // Step 4: Save locally (optional)
      if (this.config.localOutputPath) {
        console.log('Step 4: Saving locally...');
        fs.writeFileSync(this.config.localOutputPath, csv);
        console.log(`Saved to: ${this.config.localOutputPath}`);
      }

      // Step 5: Upload to S3
      console.log('Step 5: Uploading to S3...');
      await this.uploadToS3(csv);

      console.log('✓ Training data preparation completed successfully!');
      console.log(`S3 URI: s3://${this.config.outputS3Bucket}/${this.config.outputS3Key}`);
    } catch (error) {
      console.error('✗ Training data preparation failed:', error);
      throw error;
    }
  }

  /**
   * Fetch all products from DynamoDB
   */
  private async fetchProducts(): Promise<Product[]> {
    const command = new ScanCommand({
      TableName: this.config.productsTableName,
    });

    const response = await this.dynamoClient.send(command);
    return (response.Items || []) as Product[];
  }

  /**
   * Transform products to training data format
   */
  private transformToTrainingData(products: Product[]): TrainingDataRow[] {
    return products.map(product => {
      const breakdown = product.carbonBreakdown;
      
      return {
        // Features
        materialEmission: breakdown.materials,
        manufacturingEmission: breakdown.manufacturing,
        packagingEmission: breakdown.packaging,
        transportEmission: breakdown.transport,
        usageEmission: breakdown.usage,
        disposalEmission: breakdown.disposal,
        
        // Target variable
        totalCarbon: product.carbonFootprint,
      };
    });
  }

  /**
   * Generate CSV from training data
   * Format: target,feature1,feature2,...
   * XGBoost expects target as first column
   */
  private generateCSV(data: TrainingDataRow[]): string {
    // Header (XGBoost doesn't use headers, but useful for debugging)
    const header = 'totalCarbon,materialEmission,manufacturingEmission,packagingEmission,transportEmission,usageEmission,disposalEmission';
    
    // Data rows
    const rows = data.map(row => {
      return [
        row.totalCarbon,
        row.materialEmission,
        row.manufacturingEmission,
        row.packagingEmission,
        row.transportEmission,
        row.usageEmission,
        row.disposalEmission,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Upload CSV to S3
   */
  private async uploadToS3(csv: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.outputS3Bucket,
      Key: this.config.outputS3Key,
      Body: csv,
      ContentType: 'text/csv',
    });

    await this.s3Client.send(command);
    console.log(`Uploaded to s3://${this.config.outputS3Bucket}/${this.config.outputS3Key}`);
  }
}

interface TrainingDataRow {
  materialEmission: number;
  manufacturingEmission: number;
  packagingEmission: number;
  transportEmission: number;
  usageEmission: number;
  disposalEmission: number;
  totalCarbon: number;
}

// CLI execution
if (require.main === module) {
  const preparation = new TrainingDataPreparation();
  preparation.prepare().catch(console.error);
}
