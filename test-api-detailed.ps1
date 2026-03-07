# Detailed API Gateway Test
Write-Host "Testing API Gateway with ID Token" -ForegroundColor Cyan
Write-Host ""

$API_ENDPOINT = "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
$CLIENT_ID = "2md6sb5g5k31i4ejgr0tlvqq49"
$USERNAME = "manufacturer@greenpassport.com"
$PASSWORD = "Test123!"

# Get ID token
Write-Host "Getting ID token..." -ForegroundColor Yellow
$authResponse = aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $CLIENT_ID --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD --output json | ConvertFrom-Json
$ID_TOKEN = $authResponse.AuthenticationResult.IdToken

Write-Host "ID Token obtained: $($ID_TOKEN.Substring(0, 30))..." -ForegroundColor Green
Write-Host ""

# Test with detailed error handling
Write-Host "Testing POST /drafts..." -ForegroundColor Yellow
$draftData = @{
  name = "Test Product"
  category = "Apparel"
  description = "Test description"
} | ConvertTo-Json

Write-Host "Request URL: $API_ENDPOINT/drafts" -ForegroundColor Gray
Write-Host "Request Body: $draftData" -ForegroundColor Gray
Write-Host ""

try {
  $response = Invoke-WebRequest -Uri "$API_ENDPOINT/drafts" `
    -Method POST `
    -Headers @{
      "Authorization" = "Bearer $ID_TOKEN"
      "Content-Type" = "application/json"
    } `
    -Body $draftData `
    -ErrorAction Stop `
    -Verbose
  
  Write-Host "SUCCESS!" -ForegroundColor Green
  Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host "Response:" -ForegroundColor Green
  Write-Host $response.Content -ForegroundColor Green
} catch {
  Write-Host "FAILED" -ForegroundColor Red
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
  Write-Host ""
  
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    
    Write-Host "Response Body:" -ForegroundColor Red
    Write-Host $responseBody -ForegroundColor Red
    Write-Host ""
    
    # Try to parse as JSON
    try {
      $errorJson = $responseBody | ConvertFrom-Json
      Write-Host "Parsed Error:" -ForegroundColor Yellow
      Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
    } catch {
      Write-Host "Could not parse response as JSON" -ForegroundColor Yellow
    }
  }
  
  Write-Host ""
  Write-Host "Full Exception:" -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}
