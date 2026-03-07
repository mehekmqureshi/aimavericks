#!/bin/bash
# Fix Bedrock Permissions for AI Lambda

set -e

ROLE_NAME="gp-aiGenerate-role-dev"
POLICY_NAME="BedrockAccess"
REGION="us-east-1"

echo "🔧 Adding Bedrock Permissions to Lambda Role"
echo "============================================="
echo ""
echo "Role: $ROLE_NAME"
echo "Policy: $POLICY_NAME"
echo ""

# Create policy document
cat > /tmp/bedrock-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
EOF

echo "📝 Policy document created"
echo ""

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "✅ Role exists: $ROLE_NAME"
else
    echo "❌ Role not found: $ROLE_NAME"
    echo ""
    echo "Creating role..."
    
    # Create trust policy
    cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "IAM role for AI generation Lambda with Bedrock access"
    
    echo "✅ Role created"
fi

echo ""
echo "📝 Attaching Bedrock policy..."

# Attach inline policy
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document file:///tmp/bedrock-policy.json

echo "✅ Policy attached successfully"
echo ""

# Verify
echo "📋 Verifying permissions..."
POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --output json)
echo "Inline policies:"
echo "$POLICIES" | jq -r '.PolicyNames[]'

echo ""
echo "✅ Bedrock permissions configured!"
echo ""
echo "Next steps:"
echo "1. Wait 10-15 seconds for IAM changes to propagate"
echo "2. Test the AI generation endpoint"
echo "3. Check Lambda logs if issues persist"

# Cleanup
rm -f /tmp/bedrock-policy.json /tmp/trust-policy.json
