# Test script to diagnose listProducts endpoint issue

Write-Host "=== Testing ListProducts Endpoint ===" -ForegroundColor Cyan
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
    Write-Host "Loaded .env file" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    exit 1
}

$apiUrl = $env:VITE_API_URL
$region = $env:AWS_REGION

if (-not $apiUrl) {
    Write-Host "ERROR: VITE_API_URL not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "API URL: $apiUrl" -ForegroundColor Yellow
Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check if listProducts Lambda exists
Write-Host "Step 1: Checking if listProducts Lambda function exists..." -ForegroundColor Cyan
$lambdaName = "listProducts"
$lambdaInfo = aws lambda get-function --function-name $lambdaName --region $region 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Lambda function exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Lambda function not found" -ForegroundColor Red
}
Write-Host ""

# Step 2: Check DynamoDB table
Write-Host "Step 2: Checking DynamoDB Products table..." -ForegroundColor Cyan
$tableName = "Products"
$tableInfo = aws dynamodb describe-table --table-name $tableName --region $region 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: DynamoDB table exists" -ForegroundColor Green
    
    # Check for GSI
    $tableJson = $tableInfo | ConvertFrom-Json
    $gsi = $tableJson.Table.GlobalSecondaryIndexes | Where-Object { $_.IndexName -eq 'manufacturerId-index' }
    if ($gsi) {
        Write-Host "SUCCESS: GSI 'manufacturerId-index' exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: GSI 'manufacturerId-index' NOT FOUND" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: DynamoDB table not found" -ForegroundColor Red
}
Write-Host ""

# Step 3: Check if there are any products in the table
Write-Host "Step 3: Checking for products in DynamoDB..." -ForegroundColor Cyan
$scanResult = aws dynamodb scan --table-name Products --region $region --max-items 5 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    $scanJson = $scanResult | ConvertFrom-Json
    $itemCount = $scanJson.Items.Count
    Write-Host "Found $itemCount products in table" -ForegroundColor Green
    
    if ($itemCount -gt 0) {
        Write-Host "Sample products:" -ForegroundColor Gray
        foreach ($item in $scanJson.Items) {
            $productId = $item.productId.S
            $manufacturerId = $item.manufacturerId.S
            Write-Host "  - ProductID: $productId" -ForegroundColor Gray
            Write-Host "    ManufacturerID: $manufacturerId" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "ERROR: Could not scan table" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check CloudWatch logs
Write-Host "Step 4: Checking recent CloudWatch logs..." -ForegroundColor Cyan
$logGroup = "/aws/lambda/listProducts"
$streams = aws logs describe-log-streams --log-group-name $logGroup --region $region --order-by LastEventTime --descending --max-items 1 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    $streamsJson = $streams | ConvertFrom-Json
    if ($streamsJson.logStreams.Count -gt 0) {
        $latestStream = $streamsJson.logStreams[0].logStreamName
        Write-Host "Latest log stream: $latestStream" -ForegroundColor Gray
        
        $logs = aws logs get-log-events --log-group-name $logGroup --log-stream-name $latestStream --region $region --limit 20 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            $logsJson = $logs | ConvertFrom-Json
            Write-Host "Recent log events:" -ForegroundColor Green
            foreach ($event in $logsJson.events) {
                Write-Host $event.message -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "No log streams found" -ForegroundColor Yellow
    }
} else {
    Write-Host "Could not access CloudWatch logs" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Diagnosis Complete ===" -ForegroundColor Cyan
