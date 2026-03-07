import { 
  DynamoDBClient, 
  CreateTableCommand, 
  DescribeTableCommand,
  waitUntilTableExists,
  CreateTableCommandInput 
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface TableConfig {
  tableName: string;
  primaryKey: string;
  gsiConfig?: {
    indexName: string;
    partitionKey: string;
  };
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(config: TableConfig): Promise<void> {
  const { tableName, primaryKey, gsiConfig } = config;

  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }

  const params: CreateTableCommandInput = {
    TableName: tableName,
    KeySchema: [
      { AttributeName: primaryKey, KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: primaryKey, AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    SSESpecification: {
      Enabled: true
    }
  };

  // Add GSI if configured
  if (gsiConfig) {
    params.AttributeDefinitions!.push({
      AttributeName: gsiConfig.partitionKey,
      AttributeType: 'S'
    });
    params.GlobalSecondaryIndexes = [
      {
        IndexName: gsiConfig.indexName,
        KeySchema: [
          { AttributeName: gsiConfig.partitionKey, KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ];
  }

  console.log(`Creating table ${tableName}...`);
  await client.send(new CreateTableCommand(params));

  // Wait for table to be active
  await waitUntilTableExists(
    { client, maxWaitTime: 60 },
    { TableName: tableName }
  );

  console.log(`✓ Table ${tableName} created successfully`);
}

async function provisionManufacturersTable(): Promise<void> {
  await createTable({
    tableName: 'Manufacturers',
    primaryKey: 'manufacturerId'
  });
}

async function provisionProductsTable(): Promise<void> {
  await createTable({
    tableName: 'Products',
    primaryKey: 'productId',
    gsiConfig: {
      indexName: 'manufacturerId-index',
      partitionKey: 'manufacturerId'
    }
  });
}

async function provisionProductSerialsTable(): Promise<void> {
  await createTable({
    tableName: 'ProductSerials',
    primaryKey: 'serialId',
    gsiConfig: {
      indexName: 'productId-index',
      partitionKey: 'productId'
    }
  });
}

async function provisionDraftsTable(): Promise<void> {
  await createTable({
    tableName: 'Drafts',
    primaryKey: 'draftId',
    gsiConfig: {
      indexName: 'manufacturerId-index',
      partitionKey: 'manufacturerId'
    }
  });
}

async function main() {
  try {
    console.log('Starting DynamoDB table provisioning...\n');

    // Provision all tables
    await provisionManufacturersTable();
    await provisionProductsTable();
    await provisionProductSerialsTable();
    await provisionDraftsTable();

    console.log('\n✓ All DynamoDB tables provisioned successfully');
  } catch (error) {
    console.error('Error provisioning DynamoDB tables:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { 
  provisionManufacturersTable, 
  provisionProductsTable, 
  provisionProductSerialsTable,
  provisionDraftsTable
};
