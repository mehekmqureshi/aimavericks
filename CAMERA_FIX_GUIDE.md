# 📷 Camera Access Fix - Complete Guide

## Problem Summary

**Issue:** Camera does not open when clicking "Start Camera Scan" button on the QR scanner page.

**Root Cause:** Browsers block camera access on non-HTTPS origins for security reasons. The current S3 static website endpoint uses HTTP only.

**Solution:** Deploy frontend behind CloudFront with HTTPS to enable secure camera access.

---

## ✅ What Was Fixed

### 1. QR Scanner Component Updated
- ✅ Integrated `@yudiel/react-qr-scanner` library (already installed)
- ✅ Added proper camera permission handling
- ✅ Implemented HTTPS detection and error messages
- ✅ Added comprehensive error handling for:
  - Permission denied
  - No camera found
  - Camera in use
  - HTTPS requirement
- ✅ Added camera permission state management
- ✅ Improved user feedback and error messages

### 2. CloudFront + HTTPS Deployment
- ✅ Created automated deployment script
- ✅ Origin Access Identity (OAI) for secure S3 access
- ✅ HTTPS enforcement (redirect-to-https)
- ✅ TLS 1.2+ for security
- ✅ HTTP/2 and HTTP/3 support
- ✅ Proper cache control for SPA routing
- ✅ Cache invalidation after deployment

### 3. Security & Performance
- ✅ S3 bucket policy updated for OAI access
- ✅ Proper content types and cache headers
- ✅ Compression enabled
- ✅ Custom error pages for SPA routing
- ✅ Edge locations for fast delivery

---

## 🚀 Deployment Instructions

### Prerequisites

1. **AWS Credentials Configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Key, and Region
   ```

2. **Frontend Built**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **S3 Bucket Exists**
   ```bash
   # Should already exist from previous deployment
   # Default: gp-frontend-dev
   ```

### Deploy with CloudFront + HTTPS

```bash
# Set environment variables (optional)
export AWS_REGION=us-east-1
export ENVIRONMENT=dev
export FRONTEND_BUCKET=gp-frontend-dev

# Run deployment script
npx ts-node infrastructure/deploy-cloudfront-https.ts
```

### What the Script Does

1. **Creates Origin Access Identity (OAI)**
   - Allows CloudFront to access private S3 bucket
   - Prevents direct S3 access

2. **Updates S3 Bucket Policy**
   - Grants OAI read access to bucket objects
   - Maintains security

3. **Creates CloudFront Distribution**
   - Enables HTTPS with TLS 1.2+
   - Configures cache behaviors
   - Sets up custom error pages for SPA
   - Enables compression

4. **Deploys Frontend Files**
   - Uploads all files from `frontend/dist`
   - Sets proper content types
   - Configures cache headers

5. **Invalidates Cache**
   - Clears CloudFront cache
   - Ensures latest files are served

---

## ⏱️ Deployment Timeline

| Step | Duration | Status Check |
|------|----------|--------------|
| Script execution | 2-3 minutes | Terminal output |
| CloudFront distribution | 15-20 minutes | AWS Console |
| Cache invalidation | 5-10 minutes | AWS Console |
| **Total** | **20-30 minutes** | |

### Check Deployment Status

```bash
# Get distribution status
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='Green Passport Frontend - dev (HTTPS for Camera Access)'].{Id:Id,Status:Status,Domain:DomainName}" \
  --output table

# Check if deployed (Status should be "Deployed")
```

---

## 🧪 Testing Camera Access

### 1. Wait for Deployment
- Check AWS Console > CloudFront > Distributions
- Wait until Status = "Deployed" (not "In Progress")

### 2. Access HTTPS URL
```
https://[your-cloudfront-domain].cloudfront.net
```

### 3. Test on Desktop
1. Open browser (Chrome, Firefox, Safari, Edge)
2. Navigate to: `https://[domain]/consumer`
3. Click "Start Camera Scan"
4. Allow camera permission when prompted
5. Camera should open and scan QR codes

### 4. Test on Mobile
1. Open mobile browser (Safari on iOS, Chrome on Android)
2. Navigate to: `https://[domain]/consumer`
3. Click "Start Camera Scan"
4. Allow camera permission when prompted
5. Camera should open with rear camera
6. Scan a product QR code

### 5. Test Manual Entry (Fallback)
1. If camera fails, use manual entry
2. Enter serial: `PROD001-0001`
3. Click "Verify"
4. Should navigate to product page

---

## 🔍 Troubleshooting

### Camera Still Not Working

#### 1. Check HTTPS
```javascript
// Open browser console on the page
console.log(window.location.protocol);
// Should output: "https:"
```

**Fix:** Ensure you're accessing via CloudFront domain, not S3 endpoint.

#### 2. Check Browser Permissions
- **Chrome:** Settings > Privacy and Security > Site Settings > Camera
- **Firefox:** Settings > Privacy & Security > Permissions > Camera
- **Safari:** Settings > Websites > Camera
- **Mobile:** Settings > Safari/Chrome > Camera

**Fix:** Ensure camera permission is set to "Ask" or "Allow" for the site.

#### 3. Check Camera Availability
```javascript
// Open browser console
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log('Cameras found:', cameras.length);
  });
```

**Fix:** Ensure device has a camera and it's not in use by another app.

#### 4. Check Browser Console for Errors
- Open Developer Tools (F12)
- Check Console tab for errors
- Look for permission or HTTPS errors

**Common Errors:**
- `NotAllowedError` → Permission denied
- `NotFoundError` → No camera found
- `NotReadableError` → Camera in use
- `SecurityError` → HTTPS required

