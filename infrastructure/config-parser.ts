import * as fs from 'fs';

/**
 * Configuration object representing parsed environment variables
 */
export interface Configuration {
  // AWS Configuration
  awsRegion: string;
  awsAccountId: string;

  // SageMaker Configuration
  sagemakerEndpointName?: string;
  sagemakerRoleArn?: string;
  trainingDataBucket?: string;
  trainingDataS3Uri?: string;
  modelOutputS3Uri?: string;

  // DynamoDB Tables
  productsTableName: string;
  manufacturersTableName: string;
  productSerialsTableName: string;

  // S3 Buckets
  qrCodesBucket: string;
  frontendBucket: string;

  // Cognito
  cognitoUserPoolId: string;
  cognitoClientId: string;

  // API Gateway
  apiGatewayUrl: string;

  // Carbon Calculator Configuration
  useSagemaker?: boolean;
  fallbackOnError?: boolean;
  sagemakerTimeoutMs?: number;
}

/**
 * Error thrown when configuration parsing fails
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Parse .env file content into a Configuration object
 */
export function parseConfiguration(content: string): Configuration {
  const lines = content.split('\n');
  const env: Record<string, string> = {};

  // Parse each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Parse key=value
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      throw new ConfigurationError(
        `Invalid configuration format: expected KEY=value`,
        lineNumber
      );
    }

    const [, key, value] = match;
    env[key] = value;
  }

  // Validate required fields
  const requiredFields = [
    'AWS_REGION',
    'AWS_ACCOUNT_ID',
    'PRODUCTS_TABLE_NAME',
    'MANUFACTURERS_TABLE_NAME',
    'PRODUCT_SERIALS_TABLE_NAME',
    'QR_CODES_BUCKET',
    'FRONTEND_BUCKET',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'API_GATEWAY_URL',
  ];

  for (const field of requiredFields) {
    if (!env[field]) {
      throw new ConfigurationError(
        `Missing required field: ${field}`,
        undefined,
        field
      );
    }
  }

  // Build configuration object
  const config: Configuration = {
    awsRegion: env.AWS_REGION,
    awsAccountId: env.AWS_ACCOUNT_ID,
    productsTableName: env.PRODUCTS_TABLE_NAME,
    manufacturersTableName: env.MANUFACTURERS_TABLE_NAME,
    productSerialsTableName: env.PRODUCT_SERIALS_TABLE_NAME,
    qrCodesBucket: env.QR_CODES_BUCKET,
    frontendBucket: env.FRONTEND_BUCKET,
    cognitoUserPoolId: env.COGNITO_USER_POOL_ID,
    cognitoClientId: env.COGNITO_CLIENT_ID,
    apiGatewayUrl: env.API_GATEWAY_URL,
  };

  // Add optional fields
  if (env.SAGEMAKER_ENDPOINT_NAME) {
    config.sagemakerEndpointName = env.SAGEMAKER_ENDPOINT_NAME;
  }
  if (env.SAGEMAKER_ROLE_ARN) {
    config.sagemakerRoleArn = env.SAGEMAKER_ROLE_ARN;
  }
  if (env.TRAINING_DATA_BUCKET) {
    config.trainingDataBucket = env.TRAINING_DATA_BUCKET;
  }
  if (env.TRAINING_DATA_S3_URI) {
    config.trainingDataS3Uri = env.TRAINING_DATA_S3_URI;
  }
  if (env.MODEL_OUTPUT_S3_URI) {
    config.modelOutputS3Uri = env.MODEL_OUTPUT_S3_URI;
  }
  if (env.USE_SAGEMAKER) {
    config.useSagemaker = env.USE_SAGEMAKER === 'true';
  }
  if (env.FALLBACK_ON_ERROR) {
    config.fallbackOnError = env.FALLBACK_ON_ERROR === 'true';
  }
  if (env.SAGEMAKER_TIMEOUT_MS) {
    const timeout = parseInt(env.SAGEMAKER_TIMEOUT_MS, 10);
    if (isNaN(timeout)) {
      throw new ConfigurationError(
        `Invalid value for SAGEMAKER_TIMEOUT_MS: must be a number`,
        undefined,
        'SAGEMAKER_TIMEOUT_MS'
      );
    }
    config.sagemakerTimeoutMs = timeout;
  }

  return config;
}

/**
 * Parse .env file from filesystem
 */
export function parseConfigurationFile(filePath: string): Configuration {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseConfiguration(content);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigurationError(`Configuration file not found: ${filePath}`);
    }
    throw new ConfigurationError(
      `Failed to read configuration file: ${(error as Error).message}`
    );
  }
}

/**
 * Format Configuration object back to .env file content
 */
