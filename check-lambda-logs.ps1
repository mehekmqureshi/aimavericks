# Check CloudWatch logs for listProducts Lambda errors

Write-Host "=== Checking listProducts Lambda Logs ===" -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$logGroup = "/aws/lambda/listProducts"

# Get the most recent log streams
Write-Host "Fetching recent log streams..." -ForegroundColor Yellow
$streams = aws logs describe-log-streams `
    --log-group-name $logGroup `
    --region $region `
    --order-by LastEventTime `
    --descending `
    --max-items 3 `
    --output json 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not access CloudWatch logs" -ForegroundColor Red
    Write-Host "The log group may not exist yet or there may be a permissions issue" -ForegroundColor Yellow
    exit 1
}

$streamsJson = $streams | ConvertFrom-Json

if ($streamsJson.logStreams.Count -eq 0) {
    Write-Host "No log streams found - Lambda has not been invoked yet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try accessing the Products List page in the browser, then run this script again" -ForegroundColor Gray
    exit 0
}

Write-Host "Found $($streamsJson.logStreams.Count) recent log streams" -ForegroundColor Green
Write-Host ""

# Get logs from the most recent stream
foreach ($stream in $streamsJson.logStreams) {
    $streamName = $stream.logStreamName
    Write-Host "=== Log Stream: $streamName ===" -ForegroundColor Cyan
    Write-Host "Last Event: $($stream.lastEventTime)" -ForegroundColor Gray
    Write-Host ""
    
    $logs = aws logs get-log-events `
        --log-group-name $logGroup `
        --log-stream-name $streamName `
        --region $region `
        --limit 50 `
        --output json | ConvertFrom-Json
    
    foreach ($event in $logs.events) {
        $msg = $event.message
        
        # Color code based on content
        if ($msg -match "ERROR|Error|error|Exception|Failed") {
            Write-Host $msg -ForegroundColor Red
        } elseif ($msg -match "WARN|Warning|warning") {
            Write-Host $msg -ForegroundColor Yellow
        } elseif ($msg -match "START|END|REPORT") {
            Write-Host $msg -ForegroundColor Cyan
        } else {
            Write-Host $msg -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

Write-Host "=== Analysis ===" -ForegroundColor Cyan
Write-Host "Look for:" -ForegroundColor Yellow
Write-Host "  - Authentication errors (401, Unauthorized)" -ForegroundColor Gray
Write-Host "  - DynamoDB errors (ResourceNotFoundException, AccessDenied)" -ForegroundColor Gray
Write-Host "  - Timeout errors" -ForegroundColor Gray
Write-Host "  - Module not found errors" -ForegroundColor Gray
Write-Host ""
