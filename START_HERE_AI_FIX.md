# 🚨 AI Generation Network Error - START HERE

## Problem
Clicking the "AI Autofill" button shows: **"AI generation failed: Network Error"**

## ⚡ Quick Fix (2 minutes)

### Step 1: Run Diagnostic
```bash
# Windows PowerShell
.\diagnose-ai-endpoint.ps1

# Linux/Mac/Git Bash
bash diagnose-ai-endpoint.sh
```

### Step 2: Apply Most Common Fix
```bash
# Windows PowerShell
.\fix-bedrock-permissions.ps1

# Linux/Mac/Git Bash
bash fix-bedrock-permissions.sh
```

### Step 3: Test
```bash
# Windows PowerShell or Linux/Mac/Git Bash
bash test-ai-generation-complete.sh
```

## 📚 Documentation Files

| File | When to Use |
|------|-------------|
| **AI_FIX_QUICK_REFERENCE.md** | Quick fixes and common solutions |
| **AI_GENERATION_FIX_GUIDE.md** | Detailed troubleshooting guide |
| **AI_FIX_SUMMARY.md** | Overview and implementation details |

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `diagnose-ai-endpoint.sh/.ps1` | Check what's wrong |
| `fix-bedrock-permissions.sh/.ps1` | Fix IAM permissions |
| `test-ai-generation-complete.sh` | Test everything |

## 🎯 Most Likely Issues

1. **Missing Bedrock Permissions** (80%) → Run `fix-bedrock-permissions`
2. **API Gateway Not Deployed** (15%) → Run `deploy-api-gateway.ts`
3. **Wrong Frontend Config** (5%) → Update `frontend/.env`

## 🔍 Quick Checks

### Is API Gateway deployed?
```bash
aws apigateway get-rest-api --rest-api-id 325xzv9pli --region us-east-1
```

### Is Lambda deployed?
```bash
aws lambda get-function --function-name gp-aiGenerate-dev --region us-east-1
```

### Does Lambda have Bedrock permissions?
```bash
aws iam list-role-policies --role-name gp-aiGenerate-role-dev
```

## 📞 Expected Behavior

### ✅ Working
- Click "AI Autofill" button
- See "Generating..." message
- Description field fills with AI-generated text

### ❌ Not Working
- Click "AI Autofill" button
- See error: "AI generation failed: Network Error"

## 🚀 Full Fix Workflow

```bash
# 1. Diagnose
bash diagnose-ai-endpoint.sh

# 2. Fix permissions (most common issue)
bash fix-bedrock-permissions.sh

# 3. If API Gateway missing, deploy it
cd infrastructure
npx ts-node deploy-api-gateway.ts
cd ..

# 4. Test
bash test-ai-generation-complete.sh

# 5. If still not working, check logs
aws logs tail /aws/lambda/gp-aiGenerate-dev --follow --region us-east-1
```

## 💡 Pro Tips

1. **Check browser DevTools** (F12 → Network tab) to see the actual error
2. **Lambda logs** show the real issue: `aws logs tail /aws/lambda/gp-aiGenerate-dev --follow`
3. **Test with curl** before testing in the app
4. **IAM changes** take 10-15 seconds to propagate

## 🆘 Still Stuck?

1. Read `AI_FIX_QUICK_REFERENCE.md` for common solutions
2. Read `AI_GENERATION_FIX_GUIDE.md` for detailed troubleshooting
3. Check Lambda logs for specific errors
4. Verify you're logged in to the app (need JWT token)

## 📋 Checklist

Before asking for help, verify:

- [ ] Ran diagnostic script
- [ ] Applied Bedrock permissions fix
- [ ] API Gateway exists (ID: 325xzv9pli)
- [ ] Lambda exists (gp-aiGenerate-dev)
- [ ] Frontend .env has correct API URL
- [ ] User is logged in to the app
- [ ] Checked Lambda logs
- [ ] Tested with curl

## 🎯 Success Looks Like

```json
{
  "generatedContent": "This organic cotton t-shirt combines comfort with sustainability. Made from 100% certified organic cotton, it features a soft, breathable fabric that's gentle on both skin and the environment. The manufacturing process emphasizes reduced water usage and chemical-free production, making it an excellent choice for eco-conscious consumers seeking quality apparel with a minimal environmental footprint.",
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

---

**Start with the diagnostic script, then follow its recommendations!**
