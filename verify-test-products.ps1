# Verify Test Products Script
# Verifies that the 3 test products appear in the product list

$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verify Test Products" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

# Authenticate with Cognito
Write-Host "Authenticating..." -ForegroundColor Cyan
$username = $env:TEST_USERNAME
$password = $env:TEST_PASSWORD
$clientId = $env:COGNITO_CLIENT_ID
$region = $env:AWS_REGION

try {
    $authResult = aws cognito-idp initiate-auth `
        --auth-flow USER_PASSWORD_AUTH `
        --client-id $clientId `
        --auth-parameters "USERNAME=$username,PASSWORD=$password" `
        --region $region | ConvertFrom-Json
    
    $TOKEN = $authResult.AuthenticationResult.IdToken
    Write-Host "✅ Authentication successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

# Get product list
Write-Host "Fetching product list..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/products" -Method Get -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Successfully retrieved product list!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Total Products: $($response.products.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    # Display each product
    $testProducts = @(
        "Organic Cotton T-Shirt - Black",
        "Combined Material T-Shirt - Blue",
        "Cotton Casual Pant"
    )
    
    foreach ($productName in $testProducts) {
        $product = $response.products | Where-Object { $_.name -eq $productName }
        
        if ($product) {
            Write-Host "✅ Found: $productName" -ForegroundColor Green
            Write-Host "   Product ID: $($product.productId)" -ForegroundColor Gray
            Write-Host "   Category: $($product.category)" -ForegroundColor Gray
            Write-Host "   Carbon Footprint: $($product.carbonFootprint) kg CO2" -ForegroundColor Gray
            Write-Host "   Badge: $($product.badge.name)" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host "❌ Not Found: $productName" -ForegroundColor Red
            Write-Host ""
        }
    }
    
    # Show all products
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  All Products in System" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($product in $response.products) {
        Write-Host "• $($product.name)" -ForegroundColor White
        Write-Host "  ID: $($product.productId)" -ForegroundColor Gray
        Write-Host "  Carbon: $($product.carbonFootprint) kg CO2 | Badge: $($product.badge.name)" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Error fetching product list!" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Red
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend URL: https://d1iqxqvvvqvqvq.cloudfront.net/products" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
