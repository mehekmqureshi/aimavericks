# Configuration Parser

The configuration parser provides utilities for parsing, validating, and formatting `.env` configuration files for the Green Passport platform.

## Features

- Parse `.env` files into typed Configuration objects
- Validate required and optional fields
- Format Configuration objects back to `.env` format
- Comprehensive error messages with line numbers and field names
- Schema validation for AWS resources (regions, account IDs, bucket names, etc.)
- Round-trip preservation (parse → format → parse produces equivalent object)

## Usage

### Parse Configuration File

```typescript
import { parseConfigurationFile, ConfigurationError } from './config-parser';

try {
  const config = parseConfigurationFile('.env');
  console.log('AWS Region:', config.awsRegion);
  console.log('Products Table:', config.productsTableName);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
    if (error.line) console.error('Line:', error.line);
    if (error.field) console.error('Field:', error.field);
  }
}
```

### Parse Configuration String

```typescript
import { parseConfiguration } from './config-parser';

const envContent = `
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
PRODUCTS_TABLE_NAME=Products
# ... other fields
`;

const config = parseConfiguration(envContent);
```

### Validate Configuration

```typescript
import { validateConfiguration, ConfigurationError } from './config-parser';

try {
  validateConfiguration(config);
  console.log('Configuration is valid!');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Validation failed:', error.message);
    console.error('Field:', error.field);
  }
}
```

### Format Configuration

```typescript
import { formatConfiguration, Configuration } from './config-parser';

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

const envContent = formatConfiguration(config);
console.log(envContent);
```

## Configuration Schema

### Required Fields

- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCOUNT_ID` - 12-digit AWS account ID
- `PRODUCTS_TABLE_NAME` - DynamoDB products table name
- `MANUFACTURERS_TABLE_NAME` - DynamoDB manufacturers table name
- `PRODUCT_SERIALS_TABLE_NAME` - DynamoDB product serials table name
- `QR_CODES_BUCKET` - S3 bucket for QR code images
- `FRONTEND_BUCKET` - S3 bucket for frontend assets
- `COGNITO_USER_POOL_ID` - Cognito user pool ID
- `COGNITO_CLIENT_ID` - Cognito app client ID
- `API_GATEWAY_URL` - API Gateway endpoint URL (must use HTTPS)

### Optional Fields

- `SAGEMAKER_ENDPOINT_NAME` - SageMaker endpoint name for ML predictions
- `SAGEMAKER_ROLE_ARN` - IAM role ARN for SageMaker
- `TRAINING_DATA_BUCKET` - S3 bucket for training data
- `TRAINING_DATA_S3_URI` - S3 URI for training data
- `MODEL_OUTPUT_S3_URI` - S3 URI for model output
- `USE_SAGEMAKER` - Boolean flag to enable SageMaker (true/false)
- `FALLBACK_ON_ERROR` - Boolean flag to enable fallback on errors (true/false)
- `SAGEMAKER_TIMEOUT_MS` - Timeout in milliseconds for SageMaker requests

## Validation Rules

### AWS Region
- Format: `{region}-{location}-{number}` (e.g., us-east-1, eu-west-2)

### AWS Account ID
- Must be exactly 12 digits

### Table Names
- Alphanumeric characters, hyphens, and underscores only
- Pattern: `[a-zA-Z0-9_-]+`

### S3 Bucket Names
- Lowercase letters, numbers, and hyphens only
- Must start and end with alphanumeric character
- Length: 3-63 characters
- Pattern: `[a-z0-9][a-z0-9-]{1,61}[a-z0-9]`

### API Gateway URL
- Must use HTTPS protocol

### Numeric Fields
- Must be positive integers

## Error Handling

The parser throws `ConfigurationError` with detailed information:

```typescript
class ConfigurationError extends Error {
  message: string;    // Error description
  line?: number;      // Line number where error occurred
  field?: string;     // Field name that caused the error
}
```

### Common Errors

1. **Missing Required Field**
   ```
   Missing required field: AWS_ACCOUNT_ID
   ```

2. **Invalid Line Format**
   ```
   Invalid configuration format: expected KEY=value
   Line: 5
   ```

3. **Invalid Field Value**
   ```
   Invalid AWS region format: invalid-region
   Field: awsRegion
   ```

4. **File Not Found**
   ```
   Configuration file not found: .env
   ```

## Example .env File

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# SageMaker Configuration
SAGEMAKER_ENDPOINT_NAME=gp-carbon-predictor
SAGEMAKER_ROLE_ARN=arn:aws:iam::123456789012:role/SageMakerExecutionRole
TRAINING_DATA_BUCKET=gp-training-data
TRAINING_DATA_S3_URI=s3://gp-training-data/training-data/
MODEL_OUTPUT_S3_URI=s3://gp-training-data/model-output/

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

# Carbon Calculator Configuration
USE_SAGEMAKER=true
FALLBACK_ON_ERROR=true
SAGEMAKER_TIMEOUT_MS=200
```

## Testing

Run the test suite:

```bash
npm test -- infrastructure/config-parser.test.ts
```

The test suite covers:
- Valid configuration parsing
- Optional field handling
- Missing required fields
- Invalid line formats
- Invalid numeric values
- Comment and empty line handling
- Configuration formatting
- Schema validation
- Round-trip preservation

## Integration with Deployment

Use the configuration parser in deployment scripts:

```typescript
import { parseConfigurationFile, validateConfiguration } from './config-parser';

async function deploy() {
  // Load and validate configuration
  const config = parseConfigurationFile('.env');
  validateConfiguration(config);

  // Use configuration for deployment
  await provisionDynamoDB(config);
  await provisionS3(config);
  await provisionCognito(config);
  // ... other provisioning steps
}
```

## Requirements Satisfied

- **Requirement 28.1**: Parse .env files into Configuration object
- **Requirement 28.2**: Return descriptive errors for invalid config with line numbers
- **Requirement 28.3**: Format Configuration objects back to .env files
- **Requirement 28.4**: Round-trip preservation (parse → format → parse)
- **Requirement 28.5**: Schema validation before deployment
