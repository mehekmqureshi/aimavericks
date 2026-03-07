# Diagnosing Frontend Network Error

## Steps to Get Detailed Error Information

### 1. Open Browser Developer Tools
- Press F12 or Right-click > Inspect
- Go to the "Console" tab

### 2. Check for Errors
Look for red error messages when you click "Retry" on the Products List page.

Common errors to look for:
- CORS errors (Access-Control-Allow-Origin)
- 401 Unauthorized (authentication issue)
- 403 Forbidden (permissions issue)
- 404 Not Found (endpoint doesn't exist)
- 500 Internal Server Error (Lambda error)

### 3. Check Network Tab
- Go to "Network" tab in DevTools
- Click "Retry" button
- Look for the request to `/products`
- Click on it to see:
  - Request URL
  - Status Code
  - Response Headers
  - Response Body

### 4. Check Request Details
In the Network tab, find the request and check:
- Request URL: Should be `https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/products`
- Request Headers: Should include `Authorization: Bearer <token>`
- Status Code: What is it?
- Response: What does it say?

## Please Provide
1. The exact error message from Console tab
2. The status code from Network tab
3. The response body from the failed request
