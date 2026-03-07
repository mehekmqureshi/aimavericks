# AI Generation Endpoint Diagnostic Script (PowerShell)

$ErrorActionPreference = "Continue"

$API_ID = "325xzv9pli"
$REGION = "us-east-1"
$LAMBDA_NAME = "gp-aiGenerate-dev"
$ROLE_NAME = "gp-aiGenerate-role-dev"

Write-Host "AI Generation Endpoint Diagnostics" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: API Gateway exists
Write-Host "1. Checking API Gateway..." -ForegroundColor Yellow
try {
    $apiInfo = aws apigateway get-rest-api --rest-api-id $API_ID --region $REGION 2>$null | ConvertFrom-Json
    if ($apiInfo) {
        Write-Host "   OK API Gateway exists: $API_ID" -ForegroundColor Green
        Write-Host "   Name: $($apiInfo.name)"
    }
} catch {
    Write-Host "   ERROR API Gateway NOT FOUND: $API_ID" -ForegroundColor Red
    Write-Host "   FIX: Run npx ts-node infrastructure/deploy-api-gateway.ts"
    exit 1
}
Write-Host ""

# Check 2: /ai/generate route exists
Write-Host "2. Checking /ai/generate route..." -ForegroundColor Yellow
try {
    $resources = aws apigateway get-resources --rest-api-id $API_ID --region $REGION 2>$null | ConvertFrom-Json
    $aiResource = $resources.items | Where-Object { $_.path -eq "/ai/generate" }
    
    if ($aiResource) {
        Write-Host "   OK Route exists: /ai/generate" -ForegroundColor Green
        Write-Host "   Resource ID: $($aiResource.id)"
        
        if ($aiResource.resourceMethods) {
            $methods = $aiResource.resourceMethods.PSObject.Properties.Name -join ", "
            Write-Host "   Methods: $methods"
        }
    } else {
        Write-Host "   ERROR Route NOT FOUND: /ai/generate" -ForegroundColor Red
        Write-Host "   FIX: Run npx ts-node infrastructure/deploy-api-gateway.ts"
        exit 1
    }
} catch {
    Write-Host "   ERROR checking routes" -ForegroundColor Red
}
Write-Host ""

# Check 3: Lambda function exists
Write-Host "3. Checking Lambda function..." -ForegroundColor Yellow
try {
    $lambdaInfo = aws lambda get-function --function-name $LAMBDA_NAME --region $REGION 2>$null | ConvertFrom-Json
    if ($lambdaInfo) {
        Write-Host "   OK Lambda exists: $LAMBDA_NAME" -ForegroundColor Green
        Write-Host "   Runtime: $($lambdaInfo.Configuration.Runtime)"
        Write-Host "   Timeout: $($lambdaInfo.Configuration.Timeout)s"
        Write-Host "   Memory: $($lambdaInfo.Configuration.MemorySize)MB"
    }
} catch {
    Write-Host "   ERROR Lambda NOT FOUND: $LAMBDA_NAME" -ForegroundColor Red
    Write-Host "   FIX: Deploy Lambda first"
    exit 1
}
Write-Host ""

# Check 4: Lambda IAM role
Write-Host "4. Checking Lambda IAM permissions..." -ForegroundColor Yellow
try {
    $roleInfo = aws iam get-role --role-name $ROLE_NAME 2>$null | ConvertFrom-Json
    if ($roleInfo) {
        Write-Host "   OK IAM Role exists: $ROLE_NAME" -ForegroundColor Green
        
        $policies = aws iam list-role-policies --role-name $ROLE_NAME 2>$null | ConvertFrom-Json
        $attachedPolicies = aws iam list-attached-role-policies --role-name $ROLE_NAME 2>$null | ConvertFrom-Json
        
        Write-Host "   Inline policies: $($policies.PolicyNames.Count)"
        Write-Host "   Attached policies: $($attachedPolicies.AttachedPolicies.Count)"
        
        $hasBedrock = $false
        foreach ($policyName in $policies.PolicyNames) {
            $policyDoc = aws iam get-role-policy --role-name $ROLE_NAME --policy-name $policyName 2>$null
            if ($policyDoc -match "bedrock") {
                $hasBedrock = $true
                Write-Host "   OK Bedrock permissions found in: $policyName" -ForegroundColor Green
            }
        }
        
        if (-not $hasBedrock) {
            Write-Host "   WARNING No Bedrock permissions found" -ForegroundColor Yellow
            Write-Host "   FIX: Run .\fix-bedrock-permissions.ps1"
        }
    }
} catch {
    Write-Host "   ERROR IAM Role NOT FOUND: $ROLE_NAME" -ForegroundColor Red
    Write-Host "   FIX: Run .\fix-bedrock-permissions.ps1"
}
Write-Host ""

# Check 5: Test CORS preflight
Write-Host "5. Testing CORS preflight..." -ForegroundColor Yellow
try {
    $corsResponse = Invoke-WebRequest -Uri "https://$API_ID.execute-api.$REGION.amazonaws.com/prod/ai/generate" -Method OPTIONS -Headers @{"Origin" = "http://localhost:5173"; "Access-Control-Request-Method" = "POST"; "Access-Control-Request-Headers" = "Authorization,Content-Type"} -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($corsResponse.StatusCode -eq 200) {
        Write-Host "   OK CORS preflight successful" -ForegroundColor Green
    } else {
        Write-Host "   ERROR CORS preflight failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR CORS preflight failed" -ForegroundColor Red
}
Write-Host ""

# Check 6: Test endpoint
Write-Host "6. Testing endpoint availability..." -ForegroundColor Yellow
try {
    $body = @{productName = "Test"; category = "Apparel"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "https://$API_ID.execute-api.$REGION.amazonaws.com/prod/ai/generate" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue
    
    Write-Host "   HTTP Status: $($response.StatusCode)"
    if ($response.StatusCode -eq 200) {
        Write-Host "   WARNING Endpoint returned 200 without auth" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   HTTP Status: $statusCode"
    
    if ($statusCode -eq 401) {
        Write-Host "   OK Endpoint reachable (401 = auth required)" -ForegroundColor Green
    } else {
        Write-Host "   ERROR Unexpected response: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/prod/ai/generate"
Write-Host ""
Write-Host "For detailed fixes, see: AI_GENERATION_FIX_GUIDE.md"
