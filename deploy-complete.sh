#!/bin/bash

echo "========================================"
echo "Complete Deployment Process"
echo "========================================"
echo ""

echo "Step 1: Building Frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
cd ..
echo "Frontend build complete!"
echo ""

echo "Step 2: Running Complete Deployment..."
npx ts-node infrastructure/complete-deployment.ts
if [ $? -ne 0 ]; then
    echo "Deployment failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
