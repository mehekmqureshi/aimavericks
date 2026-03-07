# Diagnose QR Generation Error
# This script checks the QR generation Lambda and API Gateway configuration

Write-Host "=== QR Generation Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check if Lambda exists
Write-Host "1. Checking Lambda function..." -ForegroundColor Yellow
$lambdaName = "gp-generateQR-dev"
try {
    $lambda = aws lambda get-function --function-name $lambdaName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK Lambda exists: $lambdaName" -ForegroundColor Green
        
        # Get Lambda configuration
        $config = aws lambda get-function-configuration --function-name $lambdaName | ConvertFrom-Json
        Write-Host "   Runtime: $($config.Runtime)" -ForegroundColor Gray
        Write-Host "   Memory: $($config.MemorySize) MB" -ForegroundColor Gray
        Write-Host "   Timeout: $($config.Timeout) seconds" -ForegroundColor Gray
        
        # Check environment variables
        Write-Host "   Environment Variables:" -ForegroundColor Gray
        $config.Environment.Variables.PSObject.Properties | ForEach-Object {
            Write-Host "     - $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ERROR Lambda not found: $lambdaName" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR checking Lambda: $_" -ForegroundColor Red
}

Write-Host ""

# Check recent Lambda logs
Write-Host "2. Checking recent Lambda logs..." -ForegroundColor Yellow
try {
    $logGroup = "/aws/lambda/$lambdaName"
    $streams = aws logs describe-log-streams --log-group-name $logGroup --order-by LastEventTime --descending --max-items 1 | ConvertFrom-Json
    
    if ($streams.logStreams.Count -gt 0) {
        $latestStream = $streams.logStreams[0].logStreamName
        Write-Host "   Latest log stream: $latestStream" -ForegroundColor Gray
        
        # Get recent log events
        $logs = aws logs get-log-events --log-group-name $logGroup --log-stream-name $latestStream --limit 20 | ConvertFrom-Json
        
        Write-Host "   Recent log entries:" -ForegroundColor Gray
        $logs.events | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime
            Write-Host "     [$timestamp] $($_.message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No log streams found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERROR checking logs: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Diagnostics Complete ===" -ForegroundColor Cyan
