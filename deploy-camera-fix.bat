@echo off
REM Camera Fix Deployment Script for Windows
REM This script deploys the frontend with CloudFront + HTTPS to enable camera access

echo ==================================================
echo 📷 Camera Access Fix - Deployment Script
echo ==================================================
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS CLI not configured. Please run: aws configure
    exit /b 1
)

echo ✅ AWS CLI configured
echo.

REM Set environment variables
if not defined AWS_REGION set AWS_REGION=us-east-1
if not defined ENVIRONMENT set ENVIRONMENT=dev
if not defined FRONTEND_BUCKET set FRONTEND_BUCKET=gp-frontend-dev

echo Configuration:
echo   Region: %AWS_REGION%
echo   Environment: %ENVIRONMENT%
echo   Bucket: %FRONTEND_BUCKET%
echo.

REM Step 1: Build frontend
echo 📦 Step 1: Building frontend...
cd frontend
call npm install
call npm run build
cd ..
echo ✅ Frontend built
echo.

REM Step 2: Deploy with CloudFront + HTTPS
echo 🚀 Step 2: Deploying with CloudFront + HTTPS...
npx ts-node infrastructure/deploy-cloudfront-https.ts

echo.
echo ==================================================
echo ✅ Deployment Complete!
echo ==================================================
echo.
echo 📋 Next Steps:
echo   1. Wait 15-20 minutes for CloudFront distribution to deploy
echo   2. Check AWS Console ^> CloudFront ^> Distributions
echo   3. Access your HTTPS URL and test camera
echo   4. See CAMERA_FIX_GUIDE.md for testing instructions
echo.
