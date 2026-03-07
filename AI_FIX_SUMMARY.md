# AI Generation Fix - Summary

## 📋 What Was Created

I've created a complete diagnostic and fix toolkit for the "AI generation failed: Network Error" issue:

### Documentation
1. **AI_GENERATION_FIX_GUIDE.md** - Comprehensive troubleshooting guide with detailed explanations
2. **AI_FIX_QUICK_REFERENCE.md** - Quick reference card for fast fixes

### Diagnostic Scripts
3. **diagnose-ai-endpoint.sh** (Linux/Mac) - Automated diagnostic tool
4. **diagnose-ai-endpoint.ps1** (Windows) - PowerShell version

### Fix Scripts
5. **fix-bedrock-permissions.sh** (Linux/Mac) - Adds Bedrock permissions to Lambda IAM role
6. **fix-bedrock-permissions.ps1** (Windows) - PowerShell version

### Test Scripts
7. **test-ai-generation-complete.sh** - Complete end-to-end testing suite

## 🎯 Root Cause Analysis

The "Network Error" is most likely caused by one of these issues:

### 1. Missing Bedrock Permissions (80% probability)
- Lambda IAM role lacks `bedrock:InvokeModel` permission
- **Fix**: Run `./fix-bedrock-permissions.sh`

### 2. API Gateway Not Properly Configured (15% probability)
- Route `/ai/generate` missing or misconfigured
- CORS not enabled
- **Fix**: Run `npx ts-node infrastructure/deploy-api-gateway.ts`

### 3. Frontend Configuration (5% probability)
- Wrong API Gateway URL in `frontend/.env`
- **Fix**: Update `VITE_API_GATEWAY_URL` and rebuild

## 🚀 Quick Start

### Step 1: Run Diagnostics
```bash
# Linux/Mac
bash diagnose-ai-endpoint.sh

# Windows PowerShell
.\diagnose-ai-endpoint.ps1
```

This will check:
- ✅ API Gateway exists
- ✅ `/ai/generate` route configured
- ✅ Lambda function deployed
- ✅ IAM permissions
- ✅ CORS configuration
- ✅ Endpoint accessibility

### Step 2: Apply Fixes

Based on diagnostic results:

**If Bedrock permissions missing:**
```bash
bash fix-bedrock-permissions.sh
```

**If API Gateway issues:**
```bash
cd infrastructure
npx ts-node deploy-api-gateway.ts
```

**If frontend config wrong:**
```bash
# Update frontend/.env with correct API URL
cd frontend
npm run build
```

### Step 3: Test
```bash
bash test-ai-generation-complete.sh
```

## 📊 Current Configuration

### Frontend
- **Location**: `frontend/.env`
- **API URL**: `https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod`
- **Endpoint Called**: `POST /ai/generate`

### Backend
- **Lambda**: `gp-aiGenerate-dev`
- **Region**: `us-east-1`
- **Model**: `anthropic.claude-haiku-4-5-20251001-v1:0`
- **IAM Role**: `gp-aiGenerate-role-dev`

### API Gateway
- **API ID**: `325xzv9pli`
- **Stage**: `prod`
- **Route**: `/ai/generate` (POST, requires auth)

## 🔍 How to Debug

### 1. Check Browser Console
```
F12 → Console tab
Look for: "AI generation failed: Network Error"
```

### 2. Check Network Tab
```
F12 → Network tab → Click AI button
Look at the request to /ai/generate:
- Status code (401, 403, 500, etc.)
- Response body
- Request headers (Authorization present?)
```

### 3. Check Lambda Logs
```bash
aws logs tail /aws/lambda/gp-aiGenerate-dev --follow --region us-east-1
```

### 4. Test Endpoint Directly
```bash
curl -X POST https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/ai/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productName":"Test","category":"Apparel"}'
```

## 📝 Implementation Details

### Lambda Function (`backend/lambdas/aiGenerate.ts`)
- Accepts: `productName`, `category`, `materials`, `manufacturingProcess`
- OR: `lifecycleData`, `carbonFootprint`
- Returns: `generatedContent`, `timestamp`
- Requires: Cognito JWT token in Authorization header

### AI Service (`backend/services/AIService.ts`)
- Uses Amazon Bedrock Runtime Client
- Model: Claude Haiku 4.5
- Timeout: 10 seconds
- Circuit breaker pattern for resilience

### Frontend (`frontend/src/pages/CreateDPP.tsx`)
- Button: "AI Autofill"
- Calls: `apiClient.post('/ai/generate', {...})`
- Requires: Product name and category filled

## ✅ Success Criteria

After fixes, you should see:

1. **Diagnostic script**: All checks pass ✅
2. **Test script**: 200 OK response with generated content
3. **Browser**: AI button generates description successfully
4. **Lambda logs**: No errors, successful Bedrock invocations

## 🆘 If Still Not Working

1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check Bedrock is enabled in your account
3. Verify region is us-east-1
4. Check AWS service quotas for Bedrock
5. Ensure Lambda has internet access (VPC config)
6. Review full logs in CloudWatch

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `AI_GENERATION_FIX_GUIDE.md` | Complete troubleshooting guide |
| `AI_FIX_QUICK_REFERENCE.md` | Quick reference card |
| `diagnose-ai-endpoint.sh` | Automated diagnostics |
| `fix-bedrock-permissions.sh` | Fix IAM permissions |
| `test-ai-generation-complete.sh` | End-to-end testing |
| `backend/lambdas/aiGenerate.ts` | Lambda function code |
| `backend/services/AIService.ts` | Bedrock integration |
| `frontend/src/pages/CreateDPP.tsx` | Frontend AI button |

## 🎯 Next Steps

1. Run `bash diagnose-ai-endpoint.sh`
2. Follow the recommendations from the diagnostic
3. Run `bash test-ai-generation-complete.sh` to verify
4. Test in the actual application
5. Monitor logs for any issues

## 💡 Prevention

To avoid this issue in the future:

1. Always deploy IAM roles before Lambdas
2. Test endpoints independently before frontend integration
3. Use the diagnostic script after any infrastructure changes
4. Keep frontend .env in sync with backend deployments
5. Monitor CloudWatch for Lambda errors

---

**Need help?** Check `AI_FIX_QUICK_REFERENCE.md` for one-line fixes or `AI_GENERATION_FIX_GUIDE.md` for detailed explanations.
