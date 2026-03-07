# Test generateQR Lambda Function

Write-Host "=== Testing generateQR Lambda ===" -ForegroundColor Cyan
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

$apiUrl = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$region = $env:AWS_REGION

if (-not $region) {
    Write-Host "ERROR: AWS_REGION not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "API URL: $apiUrl" -ForegroundColor Yellow
Write-Host ""

# Step 1: Get authentication token
Write-Host "Step 1: Getting authentication token..." -ForegroundColor Cyan
$username = $env:TEST_USERNAME
$password = $env:TEST_PASSWORD
$userPoolId = $env:COGNITO_USER_POOL_ID
$clientId = $env:COGNITO_CLIENT_ID

if (-not $username -or -not $password) {
    Write-Host "ERROR: TEST_USERNAME or TEST_PASSWORD not set in .env" -ForegroundColor Red
    Write-Host "Please add these to your .env file" -ForegroundColor Yellow
    exit 1
}

# Authenticate with Cognito
$authResult = aws cognito-idp initiate-auth `
    --auth-flow USER_PASSWORD_AUTH `
    --client-id $clientId `
    --auth-parameters "USERNAME=$username,PASSWORD=$password" `
    --region $region | ConvertFrom-Json

if (-not $authResult.AuthenticationResult.IdToken) {
    Write-Host "ERROR: Failed to authenticate" -ForegroundColor Red
    exit 1
}

$token = $authResult.AuthenticationResult.IdToken
Write-Host "SUCCESS: Got authentication token" -ForegroundColor Green
Write-Host ""

# Step 2: Get list of products
Write-Host "Step 2: Getting list of products..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $productsResponse = Invoke-RestMethod -Uri "$apiUrl/products" -Method Get -Headers $headers
    $products = $productsResponse.products
    
    if ($products.Count -eq 0) {
        Write-Host "ERROR: No products found. Please create a product first." -ForegroundColor Red
        exit 1
    }
    
    $testProduct = $products[0]
    Write-Host "SUCCESS: Found $($products.Count) products" -ForegroundColor Green
    Write-Host "Using product: $($testProduct.name) (ID: $($testProduct.productId))" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to get products: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Generate QR codes
Write-Host "Step 3: Generating QR codes..." -ForegroundColor Cyan
$qrRequest = @{
    productId = $testProduct.productId
    count = 5
} | ConvertTo-Json

Write-Host "Request payload:" -ForegroundColor Gray
Write-Host $qrRequest -ForegroundColor Gray
Write-Host ""

try {
    $qrResponse = Invoke-RestMethod -Uri "$apiUrl/qr/generate" -Method Post -Headers $headers -Body $qrRequest
    
    Write-Host "SUCCESS: QR codes generated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host "  Serial IDs: $($qrResponse.serialIds.Count)" -ForegroundColor Gray
    Write-Host "  ZIP URL: $($qrResponse.zipUrl)" -ForegroundColor Gray
    Write-Host "  Expires At: $($qrResponse.expiresAt)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Serial IDs:" -ForegroundColor Yellow
    $qrResponse.serialIds | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Step 4: Test download URL
    Write-Host "Step 4: Testing download URL..." -ForegroundColor Cyan
    try {
        $downloadTest = Invoke-WebRequest -Uri $qrResponse.zipUrl -Method Head
        Write-Host "SUCCESS: Download URL is accessible" -ForegroundColor Green
        Write-Host "  Content Type: $($downloadTest.Headers.'Content-Type')" -ForegroundColor Gray
        Write-Host "  Content Length: $([math]::Round($downloadTest.Headers.'Content-Length' / 1024, 2)) KB" -ForegroundColor Gray
    } catch {
        Write-Host "WARNING: Could not access download URL: $_" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Failed to generate QR codes" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "QR generation is working correctly!" -ForegroundColor Green
