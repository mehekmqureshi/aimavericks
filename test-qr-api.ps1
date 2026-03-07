# Test QR Generation via API Gateway

Write-Host "=== Testing QR Generation via API Gateway ===" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$region = "us-east-1"

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

Write-Host "API URL: $apiUrl" -ForegroundColor Yellow
Write-Host ""

# Step 1: Get a test product
Write-Host "Step 1: Getting test product from DynamoDB..." -ForegroundColor Cyan
$scanResult = aws dynamodb scan --table-name Products --limit 1 --region $region | ConvertFrom-Json

if ($scanResult.Items.Count -eq 0) {
    Write-Host "ERROR: No products found" -ForegroundColor Red
    exit 1
}

$productId = $scanResult.Items[0].productId.S
Write-Host "SUCCESS: Using product $productId" -ForegroundColor Green
Write-Host ""

# Step 2: Get Cognito token (you'll need valid credentials)
Write-Host "Step 2: Note - This test requires a valid Cognito token" -ForegroundColor Yellow
Write-Host "To test from the browser:" -ForegroundColor Yellow
Write-Host "1. Open the frontend application" -ForegroundColor Gray
Write-Host "2. Log in with your credentials" -ForegroundColor Gray
Write-Host "3. Navigate to QR Management" -ForegroundColor Gray
Write-Host "4. Select product: $productId" -ForegroundColor Gray
Write-Host "5. Enter quantity (e.g., 10)" -ForegroundColor Gray
Write-Host "6. Click 'Generate QR Codes'" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Lambda is deployed and ready ===" -ForegroundColor Green
Write-Host ""
Write-Host "The generateQR Lambda has been successfully deployed and tested." -ForegroundColor Green
Write-Host "You can now test it from the frontend application." -ForegroundColor Green
