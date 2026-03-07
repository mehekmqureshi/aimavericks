# POST /drafts Endpoint Fix Summary

## Issues Found

### 1. **Authentication Token Type Mismatch** ✅ IDENTIFIED
- **Problem**: Frontend is sending ACCESS token, but API Gateway Cognito authorizer expects ID token
- **Evidence**: 
  - POST with ACCESS token → 401 Unauthorized
  - POST with ID token → 500 Internal Server Error (passes auth but Lambda fails)
- **Root Cause**: Cognito User Pool authorizers validate ID tokens, not access tokens

### 2. **Lambda Handler Not Found** ✅ IDENTIFIED  
- **Problem**: Lambda returns "Runtime.HandlerNotFound: index.handler is undefined or not exported"
- **Evidence**: Direct Lambda invocation fails with handler not found error
- **Root Cause**: Lambda deployment package may be corrupted or incorrectly bundled

### 3. **Frontend Using Wrong Token** ✅ IDENTIFIED
- **Location**: `frontend/src/services/apiClient.ts` and `frontend/src/services/cognitoAuth.ts`
- **Problem**: Frontend stores and sends `accessToken` instead of `idToken`
- **Impact**: All authenticated API calls fail with 401

## Required Fixes

### Fix 1: Update Frontend to Use ID Token

**File**: `frontend/src/services/cognitoAuth.ts`
```typescript
// Change from:
const authResult: AuthResult = {
  accessToken: accessToken.getJwtToken(),  // ❌ Wrong
  // ...
};

// To:
const authResult: AuthResult = {
  accessToken: idToken.getJwtToken(),  // ✅ Correct - use ID token
  // ...
};
```

**File**: `frontend/src/services/apiClient.ts`
- No changes needed - already uses TOKEN_STORAGE_KEY correctly

**File**: `frontend/src/context/AuthContext.tsx`
```typescript
// In storeAuthData function, ensure we're storing the ID token:
localStorage.setItem(TOKEN_STORAGE_KEY, authResult.accessToken); // This will now be ID token
```

### Fix 2: Rebuild and Redeploy Lambda

**Command**:
```bash
# Rebuild Lambda with correct configuration
npx esbuild backend/lambdas/saveDraft.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/lambdas/saveDraft-rebuild/index.js \
  --external:@aws-sdk/* \
  --format=cjs \
  --sourcemap

# Create deployment package
cd dist/lambdas/saveDraft-rebuild
zip -r ../saveDraft-rebuild.zip .
cd ../../..

# Deploy to AWS
aws lambda update-function-code \
  --function-name gp-saveDraft-dev \
  --zip-file fileb://dist/lambdas/saveDraft-rebuild.zip
```

### Fix 3: Verify API Gateway Authorizer Configuration

**Check**:
```bash
aws apigateway get-method \
  --rest-api-id 325xzv9pli \
  --resource-id 2n3ikl \
  --http-method POST
```

**Expected**: `authorizationType: "COGNITO_USER_POOLS"` and `authorizerId: "xrzcni"` ✅ CONFIRMED

### Fix 4: Enable CORS for Authorization Header

**Check**: Ensure OPTIONS method includes Authorization in allowed headers
```bash
aws apigateway get-integration-response \
  --rest-api-id 325xzv9pli \
  --resource-id 2n3ikl \
  --http-method OPTIONS \
  --status-code 200
```

**Expected**: `Access-Control-Allow-Headers` includes `Authorization`

## Testing Steps

1. **Test Authentication**:
   ```powershell
   # Get ID token from Cognito
   $auth = aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id 2md6sb5g5k31i4ejgr0tlvqq49 --auth-parameters USERNAME=manufacturer@greenpassport.com,PASSWORD=Test123! --output json | ConvertFrom-Json
   $ID_TOKEN = $auth.AuthenticationResult.IdToken
   ```

2. **Test POST /drafts**:
   ```powershell
   Invoke-WebRequest -Uri "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/drafts" -Method POST -Headers @{"Authorization"="Bearer $ID_TOKEN";"Content-Type"="application/json"} -Body '{"name":"Test","category":"Apparel"}'
   ```

3. **Expected Response**: `201 Created` with `draftId` and `savedAt`

## Implementation Priority

1. **HIGH**: Fix frontend to use ID token instead of access token
2. **HIGH**: Rebuild and redeploy saveDraft Lambda  
3. **MEDIUM**: Verify all other Lambdas are correctly deployed
4. **LOW**: Add better error logging to Lambda functions

## Additional Notes

- **Cognito Token Types**:
  - **ID Token**: Contains user identity claims (sub, email, etc.) - Used for authentication
  - **Access Token**: Used for authorization with API Gateway/OAuth scopes
  - **Refresh Token**: Used to get new ID/Access tokens

- **API Gateway Cognito Authorizer**: Always validates ID tokens, not access tokens

- **Lambda Runtime**: Node.js 20.x includes AWS SDK v3 by default, so external marking is correct

## Files to Modify

1. `frontend/src/services/cognitoAuth.ts` - Use ID token
2. `frontend/src/context/AuthContext.tsx` - Store ID token  
3. `backend/lambdas/saveDraft.ts` - Rebuild and redeploy

## Verification Commands

```bash
# Check Lambda logs after fix
aws logs tail /aws/lambda/gp-saveDraft-dev --follow

# Test endpoint
curl -X POST https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/drafts \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","category":"Apparel"}'
```
