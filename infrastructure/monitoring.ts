/**
 * CloudWatch Monitoring and Alarms Configuration
 * 
 * This module creates CloudWatch dashboards and alarms for monitoring
 * the Green Passport platform's AWS resources.
 * 
 * Requirements: 29.1, 29.3
 */

import {
  CloudWatchClient,
  PutDashboardCommand,
  PutMetricAlarmCommand,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface MonitoringConfig {
  environment: string;
  apiGatewayName: string;
  lambdaFunctions: string[];
  dynamodbTables: string[];
  s3Buckets: string[];
  alarmEmail?: string;
}

/**
 * Create CloudWatch dashboard with key metrics
 */
export async function createDashboard(config: MonitoringConfig): Promise<void> {
  const dashboardName = `GreenPassport-${config.environment}`;
  
  const dashboardBody = {
    widgets: [
      // API Gateway Metrics
      {
        type: 'metric',
        x: 0,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['AWS/ApiGateway', 'Count', { stat: 'Sum', label: 'Total Requests' }],
            ['.', '4XXError', { stat: 'Sum', label: '4XX Errors' }],
            ['.', '5XXError', { stat: 'Sum', label: '5XX Errors' }],
          ],
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'API Gateway - Request Count',
          period: 300,
        },
      },
      {
        type: 'metric',
        x: 12,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['AWS/ApiGateway', 'Latency', { stat: 'Average', label: 'Avg Latency' }],
            ['.', '.', { stat: 'p99', label: 'P99 Latency' }],
          ],
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'API Gateway - Latency (ms)',
          period: 300,
          yAxis: {
            left: {
              label: 'Milliseconds',
            },
          },
        },
      },
      
      // Lambda Metrics
      {
        type: 'metric',
        x: 0,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: config.lambdaFunctions.map((fn) => [
            'AWS/Lambda',
            'Duration',
            { stat: 'Average', label: fn },
            { dimensions: { FunctionName: fn } },
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Lambda - Execution Duration',
          period: 300,
          yAxis: {
            left: {
              label: 'Milliseconds',
            },
          },
        },
      },
      {
        type: 'metric',
        x: 12,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: config.lambdaFunctions.map((fn) => [
            'AWS/Lambda',
            'Errors',
            { stat: 'Sum', label: fn },
            { dimensions: { FunctionName: fn } },
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Lambda - Errors',
          period: 300,
        },
      },
      {
        type: 'metric',
        x: 0,
        y: 12,
        width: 12,
        height: 6,
        properties: {
          metrics: config.lambdaFunctions.map((fn) => [
            'AWS/Lambda',
            'Throttles',
            { stat: 'Sum', label: fn },
            { dimensions: { FunctionName: fn } },
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Lambda - Throttles',
          period: 300,
        },
      },
      
      // DynamoDB Metrics
      {
        type: 'metric',
        x: 12,
        y: 12,
        width: 12,
        height: 6,
        properties: {
          metrics: config.dynamodbTables.flatMap((table) => [
            ['AWS/DynamoDB', 'ConsumedReadCapacityUnits', { stat: 'Sum', label: `${table} Read` }, { dimensions: { TableName: table } }],
            ['.', 'ConsumedWriteCapacityUnits', { stat: 'Sum', label: `${table} Write` }, { dimensions: { TableName: table } }],
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'DynamoDB - Capacity Units',
          period: 300,
        },
      },
      {
        type: 'metric',
        x: 0,
        y: 18,
        width: 12,
        height: 6,
        properties: {
          metrics: config.dynamodbTables.flatMap((table) => [
            ['AWS/DynamoDB', 'ReadThrottleEvents', { stat: 'Sum', label: `${table} Read` }, { dimensions: { TableName: table } }],
            ['.', 'WriteThrottleEvents', { stat: 'Sum', label: `${table} Write` }, { dimensions: { TableName: table } }],
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'DynamoDB - Throttle Events',
          period: 300,
        },
      },
      
      // S3 Metrics
      {
        type: 'metric',
        x: 12,
        y: 18,
        width: 12,
        height: 6,
        properties: {
          metrics: config.s3Buckets.flatMap((bucket) => [
            ['AWS/S3', 'AllRequests', { stat: 'Sum', label: bucket }, { dimensions: { BucketName: bucket } }],
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'S3 - Request Count',
          period: 300,
        },
      },
      {
        type: 'metric',
        x: 0,
        y: 24,
        width: 12,
        height: 6,
        properties: {
          metrics: config.s3Buckets.flatMap((bucket) => [
            ['AWS/S3', 'BytesDownloaded', { stat: 'Sum', label: `${bucket} Download` }, { dimensions: { BucketName: bucket } }],
            ['.', 'BytesUploaded', { stat: 'Sum', label: `${bucket} Upload` }, { dimensions: { BucketName: bucket } }],
          ]),
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'S3 - Data Transfer (Bytes)',
          period: 300,
        },
      },
    ],
  };

  const command = new PutDashboardCommand({
    DashboardName: dashboardName,
    DashboardBody: JSON.stringify(dashboardBody),
  });

  await cloudwatch.send(command);
  console.log(`✓ CloudWatch dashboard created: ${dashboardName}`);
}

/**
 * Create CloudWatch alarms for critical metrics
 */
export async function createAlarms(config: MonitoringConfig): Promise<void> {
  const alarms = [
    // API Gateway Error Rate Alarm
    {
      AlarmName: `GreenPassport-${config.environment}-API-ErrorRate`,
      AlarmDescription: 'API Gateway error rate exceeds 5%',
      MetricName: '5XXError',
      Namespace: 'AWS/ApiGateway',
      Statistic: 'Sum',
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 5,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'notBreaching',
    },
    
    // Lambda Error Rate Alarms (one per function)
    ...config.lambdaFunctions.map((fn) => ({
      AlarmName: `GreenPassport-${config.environment}-Lambda-${fn}-ErrorRate`,
      AlarmDescription: `Lambda ${fn} error rate exceeds 2%`,
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: fn,
        },
      ],
      Statistic: 'Sum',
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 2,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'notBreaching',
    })),
    
    // DynamoDB Throttling Alarms
    ...config.dynamodbTables.flatMap((table) => [
      {
        AlarmName: `GreenPassport-${config.environment}-DynamoDB-${table}-ReadThrottle`,
        AlarmDescription: `DynamoDB ${table} read throttling detected`,
        MetricName: 'ReadThrottleEvents',
        Namespace: 'AWS/DynamoDB',
        Dimensions: [
          {
            Name: 'TableName',
            Value: table,
          },
        ],
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 1,
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        TreatMissingData: 'notBreaching',
      },
      {
        AlarmName: `GreenPassport-${config.environment}-DynamoDB-${table}-WriteThrottle`,
        AlarmDescription: `DynamoDB ${table} write throttling detected`,
        MetricName: 'WriteThrottleEvents',
        Namespace: 'AWS/DynamoDB',
        Dimensions: [
          {
            Name: 'TableName',
            Value: table,
          },
        ],
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 1,
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        TreatMissingData: 'notBreaching',
      },
    ]),
    
    // S3 Error Rate Alarms
    ...config.s3Buckets.flatMap((bucket) => [
      {
        AlarmName: `GreenPassport-${config.environment}-S3-${bucket}-4xxErrors`,
        AlarmDescription: `S3 ${bucket} 4xx error rate exceeds 1%`,
        MetricName: '4xxErrors',
        Namespace: 'AWS/S3',
        Dimensions: [
          {
            Name: 'BucketName',
            Value: bucket,
          },
        ],
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 2,
        Threshold: 1,
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'notBreaching',
      },
      {
        AlarmName: `GreenPassport-${config.environment}-S3-${bucket}-5xxErrors`,
        AlarmDescription: `S3 ${bucket} 5xx error rate exceeds 1%`,
        MetricName: '5xxErrors',
        Namespace: 'AWS/S3',
        Dimensions: [
          {
            Name: 'BucketName',
            Value: bucket,
          },
        ],
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 2,
        Threshold: 1,
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'notBreaching',
      },
    ]),
  ];

  // Create all alarms
  for (const alarm of alarms) {
    const command = new PutMetricAlarmCommand(alarm);
    await cloudwatch.send(command);
    console.log(`✓ CloudWatch alarm created: ${alarm.AlarmName}`);
  }
}

/**
 * List all existing alarms for the environment
 */
export async function listAlarms(environment: string): Promise<void> {
  const command = new DescribeAlarmsCommand({
    AlarmNamePrefix: `GreenPassport-${environment}`,
  });

  const response = await cloudwatch.send(command);
  
  if (!response.MetricAlarms || response.MetricAlarms.length === 0) {
    console.log('No alarms found for this environment.');
    return;
  }

  console.log(`\nFound ${response.MetricAlarms.length} alarms:\n`);
  
  for (const alarm of response.MetricAlarms) {
    console.log(`- ${alarm.AlarmName}`);
    console.log(`  State: ${alarm.StateValue}`);
    console.log(`  Description: ${alarm.AlarmDescription}`);
    console.log('');
  }
}

/**
 * Setup complete monitoring infrastructure
 */
export async function setupMonitoring(config: MonitoringConfig): Promise<void> {
  console.log('Setting up CloudWatch monitoring...\n');
  
  try {
    // Create dashboard
    await createDashboard(config);
    
    // Create alarms
    await createAlarms(config);
    
    console.log('\n✓ CloudWatch monitoring setup complete!');
    console.log(`\nDashboard URL: https://console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION || 'us-east-1'}#dashboards:name=GreenPassport-${config.environment}`);
    
  } catch (error) {
    console.error('Error setting up monitoring:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const config: MonitoringConfig = {
    environment: process.env.ENVIRONMENT || 'dev',
    apiGatewayName: 'green-passport-api',
    lambdaFunctions: [
      'createProduct',
      'generateQR',
      'getProduct',
      'verifySerial',
      'aiGenerate',
      'updateProduct',
      'listProducts',
      'calculateEmission',
      'saveDraft',
      'getDraft',
    ],
    dynamodbTables: [
      'Manufacturers',
      'Products',
      'ProductSerials',
      'Drafts',
    ],
    s3Buckets: [
      `gp-qr-codes-${process.env.ENVIRONMENT || 'dev'}`,
      `gp-frontend-${process.env.ENVIRONMENT || 'dev'}`,
    ],
  };

  setupMonitoring(config)
    .then(() => {
      console.log('\nMonitoring setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup monitoring:', error);
      process.exit(1);
    });
}
