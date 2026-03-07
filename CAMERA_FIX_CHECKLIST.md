# 📋 Camera Fix - Deployment Checklist

Use this checklist to ensure successful deployment and testing.

---

## Pre-Deployment

### Prerequisites
- [ ] AWS CLI installed and configured
  ```bash
  aws --version
  aws sts get-caller-identity
  ```
- [ ] Node.js and npm installed
  ```bash
  node --version
  npm --version
  ```
- [ ] S3 bucket exists (`gp-frontend-dev`)
  ```bash
  aws s3 ls | grep gp-frontend
  ```
- [ ] Frontend dependencies installed
  ```bash
  cd frontend && npm install
  ```

### Code Review
- [ ] QRScanner.tsx updated with camera integration
- [ ] @yudiel/react-qr-scanner library installed (v2.5.1)
- [ ] No TypeScript errors in QRScanner component
- [ ] deploy-cloudfront-https.ts script exists

---

## Deployment

### Build Frontend
- [ ] Navigate to frontend directory
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Verify `dist` folder created
- [ ] Check dist folder contains index.html and assets

### Deploy to CloudFront
- [ ] Run deployment script
  - Windows: `deploy-camera-fix.bat`
  - Linux/Mac: `./deploy-camera-fix.sh`
- [ ] Script completes without errors
- [ ] OAI created successfully
- [ ] S3 bucket policy updated
- [ ] CloudFront distribution created
- [ ] Files uploaded to S3
- [ ] Cache invalidation initiated
- [ ] Note CloudFront domain from output

### Verify AWS Resources
- [ ] Check CloudFront distribution in AWS Console
  - Console > CloudFront > Distributions
  - Status should be "In Progress" initially
- [ ] Check S3 bucket has files
  ```bash
  aws s3 ls s3://gp-frontend-dev/
  ```
- [ ] Check bucket policy includes OAI
  ```bash
  aws s3api get-bucket-policy --bucket gp-frontend-dev
  ```

---

## Wait for Deployment

### CloudFront Distribution
- [ ] Wait 15-20 minutes for distribution to deploy
- [ ] Check status in AWS Console
- [ ] Status changes from "In Progress" to "Deployed"
- [ ] Note the CloudFront domain name

### Cache Invalidation
- [ ] Wait 5-10 minutes for cache invalidation
- [ ] Check invalidation status in AWS Console
  - CloudFront > Distributions > [Your Distribution] > Invalidations
- [ ] Status changes to "Completed"

---

## Testing - Desktop

### Chrome
- [ ] Open Chrome browser
- [ ] Navigate to `https://[cloudfront-domain].cloudfront.net/consumer`
- [ ] Verify HTTPS (padlock icon in address bar)
- [ ] Click "Start Camera Scan"
- [ ] Allow camera permission when prompted
- [ ] Verify camera feed appears
- [ ] Point camera at QR code (or test pattern)
- [ ] Verify QR code scans successfully
- [ ] Verify redirect to product page

### Firefox
- [ ] Open Firefox browser
- [ ] Navigate to consumer page
- [ ] Verify HTTPS
- [ ] Test camera scan
- [ ] Verify QR code detection
- [ ] Verify redirect

### Safari (macOS)
- [ ] Open Safari browser
- [ ] Navigate to consumer page
- [ ] Verify HTTPS
- [ ] Test camera scan
- [ ] Verify QR code detection
- [ ] Verify redirect

### Edge
- [ ] Open Edge browser
- [ ] Navigate to consumer page
- [ ] Verify HTTPS
- [ ] Test camera scan
- [ ] Verify QR code detection
- [ ] Verify redirect

---

## Testing - Mobile

### Safari (iOS)
- [ ] Open Safari on iPhone/iPad
- [ ] Navigate to consumer page
- [ ] Verify HTTPS
- [ ] Click "Start Camera Scan"
- [ ] Allow camera permission (system + browser)
- [ ] Verify rear camera activates
- [ ] Point at QR code
- [ ] Verify scan and redirect

### Chrome (Android)
- [ ] Open Chrome on Android device
- [ ] Navigate to consumer page
- [ ] Verify HTTPS
- [ ] Click "Start Camera Scan"
- [ ] Allow camera permission (system + browser)
- [ ] Verify rear camera activates
- [ ] Point at QR code
- [ ] Verify scan and redirect

---

## Testing - Error Scenarios

### Permission Denied
- [ ] Click "Start Camera Scan"
- [ ] Deny camera permission
- [ ] Verify clear error message appears
- [ ] Verify manual entry option is available
- [ ] Test manual entry with `PROD001-0001`
- [ ] Verify redirect to product page

### No Camera
- [ ] Test on device without camera (if available)
- [ ] Verify appropriate error message
- [ ] Verify manual entry works

### Camera in Use
- [ ] Open another app using camera
- [ ] Try to start camera scan
- [ ] Verify error message about camera in use
- [ ] Close other app
- [ ] Retry camera scan
- [ ] Verify camera works

### HTTP Access (Should Not Happen)
- [ ] Try accessing via HTTP (if possible)
- [ ] Verify HTTPS warning appears
- [ ] Verify manual entry still works

---

## Testing - Manual Entry Fallback

