# Test Save Draft Endpoint
Write-Host "🧪 Testing POST /drafts Endpoint" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$API_ENDPOINT = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$CLIENT_ID = "2md6sb5g5k31i4ejgr0tlvqq49"
$USERNAME = "manufacturer@greenpassport.com"
$PASSWORD = "Test123!"

# Step 1: Get Cognito token
Write-Host "📝 Step 1: Authenticating with Cognito..." -ForegroundColor Yellow
$authResponse = aws cognito-idp initiate-auth `
  --auth-flow USER_PASSWORD_AUTH `
  --client-id $CLIENT_ID `
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD `
  --output json | ConvertFrom-Json

$ACCESS_TOKEN = $authResponse.AuthenticationResult.AccessToken

if (-not $ACCESS_TOKEN) {
  Write-Host "❌ Authentication failed" -ForegroundColor Red
  Write-Host $authResponse
  exit 1
}

Write-Host "✅ Authentication successful" -ForegroundColor Green
Write-Host "   Token: $($ACCESS_TOKEN.Substring(0, 50))..."
Write-Host ""

# Step 2: Test POST /drafts without token
Write-Host "📝 Step 2: Testing POST /drafts WITHOUT token (should fail)..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"name":"Test Product","category":"Apparel"}' `
    -ErrorAction Stop
  Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "   Status: $($_.Exception.Response.StatusCode.value__) (Expected 401)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Test POST /drafts with token
Write-Host "📝 Step 3: Testing POST /drafts WITH token (should succeed)..." -ForegroundColor Yellow

$draftData = @{
  name = "Test Product Draft"
  description = "This is a test draft"
  category = "Apparel"
  lifecycleData = @{
    materials = @(
      @{
        name = "Organic Cotton"
        percentage = 100
        origin = "India"
        certifications = @("GOTS")
      }
    )
  }
} | ConvertTo-Json -Depth 10

Write-Host "   Request Body:" -ForegroundColor Gray
Write-Host $draftData -ForegroundColor Gray
Write-Host ""

try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{
      "Authorization"="Bearer $ACCESS_TOKEN"
      "Content-Type"="application/json"
    } `
    -Body $draftData `
    -ErrorAction Stop
  
  Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "   Response:" -ForegroundColor Green
  $result = $response.Content | ConvertFrom-Json
  Write-Host $response.Content -ForegroundColor Green
  Write-Host ""
  
  if ($result.draftId) {
    Write-Host "✅ Draft saved successfully!" -ForegroundColor Green
    Write-Host "   Draft ID: $($result.draftId)" -ForegroundColor Green
    Write-Host "   Saved At: $($result.savedAt)" -ForegroundColor Green
  }
} catch {
  Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  Write-Host "❌ Draft save failed" -ForegroundColor Red
  Write-Host ""
  
  # Try to get response body
  try {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response Body:" -ForegroundColor Red
    Write-Host $responseBody -ForegroundColor Red
  } catch {
    Write-Host "   Could not read response body" -ForegroundColor Red
  }
  Write-Host ""
  
  Write-Host "🔍 Additional Diagnostics:" -ForegroundColor Yellow
  Write-Host "   1. Check Lambda logs: aws logs tail /aws/lambda/gp-saveDraft-dev --follow" -ForegroundColor Yellow
  Write-Host "   2. Check API Gateway logs in CloudWatch" -ForegroundColor Yellow
  Write-Host "   3. Verify DynamoDB table: aws dynamodb describe-table --table-name Drafts" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 Test Complete!" -ForegroundColor Cyan
