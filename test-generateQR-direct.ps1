# Test generateQR Lambda Function Directly

Write-Host "=== Testing generateQR Lambda (Direct Invocation) ===" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$region = $env:AWS_REGION
$functionName = "gp-generateQR-dev"

Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host "Function: $functionName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Get a test product ID
Write-Host "Step 1: Getting a test product..." -ForegroundColor Cyan
$productsTable = "Products"

$scanResult = aws dynamodb scan `
    --table-name $productsTable `
    --limit 1 `
    --region $region | ConvertFrom-Json

if ($scanResult.Items.Count -eq 0) {
    Write-Host "ERROR: No products found in DynamoDB. Please create a product first." -ForegroundColor Red
    exit 1
}

$testProduct = $scanResult.Items[0]
$productId = $testProduct.productId.S
$manufacturerId = $testProduct.manufacturerId.S

Write-Host "SUCCESS: Found test product" -ForegroundColor Green
Write-Host "  Product ID: $productId" -ForegroundColor Gray
Write-Host "  Manufacturer ID: $manufacturerId" -ForegroundColor Gray
Write-Host ""

# Step 2: Create test payload
Write-Host "Step 2: Creating test payload..." -ForegroundColor Cyan

# Create proper JSON structure
$bodyJson = @{
    productId = $productId
    count = 3
} | ConvertTo-Json -Compress

$payload = @{
    body = $bodyJson
    requestContext = @{
        requestId = "test-request-$(Get-Date -Format 'yyyyMMddHHmmss')"
        authorizer = @{
            claims = @{
                sub = $manufacturerId
            }
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $payload -ForegroundColor Gray
Write-Host ""

# Step 3: Invoke Lambda
Write-Host "Step 3: Invoking Lambda..." -ForegroundColor Cyan

$payloadFile = "test-payload.json"
$responseFile = "test-response.json"

# Write payload to file
$payload | Set-Content -Path $payloadFile -NoNewline

# Invoke Lambda using file
$invokeResult = aws lambda invoke `
    --function-name $functionName `
    --cli-binary-format raw-in-base64-out `
    --payload "file://$payloadFile" `
    --region $region `
    $responseFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Lambda invocation failed" -ForegroundColor Red
    Write-Host $invokeResult -ForegroundColor Red
    Remove-Item $payloadFile -Force -ErrorAction SilentlyContinue
    Remove-Item $responseFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# Step 4: Parse response
Write-Host "Step 4: Parsing response..." -ForegroundColor Cyan

if (Test-Path $responseFile) {
    $response = Get-Content $responseFile | ConvertFrom-Json
    
    Write-Host "Lambda Response:" -ForegroundColor Yellow
    Write-Host "  Status Code: $($response.statusCode)" -ForegroundColor Gray
    
    if ($response.statusCode -eq 200) {
        $body = $response.body | ConvertFrom-Json
        
        Write-Host ""
        Write-Host "SUCCESS: QR codes generated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response Details:" -ForegroundColor Yellow
        Write-Host "  Serial IDs Count: $($body.serialIds.Count)" -ForegroundColor Gray
        Write-Host "  ZIP URL: $($body.zipUrl)" -ForegroundColor Gray
        Write-Host "  Expires At: $($body.expiresAt)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Serial IDs:" -ForegroundColor Yellow
        $body.serialIds | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor Gray
        }
        Write-Host ""
        
        # Test ZIP URL
        Write-Host "Step 5: Testing ZIP download URL..." -ForegroundColor Cyan
        try {
            $downloadTest = Invoke-WebRequest -Uri $body.zipUrl -Method Head
            Write-Host "SUCCESS: ZIP URL is accessible" -ForegroundColor Green
            Write-Host "  Content Type: $($downloadTest.Headers.'Content-Type')" -ForegroundColor Gray
            if ($downloadTest.Headers.'Content-Length') {
                Write-Host "  Content Length: $([math]::Round($downloadTest.Headers.'Content-Length' / 1024, 2)) KB" -ForegroundColor Gray
            }
        } catch {
            Write-Host "WARNING: Could not access ZIP URL: $_" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host ""
        Write-Host "ERROR: Lambda returned error status" -ForegroundColor Red
        Write-Host "Response body:" -ForegroundColor Red
        Write-Host $response.body -ForegroundColor Red
    }
    
    # Cleanup
    Remove-Item $payloadFile -Force -ErrorAction SilentlyContinue
    Remove-Item $responseFile -Force -ErrorAction SilentlyContinue
    
} else {
    Write-Host "ERROR: Response file not found" -ForegroundColor Red
    Remove-Item $payloadFile -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
