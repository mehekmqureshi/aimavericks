#!/usr/bin/env pwsh

# Test Draft Save with Real Authentication

$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$COGNITO_CLIENT_ID = "2md6sb5g5k31i4ejgr0tlvqq49"
$COGNITO_REGION = "us-east-1"

Write-Host "Testing Draft Save with Authentication..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Get ID Token from Cognito
Write-Host "Step 1: Authenticating with Cognito..." -ForegroundColor Yellow

$authPayload = @{
    AuthFlow = "USER_PASSWORD_AUTH"
    ClientId = $COGNITO_CLIENT_ID
    AuthParameters = @{
        USERNAME = "manufacturer@greenpassport.com"
        PASSWORD = "Test123!"
    }
} | ConvertTo-Json -Depth 10

try {
    $authResponse = aws cognito-idp initiate-auth `
        --region $COGNITO_REGION `
        --cli-input-json $authPayload 2>&1 | ConvertFrom-Json
    
    $idToken = $authResponse.AuthenticationResult.IdToken
    
    if ($idToken) {
        Write-Host "✅ Authentication successful!" -ForegroundColor Green
        Write-Host "Token (first 50 chars): $($idToken.Substring(0, [Math]::Min(50, $idToken.Length)))..." -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ Failed to get ID token" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test Save Draft endpoint
Write-Host "Step 2: Testing Save Draft endpoint..." -ForegroundColor Yellow

$draftData = @{
    name = "Test Product - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    description = "Test Description"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Organic Cotton"
                weight = 0.5
                percentage = 100
                emissionFactor = 0.2
                countryOfOrigin = "MUMBAI"
                recycled = $true
                certification = "BT"
                calculatedEmission = 0.1
            }
        )
    }
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $idToken"
    }
    
    $response = Invoke-WebRequest `
        -Uri "$API_URL/drafts" `
        -Method POST `
        -Body $draftData `
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
    Write-Host "✅ Draft saved successfully!" -ForegroundColor Green
    
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
    }
}

Write-Host ""
Write-Host "Test Complete" -ForegroundColor Cyan
