# 📷 Camera Fix - Quick Start

## Problem
Camera doesn't open on QR scanner page because browsers require HTTPS for camera access.

## Solution
Deploy frontend with CloudFront + HTTPS.

---

## 🚀 Quick Deploy (Windows)

```bash
# Run deployment script
deploy-camera-fix.bat
```

## 🚀 Quick Deploy (Linux/Mac)

```bash
# Make script executable
chmod +x deploy-camera-fix.sh

# Run deployment script
./deploy-camera-fix.sh
```

## 🚀 Manual Deploy

```bash
# 1. Build frontend
cd frontend
npm install
npm run build
cd ..

# 2. Deploy with CloudFront
npx ts-node infrastructure/deploy-cloudfront-https.ts
```

---

## ⏱️ Timeline

- Script execution: 2-3 minutes
- CloudFront deployment: 15-20 minutes
- **Total: ~20-25 minutes**

---

## ✅ What Was Fixed

1. **QRScanner Component**
   - ✅ Integrated @yudiel/react-qr-scanner library
   - ✅ Added camera permission handling
   - ✅ Added HTTPS detection
   - ✅ Improved error messages

2. **CloudFront + HTTPS**
   - ✅ HTTPS enforcement
   - ✅ Secure origin for camera access
   - ✅ TLS 1.2+ security
   - ✅ HTTP/2 and HTTP/3 support

---

## 🧪 Testing

### After Deployment

1. **Wait for CloudFront**
   - Check AWS Console > CloudFront
   - Wait for Status = "Deployed"

2. **Access HTTPS URL**
   ```
   https://[your-cloudfront-domain].cloudfront.net/consumer
   ```

3. **Test Camera**
   - Click "Start Camera Scan"
   - Allow camera permission
   - Camera should open
   - Scan QR code

4. **Test Manual Entry (Fallback)**
   - Enter: `PROD001-0001`
   - Click "Verify"
   - Should show product

---

## 🔍 Troubleshooting

### Camera Still Not Working?

1. **Check HTTPS**
   - URL should start with `https://`
   - Browser should show padlock icon

2. **Check Permissions**
   - Browser Settings > Camera
   - Should be "Allow" or "Ask"

3. **Check Browser Console**
   - Press F12
   - Look for errors in Console tab

4. **Try Different Browser**
   - Chrome, Firefox, Safari, Edge

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| NotAllowedError | Permission denied | Allow camera in browser settings |
| NotFoundError | No camera | Use manual entry or different device |
| NotReadableError | Camera in use | Close other apps using camera |
| SecurityError | Not HTTPS | Use CloudFront HTTPS URL |

---

## 📱 Browser Support

### Desktop
- ✅ Chrome (HTTPS required)
- ✅ Firefox (HTTPS required)
- ✅ Safari (HTTPS required)
- ✅ Edge (HTTPS required)

### Mobile
- ✅ Safari iOS (HTTPS required)
- ✅ Chrome Android (HTTPS required)
- ✅ Firefox Android (HTTPS required)

---

## 📊 Verification Checklist

- [ ] CloudFront distribution deployed
- [ ] Frontend accessible via HTTPS
- [ ] Camera button appears
- [ ] Camera opens on click
- [ ] QR codes scan successfully
- [ ] Manual entry works
- [ ] Works on desktop
- [ ] Works on mobile

---

## 📚 Full Documentation

See **CAMERA_FIX_GUIDE.md** for:
- Detailed troubleshooting
- Security considerations
- Cost estimates
- Browser compatibility
- Testing procedures

---

## 💡 Key Points

1. **HTTPS is Required**
   - Browsers block camera on HTTP
   - CloudFront provides HTTPS

2. **Permission Required**
   - User must allow camera access
   - Permission is remembered per site

3. **Fallback Available**
   - Manual entry always works
   - No camera needed

4. **Works Everywhere**
   - Desktop and mobile
   - All modern browsers

---

## 🎯 Success Criteria

✅ Camera opens on desktop  
✅ Camera opens on mobile  
✅ QR codes scan successfully  
✅ Error messages are clear  
✅ Manual entry works as fallback  

---

**Deployment Time:** 20-25 minutes  
**Status:** Ready to Deploy  
**Next:** Run deploy-camera-fix.bat (Windows) or deploy-camera-fix.sh (Linux/Mac)
