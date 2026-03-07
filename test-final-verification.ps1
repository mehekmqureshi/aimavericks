# Final Verification Test for POST /drafts
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  POST /drafts Endpoint - Final Verification Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$API_ENDPOINT = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$CLIENT_ID = "2md6sb5g5k31i4ejgr0tlvqq49"
$USERNAME = "manufacturer@greenpassport.com"
$PASSWORD = "Test123!"

# Test 1: Authentication
Write-Host "Test 1: Cognito Authentication" -ForegroundColor Yellow
try {
  $authResponse = aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $CLIENT_ID --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD --output json | ConvertFrom-Json
  $ID_TOKEN = $authResponse.AuthenticationResult.IdToken
  Write-Host "  ✅ Authentication successful" -ForegroundColor Green
  Write-Host "  ID Token: $($ID_TOKEN.Substring(0, 30))..." -ForegroundColor Gray
} catch {
  Write-Host "  ❌ Authentication failed" -ForegroundColor Red
  exit 1
}
Write-Host ""

# Test 2: POST /drafts with minimal data
Write-Host "Test 2: POST /drafts (minimal data)" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{"Authorization"="Bearer $ID_TOKEN";"Content-Type"="application/json"} `
    -Body '{"name":"Minimal Test","category":"Apparel"}' `
    -UseBasicParsing `
    -ErrorAction Stop
  
  $result = $response.Content | ConvertFrom-Json
  Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "  Draft ID: $($result.draftId)" -ForegroundColor Gray
  Write-Host "  Saved At: $($result.savedAt)" -ForegroundColor Gray
} catch {
  Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: POST /drafts with full lifecycle data
Write-Host "Test 3: POST /drafts (full lifecycle data)" -ForegroundColor Yellow
$fullData = @{
  name = "Organic Cotton T-Shirt"
  description = "Sustainable cotton t-shirt with minimal environmental impact"
  category = "Apparel"
  lifecycleData = @{
    materials = @(
      @{
        name = "Organic Cotton"
        percentage = 95
        origin = "India"
        certifications = @("GOTS", "Fair Trade")
      },
      @{
        name = "Recycled Polyester"
        percentage = 5
        origin = "USA"
        certifications = @("GRS")
      }
    )
    manufacturing = @{
      location = "Bangladesh"
      energySource = "Solar"
      waterUsage = 50
    }
  }
} | ConvertTo-Json -Depth 10

try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{"Authorization"="Bearer $ID_TOKEN";"Content-Type"="application/json"} `
    -Body $fullData `
    -UseBasicParsing `
    -ErrorAction Stop
  
  $result = $response.Content | ConvertFrom-Json
  Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "  Draft ID: $($result.draftId)" -ForegroundColor Gray
  Write-Host "  Saved At: $($result.savedAt)" -ForegroundColor Gray
} catch {
  Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: POST /drafts without authentication (should fail)
Write-Host "Test 4: POST /drafts without auth (should fail with 401)" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"name":"Test","category":"Apparel"}' `
    -UseBasicParsing `
    -ErrorAction Stop
  
  Write-Host "  ❌ Unexpected success - should have failed!" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host "  ✅ Correctly rejected with 401 Unauthorized" -ForegroundColor Green
  } else {
    Write-Host "  ⚠️  Failed with unexpected status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
  }
}
Write-Host ""

# Test 5: POST /drafts with invalid data (should fail)
Write-Host "Test 5: POST /drafts with empty body (should fail with 400)" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{"Authorization"="Bearer $ID_TOKEN";"Content-Type"="application/json"} `
    -Body '{}' `
    -UseBasicParsing `
    -ErrorAction Stop
  
  Write-Host "  ❌ Unexpected success - should have failed!" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 400) {
    Write-Host "  ✅ Correctly rejected with 400 Bad Request" -ForegroundColor Green
  } else {
    Write-Host "  ⚠️  Failed with unexpected status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
  }
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
