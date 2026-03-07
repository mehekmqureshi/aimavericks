# HTTPS Deployment - Quick Reference

## 🚀 One-Command Deployment

```bash
npm run deploy:test
```

This command will:
1. Build frontend
2. Deploy to S3 + CloudFront (HTTPS)
3. Run all component tests
4. Report results

## 📋 Individual Commands

### Deploy Only
```bash
npm run deploy:https
```

### Build + Deploy
```bash
npm run deploy:complete
```

### Test Components
```bash
npm run test:components
```

## ✅ What's Configured

### Frontend
- ✅ S3 bucket: **Private** (no public access)
- ✅ CloudFront: **HTTPS only** (redirect HTTP → HTTPS)
- ✅ Origin Access Identity: CloudFront-only access
- ✅ Cache: Optimized for performance
- ✅ Compression: Gzip + Brotli enabled

### Backend
- ✅ API Gateway: **HTTPS endpoints only**
- ✅ CORS: Configured for CloudFront domain
- ✅ Lambda: Environment variables set
- ✅ DynamoDB: Tables provisioned

### Security
- ✅ No HTTP endpoints exposed
- ✅ S3 website hosting disabled
- ✅ Private bucket with OAI access only
- ✅ TLS 1.2+ enforced

## 🧪 Automated Tests

All tests run automatically after deployment:

| Test | What It Checks |
|------|----------------|
| Frontend HTTPS | CloudFront serves via HTTPS |
| API Gateway HTTPS | All API calls use HTTPS |
| Create Product | Product creation works |
| Save Draft | Draft saving works |
| Generate QR | QR code generation works |
| AI Autofill | AI-powered autofill works |
| QR Scan | QR verification works |
| Sustainability Badge | Badge calculation works |
| DynamoDB Records | Database operations work |

## 📊 Expected Results

```
🧪 Testing: Frontend HTTPS Access...
  ✅ PASSED (234ms)

🧪 Testing: API Gateway HTTPS...
  ✅ PASSED (12ms)

🧪 Testing: Create Product...
  ✅ PASSED (456ms)

🧪 Testing: Save Draft...
  ✅ PASSED (389ms)

🧪 Testing: Generate QR Code...
  ✅ PASSED (567ms)

🧪 Testing: AI Autofill...
  ✅ PASSED (2341ms)

🧪 Testing: QR Scan Verification...
  ✅ PASSED (234ms)

🧪 Testing: Sustainability Badge Calculation...
  ✅ PASSED (345ms)

🧪 Testing: DynamoDB Record Creation...
  ✅ PASSED (456ms)

Total: 9 | Passed: 9 | Failed: 0
Success Rate: 100.0%
```

## 🔧 Troubleshooting

### Tests fail with "Authentication required"
**This is expected** for protected endpoints. The test verifies the endpoint exists and responds correctly.

### CloudFront returns 403
Run deployment again to fix OAI configuration:
```bash
npm run deploy:https
```

### API calls fail
Check API Gateway URL in `frontend/.env`:
```bash
cat frontend/.env | grep VITE_API_GATEWAY_URL
```

## 📱 Access Your Application

After deployment, you'll see:
```
✅ DEPLOYMENT COMPLETE

📱 Frontend URL (HTTPS):
   https://d1234567890abc.cloudfront.net

🔒 Security:
   ✓ S3 bucket is private (no public access)
   ✓ CloudFront serves via HTTPS only
   ✓ API Gateway uses HTTPS
   ✓ No HTTP endpoints exposed
```

## ⏱️ Deployment Time

- **First deployment**: 15-20 minutes (CloudFront creation)
- **Subsequent deployments**: 5-10 minutes (cache invalidation)

## 🎯 Manual Testing

After automated tests pass, manually verify:

1. Open CloudFront URL in browser
2. Login with test credentials
3. Create a product
4. Generate QR code
5. Test camera on mobile (QR scan)
6. Verify sustainability badge

## 📞 Support

If you encounter issues:

1. Check `HTTPS_DEPLOYMENT_GUIDE.md` for detailed troubleshooting
2. Review AWS CloudWatch logs
3. Verify environment variables in `frontend/.env`
4. Check AWS Console for service status

## 🔄 Rollback

If needed, redeploy previous version:
```bash
git checkout <previous-commit>
npm run deploy:complete
```

## 📈 Next Steps

1. **Custom Domain** (optional)
   - Request ACM certificate
   - Configure Route 53
   - Update CloudFront

2. **Monitoring** (recommended)
   ```bash
   npm run setup:monitoring
   ```

3. **CI/CD** (optional)
   - Set up GitHub Actions
   - Automate on every push

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All automated tests pass
- ✅ CloudFront URL accessible via HTTPS
- ✅ API calls work correctly
- ✅ Camera access works on mobile
- ✅ QR scanning functional
- ✅ Products can be created and viewed

---

**Ready to deploy?** Run: `npm run deploy:test`
