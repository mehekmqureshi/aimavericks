# Bedrock Model Access Required

## 🚨 Issue Found

The AI generation is failing because **Bedrock model access has not been requested** for your AWS account.

### Error Message
```
Model use case details have not been submitted for this account. 
Fill out the Anthropic use case details form before using the model.
```

## ✅ Solution: Request Bedrock Model Access

### Step 1: Open AWS Bedrock Console
1. Go to: https://console.aws.amazon.com/bedrock/
2. Make sure you're in the **us-east-1** region (top right)

### Step 2: Request Model Access
1. In the left sidebar, click **"Model access"**
2. Click **"Manage model access"** or **"Request model access"**
3. Find **"Anthropic"** in the list
4. Check the box for:
   - ✅ **Claude 3 Haiku** (anthropic.claude-3-haiku-20240307-v1:0)
   - ✅ **Claude 3.5 Sonnet** (optional, for better quality)
5. Fill out the required use case form:
   - **Use case**: Product description generation for sustainability platform
   - **Industry**: E-commerce / Sustainability
   - **Description**: Generate product descriptions and sustainability insights for digital product passports
6. Click **"Request model access"** or **"Submit"**

### Step 3: Wait for Approval
- **Instant access**: Some models are approved instantly
- **Manual review**: May take 15-30 minutes for Anthropic models
- You'll receive an email when approved

### Step 4: Verify Access
After approval, run this command to verify:
```powershell
aws bedrock-runtime invoke-model `
  --model-id anthropic.claude-3-haiku-20240307-v1:0 `
  --region us-east-1 `
  --body file://test-bedrock-direct.json `
  --cli-binary-format raw-in-base64-out `
  bedrock-response.json
```

If successful, you'll see a response file created.

### Step 5: Test AI Generation
Once access is granted, test the Lambda:
```powershell
.\test-ai-with-auth.ps1
```

## 📋 Current Configuration

- **Model**: anthropic.claude-3-haiku-20240307-v1:0 (Claude 3 Haiku)
- **Region**: us-east-1
- **Lambda**: gp-aiGenerate-dev
- **IAM Role**: gp-aiGenerate-role-dev ✅ (has Bedrock permissions)

## 🔍 Diagnostic Results

✅ API Gateway configured
✅ Lambda deployed
✅ IAM permissions correct
✅ CORS working
✅ Endpoint reachable
❌ **Bedrock model access not granted**

## ⏱️ Timeline

1. **Now**: Request model access in Bedrock console
2. **15-30 min**: Wait for approval (usually instant for Claude 3 Haiku)
3. **After approval**: AI generation will work immediately

## 🎯 Alternative: Use Different Model

If you have access to other models, you can update the model ID in `backend/services/AIService.ts`:

### Available Models (if you have access)
```typescript
// Current (requires access request)
private readonly modelId: string = 'anthropic.claude-3-haiku-20240307-v1:0';

// Alternatives (if you have access)
// private readonly modelId: string = 'anthropic.claude-3-5-sonnet-20240620-v1:0'; // Better quality
// private readonly modelId: string = 'amazon.titan-text-express-v1'; // Amazon's model
```

After changing, rebuild and redeploy:
```powershell
npx ts-node infrastructure/package-lambdas.ts
aws lambda update-function-code --function-name gp-aiGenerate-dev --region us-east-1 --zip-file fileb://dist/lambdas/aiGenerate.zip
```

## 📞 Quick Links

- **Bedrock Console**: https://console.aws.amazon.com/bedrock/
- **Model Access Page**: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
- **Bedrock Pricing**: https://aws.amazon.com/bedrock/pricing/

## 💰 Cost Estimate

Claude 3 Haiku pricing (us-east-1):
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

For product descriptions (~200 tokens each):
- Cost per generation: ~$0.0003 (less than a penny)
- 1000 generations: ~$0.30

## ✅ Next Steps

1. **Request Bedrock model access** (see Step 1-3 above)
2. Wait for approval (15-30 minutes)
3. Test again with `.\test-ai-with-auth.ps1`
4. AI generation will work in the frontend

## 🆘 If Access is Denied

If your request is denied:
1. Check AWS account is in good standing
2. Ensure billing is set up
3. Try requesting access to Amazon Titan models instead
4. Contact AWS Support for assistance

---

**The infrastructure is correctly configured. You just need to request Bedrock model access!**
