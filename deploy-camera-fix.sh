#!/bin/bash

# Camera Fix Deployment Script
# This script deploys the frontend with CloudFront + HTTPS to enable camera access

echo "=================================================="
echo "📷 Camera Access Fix - Deployment Script"
echo "=================================================="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Set environment variables
export AWS_REGION=${AWS_REGION:-us-east-1}
export ENVIRONMENT=${ENVIRONMENT:-dev}
export FRONTEND_BUCKET=${FRONTEND_BUCKET:-gp-frontend-dev}

echo "Configuration:"
echo "  Region: $AWS_REGION"
echo "  Environment: $ENVIRONMENT"
echo "  Bucket: $FRONTEND_BUCKET"
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend built"
echo ""

# Step 2: Deploy with CloudFront + HTTPS
echo "🚀 Step 2: Deploying with CloudFront + HTTPS..."
npx ts-node infrastructure/deploy-cloudfront-https.ts

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "  1. Wait 15-20 minutes for CloudFront distribution to deploy"
echo "  2. Check AWS Console > CloudFront > Distributions"
echo "  3. Access your HTTPS URL and test camera"
echo "  4. See CAMERA_FIX_GUIDE.md for testing instructions"
echo ""
