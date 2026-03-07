# Amazon Bedrock Configuration Guide

## Overview

This guide covers the setup and configuration of Amazon Bedrock for the Green Passport platform's AI features (product description generation and sustainability insights).

## Model Selection

The platform uses **Claude 3 Haiku** (as specified in task 42.1) for cost-effective AI generation:

- **Model ID**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Use Cases**: Product descriptions, sustainability insights
- **Timeout**: 3 seconds
- **Max Tokens**: 1000

### Why Claude 3 Haiku?

- Fast response times (suitable for 3-second timeout requirement)
- Cost-effective for high-volume operations
- Sufficient capability for description and insight generation
- Lower latency than Sonnet/Opus variants

## Prerequisites

1. AWS Account with Bedrock access
2. AWS CLI configured with appropriate credentials
3. IAM permissions to enable model access

## Step 1: Enable Model Access

### Via AWS Console

1. Navigate to Amazon Bedrock console: https://console.aws.amazon.com/bedrock/
2. Select your region (e.g., `us-east-1`)
3. Go to "Model access" in the left sidebar
4. Click "Manage model access"
5. Find "Anthropic" section
6. Enable **Claude 3 Haiku**
7. Review and submit the access request
8. Wait for approval (usually instant for Haiku)

### Via AWS CLI

```bash
# Check current model access
aws bedrock list-foundation-models --region us-east-1

# Request access to Claude 3 Haiku
aws bedrock put-model-invocation-logging-configuration \
  --region us-east-1 \
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/modelinvocations",
      "roleArn": "arn:aws:iam::ACCOUNT_ID:role/BedrockLoggingRole"
    }
  }'
```

## Step 2: Verify Model Access

Run the verification script:

```bash
cd infrastructure
npx ts-node verify-bedrock-access.ts
```

This script will:
- Check if Claude 3 Haiku is accessible
- Test model invocation with a sample prompt
- Verify response format
- Measure response time

## Step 3: Configure IAM Permissions

The `aiGenerate` Lambda function requires the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    }
  ]
}
```

### Apply IAM Policy

The IAM policy is already configured in `infrastructure/iam-policies/aiGenerate-policy.json` and will be applied during Lambda deployment.

To verify:

```bash
# Check if policy exists
aws iam get-role-policy \
  --role-name aiGenerate-lambda-role \
  --policy-name BedrockInvokePolicy \
  --region us-east-1
```

## Step 4: Update AIService Configuration

The AIService is already configured to use Claude 3 Haiku. Update the model ID if needed:

**File**: `backend/services/AIService.ts`

```typescript
private readonly modelId: string = 'anthropic.claude-3-haiku-20240307-v1:0';
```

## Step 5: Test AI Generation

### Test Product Description Generation

```bash
cd infrastructure
npx ts-node test-bedrock-generation.ts --type description
```

### Test Sustainability Insights Generation

```bash
npx ts-node test-bedrock-generation.ts --type insights
```

## Model Invocation Parameters

### Current Configuration

```typescript
{
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 1000,
  temperature: 0.7,  // Can be adjusted for creativity
  top_p: 0.9,        // Can be adjusted for diversity
  messages: [
    {
      role: 'user',
      content: prompt
    }
  ]
}
```

### Recommended Adjustments

For **product descriptions**:
- `temperature`: 0.8 (more creative)
- `max_tokens`: 500 (shorter responses)

For **sustainability insights**:
- `temperature`: 0.5 (more factual)
- `max_tokens`: 800 (detailed analysis)

## Cost Optimization

### Claude 3 Haiku Pricing (as of 2024)

- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

### Estimated Costs

Assuming 1000 tokens per request (500 input + 500 output):
- Cost per request: ~$0.00088
- 10,000 requests/month: ~$8.80/month

### Optimization Strategies

1. **Cache common prompts**: Store frequently generated descriptions
2. **Reduce max_tokens**: Use 500-800 instead of 1000
3. **Batch processing**: Generate multiple descriptions in one request
4. **Fallback to templates**: Use AI only for premium products

## Monitoring and Logging

### CloudWatch Metrics

Monitor these metrics in CloudWatch:

- `Invocations`: Number of model invocations
- `ModelInvocationLatency`: Response time
- `ClientErrors`: 4xx errors
- `ServerErrors`: 5xx errors

### Enable Detailed Logging

```bash
aws bedrock put-model-invocation-logging-configuration \
  --region us-east-1 \
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/green-passport",
      "roleArn": "arn:aws:iam::ACCOUNT_ID:role/BedrockLoggingRole",
      "largeDataDeliveryS3Config": {
        "bucketName": "gp-bedrock-logs",
        "keyPrefix": "model-invocations/"
      }
    },
    "s3Config": {
      "bucketName": "gp-bedrock-logs",
      "keyPrefix": "model-invocations/"
    },
    "textDataDeliveryEnabled": true,
    "imageDataDeliveryEnabled": false,
    "embeddingDataDeliveryEnabled": false
  }'
```

## Troubleshooting

### Error: "Model not found"

**Solution**: Verify model access is enabled in Bedrock console

```bash
aws bedrock list-foundation-models --region us-east-1 | grep claude-3-haiku
```

### Error: "Access denied"

**Solution**: Check IAM permissions for the Lambda execution role

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/aiGenerate-lambda-role \
  --action-names bedrock:InvokeModel \
  --resource-arns "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
```

### Error: "Timeout after 3 seconds"

**Solution**: 
1. Check network connectivity
2. Verify region is correct
3. Consider increasing timeout (not recommended per requirements)
4. Use Claude 3 Haiku instead of Sonnet (faster)

### Circuit Breaker Opens

**Solution**: 
1. Check CloudWatch logs for error patterns
2. Verify Bedrock service health
3. Reset circuit breaker after fixing underlying issue
4. Adjust failure threshold if needed

## Regional Availability

Claude 3 Haiku is available in these regions:
- `us-east-1` (N. Virginia) ✓ Recommended
- `us-west-2` (Oregon)
- `eu-central-1` (Frankfurt)
- `ap-southeast-1` (Singapore)
- `ap-northeast-1` (Tokyo)

Choose the region closest to your users for lowest latency.

## Security Best Practices

1. **Least Privilege**: Grant only `bedrock:InvokeModel` permission
2. **Resource Restrictions**: Limit to specific model ARNs
3. **Logging**: Enable CloudWatch logging for audit trails
4. **Encryption**: Use AWS KMS for data encryption at rest
5. **VPC Endpoints**: Use VPC endpoints for private connectivity (optional)

## Next Steps

After completing Bedrock configuration:

1. ✓ Enable Claude 3 Haiku model access
2. ✓ Verify IAM permissions
3. ✓ Run verification script
4. ✓ Test AI generation endpoints
5. → Deploy aiGenerate Lambda function (Task 41)
6. → Test end-to-end AI features in dashboard

## References

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3 Model Guide](https://docs.anthropic.com/claude/docs/models-overview)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