### Valid Serial
- [ ] Enter `PROD001-0001` in manual entry field
- [ ] Click "Verify"
- [ ] Verify redirect to product page
- [ ] Verify product details display

### Invalid Serial
- [ ] Enter `INVALID-123` in manual entry field
- [ ] Click "Verify"
- [ ] Verify error message appears
- [ ] Verify format hint is shown

### Empty Input
- [ ] Leave manual entry field empty
- [ ] Click "Verify"
- [ ] Verify validation error appears

---

## Testing - Product Verification Flow

### Complete Flow
- [ ] Scan QR code (or enter serial manually)
- [ ] Verify redirect to `/product/[serialId]`
- [ ] Verify product information displays
- [ ] Verify carbon footprint shows
- [ ] Verify material composition shows
- [ ] Verify manufacturer details show
- [ ] Verify verification badge shows

---

## Performance Testing

### Load Time
- [ ] Measure page load time (should be < 3s)
- [ ] Check Network tab in DevTools
- [ ] Verify assets are compressed
- [ ] Verify assets are cached (second load)

### Camera Startup
- [ ] Measure time from click to camera feed (should be < 2s)
- [ ] Verify no lag or freezing

### QR Scan Speed
- [ ] Measure time from QR code in view to detection (should be < 1s)
- [ ] Test with multiple QR codes

---

## Security Testing

### HTTPS
- [ ] Verify all pages use HTTPS
- [ ] Verify no mixed content warnings
- [ ] Verify TLS certificate is valid
- [ ] Check certificate details (should be CloudFront)

### S3 Access
- [ ] Try accessing S3 bucket directly
  ```
  http://gp-frontend-dev.s3-website-us-east-1.amazonaws.com
  ```
- [ ] Should be blocked or show error (bucket should be private)

### Camera Permissions
- [ ] Verify permission prompt appears
- [ ] Verify permission is remembered
- [ ] Verify can revoke permission in browser settings

---

## Documentation

### Update Deployment Docs
- [ ] Add CloudFront URL to DEPLOYMENT_STATUS.md
- [ ] Update frontend URL in all documentation
- [ ] Document camera testing procedure
- [ ] Add troubleshooting section for camera issues

### User Documentation
- [ ] Create user guide for QR scanning
- [ ] Document camera permission requirements
- [ ] Document manual entry as fallback
- [ ] Add screenshots of camera interface

---

## Monitoring

### CloudWatch
- [ ] Check CloudFront metrics
  - Requests
  - Bytes downloaded
  - Error rate
- [ ] Set up alarms for high error rates (optional)

### Browser Console
- [ ] Check for JavaScript errors
- [ ] Check for camera-related warnings
- [ ] Verify no CORS errors

### User Feedback
- [ ] Monitor user reports
- [ ] Track camera usage vs manual entry
- [ ] Collect feedback on camera experience

---

## Post-Deployment

### Cleanup
- [ ] Remove old S3 static website configuration (if any)
- [ ] Update environment variables with CloudFront URL
- [ ] Update API Gateway CORS if needed

### Communication
- [ ] Notify team of new HTTPS URL
- [ ] Share testing results
- [ ] Document any issues encountered
- [ ] Share camera usage instructions with users

### Backup
- [ ] Save CloudFront distribution ID
- [ ] Save OAI ID
- [ ] Document rollback procedure
- [ ] Keep old S3 endpoint as fallback (optional)

---

## Rollback (If Needed)

### Issues Detected
- [ ] Document specific issues
- [ ] Check error logs
- [ ] Determine if rollback needed

### Rollback Steps
- [ ] Disable CloudFront distribution
  ```bash
  aws cloudfront update-distribution --id [ID] --distribution-config '{"Enabled":false}'
  ```
- [ ] Revert QRScanner.tsx changes (if needed)
- [ ] Use S3 HTTP endpoint temporarily
- [ ] Investigate and fix issues
- [ ] Re-deploy when ready

---

## Success Criteria

### All Must Pass
- [ ] Frontend accessible via HTTPS
- [ ] Camera opens on desktop (Chrome, Firefox, Safari, Edge)
- [ ] Camera opens on mobile (iOS Safari, Android Chrome)
- [ ] QR codes scan successfully
- [ ] Product verification flow works end-to-end
- [ ] Error messages are clear and helpful
- [ ] Manual entry works as fallback
- [ ] No console errors
- [ ] Performance is acceptable (< 3s load, < 2s camera start)
- [ ] Security requirements met (HTTPS, private S3)

---

## Sign-Off

### Deployment Team
- [ ] Developer: _________________ Date: _______
- [ ] QA Tester: _________________ Date: _______
- [ ] DevOps: ____________________ Date: _______

### Testing Results
- [ ] Desktop testing: PASS / FAIL
- [ ] Mobile testing: PASS / FAIL
- [ ] Error handling: PASS / FAIL
- [ ] Performance: PASS / FAIL
- [ ] Security: PASS / FAIL

### Approval
- [ ] Ready for production: YES / NO
- [ ] Issues to address: _________________________
- [ ] Follow-up actions: _________________________

---

**Checklist Version:** 1.0  
**Last Updated:** March 4, 2026  
**Status:** Ready for Use
