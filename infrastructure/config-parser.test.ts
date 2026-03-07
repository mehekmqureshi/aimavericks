import {
  parseConfiguration,
  formatConfiguration,
  validateConfiguration,
  Configuration,
  ConfigurationError,
} from './config-parser';

describe('Configuration Parser', () => {
  describe('parseConfiguration', () => {
    it('should parse valid configuration', () => {
      const content = `
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# DynamoDB Tables
PRODUCTS_TABLE_NAME=Products
MANUFACTURERS_TABLE_NAME=Manufacturers
PRODUCT_SERIALS_TABLE_NAME=ProductSerials

# S3 Buckets
QR_CODES_BUCKET=gp-qr-codes-production
FRONTEND_BUCKET=gp-frontend-production

# Cognito
COGNITO_USER_POOL_ID=us-east-1_abc123
COGNITO_CLIENT_ID=abc123def456

# API Gateway
API_GATEWAY_URL=https://api.example.com/prod
`;

      const config = parseConfiguration(content);

      expect(config.awsRegion).toBe('us-east-1');
      expect(config.awsAccountId).toBe('123456789012');
      expect(config.productsTableName).toBe('Products');
      expect(config.manufacturersTableName).toBe('Manufacturers');
      expect(config.productSerialsTableName).toBe('ProductSerials');
      expect(config.qrCodesBucket).toBe('gp-qr-codes-production');
      expect(config.frontendBucket).toBe('gp-frontend-production');
      expect(config.cognitoUserPoolId).toBe('us-east-1_abc123');
      expect(config.cognitoClientId).toBe('abc123def456');
      expect(config.apiGatewayUrl).toBe('https://api.example.com/prod');
    });

    it('should parse optional SageMaker fields', () => {
      const content = `
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
PRODUCTS_TABLE_NAME=Products
MANUFACTURERS_TABLE_NAME=Manufacturers
PRODUCT_SERIALS_TABLE_NAME=ProductSerials
QR_CODES_BUCKET=gp-qr-codes-production
FRONTEND_BUCKET=gp-frontend-production
COGNITO_USER_POOL_ID=us-east-1_abc123
COGNITO_CLIENT_ID=abc123def456
API_GATEWAY_URL=https://api.example.com/prod
SAGEMAKER_ENDPOINT_NAME=gp-carbon-predictor
USE_SAGEMAKER=true
SAGEMAKER_TIMEOUT_MS=200
`;

      const config = parseConfiguration(content);

      expect(config.sagemakerEndpointName).toBe('gp-carbon-predictor');
      expect(config.useSagemaker).toBe(true);
      expect(config.sagemakerTimeoutMs).toBe(200);
    });

    it('should throw error for missing required field', () => {
      const content = `
AWS_REGION=us-east-1
# Missing AWS_ACCOUNT_ID
PRODUCTS_TABLE_NAME=Products
`;

      expect(() => parseConfiguration(content)).toThrow(ConfigurationError);
      expect(() => parseConfiguration(content)).toThrow(
        'Missing required field: AWS_ACCOUNT_ID'
      );
    });

    it('should throw error for invalid line format', () => {
      const content = `
AWS_REGION=us-east-1
INVALID LINE WITHOUT EQUALS
`;

      expect(() => parseConfiguration(content)).toThrow(ConfigurationError);
      expect(() => parseConfiguration(content)).toThrow(
        'Invalid configuration format'
      );
    });

    it('should throw error for invalid numeric value', () => {
      const content = `
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
PRODUCTS_TABLE_NAME=Products
MANUFACTURERS_TABLE_NAME=Manufacturers
PRODUCT_SERIALS_TABLE_NAME=ProductSerials
QR_CODES_BUCKET=gp-qr-codes-production
FRONTEND_BUCKET=gp-frontend-production
COGNITO_USER_POOL_ID=us-east-1_abc123
COGNITO_CLIENT_ID=abc123def456
API_GATEWAY_URL=https://api.example.com/prod
SAGEMAKER_TIMEOUT_MS=not-a-number
`;

      expect(() => parseConfiguration(content)).toThrow(ConfigurationError);
      expect(() => parseConfiguration(content)).toThrow(
        'Invalid value for SAGEMAKER_TIMEOUT_MS'
      );
    });

    it('should skip empty lines and comments', () => {
      const content = `
# This is a comment
AWS_REGION=us-east-1

# Another comment
AWS_ACCOUNT_ID=123456789012

PRODUCTS_TABLE_NAME=Products
MANUFACTURERS_TABLE_NAME=Manufacturers
PRODUCT_SERIALS_TABLE_NAME=ProductSerials
QR_CODES_BUCKET=gp-qr-codes-production
FRONTEND_BUCKET=gp-frontend-production
COGNITO_USER_POOL_ID=us-east-1_abc123
COGNITO_CLIENT_ID=abc123def456
API_GATEWAY_URL=https://api.example.com/prod
`;

      const config = parseConfiguration(content);
      expect(config.awsRegion).toBe('us-east-1');
    });
  });

  describe('formatConfiguration', () => {
    it('should format configuration to .env content', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
      };

      const content = formatConfiguration(config);

      expect(content).toContain('AWS_REGION=us-east-1');
      expect(content).toContain('AWS_ACCOUNT_ID=123456789012');
      expect(content).toContain('PRODUCTS_TABLE_NAME=Products');
      expect(content).toContain('QR_CODES_BUCKET=gp-qr-codes-production');
      expect(content).toContain('API_GATEWAY_URL=https://api.example.com/prod');
    });

    it('should include optional fields when present', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
        sagemakerEndpointName: 'gp-carbon-predictor',
        useSagemaker: true,
        sagemakerTimeoutMs: 200,
      };

      const content = formatConfiguration(config);

      expect(content).toContain('SAGEMAKER_ENDPOINT_NAME=gp-carbon-predictor');
      expect(content).toContain('USE_SAGEMAKER=true');
      expect(content).toContain('SAGEMAKER_TIMEOUT_MS=200');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configuration', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
      };

      expect(() => validateConfiguration(config)).not.toThrow();
    });

    it('should throw error for invalid AWS region', () => {
      const config: Configuration = {
        awsRegion: 'invalid-region',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
      };

      expect(() => validateConfiguration(config)).toThrow(ConfigurationError);
      expect(() => validateConfiguration(config)).toThrow(
        'Invalid AWS region format'
      );
    });

    it('should throw error for invalid AWS account ID', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '12345', // Too short
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
      };

      expect(() => validateConfiguration(config)).toThrow(ConfigurationError);
      expect(() => validateConfiguration(config)).toThrow(
        'Invalid AWS account ID'
      );
    });

    it('should throw error for invalid bucket name', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'INVALID_BUCKET_NAME', // Uppercase not allowed
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
      };

      expect(() => validateConfiguration(config)).toThrow(ConfigurationError);
      expect(() => validateConfiguration(config)).toThrow(
        'Invalid QR codes bucket name'
      );
    });

    it('should throw error for non-HTTPS API Gateway URL', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'http://api.example.com/prod', // HTTP not HTTPS
      };

      expect(() => validateConfiguration(config)).toThrow(ConfigurationError);
      expect(() => validateConfiguration(config)).toThrow(
        'API Gateway URL must use HTTPS'
      );
    });

    it('should throw error for negative timeout', () => {
      const config: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
        sagemakerTimeoutMs: -100,
      };

      expect(() => validateConfiguration(config)).toThrow(ConfigurationError);
      expect(() => validateConfiguration(config)).toThrow(
        'SageMaker timeout must be positive'
      );
    });
  });

  describe('round-trip', () => {
    it('should preserve configuration through parse-format-parse cycle', () => {
      const original: Configuration = {
        awsRegion: 'us-east-1',
        awsAccountId: '123456789012',
        productsTableName: 'Products',
        manufacturersTableName: 'Manufacturers',
        productSerialsTableName: 'ProductSerials',
        qrCodesBucket: 'gp-qr-codes-production',
        frontendBucket: 'gp-frontend-production',
        cognitoUserPoolId: 'us-east-1_abc123',
        cognitoClientId: 'abc123def456',
        apiGatewayUrl: 'https://api.example.com/prod',
        sagemakerEndpointName: 'gp-carbon-predictor',
        useSagemaker: true,
        sagemakerTimeoutMs: 200,
      };

      const formatted = formatConfiguration(original);
      const parsed = parseConfiguration(formatted);

      expect(parsed).toEqual(original);
    });
  });
});
