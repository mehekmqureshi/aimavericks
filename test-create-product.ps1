# Test Create Product Endpoint
# This script tests the /products endpoint with authentication

$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "Testing Create Product Endpoint..." -ForegroundColor Cyan
Write-Host ""

# You need to replace this with a valid JWT token from Cognito
$TOKEN = Read-Host "Enter your JWT token (from browser localStorage 'gp_access_token')"

if ([string]::IsNullOrWhiteSpace($TOKEN)) {
    Write-Host "Error: Token is required" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
}

$body = @{
    name = "Test Product"
    description = "Test product description"
    category = "Apparel"
    lifecycleData = @{
        materials = @(
            @{
                name = "Cotton"
                percentage = 100
                weight = 0.2
                emissionFactor = 5.5
                recycled = $false
            }
        )
        manufacturing = @{
            factoryLocation = "Bangladesh"
            energyConsumption = 2.5
            energyEmissionFactor = 0.8
            dyeingMethod = "Natural Dyes"
            waterConsumption = 50
            wasteGenerated = 0.02
        }
        packaging = @{
            materialType = "Recycled Cardboard"
            weight = 0.05
            emissionFactor = 0.9
            recyclable = $true
        }
        transport = @{
            mode = "Ship"
            distance = 8000
            fuelType = "Heavy Fuel Oil"
            emissionFactorPerKm = 0.015
        }
        usage = @{
            avgWashCycles = 50
            washTemperature = 30
            dryerUse = $false
        }
        endOfLife = @{
            recyclable = $true
            biodegradable = $false
            takebackProgram = $true
            disposalEmission = 0.5
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "Request URL: $API_URL/products" -ForegroundColor Yellow
Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $body
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Red
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}
