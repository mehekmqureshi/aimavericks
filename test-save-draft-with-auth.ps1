#!/usr/bin/env pwsh

# Test Save Draft with Authentication
$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Testing Save Draft Endpoint with Authentication" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if user has a token stored
$token = $null
if (Test-Path "$env:USERPROFILE\.gp-test-token") {
    $token = Get-Content "$env:USERPROFILE\.gp-test-token" -Raw
    Write-Host "Found stored token" -ForegroundColor Green
} else {
    Write-Host "No stored token found. You need to log in first." -ForegroundColor Yellow
    Write-Host "Please provide your JWT token (or press Enter to skip):" -ForegroundColor Yellow
    $token = Read-Host
}

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host ""
    Write-Host "Testing without authentication (will fail with 401)..." -ForegroundColor Yellow
    Write-Host ""
}

# Test data
$testData = @{
    name = "Test Product - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    description = "Test Description for Save Draft"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Organic Cotton"
                weight = 0.5
                percentage = 100
                emissionFactor = 5.0
                countryOfOrigin = "India"
                recycled = $false
                certification = "GOTS"
                calculatedEmission = 2.5
            }
        )
    }
} | ConvertTo-Json -Depth 10

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $testData
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if (![string]::IsNullOrWhiteSpace($token)) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $response = Invoke-WebRequest `
        -Uri "$API_URL/drafts" `
        -Method POST `
        -Body $testData `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    $responseObj = $response.Content | ConvertFrom-Json
    Write-Host "Draft ID: $($responseObj.draftId)" -ForegroundColor Cyan
    Write-Host "Saved At: $($responseObj.savedAt)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Save Draft is working correctly!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR occurred:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
        Write-Host ""
    }
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "💡 This is expected - you need to be logged in to save drafts." -ForegroundColor Yellow
        Write-Host "   The frontend will show 'Login Required' on the Save Draft button." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
