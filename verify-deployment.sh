#!/bin/bash

echo "🔍 Green Passport Platform - Deployment Verification"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS CLI
echo "📋 Checking AWS CLI..."
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✅ AWS CLI installed${NC}"
else
    echo -e "${RED}❌ AWS CLI not found${NC}"
    exit 1
fi

# Check DynamoDB Tables
echo ""
echo "📊 Checking DynamoDB Tables..."
TABLES=$(aws dynamodb list-tables --query "TableNames" --output text)
if echo "$TABLES" | grep -q "Products"; then
    echo -e "${GREEN}✅ Products table exists${NC}"
else
    echo -e "${RED}❌ Products table missing${NC}"
fi

if echo "$TABLES" | grep -q "Manufacturers"; then
    echo -e "${GREEN}✅ Manufacturers table exists${NC}"
else
    echo -e "${RED}❌ Manufacturers table missing${NC}"
fi

# Check Lambda Functions
echo ""
echo "⚡ Checking Lambda Functions..."
LAMBDA_COUNT=$(aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'gp-')].FunctionName" --output text | wc -w)
echo -e "${GREEN}✅ Found $LAMBDA_COUNT Lambda functions${NC}"

# Check API Gateway
echo ""
echo "🌐 Checking API Gateway..."
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='green-passport-api-dev'].id" --output text)
if [ -n "$API_ID" ]; then
    echo -e "${GREEN}✅ API Gateway exists: $API_ID${NC}"
    API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
    echo "   Endpoint: $API_ENDPOINT"
else
    echo -e "${RED}❌ API Gateway not found${NC}"
fi

# Check Cognito User Pool
echo ""
echo "🔐 Checking Cognito User Pool..."
USER_POOL=$(aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?contains(Name, 'green-passport')].Id" --output text)
if [ -n "$USER_POOL" ]; then
    echo -e "${GREEN}✅ Cognito User Pool exists: $USER_POOL${NC}"
else
    echo -e "${RED}❌ Cognito User Pool not found${NC}"
fi

# Check S3 Buckets
echo ""
echo "🪣 Checking S3 Buckets..."
BUCKET_COUNT=$(aws s3 ls | grep -c "gp-")
echo -e "${GREEN}✅ Found $BUCKET_COUNT S3 buckets${NC}"

# Check Frontend
echo ""
echo "🎨 Checking Frontend..."
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ Frontend .env configured${NC}"
    if grep -q "325xzv9pli" frontend/.env; then
        echo -e "${GREEN}✅ API Gateway URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  API Gateway URL may need update${NC}"
    fi
else
    echo -e "${RED}❌ Frontend .env missing${NC}"
fi

# Summary
echo ""
echo "======================================================"
echo "🎉 Deployment Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Access frontend: http://localhost:3001"
echo "2. Login with: manufacturer@greenpassport.com / Test123!"
echo "3. Test API: npx ts-node infrastructure/test-api.ts"
echo ""
