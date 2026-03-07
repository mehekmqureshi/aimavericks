import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Product } from '../../shared/types';

/**
 * ProductRepository handles CRUD operations for products in DynamoDB
 * Requirements: 17.1, 17.2, 17.4
 */
export class ProductRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private gsiName: string;

  constructor(
    client?: DynamoDBClient,
    tableName: string = process.env.PRODUCTS_TABLE_NAME || 'Products',
    gsiName: string = 'manufacturerId-index'
  ) {
    this.client = client || new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = tableName;
    this.gsiName = gsiName;
  }

  /**
   * Create a new product in DynamoDB
   * Requirement 17.1: Products table with productId as primary key
   */
  async createProduct(product: Product): Promise<Product> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(product, { removeUndefinedValues: true }),
    });

    await this.client.send(command);
    return product;
  }

  /**
   * Get a product by productId
   * Requirement 17.1: Products table with productId as primary key
   */
  async getProduct(productId: string): Promise<Product | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ productId }),
    });

    const response = await this.client.send(command);
    
    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as Product;
  }

  /**
   * Update a product with partial updates
   * Requirement 17.7: Support partial updates to lifecycle data sections
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    let index = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'productId') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
        
        index++;
      }
    }

    // Always update the updatedAt timestamp
    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ productId }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues, { removeUndefinedValues: true }),
      ReturnValues: 'ALL_NEW',
    });

    const response = await this.client.send(command);
    
    if (!response.Attributes) {
      throw new Error(`Product ${productId} not found`);
    }

    return unmarshall(response.Attributes) as Product;
  }

  /**
   * List all products for a manufacturer using GSI
   * Requirement 17.2: Global Secondary Index on manufacturerId
   * Requirement 17.4: Query products by manufacturerId within 100ms
   */
  async listProductsByManufacturer(manufacturerId: string): Promise<Product[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: this.gsiName,
      KeyConditionExpression: 'manufacturerId = :manufacturerId',
      ExpressionAttributeValues: marshall({
        ':manufacturerId': manufacturerId,
      }),
    });

    const response = await this.client.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map(item => unmarshall(item) as Product);
  }
}
