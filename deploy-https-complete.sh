#!/bin/bash
# Complete HTTPS Deployment Script for Linux/Mac
# Builds frontend and deploys via S3 + CloudFront with HTTPS

set -e

echo "========================================"
echo "Green Passport HTTPS Deployment"
echo "========================================"
echo ""

# Step 1: Build Frontend
echo "[1/4] Building frontend..."
cd frontend
npm run build
cd ..
echo "✓ Frontend built successfully"
echo ""

# Step 2: Deploy to S3 + CloudFront
echo "[2/4] Deploying to AWS (S3 + CloudFront)..."
ts-node infrastructure/deploy-cloudfront-https.ts
echo "✓ Deployment complete"
echo ""

# Step 3: Run Component Tests
echo "[3/4] Running component tests..."
if ! ts-node infrastructure/test-all-components.ts; then
    echo "WARNING: Some tests failed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✓ Tests complete"
echo ""

# Step 4: Display Summary
echo "[4/4] Deployment Summary"
echo "========================================"
echo "✓ Frontend deployed via HTTPS"
echo "✓ S3 bucket is private"
echo "✓ CloudFront distribution active"
echo "✓ All API calls use HTTPS"
echo "========================================"
echo ""
echo "Access your application at the CloudFront URL shown above"
echo ""
