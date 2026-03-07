# Create Test Products Script
# Creates 3 test products in the system

$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Create Test Products" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

# Get authentication credentials
$username = $env:TEST_USERNAME
$password = $env:TEST_PASSWORD
$clientId = $env:COGNITO_CLIENT_ID
$region = $env:AWS_REGION

# If credentials not in .env, prompt for token
if (-not $username -or -not $password) {
    Write-Host "No test credentials found in .env file" -ForegroundColor Yellow
    Write-Host ""
    $TOKEN = Read-Host "Enter your JWT token (from browser localStorage 'gp_access_token')"
    
    if ([string]::IsNullOrWhiteSpace($TOKEN)) {
        Write-Host "❌ Error: Token is required" -ForegroundColor Red
        exit 1
    }
} else {
    # Authenticate with Cognito
    Write-Host "Authenticating with Cognito..." -ForegroundColor Cyan
    try {
        $authResult = aws cognito-idp initiate-auth `
            --auth-flow USER_PASSWORD_AUTH `
            --client-id $clientId `
            --auth-parameters "USERNAME=$username,PASSWORD=$password" `
            --region $region | ConvertFrom-Json
        
        if (-not $authResult.AuthenticationResult.IdToken) {
            Write-Host "❌ Authentication failed" -ForegroundColor Red
            exit 1
        }
        
        $TOKEN = $authResult.AuthenticationResult.IdToken
        Write-Host "✅ Authentication successful" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Authentication error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
}

# Product 1: Organic Cotton T-Shirt - Black
Write-Host ""
Write-Host "Creating Product 1: Organic Cotton T-Shirt - Black..." -ForegroundColor Yellow

$product1 = @{
    name = "Organic Cotton T-Shirt - Black"
    description = "Premium black t-shirt made from 100% certified organic cotton"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Organic Cotton"
                percentage = 100
                weight = 0.18
                emissionFactor = 3.2
                countryOfOrigin = "India"
                recycled = $false
                certification = "GOTS Certified"
                calculatedEmission = 0.576
            }
        )
        manufacturing = @{
            factoryLocation = "India"
            energyConsumption = 2.0
            energyEmissionFactor = 0.7
            dyeingMethod = "Natural Dyes"
            waterConsumption = 40
            wasteGenerated = 0.015
            calculatedEmission = 1.4
        }
        packaging = @{
            materialType = "Recycled Cardboard"
            weight = 0.04
            emissionFactor = 0.8
            recyclable = $true
            calculatedEmission = 0.032
        }
        transport = @{
            mode = "Ship"
            distance = 7500
            fuelType = "Heavy Fuel Oil"
            emissionFactorPerKm = 0.012
            calculatedEmission = 90.0
        }
        usage = @{
            avgWashCycles = 60
            washTemperature = 30
            dryerUse = $false
            calculatedEmission = 3.6
        }
        endOfLife = @{
            recyclable = $true
            biodegradable = $true
            takebackProgram = $true
            disposalEmission = 0.3
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $product1 -ErrorAction Stop
    Write-Host "✅ Product 1 created successfully!" -ForegroundColor Green
    Write-Host "   Product ID: $($response1.productId)" -ForegroundColor Gray
    Write-Host "   Carbon Footprint: $($response1.carbonFootprint) kg CO2" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create Product 1" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.message)" -ForegroundColor Red
    }
}

# Product 2: Combined Material T-Shirt - Blue
Write-Host ""
Write-Host "Creating Product 2: Combined Material T-Shirt - Blue..." -ForegroundColor Yellow

$product2 = @{
    name = "Combined Material T-Shirt - Blue"
    description = "Comfortable blue t-shirt with cotton-polyester blend for durability"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Cotton"
                percentage = 60
                weight = 0.12
                emissionFactor = 5.5
                countryOfOrigin = "USA"
                recycled = $false
                calculatedEmission = 0.66
            },
            @{
                name = "Polyester"
                percentage = 40
                weight = 0.08
                emissionFactor = 7.2
                countryOfOrigin = "China"
                recycled = $false
                calculatedEmission = 0.576
            }
        )
        manufacturing = @{
            factoryLocation = "China"
            energyConsumption = 3.0
            energyEmissionFactor = 0.9
            dyeingMethod = "Synthetic Dyes"
            waterConsumption = 60
            wasteGenerated = 0.025
            calculatedEmission = 2.7
        }
        packaging = @{
            materialType = "Plastic Bag"
            weight = 0.03
            emissionFactor = 2.5
            recyclable = $false
            calculatedEmission = 0.075
        }
        transport = @{
            mode = "Air"
            distance = 9000
            fuelType = "Jet Fuel"
            emissionFactorPerKm = 0.5
            calculatedEmission = 4500.0
        }
        usage = @{
            avgWashCycles = 80
            washTemperature = 40
            dryerUse = $true
            calculatedEmission = 8.0
        }
        endOfLife = @{
            recyclable = $false
            biodegradable = $false
            takebackProgram = $false
            disposalEmission = 1.2
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $product2 -ErrorAction Stop
    Write-Host "✅ Product 2 created successfully!" -ForegroundColor Green
    Write-Host "   Product ID: $($response2.productId)" -ForegroundColor Gray
    Write-Host "   Carbon Footprint: $($response2.carbonFootprint) kg CO2" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create Product 2" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.message)" -ForegroundColor Red
    }
}

# Product 3: Cotton Casual Pant
Write-Host ""
Write-Host "Creating Product 3: Cotton Casual Pant..." -ForegroundColor Yellow

$product3 = @{
    name = "Cotton Casual Pant"
    description = "Versatile casual pants made from cotton blend for everyday comfort"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Cotton Blend"
                percentage = 100
                weight = 0.35
                emissionFactor = 4.8
                countryOfOrigin = "Bangladesh"
                recycled = $false
                calculatedEmission = 1.68
            }
        )
        manufacturing = @{
            factoryLocation = "Bangladesh"
            energyConsumption = 3.5
            energyEmissionFactor = 0.85
            dyeingMethod = "Low-Impact Dyes"
            waterConsumption = 75
            wasteGenerated = 0.03
            calculatedEmission = 2.975
        }
        packaging = @{
            materialType = "Recycled Paper"
            weight = 0.06
            emissionFactor = 0.7
            recyclable = $true
            calculatedEmission = 0.042
        }
        transport = @{
            mode = "Ship"
            distance = 8500
            fuelType = "Heavy Fuel Oil"
            emissionFactorPerKm = 0.013
            calculatedEmission = 110.5
        }
        usage = @{
            avgWashCycles = 70
            washTemperature = 30
            dryerUse = $false
            calculatedEmission = 4.2
        }
        endOfLife = @{
            recyclable = $true
            biodegradable = $false
            takebackProgram = $true
            disposalEmission = 0.4
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $product3 -ErrorAction Stop
    Write-Host "✅ Product 3 created successfully!" -ForegroundColor Green
    Write-Host "   Product ID: $($response3.productId)" -ForegroundColor Gray
    Write-Host "   Carbon Footprint: $($response3.carbonFootprint) kg CO2" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create Product 3" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorDetails.message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test products creation completed!" -ForegroundColor Green
Write-Host "Check the product list at: https://d1iqxqvvvqvqvq.cloudfront.net/products" -ForegroundColor Cyan
