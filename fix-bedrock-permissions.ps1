# Fix Bedrock Permissions for AI Lambda (PowerShell)

$ErrorActionPreference = "Stop"

$ROLE_NAME = "gp-aiGenerate-role-dev"
$POLICY_NAME = "BedrockAccess"
$REGION = "us-east-1"

Write-Host "🔧 Adding Bedrock Permissions to Lambda Role" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Role: $ROLE_NAME"
Write-Host "Policy: $POLICY_NAME"
Write-Host ""

# Create policy document
$policyDocument = @"
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
"@

$policyDocument | Out-File -FilePath "$env:TEMP\bedrock-policy.json" -Encoding utf8
Write-Host "📝 Policy document created" -ForegroundColor Green
Write-Host ""

# Check if role exists
try {
    $roleInfo = aws iam get-role --role-name $ROLE_NAME 2>$null | ConvertFrom-Json
    Write-Host "✅ Role exists: $ROLE_NAME" -ForegroundColor Green
} catch {
    Write-Host "❌ Role not found: $ROLE_NAME" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating role..." -ForegroundColor Yellow
    
    # Create trust policy
    $trustPolicy = @"
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
"@
    
    $trustPolicy | Out-File -FilePath "$env:TEMP\trust-policy.json" -Encoding utf8
    
    aws iam create-role `
        --role-name $ROLE_NAME `
        --assume-role-policy-document "file://$env:TEMP\trust-policy.json" `
        --description "IAM role for AI generation Lambda with Bedrock access"
    
    Write-Host "✅ Role created" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Attaching Bedrock policy..." -ForegroundColor Yellow

# Attach inline policy
aws iam put-role-policy `
    --role-name $ROLE_NAME `
    --policy-name $POLICY_NAME `
    --policy-document "file://$env:TEMP\bedrock-policy.json"

Write-Host "✅ Policy attached successfully" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "📋 Verifying permissions..." -ForegroundColor Yellow
$policies = aws iam list-role-policies --role-name $ROLE_NAME | ConvertFrom-Json
Write-Host "Inline policies:"
foreach ($policy in $policies.PolicyNames) {
    Write-Host "  - $policy" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Bedrock permissions configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Wait 10-15 seconds for IAM changes to propagate"
Write-Host "2. Test the AI generation endpoint"
Write-Host "3. Check Lambda logs if issues persist"

# Cleanup
Remove-Item -Path "$env:TEMP\bedrock-policy.json" -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\trust-policy.json" -ErrorAction SilentlyContinue
