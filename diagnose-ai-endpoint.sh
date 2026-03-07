#!/bin/bash
# AI Generation Endpoint Diagnostic Script

set -e

API_ID="325xzv9pli"
REGION="us-east-1"
LAMBDA_NAME="gp-aiGenerate-dev"
ROLE_NAME="gp-aiGenerate-role-dev"

echo "🔍 AI Generation Endpoint Diagnostics"
echo "======================================"
echo ""

# Check 1: API Gateway exists
echo "1️⃣  Checking API Gateway..."
if aws apigateway get-rest-api --rest-api-id "$API_ID" --region "$REGION" &>/dev/null; then
    echo "   ✅ API Gateway exists: $API_ID"
    API_NAME=$(aws apigateway get-rest-api --rest-api-id "$API_ID" --region "$REGION" --query 'name' --output text)
    echo "   📝 Name: $API_NAME"
else
    echo "   ❌ API Gateway NOT FOUND: $API_ID"
    echo "   🔧 Run: npx ts-node infrastructure/deploy-api-gateway.ts"
    exit 1
fi
echo ""

# Check 2: /ai/generate route exists
echo "2️⃣  Checking /ai/generate route..."
RESOURCES=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --output json)
AI_RESOURCE=$(echo "$RESOURCES" | jq -r '.items[] | select(.path=="/ai/generate") | .id')

if [ -n "$AI_RESOURCE" ]; then
    echo "   ✅ Route exists: /ai/generate"
    echo "   📝 Resource ID: $AI_RESOURCE"
    
    # Check methods
    METHODS=$(echo "$RESOURCES" | jq -r '.items[] | select(.path=="/ai/generate") | .resourceMethods | keys[]' 2>/dev/null || echo "")
    echo "   📝 Methods: $METHODS"
else
    echo "   ❌ Route NOT FOUND: /ai/generate"
    echo "   🔧 Run: npx ts-node infrastructure/deploy-api-gateway.ts"
    exit 1
fi
echo ""

# Check 3: Lambda function exists
echo "3️⃣  Checking Lambda function..."
if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" &>/dev/null; then
    echo "   ✅ Lambda exists: $LAMBDA_NAME"
    LAMBDA_RUNTIME=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" --query 'Configuration.Runtime' --output text)
    LAMBDA_TIMEOUT=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" --query 'Configuration.Timeout' --output text)
    LAMBDA_MEMORY=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" --query 'Configuration.MemorySize' --output text)
    echo "   📝 Runtime: $LAMBDA_RUNTIME"
    echo "   📝 Timeout: ${LAMBDA_TIMEOUT}s"
    echo "   📝 Memory: ${LAMBDA_MEMORY}MB"
else
    echo "   ❌ Lambda NOT FOUND: $LAMBDA_NAME"
    echo "   🔧 Deploy Lambda first"
    exit 1
fi
echo ""

# Check 4: Lambda IAM role and Bedrock permissions
echo "4️⃣  Checking Lambda IAM permissions..."
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "   ✅ IAM Role exists: $ROLE_NAME"
    
    # Check for Bedrock permissions
    POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --output json)
    ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --output json)
    
    echo "   📝 Inline policies: $(echo "$POLICIES" | jq -r '.PolicyNames | length')"
    echo "   📝 Attached policies: $(echo "$ATTACHED_POLICIES" | jq -r '.AttachedPolicies | length')"
    
    # Check for Bedrock in policies
    HAS_BEDROCK=false
    for policy in $(echo "$POLICIES" | jq -r '.PolicyNames[]'); do
        POLICY_DOC=$(aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$policy" --output json)
        if echo "$POLICY_DOC" | grep -q "bedrock"; then
            HAS_BEDROCK=true
            echo "   ✅ Bedrock permissions found in: $policy"
        fi
    done
    
    if [ "$HAS_BEDROCK" = false ]; then
        echo "   ⚠️  No Bedrock permissions found"
        echo "   🔧 Add bedrock:InvokeModel permission to role"
    fi
else
    echo "   ❌ IAM Role NOT FOUND: $ROLE_NAME"
    echo "   🔧 Create IAM role with Bedrock permissions"
fi
echo ""

# Check 5: Test CORS preflight
echo "5️⃣  Testing CORS preflight..."
CORS_RESPONSE=$(curl -s -X OPTIONS \
    "https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/ai/generate" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Authorization,Content-Type" \
    -w "\n%{http_code}" \
    -o /dev/null)

if [ "$CORS_RESPONSE" = "200" ]; then
    echo "   ✅ CORS preflight successful"
else
    echo "   ❌ CORS preflight failed (HTTP $CORS_RESPONSE)"
    echo "   🔧 Configure CORS on API Gateway"
fi
echo ""

# Check 6: Test endpoint (without auth)
echo "6️⃣  Testing endpoint availability..."
ENDPOINT_RESPONSE=$(curl -s -X POST \
    "https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/ai/generate" \
    -H "Content-Type: application/json" \
    -d '{"productName":"Test","category":"Apparel"}' \
    -w "\n%{http_code}" \
    -o /tmp/ai-response.json)

HTTP_CODE=$(echo "$ENDPOINT_RESPONSE" | tail -n1)
echo "   📝 HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Endpoint reachable (401 = auth required, as expected)"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "   ⚠️  Endpoint returned 200 without auth (check authorizer)"
else
    echo "   ❌ Unexpected response: $HTTP_CODE"
    cat /tmp/ai-response.json
fi
echo ""

# Summary
echo "======================================"
echo "📊 Diagnostic Summary"
echo "======================================"
echo ""
echo "API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/ai/generate"
echo ""
echo "Next Steps:"
echo "1. If API Gateway missing → Run: npx ts-node infrastructure/deploy-api-gateway.ts"
echo "2. If Lambda missing → Deploy Lambda function"
echo "3. If Bedrock permissions missing → Add IAM policy (see AI_GENERATION_FIX_GUIDE.md)"
echo "4. If CORS failing → Configure CORS on API Gateway"
echo "5. Test with valid JWT token from frontend"
echo ""
echo "For detailed fixes, see: AI_GENERATION_FIX_GUIDE.md"