#### 5. Test with Different Browsers
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

### Distribution Not Deploying

```bash
# Check distribution status
aws cloudfront get-distribution --id [DISTRIBUTION_ID]

# Check for errors in CloudWatch
aws logs tail /aws/cloudfront/[DISTRIBUTION_ID] --follow
```

### Files Not Updating

```bash
# Create cache invalidation
aws cloudfront create-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --paths "/*"
```

### S3 Access Denied

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket gp-frontend-dev

# Update bucket policy (script does this automatically)
npx ts-node infrastructure/deploy-cloudfront-https.ts
```

---

## 📱 Camera Permissions by Browser

### Desktop Browsers

| Browser | HTTPS Required | Permission Prompt | Notes |
|---------|----------------|-------------------|-------|
| Chrome | ✅ Yes | First access | Remembers choice |
| Firefox | ✅ Yes | First access | Remembers choice |
| Safari | ✅ Yes | First access | Remembers choice |
| Edge | ✅ Yes | First access | Remembers choice |

### Mobile Browsers

| Browser | HTTPS Required | Permission Prompt | Notes |
|---------|----------------|-------------------|-------|
| Safari (iOS) | ✅ Yes | First access | System permission + site permission |
| Chrome (Android) | ✅ Yes | First access | System permission + site permission |
| Firefox (Android) | ✅ Yes | First access | System permission + site permission |

### Permission Flow

1. **System Permission** (Mobile only)
   - User must grant camera access to browser app
   - Settings > Apps > Browser > Permissions > Camera

2. **Site Permission**
   - Browser prompts when site requests camera
   - User can Allow or Block
   - Choice is remembered per site

3. **HTTPS Requirement**
   - All modern browsers require HTTPS for camera
   - Exception: localhost (for development)

---

## 🎯 Expected Behavior After Fix

### ✅ On Desktop
1. Click "Start Camera Scan"
2. Browser prompts for camera permission
3. User clicks "Allow"
4. Camera feed appears in scanner view
5. Point camera at QR code
6. QR code is detected and scanned
7. Redirects to product page

### ✅ On Mobile
1. Click "Start Camera Scan"
2. Browser prompts for camera permission
3. User clicks "Allow"
4. Rear camera activates
5. Point camera at QR code
6. QR code is detected and scanned
7. Redirects to product page

### ✅ Error Handling
- Permission denied → Clear error message + manual entry option
- No camera → Clear error message + manual entry option
- Camera in use → Clear error message + manual entry option
- HTTPS required → Clear error message + manual entry option

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] CloudFront distribution status is "Deployed"
- [ ] Frontend accessible via HTTPS URL
- [ ] Browser shows padlock icon (secure connection)
- [ ] Camera button appears on /consumer page
- [ ] Clicking button prompts for permission
- [ ] Camera feed appears after allowing permission
- [ ] QR codes can be scanned successfully
- [ ] Manual entry works as fallback
- [ ] Error messages are clear and helpful
- [ ] Works on desktop browsers (Chrome, Firefox, Safari)
- [ ] Works on mobile browsers (iOS Safari, Android Chrome)
- [ ] Product page loads after successful scan

---

## 🔐 Security Considerations

### HTTPS Benefits
- ✅ Encrypted communication
- ✅ Camera access enabled
- ✅ Geolocation access enabled
- ✅ Service workers enabled
- ✅ Browser trust indicators
- ✅ SEO benefits

### S3 Security
- ✅ Bucket not publicly accessible
- ✅ Access only via CloudFront OAI
- ✅ Bucket policy restricts access
- ✅ Encryption at rest

### CloudFront Security
- ✅ TLS 1.2+ only
- ✅ HTTP/2 and HTTP/3 support
- ✅ DDoS protection via AWS Shield
- ✅ Geographic restrictions (if needed)

---

## 💰 Cost Estimate

### CloudFront Pricing (Low Traffic)
- **Data Transfer:** $0.085/GB (first 10 TB)
- **Requests:** $0.0075 per 10,000 HTTPS requests
- **Estimated Monthly:** $1-5 for low traffic

### S3 Pricing
- **Storage:** $0.023/GB
- **Requests:** Minimal (CloudFront caches)
- **Estimated Monthly:** $0.50-1

### Total Estimated Cost
- **Monthly:** $1.50-6 for low traffic
- **Free Tier:** First 12 months include free CloudFront usage

---

## 📚 Additional Resources

### AWS Documentation
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/s3/static-website/)
- [Origin Access Identity](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)

### Browser APIs
- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)
- [Camera Access on Web](https://web.dev/camera-access/)

### QR Scanner Library
- [@yudiel/react-qr-scanner](https://www.npmjs.com/package/@yudiel/react-qr-scanner)
- [GitHub Repository](https://github.com/yudielcurbelo/react-qr-scanner)

---

## 🎉 Success Criteria

The fix is successful when:

1. ✅ Frontend is accessible via HTTPS
2. ✅ Camera opens on desktop browsers
3. ✅ Camera opens on mobile browsers
4. ✅ QR codes can be scanned successfully
5. ✅ Error messages are clear and helpful
6. ✅ Manual entry works as fallback
7. ✅ Product verification flow is complete

---

## 📞 Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review browser console for errors
3. Verify AWS CloudFront distribution status
4. Test with different browsers/devices
5. Check camera permissions in browser settings

---

**Last Updated:** March 4, 2026  
**Status:** Ready for Deployment  
**Estimated Fix Time:** 30 minutes (including CloudFront deployment)
