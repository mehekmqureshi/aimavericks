# AI Generation Fix - Quick Reference

## 🚨 Problem
AI button shows: "AI generation failed: Network Error"

## ⚡ Quick Diagnosis (30 seconds)

Run diagnostic script:
```bash
# Linux/Mac
bash diagnose-ai-endpoint.sh

# Windows
.\diagnose-ai-endpoint.ps1
```

## 🔧 Most Common Fixes

### Fix 1: Missing Bedrock Permissions (Most Likely)
```bash
# Linux/Mac
bash fix-bedrock-permissions.sh

# Windows
.\fix-bedrock-permissions.ps1
```

### Fix 2: API Gateway Not Deployed
```bash
cd infrastructure
npx ts-node deploy-api-gateway.ts
```
Then update `frontend/.env` with the new API URL.

### Fix 3: CORS Not Configured
```bash
# Get resource ID
aws apigateway get-resources --rest-api-id 325xzv9pli --region us-east-1

# Then run CORS fix from AI_GENERATION_FIX_GUIDE.md
```

### Fix 4: Frontend Configuration
Check `frontend/.env`:
```env
VITE_API_GATEWAY_URL=https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod
```

Rebuild after changes:
```bash
cd frontend
npm run build
```

## 🧪 Quick Test

```bash
# Full test suite
bash test-ai-generation-complete.sh

# Or manual test
curl -X POST https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/ai/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productName":"Test Shirt","category":"Apparel"}'
```

## 📋 Checklist

- [ ] API Gateway exists (ID: 325xzv9pli)
- [ ] Route `/ai/generate` is configured
- [ ] Lambda `gp-aiGenerate-dev` is deployed
- [ ] IAM role has Bedrock permissions
- [ ] CORS is enabled (OPTIONS method)
- [ ] Frontend has correct API URL
- [ ] User is logged in with valid token

## 🔍 View Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/gp-aiGenerate-dev --follow --region us-east-1

# API Gateway logs (if enabled)
aws logs tail /aws/apigateway/325xzv9pli/prod --follow --region us-east-1
```

## 📞 Expected Responses

### ✅ Success (200)
```json
{
  "generatedContent": "This organic cotton t-shirt...",
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

### 🔒 Auth Required (401)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```

### ❌ Server Error (500)
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred while generating content"
  }
}
```

## 🎯 Root Cause by Error Type

| Error | Root Cause | Fix |
|-------|-----------|-----|
| Network Error | CORS or wrong URL | Fix 2 or 3 |
| 401 Unauthorized | Not logged in | Login to app |
| 403 Forbidden | Cognito config | Check authorizer |
| 500 Internal | Bedrock permissions | Fix 1 |
| 504 Timeout | Lambda timeout | Increase timeout |

## 📚 Full Documentation

See `AI_GENERATION_FIX_GUIDE.md` for detailed explanations and advanced troubleshooting.

## 🏃 One-Line Fixes

```bash
# Fix everything at once (if you're feeling lucky)
bash fix-bedrock-permissions.sh && \
cd infrastructure && npx ts-node deploy-api-gateway.ts && \
cd .. && bash test-ai-generation-complete.sh
```

## 💡 Pro Tips

1. Always check Lambda logs first - they show the actual error
2. Use browser DevTools Network tab to see the exact request/response
3. Test with curl before testing in the app
4. IAM changes take 10-15 seconds to propagate
5. Clear browser cache if frontend changes don't apply

## 🆘 Still Not Working?

1. Run full diagnostic: `bash diagnose-ai-endpoint.sh`
2. Check all logs
3. Verify AWS credentials are configured
4. Ensure Bedrock is available in us-east-1
5. Check AWS service quotas for Bedrock
