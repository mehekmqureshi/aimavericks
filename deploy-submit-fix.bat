@echo off
REM Deploy Submit Button Fix
REM This script builds and deploys the frontend with the submit button fixes

echo 🚀 Deploying Submit Button Fix...
echo.

REM Step 1: Build Frontend
echo 📦 Step 1: Building frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend build failed
    exit /b 1
)
cd ..
echo ✅ Frontend built successfully
echo.

REM Step 2: Deploy to S3
set FRONTEND_BUCKET=gp-frontend-aimavericks-2026
echo 📤 Step 2: Deploying to S3 bucket: %FRONTEND_BUCKET%

REM Upload to S3
aws s3 sync frontend/dist/ s3://%FRONTEND_BUCKET% --delete --cache-control "max-age=31536000,public" --exclude "index.html"
aws s3 cp frontend/dist/index.html s3://%FRONTEND_BUCKET%/index.html --cache-control "max-age=0,no-cache,no-store,must-revalidate"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ S3 upload failed
    exit /b 1
)
echo ✅ Files uploaded to S3
echo.

REM Step 3: Invalidate CloudFront cache
echo 🔄 Step 3: Invalidating CloudFront cache...

REM Get CloudFront distribution ID
for /f "tokens=*" %%i in ('aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='%FRONTEND_BUCKET%.s3.amazonaws.com']].Id" --output text') do set DISTRIBUTION_ID=%%i

if "%DISTRIBUTION_ID%"=="" (
    echo ⚠️  Warning: Could not find CloudFront distribution for bucket %FRONTEND_BUCKET%
    echo    You may need to manually invalidate the cache
) else (
    echo    Distribution ID: %DISTRIBUTION_ID%
    aws cloudfront create-invalidation --distribution-id %DISTRIBUTION_ID% --paths "/*"
    echo ✅ CloudFront cache invalidated
)

echo.
echo ✅ Deployment complete!
echo.
echo 📋 Next steps:
echo    1. Wait 2-3 minutes for CloudFront to propagate changes
echo    2. Hard refresh your browser (Ctrl+Shift+R)
echo    3. Test the submit button on the Create DPP page
echo    4. Check browser console for any errors
echo.
echo 🔗 Application URL: https://d3j1t5ho20lhp.cloudfront.net
echo.

pause
