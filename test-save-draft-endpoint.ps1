#!/usr/bin/env pwsh

# Test Save Draft Endpoint
$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "Testing Save Draft Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test data
$testData = @{
    name = "Test Product"
    description = "Test Description"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Cotton"
                weight = 0.5
                percentage = 100
                emissionFactor = 5.0
            }
        )
    }
} | ConvertTo-Json -Depth 10

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $testData
Write-Host ""

try {
    # Make POST request without auth to see the error
    $response = Invoke-WebRequest `
        -Uri "$API_URL/drafts" `
        -Method POST `
        -Body $testData `
        -ContentType "application/json" `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
