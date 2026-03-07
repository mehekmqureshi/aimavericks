# Quick verification script for Products List fix

Write-Host "=== Verifying Products List Fix ===" -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$passed = 0
$total = 0

# Check 1: Lambda exists and is active
Write-Host "Check 1: Lambda function status..." -ForegroundColor Yellow
$total++
$lambdaStatus = aws lambda get-function --function-name listProducts --region $region --query 'Configuration.State' --output text 2>&1
if ($LASTEXITCODE -eq 0 -and $lambdaStatus -eq "Active") {
    Write-Host "  PASS: Lambda is Active" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: Lambda is not Active or not found" -ForegroundColor Red
}

# Check 2: DynamoDB table exists
Write-Host "Check 2: DynamoDB table..." -ForegroundColor Yellow
$total++
aws dynamodb describe-table --table-name Products --region $region --query 'Table.TableName' --output text 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PASS: Products table exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: Products table not found" -ForegroundColor Red
}

# Check 3: GSI exists
Write-Host "Check 3: GSI manufacturerId-index..." -ForegroundColor Yellow
$total++
$gsiStatus = aws dynamodb describe-table --table-name Products --region $region --query 'Table.GlobalSecondaryIndexes[0].IndexStatus' --output text 2>&1
if ($LASTEXITCODE -eq 0 -and $gsiStatus -eq "ACTIVE") {
    Write-Host "  PASS: GSI is Active" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: GSI not found or not active" -ForegroundColor Red
}

# Check 4: Products exist in table
Write-Host "Check 4: Products in DynamoDB..." -ForegroundColor Yellow
$total++
$scanResult = aws dynamodb scan --table-name Products --region $region --select COUNT --output json 2>&1 | ConvertFrom-Json
$productCount = $scanResult.Count
if ($LASTEXITCODE -eq 0 -and $productCount -gt 0) {
    Write-Host "  PASS: Found $productCount products" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: No products found" -ForegroundColor Red
}

# Check 5: Lambda has DynamoDB permissions
Write-Host "Check 5: Lambda IAM permissions..." -ForegroundColor Yellow
$total++
$roleArn = aws lambda get-function --function-name listProducts --region $region --query 'Configuration.Role' --output text 2>&1
if ($LASTEXITCODE -eq 0) {
    $roleName = $roleArn.Split('/')[-1]
    $policies = aws iam list-role-policies --role-name $roleName --output json 2>&1 | ConvertFrom-Json
    if ($policies.PolicyNames -contains "DynamoDBAccess") {
        Write-Host "  PASS: DynamoDB permissions configured" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: DynamoDB permissions missing" -ForegroundColor Red
    }
} else {
    Write-Host "  FAIL: Could not check permissions" -ForegroundColor Red
}

# Check 6: API Gateway permission
Write-Host "Check 6: API Gateway invoke permission..." -ForegroundColor Yellow
$total++
$policy = aws lambda get-policy --function-name listProducts --region $region --output json 2>&1
if ($LASTEXITCODE -eq 0 -and $policy -match "apigateway") {
    Write-Host "  PASS: API Gateway can invoke Lambda" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: API Gateway permission not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "SUCCESS: All checks passed ($passed/$total)" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Products List should now work!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please test in the browser:" -ForegroundColor Yellow
    Write-Host "  1. Open https://d3jlt5hp20mlp.cloudfront.net" -ForegroundColor Gray
    Write-Host "  2. Log in with your credentials" -ForegroundColor Gray
    Write-Host "  3. Click on 'Products List' in the sidebar" -ForegroundColor Gray
    Write-Host "  4. Verify products are displayed in the table" -ForegroundColor Gray
} else {
    Write-Host "WARNING: Some checks failed ($passed/$total)" -ForegroundColor Red
    Write-Host "Please review the errors above" -ForegroundColor Yellow
}
Write-Host ""
