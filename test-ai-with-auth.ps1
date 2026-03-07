# Test AI Generation with Authentication

$API_ID = "325xzv9pli"
$REGION = "us-east-1"

Write-Host "Testing AI Generation Endpoint" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Test Lambda directly (bypasses API Gateway auth)
Write-Host "Testing Lambda function directly..." -ForegroundColor Yellow
Write-Host ""

$payload = @{
    body = '{"productName":"Organic Cotton T-Shirt","category":"Apparel"}'
    requestContext = @{
        requestId = "test-request-123"
        authorizer = @{
            claims = @{
                sub = "test-manufacturer-id"
            }
        }
    }
} | ConvertTo-Json -Depth 10

$payload | Out-File -FilePath "$env:TEMP\lambda-test-payload.json" -Encoding utf8

Write-Host "Invoking Lambda..."
$result = aws lambda invoke --function-name gp-aiGenerate-dev --region $REGION --payload file://$env:TEMP\lambda-test-payload.json "$env:TEMP\lambda-response.json" 2>&1

Write-Host $result
Write-Host ""

if (Test-Path "$env:TEMP\lambda-response.json") {
    Write-Host "Lambda Response:" -ForegroundColor Green
    $response = Get-Content "$env:TEMP\lambda-response.json" | ConvertFrom-Json
    
    Write-Host "Status Code: $($response.statusCode)"
    
    if ($response.statusCode -eq 200) {
        $body = $response.body | ConvertFrom-Json
        Write-Host ""
        Write-Host "SUCCESS! Generated Content:" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host $body.generatedContent
        Write-Host "======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Timestamp: $($body.timestamp)"
    } else {
        Write-Host ""
        Write-Host "ERROR Response:" -ForegroundColor Red
        Write-Host $response.body
    }
} else {
    Write-Host "ERROR: No response file created" -ForegroundColor Red
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If this test succeeded, the AI generation is working!"
Write-Host "The 'Network Error' in the frontend is likely due to:"
Write-Host "1. User not logged in (no JWT token)"
Write-Host "2. JWT token expired"
Write-Host "3. Frontend making request before user authentication completes"
Write-Host ""
Write-Host "To fix in the app:"
Write-Host "1. Ensure user is logged in"
Write-Host "2. Check browser DevTools -> Application -> Local Storage for 'gp_access_token'"
Write-Host "3. Try logging out and logging back in"

# Cleanup
Remove-Item -Path "$env:TEMP\lambda-test-payload.json" -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\lambda-response.json" -ErrorAction SilentlyContinue
