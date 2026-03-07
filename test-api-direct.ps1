# Direct API test script

Write-Host "=== Testing API Gateway Directly ===" -ForegroundColor Cyan
Write-Host ""

# Load frontend .env
if (Test-Path frontend/.env) {
    Get-Content frontend/.env | ForEach-Object {
        if ($_ -match '^VITE_API_GATEWAY_URL=(.*)$') {
            $apiUrl = $matches[1].Trim()
        }
        if ($_ -match '^VITE_COGNITO_REGION=(.*)$') {
            $region = $matches[1].Trim()
        }
    }
    Write-Host "API URL: $apiUrl" -ForegroundColor Yellow
    Write-Host "Region: $region" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: frontend/.env not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 1: Check if Lambda exists
Write-Host "Step 1: Checking Lambda function..." -ForegroundColor Cyan
aws lambda get-function --function-name listProducts --region $region --query 'Configuration.[FunctionName,State,LastModified]' --output table

Write-Host ""

# Step 2: Check DynamoDB table and GSI
Write-Host "Step 2: Checking DynamoDB table and GSI..." -ForegroundColor Cyan
aws dynamodb describe-table --table-name Products --region $region --query 'Table.[TableName,TableStatus,ItemCount,GlobalSecondaryIndexes[0].[IndexName,IndexStatus]]' --output table

Write-Host ""

# Step 3: Scan for products
Write-Host "Step 3: Scanning for products in DynamoDB..." -ForegroundColor Cyan
aws dynamodb scan --table-name Products --region $region --max-items 3 --output json | ConvertFrom-Json | Select-Object -ExpandProperty Items | ForEach-Object {
    Write-Host "Product ID: $($_.productId.S)" -ForegroundColor Green
    Write-Host "  Manufacturer ID: $($_.manufacturerId.S)" -ForegroundColor Gray
    Write-Host "  Name: $($_.name.S)" -ForegroundColor Gray
    Write-Host ""
}

# Step 4: Check CloudWatch logs
Write-Host "Step 4: Checking CloudWatch logs for errors..." -ForegroundColor Cyan
$logGroup = "/aws/lambda/listProducts"
$streams = aws logs describe-log-streams --log-group-name $logGroup --region $region --order-by LastEventTime --descending --max-items 1 --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    $streamsJson = $streams | ConvertFrom-Json
    if ($streamsJson.logStreams.Count -gt 0) {
        $latestStream = $streamsJson.logStreams[0].logStreamName
        Write-Host "Latest log stream: $latestStream" -ForegroundColor Gray
        Write-Host ""
        
        $logs = aws logs get-log-events --log-group-name $logGroup --log-stream-name $latestStream --region $region --limit 30 --output json | ConvertFrom-Json
        
        Write-Host "Recent log events:" -ForegroundColor Yellow
        foreach ($event in $logs.events) {
            $msg = $event.message
            if ($msg -match "ERROR|Error|error|WARN|Warning") {
                Write-Host $msg -ForegroundColor Red
            } else {
                Write-Host $msg -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "No log streams found - Lambda may not have been invoked yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "Could not access CloudWatch logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
