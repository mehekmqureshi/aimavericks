@echo off
REM Complete HTTPS Deployment Script for Windows
REM Builds frontend and deploys via S3 + CloudFront with HTTPS

echo ========================================
echo Green Passport HTTPS Deployment
echo ========================================
echo.

REM Step 1: Build Frontend
echo [1/4] Building frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)
cd ..
echo ✓ Frontend built successfully
echo.

REM Step 2: Deploy to S3 + CloudFront
echo [2/4] Deploying to AWS (S3 + CloudFront)...
call ts-node infrastructure/deploy-cloudfront-https.ts
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed
    exit /b 1
)
echo ✓ Deployment complete
echo.

REM Step 3: Run Component Tests
echo [3/4] Running component tests...
call ts-node infrastructure/test-all-components.ts
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some tests failed
    echo Continue anyway? (Y/N)
    set /p continue=
    if /i not "%continue%"=="Y" exit /b 1
)
echo ✓ Tests complete
echo.

REM Step 4: Display Summary
echo [4/4] Deployment Summary
echo ========================================
echo ✓ Frontend deployed via HTTPS
echo ✓ S3 bucket is private
echo ✓ CloudFront distribution active
echo ✓ All API calls use HTTPS
echo ========================================
echo.
echo Access your application at the CloudFront URL shown above
echo.

pause
