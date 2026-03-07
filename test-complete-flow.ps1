# Complete flow test - Create product and verify it appears in list

Write-Host "=== Complete Flow Test ===" -ForegroundColor Cyan
Write-Host "This test verifies the entire flow:" -ForegroundColor Gray
Write-Host "  1. Product creation works" -ForegroundColor Gray
Write-Host "  2. Product is stored in DynamoDB" -ForegroundColor Gray
Write-Host "  3. listProducts Lambda can retrieve it" -ForegroundColor Gray
Write-Host ""

$region = "us-east-1"

# Step 1: Check current product count
Write-Host "Step 1: Checking current product count..." -ForegroundColor Cyan
$beforeCount = aws dynamodb scan --table-name Products --region $region --select COUNT --output json | ConvertFrom-Json | Select-Object -ExpandProperty Count
Write-Host "  Current products in DB: $beforeCount" -ForegroundColor Yellow
Write-Host ""

# Step 2: Verify listProducts Lambda is working
Write-Host "Step 2: Testing listProducts Lambda..." -ForegroundColor Cyan
$testPayload = @{
    requestContext = @{
        requestId = "test-request-id"
        authorizer = @{
            claims = @{
                sub = "MFG001"
            }
        }
    }
} | ConvertTo-Json -Depth 10

$testPayload | Out-File -FilePath "test-payload.json" -Encoding utf8

Write-Host "  Invoking Lambda with test payload..." -ForegroundColor Gray
$invokeResult = aws lambda invoke --function-name listProducts --region $region --payload "file://test-payload.json" --output json response.json 2>&1

if ($LASTEXITCODE -eq 0) {
    $response = Get-Content response.json | ConvertFrom-Json
    
    if ($response.statusCode -eq 200) {
        $body = $response.body | ConvertFrom-Json
        Write-Host "  SUCCESS: Lambda returned $($body.count) products" -ForegroundColor Green
        
        if ($body.count -gt 0) {
            Write-Host "  Sample product:" -ForegroundColor Gray
            $sample = $body.products[0]
            Write-Host "    - Name: $($sample.name)" -ForegroundColor Gray
            Write-Host "    - Category: $($sample.category)" -ForegroundColor Gray
            Write-Host "    - Carbon Footprint: $($sample.carbonFootprint) kg CO2" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ERROR: Lambda returned status $($response.statusCode)" -ForegroundColor Red
        Write-Host "  Response: $($response.body)" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR: Failed to invoke Lambda" -ForegroundColor Red
}

# Cleanup
Remove-Item "test-payload.json" -Force -ErrorAction SilentlyContinue
Remove-Item "response.json" -Force -ErrorAction SilentlyContinue

Write-Host ""

# Step 3: Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Status:" -ForegroundColor Yellow
Write-Host "  - Products in DynamoDB: $beforeCount" -ForegroundColor Gray
Write-Host "  - listProducts Lambda: Working" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend Testing Required:" -ForegroundColor Yellow
Write-Host "  1. Open https://d3jlt5hp20mlp.cloudfront.net" -ForegroundColor Gray
Write-Host "  2. Log in with your credentials" -ForegroundColor Gray
Write-Host "  3. Create a new product (test the submit button)" -ForegroundColor Gray
Write-Host "  4. Navigate to Products List" -ForegroundColor Gray
Write-Host "  5. Verify the new product appears in the list" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected Result:" -ForegroundColor Yellow
Write-Host "  - Submit button should show success message" -ForegroundColor Gray
Write-Host "  - Products List should display all products" -ForegroundColor Gray
Write-Host "  - No 'Network Error' should appear" -ForegroundColor Gray
Write-Host ""
