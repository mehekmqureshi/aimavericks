# Test Fixed API
$API_URL = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$TOKEN = "eyJraWQiOiJ6dWxWUWlIQkk4b1p4akJ1Q0RVVlNvVVRSRlZ3M0J6elA2aEhueWpOeEhjPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJkNDQ4MzQwOC1lMDIxLTcwODQtOTliNy0wNjIwNTBlMTVhNmEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfUVE0V1NZTmJYIiwiY29nbml0bzp1c2VybmFtZSI6ImQ0NDgzNDA4LWUwMjEtNzA4NC05OWI3LTA2MjA1MGUxNWE2YSIsIm9yaWdpbl9qdGkiOiI1ODQwZDkyNy1iOTI4LTQ3ZTQtOTFkMy0zOTcxZjc0NTliYWUiLCJhdWQiOiIybWQ2c2I1ZzVrMzFpNGVqZ3IwdGx2cXE0OSIsImV2ZW50X2lkIjoiYWFkNzUzNDAtNmIzNy00MzgzLWEyM2QtOTcwYmYwOTA0ZTEwIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NzI3MzY3OTUsImV4cCI6MTc3Mjc0NDAzOCwiaWF0IjoxNzcyNzQwNDM4LCJqdGkiOiI0OTk5OGMwZS1kNjQ3LTQyZDEtOGFmNy05YzNjYTUwOGZmZDQiLCJlbWFpbCI6Im1hbnVmYWN0dXJlckBncmVlbnBhc3Nwb3J0LmNvbSJ9.ACVAPNuNEvHs2nK0wWa8TJ2Twyxk_VRUsIg7kJxqAgnPNpNqmJQTFoiW_Dl0d1LBAcMBwQaAG8etBz62A0AtOd_WS2ULvCNwRCAX3IjoKi0DTsanhHdnaF0XtRY-_bM6tBQrkfnvkxu3xAPe3SaQZQnIjBA2qLwBslqVs0XBzZ5gYfcDzimh6tGqlbjEFmcyOwFp8_RKT5Q_2zzf13OG2p4Z_pwSQvIWtb6yQTU22otPV9ToAsLjUVgAnQ7VuEkOJZPnvO5YUzFKE1mfSX4_h_8eiKyQJi2mPRLm5P6hBJOUyQfWdq1FZOosehTxQMzoluGsOhRDl4Ejn0bSvRqJhA"

Write-Host "Testing createProduct API..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Network Fix Test Product"
    description = "Testing after Lambda handler fix"
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
        }
        packaging = @{
            weight = 0.05
            emissionFactor = 0.9
        }
        transport = @{
            distance = 8000
            emissionFactorPerKm = 0.015
        }
        usage = @{
            avgWashCycles = 50
            washTemperature = 30
            dryerUse = $false
        }
        endOfLife = @{
            disposalEmission = 0.5
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$API_URL/products" -Method Post -Headers $headers -Body $body
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Product Created:" -ForegroundColor Green
    Write-Host "  Product ID: $($response.productId)" -ForegroundColor Gray
    Write-Host "  Carbon Footprint: $($response.carbonFootprint) kg CO2" -ForegroundColor Gray
    Write-Host "  Badge: $($response.badge.name)" -ForegroundColor Gray
    Write-Host "  Sustainability Score: $($response.sustainabilityScore)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The network error is FIXED! ✅" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
