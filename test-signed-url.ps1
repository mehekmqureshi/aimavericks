# Test Signed URL Download

Write-Host "=== Testing Signed URL Download ===" -ForegroundColor Cyan
Write-Host ""

# Generate a new QR batch and test the signed URL
Write-Host "Step 1: Generating QR codes..." -ForegroundColor Cyan

$region = "us-east-1"
$functionName = "gp-generateQR-dev"

# Get test product
$scanResult = aws dynamodb scan --table-name Products --limit 1 --region $region | ConvertFrom-Json
$productId = $scanResult.Items[0].productId.S
$manufacturerId = $scanResult.Items[0].manufacturerId.S

# Create payload
$bodyJson = @{
    productId = $productId
    count = 2
} | ConvertTo-Json -Compress

$payload = @{
    body = $bodyJson
    requestContext = @{
        requestId = "test-request-$(Get-Date -Format 'yyyyMMddHHmmss')"
        authorizer = @{
            claims = @{
                sub = $manufacturerId
            }
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

$payloadFile = "test-payload-url.json"
$responseFile = "test-response-url.json"

$payload | Set-Content -Path $payloadFile -NoNewline

# Invoke Lambda
aws lambda invoke `
    --function-name $functionName `
    --cli-binary-format raw-in-base64-out `
    --payload "file://$payloadFile" `
    --region $region `
    $responseFile | Out-Null

if (Test-Path $responseFile) {
    $response = Get-Content $responseFile | ConvertFrom-Json
    $body = $response.body | ConvertFrom-Json
    
    Write-Host "SUCCESS: QR codes generated" -ForegroundColor Green
    Write-Host "ZIP URL: $($body.zipUrl)" -ForegroundColor Gray
    Write-Host ""
    
    # Step 2: Test download with Invoke-WebRequest
    Write-Host "Step 2: Testing download with PowerShell..." -ForegroundColor Cyan
    try {
        $downloadPath = "test-qr-download.zip"
        Invoke-WebRequest -Uri $body.zipUrl -OutFile $downloadPath -UseBasicParsing
        
        if (Test-Path $downloadPath) {
            $fileSize = (Get-Item $downloadPath).Length
            Write-Host "SUCCESS: File downloaded!" -ForegroundColor Green
            Write-Host "  File size: $([math]::Round($fileSize / 1024, 2)) KB" -ForegroundColor Gray
            Write-Host "  Location: $downloadPath" -ForegroundColor Gray
            
            # Verify it's a valid ZIP
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $zip = [System.IO.Compression.ZipFile]::OpenRead($downloadPath)
                Write-Host "  ZIP entries: $($zip.Entries.Count)" -ForegroundColor Gray
                $zip.Entries | ForEach-Object {
                    Write-Host "    - $($_.Name)" -ForegroundColor Gray
                }
                $zip.Dispose()
                Write-Host ""
                Write-Host "SUCCESS: ZIP file is valid and contains QR codes!" -ForegroundColor Green
            } catch {
                Write-Host "WARNING: Could not verify ZIP contents: $_" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "ERROR: Download failed" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
    
    # Cleanup
    Remove-Item $payloadFile -Force -ErrorAction SilentlyContinue
    Remove-Item $responseFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
