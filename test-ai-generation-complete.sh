#!/bin/bash
# Complete AI Generation Test Script

set -e

API_ID="325xzv9pli"
REGION="us-east-1"
LAMBDA_NAME="gp-aiGenerate-dev"

echo "🧪 Complete AI Generation Test"
echo "==============================="
echo ""

# Get JWT token from user
echo "To test with authentication, you need a valid JWT token."
echo "You can get this from:"
echo "1. Login to the app in browser"
echo "2. Open DevTools → Application → Local Storage"
echo "3. Copy the value of 'gp_access_token'"
echo ""
read -p "Enter JWT token (or press Enter to skip auth test): " JWT_TOKEN
echo ""

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

# Test 1: CORS Preflight
echo "Test 1: CORS Preflight (OPTIONS)"
echo "================================="
CORS_RESULT=$(curl -s -X OPTIONS "$API_URL/ai/generate" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Authorization,Content-Type" \
    -w "\nHTTP_CODE:%{http_code}" \
    -v 2>&1)

echo "$CORS_RESULT"
echo ""

if echo "$CORS_RESULT" | grep -q "HTTP_CODE:200"; then
    echo "✅ CORS preflight passed"
else
    echo "❌ CORS preflight failed"
fi
echo ""
echo "---"
echo ""

# Test 2: Endpoint without auth
echo "Test 2: POST without authentication"
echo "===================================="
NO_AUTH_RESULT=$(curl -s -X POST "$API_URL/ai/generate" \
    -H "Content-Type: application/json" \
    -d '{"productName":"Organic Cotton T-Shirt","category":"Apparel"}' \
    -w "\nHTTP_CODE:%{http_code}")

echo "$NO_AUTH_RESULT"
echo ""

if echo "$NO_AUTH_RESULT" | grep -q "HTTP_CODE:401"; then
    echo "✅ Correctly requires authentication (401)"
elif echo "$NO_AUTH_RESULT" | grep -q "HTTP_CODE:403"; then
    echo "✅ Correctly requires authentication (403)"
else
    echo "⚠️  Unexpected response (should be 401 or 403)"
fi
echo ""
echo "---"
echo ""

# Test 3: With authentication (if token provided)
if [ -n "$JWT_TOKEN" ]; then
    echo "Test 3: POST with authentication"
    echo "================================="
    
    AUTH_RESULT=$(curl -s -X POST "$API_URL/ai/generate" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"productName":"Organic Cotton T-Shirt","category":"Apparel"}' \
        -w "\nHTTP_CODE:%{http_code}")
    
    echo "$AUTH_RESULT"
    echo ""
    
    if echo "$AUTH_RESULT" | grep -q "HTTP_CODE:200"; then
        echo "✅ Request successful!"
        
        # Extract and display generated content
        CONTENT=$(echo "$AUTH_RESULT" | grep -v "HTTP_CODE" | jq -r '.generatedContent' 2>/dev/null || echo "")
        if [ -n "$CONTENT" ]; then
            echo ""
            echo "Generated Content:"
            echo "=================="
            echo "$CONTENT"
        fi
    elif echo "$AUTH_RESULT" | grep -q "HTTP_CODE:401"; then
        echo "❌ Authentication failed (token may be expired)"
    elif echo "$AUTH_RESULT" | grep -q "HTTP_CODE:500"; then
        echo "❌ Server error (check Lambda logs)"
        echo ""
        echo "Check logs with:"
        echo "aws logs tail /aws/lambda/$LAMBDA_NAME --follow --region $REGION"
    else
        echo "⚠️  Unexpected response"
    fi
    echo ""
    echo "---"
    echo ""
else
    echo "Test 3: Skipped (no JWT token provided)"
    echo ""
    echo "---"
    echo ""
fi

# Test 4: Lambda direct invocation
echo "Test 4: Direct Lambda invocation"
echo "================================="
echo "Testing Lambda function directly..."
echo ""

# Create test payload
cat > /tmp/lambda-test-payload.json << 'EOF'
{
  "body": "{\"productName\":\"Organic Cotton T-Shirt\",\"category\":\"Apparel\"}",
  "requestContext": {
    "requestId": "test-request-123",
    "authorizer": {
      "claims": {
        "sub": "test-manufacturer-id"
      }
    }
  }
}
EOF

LAMBDA_RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --payload file:///tmp/lambda-test-payload.json \
    /tmp/lambda-response.json 2>&1)

echo "Invocation result:"
echo "$LAMBDA_RESULT"
echo ""

if [ -f /tmp/lambda-response.json ]; then
    echo "Lambda response:"
    cat /tmp/lambda-response.json | jq '.' 2>/dev/null || cat /tmp/lambda-response.json
    echo ""
    
    STATUS_CODE=$(cat /tmp/lambda-response.json | jq -r '.statusCode' 2>/dev/null || echo "")
    
    if [ "$STATUS_CODE" = "200" ]; then
        echo "✅ Lambda executed successfully"
    else
        echo "❌ Lambda returned error (status: $STATUS_CODE)"
        
        ERROR_MSG=$(cat /tmp/lambda-response.json | jq -r '.body' 2>/dev/null | jq -r '.error.message' 2>/dev/null || echo "")
        if [ -n "$ERROR_MSG" ]; then
            echo "Error: $ERROR_MSG"
        fi
    fi
fi
echo ""
echo "---"
echo ""

# Summary
echo "==============================="
echo "📊 Test Summary"
echo "==============================="
echo ""
echo "API Endpoint: $API_URL/ai/generate"
echo "Lambda Function: $LAMBDA_NAME"
echo ""
echo "Common Issues & Solutions:"
echo ""
echo "1. CORS fails → Run: npx ts-node infrastructure/deploy-api-gateway.ts"
echo "2. 401/403 without auth → ✅ Expected behavior"
echo "3. 401 with valid token → Token expired, login again"
echo "4. 500 error → Check Lambda logs and Bedrock permissions"
echo "5. AccessDeniedException → Run: ./fix-bedrock-permissions.sh"
echo ""
echo "View Lambda logs:"
echo "aws logs tail /aws/lambda/$LAMBDA_NAME --follow --region $REGION"
echo ""
echo "For detailed troubleshooting: AI_GENERATION_FIX_GUIDE.md"

# Cleanup
rm -f /tmp/lambda-test-payload.json /tmp/lambda-response.json
