# Test Save Draft Endpoint
Write-Host "Testing POST /drafts Endpoint" -ForegroundColor Cyan
Write-Host ""

$API_ENDPOINT = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$CLIENT_ID = "2md6sb5g5k31i4ejgr0tlvqq49"
$USERNAME = "manufacturer@greenpassport.com"
$PASSWORD = "Test123!"

# Step 1: Get Cognito token
Write-Host "Step 1: Authenticating..." -ForegroundColor Yellow
$authResponse = aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $CLIENT_ID --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD --output json | ConvertFrom-Json

$ACCESS_TOKEN = $authResponse.AuthenticationResult.AccessToken
$ID_TOKEN = $authResponse.AuthenticationResult.IdToken

if (-not $ACCESS_TOKEN) {
  Write-Host "Authentication failed" -ForegroundColor Red
  exit 1
}

Write-Host "Authentication successful" -ForegroundColor Green
Write-Host "Access Token: $($ACCESS_TOKEN.Substring(0, 30))..." -ForegroundColor Gray
Write-Host "ID Token: $($ID_TOKEN.Substring(0, 30))..." -ForegroundColor Gray
Write-Host ""

# Step 2: Test POST /drafts with ACCESS token
Write-Host "Step 2: Testing POST /drafts with ACCESS token..." -ForegroundColor Yellow

$draftData = '{"name":"Test Product Draft","description":"This is a test draft","category":"Apparel","lifecycleData":{"materials":[{"name":"Organic Cotton","percentage":100,"origin":"India","certifications":["GOTS"]}]}}'

try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" -Method POST -Headers @{"Authorization"="Bearer $ACCESS_TOKEN";"Content-Type"="application/json"} -Body $draftData -ErrorAction Stop
  
  Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "Response: $($response.Content)" -ForegroundColor Green
  Write-Host ""
  Write-Host "SUCCESS with ACCESS token!" -ForegroundColor Green
} catch {
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  Write-Host "FAILED with ACCESS token" -ForegroundColor Yellow
  
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
  }
}

Write-Host ""

# Step 3: Test POST /drafts with ID token
Write-Host "Step 3: Testing POST /drafts with ID token..." -ForegroundColor Yellow

try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" -Method POST -Headers @{"Authorization"="Bearer $ID_TOKEN";"Content-Type"="application/json"} -Body $draftData -ErrorAction Stop
  
  Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "Response: $($response.Content)" -ForegroundColor Green
  Write-Host ""
  Write-Host "SUCCESS with ID token!" -ForegroundColor Green
} catch {
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  Write-Host "FAILED with ID token" -ForegroundColor Yellow
  
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
  }
}
