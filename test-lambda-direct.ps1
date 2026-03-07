# Test listProducts Lambda directly

Write-Host "=== Testing listProducts Lambda Directly ===" -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"

# Create a test event that simulates API Gateway with JWT claims
$testEvent = @{
    httpMethod = "GET"
    path = "/products"
    headers = @{
        "Content-Type" = "application/json"
    }
    requestContext = @{
        requestId = "test-request-123"
        authorizer = @{
            claims = @{
                sub = "MFG001"
                email = "test@example.com"
            }
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Test payload:" -ForegroundColor Yellow
Write-Host $testEvent -ForegroundColor Gray
Write-Host ""

# Save to file (ASCII encoding to avoid UTF-8 BOM issues)
[System.IO.File]::WriteAllText("test-event.json", $testEvent)

Write-Host "Invoking Lambda..." -ForegroundColor Cyan
$result = aws lambda invoke `
    --function-name listProducts `
    --region $region `
    --payload "file://test-event.json" `
    --cli-binary-format raw-in-base64-out `
    response.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Lambda invoked successfully" -ForegroundColor Green
    Write-Host ""
    
    # Read response
    $response = Get-Content response.json -Raw | ConvertFrom-Json
    
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host "Status Code: $($response.statusCode)" -ForegroundColor $(if ($response.statusCode -eq 200) { "Green" } else { "Red" })
    
    if ($response.body) {
        $body = $response.body | ConvertFrom-Json
        Write-Host "Body:" -ForegroundColor Yellow
        $body | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
    }
} else {
    Write-Host "ERROR: Failed to invoke Lambda" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

# Cleanup
Remove-Item "test-event.json" -Force -ErrorAction SilentlyContinue
Remove-Item "response.json" -Force -ErrorAction SilentlyContinue

Write-Host ""
