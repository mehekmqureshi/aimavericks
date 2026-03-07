# Amazon Bedrock Quick Start Guide

## Quick Configuration Steps

### 1. Enable Model Access (AWS Console)

1. Go to: https://console.aws.amazon.com/bedrock/
2. Select region: **us-east-1** (or your preferred region)
3. Click "Model access" in left sidebar
4. Click "Manage model access"
5. Find **Anthropic** section
6. Enable **Claude 3 Haiku**
7. Click "Save changes"
8. Wait for status to show "Access granted" (usually instant)

### 2. Verify Access

```bash
cd infrastructure
npx ts-node verify-bedrock-access.ts
```

Expected output:
```
✓ Model Availability
✓ Model Access
✓ Model Invocation
✓ Response Format
✓ Response Latency

✅ All checks PASSED - Bedrock is ready!
```

### 3. Test AI Generation

```bash
# Test product descriptions
npx ts-node test-bedrock-generation.ts --type description

# Test sustainability insights
npx ts-node test-bedrock-generation.ts --type insights

# Test both
npx ts-node test-bedrock-generation.ts --type both
```

### 4. Verify IAM Permissions

The IAM policy is already configured in:
- `infrastructure/iam-policies/lambda-aiGenerate-policy.json`

It grants:
- `bedrock:InvokeModel` on Claude 3 Haiku
- `dynamodb:GetItem` on Products table
- CloudWatch Logs access

This policy will be applied automatically when deploying the Lambda function.

## Model Configuration

**Current Model**: Claude 3 Haiku
- **Model ID**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Timeout**: 3 seconds
- **Max Tokens**: 1000
- **Use Cases**: Product descriptions, sustainability insights

**Why Haiku?**
- Fast response times (< 1 second typical)
- Cost-effective ($0.25 per 1M input tokens)
- Sufficient quality for descriptions and insights
- Meets 3-second timeout requirement

## Troubleshooting

### "Model not found"
→ Enable Claude 3 Haiku in Bedrock console (Step 1 above)

### "Access denied"
→ Check IAM permissions: `bedrock:InvokeModel`

### "Timeout after 3 seconds"
→ Haiku should be fast enough; check network/region

### Circuit breaker opens
→ Check CloudWatch logs for error patterns

## Cost Estimation

**Claude 3 Haiku Pricing**:
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

**Typical Request** (500 input + 500 output tokens):
- Cost: ~$0.00088 per request
- 10,000 requests/month: ~$8.80/month

## Next Steps

After completing this configuration:

1. ✅ Model access enabled
2. ✅ Verification passed
3. ✅ IAM policy configured
4. → Deploy aiGenerate Lambda (Task 41)
5. → Test in dashboard UI

## References

- Full setup guide: `BEDROCK_SETUP.md`
- IAM policy: `iam-policies/lambda-aiGenerate-policy.json`
- AIService code: `backend/services/AIService.ts`
