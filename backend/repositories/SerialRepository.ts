import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ProductSerial } from '../../shared/types';

/**
 * SerialRepository handles CRUD operations for product serials in DynamoDB
 * Requirements: 18.1, 18.2, 18.4
 */
export class SerialRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private gsiName: string;

  constructor(
    client?: DynamoDBClient,
    tableName: string = process.env.PRODUCT_SERIALS_TABLE_NAME || 'ProductSerials',
    gsiName: string = 'productId-index'
  ) {
    this.client = client || new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = tableName;
    this.gsiName = gsiName;
  }

  /**
   * Create a new serial record in DynamoDB
   * Requirement 18.1: ProductSerials table with serialId as primary key
   */
  async createSerial(serial: ProductSerial): Promise<ProductSerial> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(serial, { removeUndefinedValues: true }),
    });

    await this.client.send(command);
    return serial;
  }

  /**
   * Get a serial by serialId
   * Requirement 18.1: ProductSerials table with serialId as primary key
   */
  async getSerial(serialId: string): Promise<ProductSerial | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ serialId }),
    });

    const response = await this.client.send(command);
    
    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as ProductSerial;
  }

  /**
   * List all serials for a product using GSI
   * Requirement 18.2: Global Secondary Index on productId
   * Requirement 18.4: Query serials by productId
   */
  async listSerialsByProduct(productId: string): Promise<ProductSerial[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: this.gsiName,
      KeyConditionExpression: 'productId = :productId',
      ExpressionAttributeValues: marshall({
        ':productId': productId,
      }),
    });

    const response = await this.client.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map(item => unmarshall(item) as ProductSerial);
  }

  /**
   * Update scan statistics for a serial
   * Used when a QR code is scanned by consumers
   */
  async updateScanStatistics(serialId: string): Promise<ProductSerial> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ serialId }),
      UpdateExpression: 'SET scannedCount = scannedCount + :inc, lastScannedAt = :timestamp',
      ExpressionAttributeValues: marshall({
        ':inc': 1,
        ':timestamp': new Date().toISOString(),
      }),
      ReturnValues: 'ALL_NEW',
    });

    const response = await this.client.send(command);
    
    if (!response.Attributes) {
      throw new Error(`Serial ${serialId} not found`);
    }

    return unmarshall(response.Attributes) as ProductSerial;
  }
}
