# Fix QR Codes S3 Bucket Access

Write-Host "=== Fixing QR Codes S3 Bucket Access ===" -ForegroundColor Cyan
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

$bucketName = "gp-qr-codes-dev"
$region = $env:AWS_REGION
$accountId = $env:AWS_ACCOUNT_ID

Write-Host "Bucket: $bucketName" -ForegroundColor Yellow
Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host ""

# Step 1: Configure CORS
Write-Host "Step 1: Configuring CORS..." -ForegroundColor Cyan

$corsConfig = @"
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
"@

$corsFile = "cors-config.json"
[System.IO.File]::WriteAllText($corsFile, $corsConfig, [System.Text.Encoding]::ASCII)

aws s3api put-bucket-cors --bucket $bucketName --cors-configuration "file://$corsFile" --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: CORS configured" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to configure CORS" -ForegroundColor Red
}

Remove-Item $corsFile -Force -ErrorAction SilentlyContinue
Write-Host ""

# Step 2: Configure Bucket Policy for signed URLs
Write-Host "Step 2: Configuring bucket policy..." -ForegroundColor Cyan

$bucketPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSignedURLAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$bucketName/qr-codes/*"
        }
    ]
}
"@

$policyFile = "bucket-policy.json"
[System.IO.File]::WriteAllText($policyFile, $bucketPolicy, [System.Text.Encoding]::ASCII)

aws s3api put-bucket-policy --bucket $bucketName --policy "file://$policyFile" --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Bucket policy configured" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to configure bucket policy" -ForegroundColor Red
}

Remove-Item $policyFile -Force -ErrorAction SilentlyContinue
Write-Host ""

# Step 3: Verify configuration
Write-Host "Step 3: Verifying configuration..." -ForegroundColor Cyan

Write-Host "Checking CORS..." -ForegroundColor Gray
$corsCheck = aws s3api get-bucket-cors --bucket $bucketName --region $region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK CORS is configured" -ForegroundColor Green
} else {
    Write-Host "  ERROR CORS check failed" -ForegroundColor Red
}

Write-Host "Checking bucket policy..." -ForegroundColor Gray
$policyCheck = aws s3api get-bucket-policy --bucket $bucketName --region $region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Bucket policy is configured" -ForegroundColor Green
} else {
    Write-Host "  ERROR Bucket policy check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Configuration Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test QR generation from the frontend" -ForegroundColor Gray
Write-Host "2. Click 'Download QR Codes ZIP' button" -ForegroundColor Gray
Write-Host "3. ZIP file should download successfully" -ForegroundColor Gray
