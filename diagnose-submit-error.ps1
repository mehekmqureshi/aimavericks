# Diagnose Submit Error Script
# This script tests the complete product submission flow

Write-Host "=== Product Submission Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]*?)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host ".env file not found" -ForegroundColor Red
    exit 1
}

$apiUrl = $env:API_GATEWAY_URL
$username = $env:TEST_USERNAME
$password = $env:TEST_PASSWORD

if (-not $apiUrl) {
    Write-Host "Missing API_GATEWAY_URL" -ForegroundColor Red
    exit 1
}

# Get authentication token
Write-Host "Authenticating..." -ForegroundColor Yellow
$authBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $authBody -ContentType "application/json"
    $token = $authResponse.token
    Write-Host "Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "API URL: $apiUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Check manufacturer exists
Write-Host "Test 1: Checking manufacturer..." -ForegroundColor Yellow
$manufacturerId = "mfr_test_001"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $mfrResponse = Invoke-RestMethod -Uri "$apiUrl/manufacturer/$manufacturerId" -Method Get -Headers $headers
    Write-Host "Manufacturer found: $($mfrResponse.name)" -ForegroundColor Green
} catch {
    Write-Host "Manufacturer not found, creating..." -ForegroundColor Yellow
    
    $mfrBody = @{
        manufacturerId = $manufacturerId
        name = "Test Manufacturer"
        location = "Test Location"
        certifications = @("ISO9001")
    } | ConvertTo-Json
    
    try {
        $createMfr = Invoke-RestMethod -Uri "$apiUrl/manufacturer" -Method Post -Headers $headers -Body $mfrBody
        Write-Host "Manufacturer created" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create manufacturer: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Create a test product with minimal data
Write-Host "Test 2: Creating minimal test product..." -ForegroundColor Yellow

$testProduct = @{
    name = "Diagnostic Test Product"
    manufacturerId = $manufacturerId
    category = "Electronics"
    materials = @(
        @{
            name = "Plastic"
            percentage = 50
            recyclable = $true
            recycledContent = 20
        }
        @{
            name = "Metal"
            percentage = 50
            recyclable = $true
            recycledContent = 10
        }
    )
    carbonFootprint = @{
        total = 100
        breakdown = @{
            manufacturing = 60
            transportation = 30
            packaging = 10
        }
    }
    lifespan = @{
        expected = 5
        unit = "years"
    }
    certifications = @("ISO14001")
    recyclability = @{
        score = 75
        instructions = "Recycle at designated facilities"
    }
}

$productJson = $testProduct | ConvertTo-Json -Depth 10

Write-Host "Request payload:" -ForegroundColor Gray
Write-Host $productJson -ForegroundColor DarkGray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/products" -Method Post -Headers $headers -Body $productJson -ContentType "application/json"
    Write-Host "Product created successfully!" -ForegroundColor Green
    Write-Host "Product ID: $($response.productId)" -ForegroundColor Cyan
    Write-Host "Serial Number: $($response.serialNumber)" -ForegroundColor Cyan
    
    # Test 3: Verify product can be retrieved
    Write-Host ""
    Write-Host "Test 3: Verifying product retrieval..." -ForegroundColor Yellow
    
    $getResponse = Invoke-RestMethod -Uri "$apiUrl/products/$($response.productId)" -Method Get -Headers $headers
    Write-Host "Product retrieved successfully" -ForegroundColor Green
    Write-Host "Name: $($getResponse.name)" -ForegroundColor Gray
    Write-Host "Status: $($getResponse.status)" -ForegroundColor Gray
    
} catch {
    Write-Host "Product creation failed" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details:" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
    }
    
    # Try to get more details from the response
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor DarkRed
    } catch {
        Write-Host "Could not read response body" -ForegroundColor DarkRed
    }
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
