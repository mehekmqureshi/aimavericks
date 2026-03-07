# Diagnose Network Error
# This script tests the API Gateway connection and CORS

$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$FRONTEND_URL = "https://d3jj1t5hp20hlp.cloudfront.net"

Write-Host "=== Network Error Diagnosis ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if API Gateway is accessible
Write-Host "[Test 1] Checking API Gateway accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/products" -Method Get -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ API Gateway is accessible" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ API Gateway is accessible (401 Unauthorized is expected without token)" -ForegroundColor Green
    } else {
        Write-Host "❌ API Gateway is NOT accessible" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Check CORS headers
Write-Host "[Test 2] Checking CORS configuration..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = $FRONTEND_URL
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "content-type,authorization"
    }
    $response = Invoke-WebRequest -Uri "$API_URL/products" -Method Options -Headers $headers -UseBasicParsing
    
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowHeaders = $response.Headers["Access-Control-Allow-Headers"]
    $allowMethods = $response.Headers["Access-Control-Allow-Methods"]
    
    Write-Host "✅ CORS is configured" -ForegroundColor Green
    Write-Host "   Allow-Origin: $allowOrigin" -ForegroundColor Gray
    Write-Host "   Allow-Headers: $allowHeaders" -ForegroundColor Gray
    Write-Host "   Allow-Methods: $allowMethods" -ForegroundColor Gray
    
    if ($allowOrigin -ne "*" -and $allowOrigin -ne $FRONTEND_URL) {
        Write-Host "⚠️  Warning: Origin mismatch!" -ForegroundColor Yellow
        Write-Host "   Expected: $FRONTEND_URL or *" -ForegroundColor Yellow
        Write-Host "   Got: $allowOrigin" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ CORS check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check if CloudFront is serving the correct files
Write-Host "[Test 3] Checking CloudFront deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $FRONTEND_URL -UseBasicParsing
    if ($response.Content -match "325xzv9pli") {
        Write-Host "✅ CloudFront is serving files with correct API URL" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: API URL not found in HTML" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ CloudFront check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Test with authentication
Write-Host "[Test 4] Testing with authentication..." -ForegroundColor Yellow
Write-Host "   Please provide a JWT token from your browser's localStorage" -ForegroundColor Gray
$token = Read-Host "   Enter token (or press Enter to skip)"

if ($token) {
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        $body = @{
            name = "Test Product"
            description = "Test"
            category = "Apparel"
            lifecycleData = @{
                materials = @(
                    @{
                        name = "Cotton"
                        percentage = 100
                        weight = 0.2
                        emissionFactor = 5.5
                        recycled = $false
                    }
                )
                manufacturing = @{
                    factoryLocation = "Test"
                    energyConsumption = 2.5
                    energyEmissionFactor = 0.8
                }
                packaging = @{
                    weight = 0.05
                    emissionFactor = 0.9
                }
                transport = @{
                    distance = 8000
                    emissionFactorPerKm = 0.015
                }
                usage = @{
                    avgWashCycles = 50
                    washTemperature = 30
                    dryerUse = $false
                }
                endOfLife = @{
                    disposalEmission = 0.5
                }
            }
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $body
        Write-Host "✅ API request successful!" -ForegroundColor Green
        Write-Host "   Product ID: $($response.productId)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ API request failed" -ForegroundColor Red
        Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   Skipped (no token provided)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Diagnosis Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Common Issues:" -ForegroundColor Yellow
Write-Host "1. Browser cache - Try hard refresh (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host "2. Not logged in - Check localStorage for 'gp_access_token'" -ForegroundColor Gray
Write-Host "3. Token expired - Log in again" -ForegroundColor Gray
Write-Host "4. CORS issue - Check API Gateway CORS configuration" -ForegroundColor Gray
Write-Host "5. Wrong CloudFront distribution - Verify URL" -ForegroundColor Gray
Write-Host ""
