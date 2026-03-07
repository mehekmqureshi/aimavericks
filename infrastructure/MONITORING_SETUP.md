# CloudWatch Monitoring Setup Guide

## Overview

This guide explains the CloudWatch monitoring and alerting infrastructure for the Green Passport platform. The monitoring system tracks key metrics across API Gateway, Lambda functions, DynamoDB tables, and S3 buckets.

## Architecture

### Dashboard

The CloudWatch dashboard provides real-time visibility into:

- **API Gateway Metrics**
  - Total request count
  - 4XX and 5XX error counts
  - Average and P99 latency

- **Lambda Metrics**
  - Execution duration per function
  - Error counts per function
  - Throttle events per function

- **DynamoDB Metrics**
  - Read/write capacity consumption
  - Throttle events per table

- **S3 Metrics**
  - Request counts per bucket
  - Data transfer (upload/download)

### Alarms

The system creates the following alarms:

#### API Gateway Alarms
- **Error Rate**: Triggers when 5XX errors exceed 5%
  - Evaluation: 2 periods of 5 minutes
  - Action: Alert operations team

#### Lambda Alarms
- **Error Rate**: Triggers when errors exceed 2% per function
  - Evaluation: 2 periods of 5 minutes
  - Functions monitored:
    - createProduct
    - generateQR
    - getProduct
    - verifySerial
    - aiGenerate
    - updateProduct
    - listProducts
    - calculateEmission
    - saveDraft
    - getDraft

#### DynamoDB Alarms
- **Read Throttling**: Triggers on any read throttle event
  - Evaluation: 1 period of 5 minutes
  - Tables monitored: Manufacturers, Products, ProductSerials, Drafts

- **Write Throttling**: Triggers on any write throttle event
  - Evaluation: 1 period of 5 minutes
  - Tables monitored: Manufacturers, Products, ProductSerials, Drafts

#### S3 Alarms
- **4XX Error Rate**: Triggers when 4XX errors exceed 1%
  - Evaluation: 2 periods of 5 minutes
  - Buckets monitored: gp-qr-codes-{env}, gp-frontend-{env}

- **5XX Error Rate**: Triggers when 5XX errors exceed 1%
  - Evaluation: 2 periods of 5 minutes
  - Buckets monitored: gp-qr-codes-{env}, gp-frontend-{env}

## Setup Instructions

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js and TypeScript installed
3. AWS SDK v3 packages installed

### Installation

```bash
# Install dependencies
npm install @aws-sdk/client-cloudwatch

# Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=dev
```

### Deployment

Run the monitoring setup script:

```bash
# Deploy monitoring infrastructure
npx ts-node infrastructure/monitoring.ts
```

This will:
1. Create the CloudWatch dashboard
2. Create all configured alarms
3. Output the dashboard URL

### Configuration

Edit the `MonitoringConfig` in `monitoring.ts` to customize:

```typescript
const config: MonitoringConfig = {
  environment: 'dev',
  apiGatewayName: 'green-passport-api',
  lambdaFunctions: ['createProduct', 'generateQR', ...],
  dynamodbTables: ['Manufacturers', 'Products', ...],
  s3Buckets: ['gp-qr-codes-dev', 'gp-frontend-dev'],
  alarmEmail: 'ops@example.com', // Optional SNS topic
};
```

## Accessing the Dashboard

After deployment, access the dashboard at:

```
https://console.aws.amazon.com/cloudwatch/home?region={region}#dashboards:name=GreenPassport-{environment}
```

## Alarm Management

### Viewing Alarms

List all alarms for an environment:

```bash
aws cloudwatch describe-alarms --alarm-name-prefix "GreenPassport-dev"
```

### Testing Alarms

To test alarm functionality:

1. **API Gateway**: Generate errors by calling invalid endpoints
2. **Lambda**: Trigger errors by passing invalid data
3. **DynamoDB**: Exceed provisioned capacity (if using provisioned mode)
4. **S3**: Attempt unauthorized access

### Alarm States

- **OK**: Metric is within threshold
- **ALARM**: Metric has breached threshold
- **INSUFFICIENT_DATA**: Not enough data to evaluate

## Metrics Reference

### API Gateway Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| Count | Total API requests | Count |
| 4XXError | Client errors | Count |
| 5XXError | Server errors | Count |
| Latency | Request latency | Milliseconds |

### Lambda Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| Duration | Execution time | Milliseconds |
| Errors | Function errors | Count |
| Throttles | Throttled invocations | Count |
| Invocations | Total invocations | Count |

### DynamoDB Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| ConsumedReadCapacityUnits | Read capacity used | Count |
| ConsumedWriteCapacityUnits | Write capacity used | Count |
| ReadThrottleEvents | Read throttles | Count |
| WriteThrottleEvents | Write throttles | Count |

### S3 Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| AllRequests | Total requests | Count |
| 4xxErrors | Client errors | Count |
| 5xxErrors | Server errors | Count |
| BytesDownloaded | Data downloaded | Bytes |
| BytesUploaded | Data uploaded | Bytes |

## Best Practices

### Dashboard Usage

1. **Regular Review**: Check dashboard daily for anomalies
2. **Trend Analysis**: Monitor trends over time to identify patterns
3. **Capacity Planning**: Use metrics to plan scaling decisions

### Alarm Response

1. **Acknowledge**: Acknowledge alarms promptly
2. **Investigate**: Check CloudWatch Logs for error details
3. **Remediate**: Fix underlying issues
4. **Document**: Record incidents and resolutions

### Optimization

1. **Adjust Thresholds**: Fine-tune alarm thresholds based on actual usage
2. **Add Custom Metrics**: Extend with application-specific metrics
3. **Set Up SNS**: Configure SNS topics for email/SMS notifications

## Troubleshooting

### Dashboard Not Showing Data

- Verify resources are deployed and active
- Check metric namespace and dimensions
- Ensure CloudWatch has permissions to access metrics

### Alarms Not Triggering

- Verify alarm configuration (threshold, period, evaluation)
- Check if metric is being published
- Review alarm history in CloudWatch console

### High Costs

- Reduce dashboard refresh rate
- Decrease alarm evaluation frequency
- Use metric filters to reduce log ingestion

## Requirements Mapping

This monitoring setup satisfies the following requirements:

- **Requirement 29.1**: Lambda error logging and CloudWatch integration
- **Requirement 29.3**: API request logging and structured logging format

## Additional Resources

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [CloudWatch Alarms Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html)
- [CloudWatch Dashboards](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)
