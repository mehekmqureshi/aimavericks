#!/bin/bash

# Test Save Draft Endpoint
echo "🧪 Testing POST /drafts Endpoint"
echo "═══════════════════════════════════════════════════════"
echo ""

API_ENDPOINT="https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
CLIENT_ID="2md6sb5g5k31i4ejgr0tlvqq49"
USERNAME="manufacturer@greenpassport.com"
PASSWORD="Test123!"

# Step 1: Get Cognito token
echo "📝 Step 1: Authenticating with Cognito..."
AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$CLIENT_ID" \
  --auth-parameters USERNAME="$USERNAME",PASSWORD="$PASSWORD" \
  --output json)

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.AccessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Authentication failed"
  echo "$AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo "   Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 2: Test OPTIONS /drafts (CORS preflight)
echo "📝 Step 2: Testing OPTIONS /drafts (CORS preflight)..."
curl -X OPTIONS "$API_ENDPOINT/drafts" \
  -H "Origin: https://d2iqvvqxqxqxqx.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"
echo ""

# Step 3: Test POST /drafts without token
echo "📝 Step 3: Testing POST /drafts WITHOUT token (should fail)..."
curl -X POST "$API_ENDPOINT/drafts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","category":"Apparel"}' \
  -w "\n   Status: %{http_code}\n" \
  -s
echo ""

# Step 4: Test POST /drafts with token
echo "📝 Step 4: Testing POST /drafts WITH token (should succeed)..."
RESPONSE=$(curl -X POST "$API_ENDPOINT/drafts" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product Draft",
    "description": "This is a test draft",
    "category": "Apparel",
    "lifecycleData": {
      "materials": [
        {
          "name": "Organic Cotton",
          "percentage": 100,
          "origin": "India",
          "certifications": ["GOTS"]
        }
      ]
    }
  }' \
  -w "\n   Status: %{http_code}\n" \
  -s)

echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "draftId"; then
  echo "✅ Draft saved successfully!"
else
  echo "❌ Draft save failed"
  echo ""
  echo "🔍 Check Lambda logs:"
  echo "   aws logs tail /aws/lambda/gp-saveDraft-dev --follow"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🎉 Test Complete!"
