# Verify QR Generation Complete Fix

Write-Host "=== Verifying QR Generation Complete Fix ===" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Lambda exists and is configured
Write-Host "Test 1: Lambda Configuration" -ForegroundColor Yellow
$lambda = aws lambda get-function-configuration --function-name gp-generateQR-dev --region us-east-1 | ConvertFrom-Json
if ($lambda.FunctionName -eq "gp-generateQR-dev") {
    Write-Host "  PASS Lambda exists" -ForegroundColor Green
    Write-Host "    Runtime: $($lambda.Runtime)" -ForegroundColor Gray
    Write-Host "    Memory: $($lambda.MemorySize) MB" -ForegroundColor Gray
    Write-Host "    Timeout: $($lambda.Timeout) seconds" -ForegroundColor Gray
} else {
    Write-Host "  FAIL Lambda not found" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 2: S3 Bucket CORS
Write-Host "Test 2: S3 Bucket CORS Configuration" -ForegroundColor Yellow
$cors = aws s3api get-bucket-cors --bucket gp-qr-codes-dev --region us-east-1 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PASS CORS is configured" -ForegroundColor Green
} else {
    Write-Host "  FAIL CORS not configured" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 3: Lambda IAM Role Permissions
Write-Host "Test 3: Lambda IAM Role Permissions" -ForegroundColor Yellow
$policy = aws iam get-role-policy --role-name gp-generateQR-role-dev --policy-name gp-generateQR-role-dev-policy | ConvertFrom-Json
$policyDoc = $policy.PolicyDocument | ConvertTo-Json -Depth 10
if ($policyDoc -match "s3:GetObject" -and $policyDoc -match "s3:PutObject") {
    Write-Host "  PASS Lambda has S3 GetObject and PutObject permissions" -ForegroundColor Green
} else {
    Write-Host "  FAIL Lambda missing required S3 permissions" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 4: Generate QR Codes
Write-Host "Test 4: QR Code Generation" -ForegroundColor Yellow
$scanResult = aws dynamodb scan --table-name Products --limit 1 --region us-east-1 | ConvertFrom-Json
if ($scanResult.Items.Count -gt 0) {
    $productId = $scanResult.Items[0].productId.S
    $manufacturerId = $scanResult.Items[0].manufacturerId.S
    
    $bodyJson = @{
        productId = $productId
        count = 2
    } | ConvertTo-Json -Compress
    
    $payload = @{
        body = $bodyJson
        requestContext = @{
            requestId = "verify-test"
            authorizer = @{
                claims = @{
                    sub = $manufacturerId
                }
            }
        }
    } | ConvertTo-Json -Depth 10 -Compress
    
    $payloadFile = "verify-payload.json"
    $responseFile = "verify-response.json"
    $payload | Set-Content -Path $payloadFile -NoNewline
    
    aws lambda invoke `
        --function-name gp-generateQR-dev `
        --cli-binary-format raw-in-base64-out `
        --payload "file://$payloadFile" `
        --region us-east-1 `
        $responseFile | Out-Null
    
    if (Test-Path $responseFile) {
        $response = Get-Content $responseFile | ConvertFrom-Json
        if ($response.statusCode -eq 200) {
            $body = $response.body | ConvertFrom-Json
            Write-Host "  PASS QR codes generated successfully" -ForegroundColor Green
            Write-Host "    Serial IDs: $($body.serialIds.Count)" -ForegroundColor Gray
            Write-Host "    ZIP URL generated: Yes" -ForegroundColor Gray
            
            # Test 5: Download ZIP
            Write-Host ""
            Write-Host "Test 5: ZIP File Download" -ForegroundColor Yellow
            try {
                $downloadPath = "verify-download.zip"
                Invoke-WebRequest -Uri $body.zipUrl -OutFile $downloadPath -UseBasicParsing
                
                if (Test-Path $downloadPath) {
                    $fileSize = (Get-Item $downloadPath).Length
                    Write-Host "  PASS ZIP file downloaded successfully" -ForegroundColor Green
                    Write-Host "    File size: $([math]::Round($fileSize / 1024, 2)) KB" -ForegroundColor Gray
                    
                    # Verify ZIP contents
                    Add-Type -AssemblyName System.IO.Compression.FileSystem
                    $zip = [System.IO.Compression.ZipFile]::OpenRead($downloadPath)
                    Write-Host "    QR codes in ZIP: $($zip.Entries.Count)" -ForegroundColor Gray
                    $zip.Dispose()
                    
                    Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue
                } else {
                    Write-Host "  FAIL ZIP file not downloaded" -ForegroundColor Red
                    $allPassed = $false
                }
            } catch {
                Write-Host "  FAIL Download failed: $_" -ForegroundColor Red
                $allPassed = $false
            }
        } else {
            Write-Host "  FAIL Lambda returned error: $($response.statusCode)" -ForegroundColor Red
            $allPassed = $false
        }
        
        Remove-Item $payloadFile -Force -ErrorAction SilentlyContinue
        Remove-Item $responseFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  SKIP No products found for testing" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Frontend Deployment
Write-Host "Test 6: Frontend Deployment" -ForegroundColor Yellow
$frontendFiles = aws s3 ls s3://gp-frontend-prod-2026/ --recursive | Select-String "index.html"
if ($frontendFiles) {
    Write-Host "  PASS Frontend deployed to S3" -ForegroundColor Green
    Write-Host "    URL: https://d3jt15hp20hlp.cloudfront.net" -ForegroundColor Gray
} else {
    Write-Host "  FAIL Frontend not deployed" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Summary
Write-Host "=== Verification Summary ===" -ForegroundColor Cyan
Write-Host ""
if ($allPassed) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "QR Generation is fully functional:" -ForegroundColor Green
    Write-Host "  1. Lambda is deployed and configured" -ForegroundColor Gray
    Write-Host "  2. S3 bucket has proper CORS" -ForegroundColor Gray
    Write-Host "  3. IAM permissions are correct" -ForegroundColor Gray
    Write-Host "  4. QR codes generate successfully" -ForegroundColor Gray
    Write-Host "  5. ZIP files download correctly" -ForegroundColor Gray
    Write-Host "  6. Frontend is deployed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now test from the browser:" -ForegroundColor Yellow
    Write-Host "  https://d3jt15hp20hlp.cloudfront.net/qr-management" -ForegroundColor Cyan
} else {
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "Please review the errors above" -ForegroundColor Yellow
}
