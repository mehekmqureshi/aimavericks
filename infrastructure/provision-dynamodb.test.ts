import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { 
  provisionManufacturersTable, 
  provisionProductsTable, 
  provisionProductSerialsTable 
} from './provision-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

describe('DynamoDB Table Provisioning', () => {
  // Skip tests if AWS credentials are not configured
  const skipIfNoCredentials = process.env.AWS_ACCESS_KEY_ID ? test : test.skip;

  skipIfNoCredentials('should create Manufacturers table with correct configuration', async () => {
    await provisionManufacturersTable();

    const response = await client.send(
      new DescribeTableCommand({ TableName: 'Manufacturers' })
    );

    expect(response.Table).toBeDefined();
    expect(response.Table?.TableName).toBe('Manufacturers');
    expect(response.Table?.KeySchema).toEqual([
      { AttributeName: 'manufacturerId', KeyType: 'HASH' }
    ]);
    expect(response.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
    expect(response.Table?.SSEDescription?.Status).toBe('ENABLED');
  }, 120000); // 2 minute timeout for table creation

  skipIfNoCredentials('should create Products table with GSI', async () => {
    await provisionProductsTable();

    const response = await client.send(
      new DescribeTableCommand({ TableName: 'Products' })
    );

    expect(response.Table).toBeDefined();
    expect(response.Table?.TableName).toBe('Products');
    expect(response.Table?.KeySchema).toEqual([
      { AttributeName: 'productId', KeyType: 'HASH' }
    ]);
    expect(response.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
    expect(response.Table?.SSEDescription?.Status).toBe('ENABLED');
    
    // Check GSI
    expect(response.Table?.GlobalSecondaryIndexes).toBeDefined();
    expect(response.Table?.GlobalSecondaryIndexes?.length).toBe(1);
    expect(response.Table?.GlobalSecondaryIndexes?.[0].IndexName).toBe('manufacturerId-index');
    expect(response.Table?.GlobalSecondaryIndexes?.[0].KeySchema).toEqual([
      { AttributeName: 'manufacturerId', KeyType: 'HASH' }
    ]);
  }, 120000);

  skipIfNoCredentials('should create ProductSerials table with GSI', async () => {
    await provisionProductSerialsTable();

    const response = await client.send(
      new DescribeTableCommand({ TableName: 'ProductSerials' })
    );

    expect(response.Table).toBeDefined();
    expect(response.Table?.TableName).toBe('ProductSerials');
    expect(response.Table?.KeySchema).toEqual([
      { AttributeName: 'serialId', KeyType: 'HASH' }
    ]);
    expect(response.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
    expect(response.Table?.SSEDescription?.Status).toBe('ENABLED');
    
    // Check GSI
    expect(response.Table?.GlobalSecondaryIndexes).toBeDefined();
    expect(response.Table?.GlobalSecondaryIndexes?.length).toBe(1);
    expect(response.Table?.GlobalSecondaryIndexes?.[0].IndexName).toBe('productId-index');
    expect(response.Table?.GlobalSecondaryIndexes?.[0].KeySchema).toEqual([
      { AttributeName: 'productId', KeyType: 'HASH' }
    ]);
  }, 120000);

  skipIfNoCredentials('should handle existing tables gracefully', async () => {
    // Run provisioning twice - second time should detect existing tables
    await provisionManufacturersTable();
    await expect(provisionManufacturersTable()).resolves.not.toThrow();
  }, 120000);
});
