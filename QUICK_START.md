# 🚀 Quick Start Guide

## Deploy in 3 Commands

```bash
# 1. Build frontend
npm run build:frontend

# 2. Deploy to AWS
npm run deploy:https

# 3. Verify deployment
npm run verify:deployment
```

## Or Use One Command

```bash
npm run deploy:verify
```

## Access Your Application

**Frontend (HTTPS):**
```
https://df4wx0ozke5s3.cloudfront.net
```

**Login:**
```
Email: manufacturer@greenpassport.com
Password: Test123!
```

## What's Deployed

✅ Frontend via S3 (private) → CloudFront → HTTPS  
✅ API Gateway with HTTPS endpoints  
✅ All HTTP endpoints disabled  
✅ Automated testing and verification  

## Need Help?

- **Full Guide**: See `HTTPS_DEPLOYMENT_GUIDE.md`
- **Troubleshooting**: See `DEPLOYMENT_SUCCESS_SUMMARY.md`
- **Verification**: Run `npm run verify:deployment`

## Quick Commands

```bash
# Deploy
npm run deploy:complete

# Verify
npm run verify:deployment

# Redeploy after changes
npm run deploy:verify
```

That's it! Your application is live and secure. 🎉
