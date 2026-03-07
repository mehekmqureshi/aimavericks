# Test the correct Lambda function that API Gateway calls

Write-Host "=== Testing gp-listProducts-dev Lambda ===" -ForegroundColor Cyan
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

# Save to file (ASCII encoding to avoid UTF-8 BOM issues)
[System.IO.File]::WriteAllText("test-event.json", $testEvent)

Write-Host "Invoking gp-listProducts-dev Lambda..." -ForegroundColor Cyan
$result = aws lambda invoke `
    --function-name gp-listProducts-dev `
    --region $region `
    --payload "file://test-event.json" `
    --cli-binary-format raw-in-base64-out `
    response.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Lambda invoked successfully" -ForegroundColor Green
    Write-Host ""
    
    # Read response
    if (Test-Path response.json) {
        $response = Get-Content response.json -Raw | ConvertFrom-Json
        
        Write-Host "Response:" -ForegroundColor Yellow
        Write-Host "Status Code: $($response.statusCode)" -ForegroundColor $(if ($response.statusCode -eq 200) { "Green" } else { "Red" })
        
        if ($response.body) {
            $body = $response.body | ConvertFrom-Json
            Write-Host "Product Count: $($body.count)" -ForegroundColor Green
            Write-Host ""
            Write-Host "Sample Products:" -ForegroundColor Yellow
            $body.products | Select-Object -First 3 | ForEach-Object {
                Write-Host "  - $($_.name) ($($_.category))" -ForegroundColor Gray
                Write-Host "    Carbon: $($_.carbonFootprint) kg CO2" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "ERROR: Failed to invoke Lambda" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

# Cleanup
Remove-Item "test-event.json" -Force -ErrorAction SilentlyContinue
Remove-Item "response.json" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Now test in browser ===" -ForegroundColor Cyan
Write-Host "1. Go to https://d3jj1t5hp20hlp.cloudfront.net/products" -ForegroundColor Yellow
Write-Host "2. Click the Retry button" -ForegroundColor Yellow
Write-Host "3. Products should now appear!" -ForegroundColor Yellow
