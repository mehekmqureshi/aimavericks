/**
 * Example usage of the configuration parser
 */

import {
  parseConfigurationFile,
  formatConfiguration,
  validateConfiguration,
  Configuration,
  ConfigurationError,
} from './config-parser';

// Example 1: Parse configuration from .env file
try {
  const config = parseConfigurationFile('.env');
  console.log('Configuration loaded successfully:');
  console.log(`  AWS Region: ${config.awsRegion}`);
  console.log(`  Products Table: ${config.productsTableName}`);
  console.log(`  API Gateway URL: ${config.apiGatewayUrl}`);

  // Validate the configuration
  validateConfiguration(config);
  console.log('Configuration is valid!');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
    if (error.line) {
      console.error(`  Line: ${error.line}`);
    }
    if (error.field) {
      console.error(`  Field: ${error.field}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}

// Example 2: Create configuration programmatically and format to .env
const newConfig: Configuration = {
  awsRegion: 'us-west-2',
  awsAccountId: '123456789012',
  productsTableName: 'Products',
  manufacturersTableName: 'Manufacturers',
  productSerialsTableName: 'ProductSerials',
  qrCodesBucket: 'gp-qr-codes-staging',
  frontendBucket: 'gp-frontend-staging',
  cognitoUserPoolId: 'us-west-2_xyz789',
  cognitoClientId: 'xyz789abc123',
  apiGatewayUrl: 'https://api-staging.example.com/prod',
  useSagemaker: false,
  fallbackOnError: true,
};

const envContent = formatConfiguration(newConfig);
console.log('\nGenerated .env content:');
console.log(envContent);

// Example 3: Validate configuration before deployment
try {
  validateConfiguration(newConfig);
  console.log('\nConfiguration validation passed!');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Validation failed:', error.message);
    console.error(`  Field: ${error.field}`);
  }
}
