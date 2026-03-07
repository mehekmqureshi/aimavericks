/**
 * Setup CloudWatch Alarms
 * Monitor Lambda errors, API Gateway errors, and DynamoDB throttling
 */

import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  ComparisonOperator,
  Statistic,
} from '@aws-sdk/client-cloudwatch';

const region = 'us-east-1';
const client = new CloudWatchClient({ region });
const apiId = '325xzv9pli';

const lambdaFunctions = [
  'gp-createProduct-dev',
  'gp-aiGenerate-dev',
  'gp-generateQR-dev',
  'gp-verifySerial-dev',
];

async function setupAlarms() {
  console.log('🔧 Setting up CloudWatch alarms...\n');

  let successCount = 0;
  let failCount = 0;

  // 1. Lambda Error Rate Alarms
  for (const functionName of lambdaFunctions) {
    try {
      await client.send(
        new PutMetricAlarmCommand({
          AlarmName: `${functionName}-ErrorRate`,
          AlarmDescription: `Alert when ${functionName} error rate exceeds 5%`,
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Statistic: Statistic.Sum,
          Period: 300, // 5 minutes
          EvaluationPeriods: 1,
          Threshold: 5,
          ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
          Dimensions: [
            {
              Name: 'FunctionName',
              Value: functionName,
            },
          ],
          TreatMissingData: 'notBreaching',
        })
      );
      console.log(`✅ ${functionName}-ErrorRate`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ ${functionName}-ErrorRate: ${error.message}`);
      failCount++;
    }
  }

  // 2. API Gateway 5xx Error Alarm
  try {
    await client.send(
      new PutMetricAlarmCommand({
        AlarmName: 'APIGateway-5xxErrors',
        AlarmDescription: 'Alert when API Gateway 5xx errors exceed 10 per minute',
        MetricName: '5XXError',
        Namespace: 'AWS/ApiGateway',
        Statistic: Statistic.Sum,
        Period: 60, // 1 minute
        EvaluationPeriods: 1,
        Threshold: 10,
        ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
        Dimensions: [
          {
            Name: 'ApiName',
            Value: 'green-passport-api-dev',
          },
        ],
        TreatMissingData: 'notBreaching',
      })
    );
    console.log('✅ APIGateway-5xxErrors');
    successCount++;
  } catch (error: any) {
    console.error(`❌ APIGateway-5xxErrors: ${error.message}`);
    failCount++;
  }

  // 3. API Gateway Latency Alarm
  try {
    await client.send(
      new PutMetricAlarmCommand({
        AlarmName: 'APIGateway-HighLatency',
        AlarmDescription: 'Alert when API Gateway latency exceeds 5 seconds',
        MetricName: 'Latency',
        Namespace: 'AWS/ApiGateway',
        Statistic: Statistic.Average,
        Period: 300, // 5 minutes
        EvaluationPeriods: 1,
        Threshold: 5000, // 5 seconds in milliseconds
        ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
        Dimensions: [
          {
            Name: 'ApiName',
            Value: 'green-passport-api-dev',
          },
        ],
        TreatMissingData: 'notBreaching',
      })
    );
    console.log('✅ APIGateway-HighLatency');
    successCount++;
  } catch (error: any) {
    console.error(`❌ APIGateway-HighLatency: ${error.message}`);
    failCount++;
  }

  // 4. DynamoDB Throttle Alarms
  const tables = ['Products', 'Manufacturers', 'ProductSerials', 'Drafts'];
  for (const tableName of tables) {
    try {
      await client.send(
        new PutMetricAlarmCommand({
          AlarmName: `DynamoDB-${tableName}-Throttles`,
          AlarmDescription: `Alert when ${tableName} table is throttled`,
          MetricName: 'UserErrors',
          Namespace: 'AWS/DynamoDB',
          Statistic: Statistic.Sum,
          Period: 300, // 5 minutes
          EvaluationPeriods: 1,
          Threshold: 5,
          ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
          Dimensions: [
            {
              Name: 'TableName',
              Value: tableName,
            },
          ],
          TreatMissingData: 'notBreaching',
        })
      );
      console.log(`✅ DynamoDB-${tableName}-Throttles`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ DynamoDB-${tableName}-Throttles: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log('\n⚠️  Note: Configure SNS topic for alarm notifications');
}

setupAlarms().catch(console.error);
