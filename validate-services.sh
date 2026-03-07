#!/bin/bash

echo "AWS Services Validation and Repair"
echo "==================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please copy .env.example to .env and configure your AWS credentials"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "Running validation script..."
echo ""

cd infrastructure
npx tsx validate-and-repair-services.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validation completed successfully"
else
    echo ""
    echo "⚠️  Validation found issues - review output above"
fi

cd ..
