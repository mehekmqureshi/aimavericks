# Deploy listProducts Lambda Function

Write-Host "=== Deploying listProducts Lambda ===" -ForegroundColor Cyan
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
node bundle-listProducts.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Bundling failed" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Lambda bundled" -ForegroundColor Green
Write-Host ""

# Step 2: Package Lambda
Write-Host "Step 2: Packaging Lambda..." -ForegroundColor Cyan
$lambdaDir = "dist/lambdas/listProducts"
$zipFile = "listProducts.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# The bundled file is already in the correct location with all dependencies
# No need to copy node_modules since everything is bundled

# Create ZIP
Compress-Archive -Path "$lambdaDir/*" -DestinationPath $zipFile -Force
Write-Host "SUCCESS: Lambda packaged to $zipFile" -ForegroundColor Green
Write-Host ""

# Step 3: Check if Lambda exists
Write-Host "Step 3: Checking if Lambda function exists..." -ForegroundColor Cyan
$functionName = "gp-listProducts-dev"  # This is the function API Gateway is calling
$lambdaExists = $false

aws lambda get-function --function-name $functionName --region $region 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $lambdaExists = $true
    Write-Host "Lambda function exists - will update" -ForegroundColor Yellow
} else {
    Write-Host "Lambda function does not exist - will create" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Create or Update Lambda
if ($lambdaExists) {
    Write-Host "Step 4: Updating Lambda function code..." -ForegroundColor Cyan
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
} else {
    Write-Host "Step 4: Creating Lambda function..." -ForegroundColor Cyan
    
    # Create IAM role first if it doesn't exist
    $roleName = "listProducts-lambda-role"
    $roleArn = "arn:aws:iam::${accountId}:role/${roleName}"
    
    Write-Host "Checking if IAM role exists..." -ForegroundColor Gray
    aws iam get-role --role-name $roleName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating IAM role..." -ForegroundColor Gray
        
        # Create trust policy
        $trustPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
        
        $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding ascii -NoNewline
        
        aws iam create-role `
            --role-name $roleName `
            --assume-role-policy-document "file://trust-policy.json" `
            --region $region
        
        # Attach policies
        aws iam attach-role-policy `
            --role-name $roleName `
            --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" `
            --region $region
        
        # Attach DynamoDB policy
        $dynamoPolicy = "{`"Version`":`"2012-10-17`",`"Statement`":[{`"Effect`":`"Allow`",`"Action`":[`"dynamodb:Query`",`"dynamodb:GetItem`"],`"Resource`":[`"arn:aws:dynamodb:${region}:${accountId}:table/Products`",`"arn:aws:dynamodb:${region}:${accountId}:table/Products/index/manufacturerId-index`"]}]}"
        
        $dynamoPolicy | Out-File -FilePath "dynamo-policy.json" -Encoding ascii -NoNewline
        
        aws iam put-role-policy `
            --role-name $roleName `
            --policy-name "DynamoDBAccess" `
            --policy-document "file://dynamo-policy.json" `
            --region $region
        
        Write-Host "Waiting 10 seconds for IAM role to propagate..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
        
        Remove-Item "trust-policy.json" -Force
        Remove-Item "dynamo-policy.json" -Force
    }
    
    # Create Lambda function
    aws lambda create-function `
        --function-name $functionName `
        --runtime nodejs20.x `
        --role $roleArn `
        --handler index.handler `
        --zip-file "fileb://$zipFile" `
        --timeout 30 `
        --memory-size 256 `
        --environment "Variables={PRODUCTS_TABLE_NAME=Products}" `
        --region $region
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Lambda function created" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create Lambda function" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 5: Grant API Gateway permission to invoke Lambda
Write-Host "Step 5: Granting API Gateway permission..." -ForegroundColor Cyan
$apiId = "325xzv9pli"  # From frontend/.env
$sourceArn = "arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*"

aws lambda add-permission `
    --function-name $functionName `
    --statement-id apigateway-invoke `
    --action lambda:InvokeFunction `
    --principal apigateway.amazonaws.com `
    --source-arn $sourceArn `
    --region $region 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: API Gateway permission granted" -ForegroundColor Green
} else {
    Write-Host "Permission may already exist (this is OK)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the API endpoint from the frontend" -ForegroundColor Gray
Write-Host "2. Check CloudWatch logs if there are any errors" -ForegroundColor Gray
