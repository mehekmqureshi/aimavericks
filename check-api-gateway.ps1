# Check API Gateway Configuration

Write-Host "=== Checking API Gateway Configuration ===" -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$apiId = "325xzv9pli"

# Step 1: Get API Gateway details
Write-Host "Step 1: Getting API Gateway details..." -ForegroundColor Cyan
$apiInfo = aws apigateway get-rest-api --rest-api-id $apiId --region $region 2>&1

if ($LASTEXITCODE -eq 0) {
    $api = $apiInfo | ConvertFrom-Json
    Write-Host "API Name: $($api.name)" -ForegroundColor Green
    Write-Host "API ID: $($api.id)" -ForegroundColor Green
    Write-Host "Created: $($api.createdDate)" -ForegroundColor Gray
} else {
    Write-Host "ERROR: Could not get API details" -ForegroundColor Red
    Write-Host $apiInfo -ForegroundColor Red
}
Write-Host ""

# Step 2: Get resources
Write-Host "Step 2: Getting API resources..." -ForegroundColor Cyan
$resources = aws apigateway get-resources --rest-api-id $apiId --region $region --output json 2>&1 | ConvertFrom-Json

$productsResource = $resources.items | Where-Object { $_.path -eq "/products" }

if ($productsResource) {
    Write-Host "Found /products resource" -ForegroundColor Green
    Write-Host "  Resource ID: $($productsResource.id)" -ForegroundColor Gray
    Write-Host "  Path: $($productsResource.path)" -ForegroundColor Gray
    
    # Check methods
    if ($productsResource.resourceMethods) {
        Write-Host "  Methods:" -ForegroundColor Gray
        $productsResource.resourceMethods.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "ERROR: /products resource not found!" -ForegroundColor Red
}
Write-Host ""

# Step 3: Check GET method on /products
Write-Host "Step 3: Checking GET method configuration..." -ForegroundColor Cyan
if ($productsResource) {
    $method = aws apigateway get-method --rest-api-id $apiId --resource-id $productsResource.id --http-method GET --region $region 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $methodJson = $method | ConvertFrom-Json
        Write-Host "GET method exists" -ForegroundColor Green
        Write-Host "  Authorization Type: $($methodJson.authorizationType)" -ForegroundColor Gray
        
        # Check integration
        if ($methodJson.methodIntegration) {
            Write-Host "  Integration Type: $($methodJson.methodIntegration.type)" -ForegroundColor Gray
            Write-Host "  Integration URI: $($methodJson.methodIntegration.uri)" -ForegroundColor Gray
        }
    } else {
        Write-Host "ERROR: GET method not found on /products" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Check deployment
Write-Host "Step 4: Checking deployments..." -ForegroundColor Cyan
$deployments = aws apigateway get-deployments --rest-api-id $apiId --region $region --output json 2>&1 | ConvertFrom-Json

if ($deployments.items.Count -gt 0) {
    $latest = $deployments.items | Sort-Object -Property createdDate -Descending | Select-Object -First 1
    Write-Host "Latest deployment:" -ForegroundColor Green
    Write-Host "  ID: $($latest.id)" -ForegroundColor Gray
    Write-Host "  Created: $($latest.createdDate)" -ForegroundColor Gray
    Write-Host "  Description: $($latest.description)" -ForegroundColor Gray
} else {
    Write-Host "WARNING: No deployments found" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Check stages
Write-Host "Step 5: Checking stages..." -ForegroundColor Cyan
$stages = aws apigateway get-stages --rest-api-id $apiId --region $region --output json 2>&1 | ConvertFrom-Json

$prodStage = $stages.item | Where-Object { $_.stageName -eq "prod" }

if ($prodStage) {
    Write-Host "Found 'prod' stage" -ForegroundColor Green
    Write-Host "  Stage Name: $($prodStage.stageName)" -ForegroundColor Gray
    Write-Host "  Deployment ID: $($prodStage.deploymentId)" -ForegroundColor Gray
    Write-Host "  Last Updated: $($prodStage.lastUpdatedDate)" -ForegroundColor Gray
} else {
    Write-Host "ERROR: 'prod' stage not found!" -ForegroundColor Red
}
Write-Host ""

# Step 6: Test endpoint with curl
Write-Host "Step 6: Testing endpoint (without auth)..." -ForegroundColor Cyan
$testUrl = "https://$apiId.execute-api.$region.amazonaws.com/prod/products"
Write-Host "URL: $testUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -ErrorAction Stop
    Write-Host "SUCCESS: Endpoint is accessible" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "Expected error (no auth token):" -ForegroundColor Yellow
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "  Message: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "If you see errors above, the API Gateway may need to be redeployed" -ForegroundColor Yellow
Write-Host "or the /products endpoint may need to be reconfigured." -ForegroundColor Yellow
