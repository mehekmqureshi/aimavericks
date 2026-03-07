# Deploy generateQR Lambda Function

Write-Host "=== Deploying generateQR Lambda ===" -ForegroundColor Cyan
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

$region = $env:AWS_REGION
$accountId = $env:AWS_ACCOUNT_ID

if (-not $region -or -not $accountId) {
    Write-Host "ERROR: AWS_REGION or AWS_ACCOUNT_ID not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host "Account ID: $accountId" -ForegroundColor Yellow
Write-Host ""

# Step 1: Bundle Lambda with esbuild
Write-Host "Step 1: Bundling Lambda with esbuild..." -ForegroundColor Cyan
node bundle-generateQR.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Bundling failed" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Lambda bundled" -ForegroundColor Green
Write-Host ""

# Step 2: Package Lambda
Write-Host "Step 2: Packaging Lambda..." -ForegroundColor Cyan
$lambdaDir = "dist/lambdas/generateQR"
$zipFile = "generateQR.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Create ZIP
Compress-Archive -Path "$lambdaDir/*" -DestinationPath $zipFile -Force
Write-Host "SUCCESS: Lambda packaged to $zipFile" -ForegroundColor Green
Write-Host ""

# Step 3: Update Lambda function code
Write-Host "Step 3: Updating Lambda function code..." -ForegroundColor Cyan
$functionName = "gp-generateQR-dev"

aws lambda update-function-code `
    --function-name $functionName `
    --zip-file "fileb://$zipFile" `
    --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Lambda function updated" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to update Lambda function" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Wait for update to complete
Write-Host "Step 4: Waiting for Lambda update to complete..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Check Lambda status
$status = aws lambda get-function --function-name $functionName --region $region | ConvertFrom-Json
Write-Host "Lambda State: $($status.Configuration.State)" -ForegroundColor Gray
Write-Host "Last Update Status: $($status.Configuration.LastUpdateStatus)" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the QR generation from the frontend" -ForegroundColor Gray
Write-Host "2. Check CloudWatch logs if there are any errors" -ForegroundColor Gray