export function formatConfiguration(config: Configuration): string {
  const lines: string[] = [];

  lines.push('# AWS Configuration');
  lines.push(`AWS_REGION=${config.awsRegion}`);
  lines.push(`AWS_ACCOUNT_ID=${config.awsAccountId}`);
  lines.push('');

  if (
    config.sagemakerEndpointName ||
    config.sagemakerRoleArn ||
    config.trainingDataBucket
  ) {
    lines.push('# SageMaker Configuration');
    if (config.sagemakerEndpointName) {
      lines.push(`SAGEMAKER_ENDPOINT_NAME=${config.sagemakerEndpointName}`);
    }
    if (config.sagemakerRoleArn) {
      lines.push(`SAGEMAKER_ROLE_ARN=${config.sagemakerRoleArn}`);
    }
    if (config.trainingDataBucket) {
      lines.push(`TRAINING_DATA_BUCKET=${config.trainingDataBucket}`);
    }
    if (config.trainingDataS3Uri) {
      lines.push(`TRAINING_DATA_S3_URI=${config.trainingDataS3Uri}`);
    }
    if (config.modelOutputS3Uri) {
      lines.push(`MODEL_OUTPUT_S3_URI=${config.modelOutputS3Uri}`);
    }
    lines.push('');
  }

  lines.push('# DynamoDB Tables');
  lines.push(`PRODUCTS_TABLE_NAME=${config.productsTableName}`);
  lines.push(`MANUFACTURERS_TABLE_NAME=${config.manufacturersTableName}`);
  lines.push(`PRODUCT_SERIALS_TABLE_NAME=${config.productSerialsTableName}`);
  lines.push('');

  lines.push('# S3 Buckets');
  lines.push(`QR_CODES_BUCKET=${config.qrCodesBucket}`);
  lines.push(`FRONTEND_BUCKET=${config.frontendBucket}`);
  lines.push('');

  lines.push('# Cognito');
  lines.push(`COGNITO_USER_POOL_ID=${config.cognitoUserPoolId}`);
  lines.push(`COGNITO_CLIENT_ID=${config.cognitoClientId}`);
  lines.push('');

  lines.push('# API Gateway');
  lines.push(`API_GATEWAY_URL=${config.apiGatewayUrl}`);
  lines.push('');

  if (
    config.useSagemaker !== undefined ||
    config.fallbackOnError !== undefined ||
    config.sagemakerTimeoutMs !== undefined
  ) {
    lines.push('# Carbon Calculator Configuration');
    if (config.useSagemaker !== undefined) {
      lines.push(`USE_SAGEMAKER=${config.useSagemaker}`);
    }
    if (config.fallbackOnError !== undefined) {
      lines.push(`FALLBACK_ON_ERROR=${config.fallbackOnError}`);
    }
    if (config.sagemakerTimeoutMs !== undefined) {
      lines.push(`SAGEMAKER_TIMEOUT_MS=${config.sagemakerTimeoutMs}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Validate configuration schema
 */
export function validateConfiguration(config: Configuration): void {
  // Validate AWS region format
  if (!/^[a-z]{2}-[a-z]+-\d+$/.test(config.awsRegion)) {
    throw new ConfigurationError(
      `Invalid AWS region format: ${config.awsRegion}`,
      undefined,
      'awsRegion'
    );
  }

  // Validate AWS account ID format (12 digits)
  if (!/^\d{12}$/.test(config.awsAccountId)) {
    throw new ConfigurationError(
      `Invalid AWS account ID: must be 12 digits`,
      undefined,
      'awsAccountId'
    );
  }

  // Validate table names (alphanumeric, hyphens, underscores)
  const tableNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!tableNameRegex.test(config.productsTableName)) {
    throw new ConfigurationError(
      `Invalid products table name: ${config.productsTableName}`,
      undefined,
      'productsTableName'
    );
  }
  if (!tableNameRegex.test(config.manufacturersTableName)) {
    throw new ConfigurationError(
      `Invalid manufacturers table name: ${config.manufacturersTableName}`,
      undefined,
      'manufacturersTableName'
    );
  }
  if (!tableNameRegex.test(config.productSerialsTableName)) {
    throw new ConfigurationError(
      `Invalid product serials table name: ${config.productSerialsTableName}`,
      undefined,
      'productSerialsTableName'
    );
  }

  // Validate bucket names (lowercase, numbers, hyphens, 3-63 chars)
  const bucketNameRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
  if (!bucketNameRegex.test(config.qrCodesBucket)) {
    throw new ConfigurationError(
      `Invalid QR codes bucket name: ${config.qrCodesBucket}`,
      undefined,
      'qrCodesBucket'
    );
  }
  if (!bucketNameRegex.test(config.frontendBucket)) {
    throw new ConfigurationError(
      `Invalid frontend bucket name: ${config.frontendBucket}`,
      undefined,
      'frontendBucket'
    );
  }

  // Validate API Gateway URL format
  if (!config.apiGatewayUrl.startsWith('https://')) {
    throw new ConfigurationError(
      `API Gateway URL must use HTTPS`,
      undefined,
      'apiGatewayUrl'
    );
  }

  // Validate optional numeric fields
  if (
    config.sagemakerTimeoutMs !== undefined &&
    config.sagemakerTimeoutMs <= 0
  ) {
    throw new ConfigurationError(
      `SageMaker timeout must be positive`,
      undefined,
      'sagemakerTimeoutMs'
    );
  }
}
