import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Manufacturer } from '../../shared/types';

/**
 * ManufacturerRepository handles operations for manufacturers in DynamoDB
 * Requirements: 2.1, 2.3
 */
export class ManufacturerRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(
    client?: DynamoDBClient,
    tableName: string = process.env.MANUFACTURERS_TABLE_NAME || 'Manufacturers'
  ) {
    this.client = client || new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = tableName;
  }

  /**
   * Get a manufacturer by manufacturerId
   * Requirement 2.1: Manufacturers table with manufacturerId as primary key
   */
  async getManufacturer(manufacturerId: string): Promise<Manufacturer | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ manufacturerId }),
    });

    const response = await this.client.send(command);
    
    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as Manufacturer;
  }

  /**
   * Update a manufacturer profile
   * Requirement 2.3: Persist manufacturer profile changes within 1 second
   */
  async updateManufacturer(
    manufacturerId: string,
    updates: Partial<Manufacturer>
  ): Promise<Manufacturer> {
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    let index = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'manufacturerId') {
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
      Key: marshall({ manufacturerId }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues, { removeUndefinedValues: true }),
      ReturnValues: 'ALL_NEW',
    });

    const response = await this.client.send(command);
    
    if (!response.Attributes) {
      throw new Error(`Manufacturer ${manufacturerId} not found`);
    }

    return unmarshall(response.Attributes) as Manufacturer;
  }
}
