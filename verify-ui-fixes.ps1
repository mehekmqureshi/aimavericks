#!/usr/bin/env pwsh

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "UI Fixes Verification Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Check if files were modified
Write-Host "Test 1: Verifying Modified Files..." -ForegroundColor Yellow
$modifiedFiles = @(
    "frontend/src/components/MaterialTable.css",
    "frontend/src/index.css",
    "frontend/src/App.css",
    "frontend/src/pages/CreateDPP.css",
    "frontend/src/components/Lifecycle_Form.css",
    "frontend/src/components/Lifecycle_Form.tsx",
    "frontend/src/services/apiClient.ts"
)

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file not found" -ForegroundColor Red
        $allPassed = $false
    }
}
Write-Host ""

# Test 2: Check CSS for overflow-x hidden
Write-Host "Test 2: Checking Overflow Control..." -ForegroundColor Yellow
$indexCss = Get-Content "frontend/src/index.css" -Raw
if ($indexCss -match "overflow-x:\s*hidden") {
    Write-Host "  ✅ overflow-x: hidden found in index.css" -ForegroundColor Green
} else {
    Write-Host "  ❌ overflow-x: hidden not found in index.css" -ForegroundColor Red
    $allPassed = $false
}

$appCss = Get-Content "frontend/src/App.css" -Raw
if ($appCss -match "overflow-x:\s*hidden") {
    Write-Host "  ✅ overflow-x: hidden found in App.css" -ForegroundColor Green
} else {
    Write-Host "  ❌ overflow-x: hidden not found in App.css" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 3: Check MaterialTable CSS for min-width
Write-Host "Test 3: Checking Input Field Widths..." -ForegroundColor Yellow
$materialTableCss = Get-Content "frontend/src/components/MaterialTable.css" -Raw
if ($materialTableCss -match "min-width:\s*\d+px") {
    Write-Host "  ✅ min-width constraints found in MaterialTable.css" -ForegroundColor Green
} else {
    Write-Host "  ❌ min-width constraints not found" -ForegroundColor Red
    $allPassed = $false
}

if ($materialTableCss -match "box-sizing:\s*border-box") {
    Write-Host "  ✅ box-sizing: border-box found" -ForegroundColor Green
} else {
    Write-Host "  ❌ box-sizing: border-box not found" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 4: Check Lifecycle_Form for useAuth
Write-Host "Test 4: Checking Authentication Integration..." -ForegroundColor Yellow
$lifecycleForm = Get-Content "frontend/src/components/Lifecycle_Form.tsx" -Raw
if ($lifecycleForm -match "useAuth") {
    Write-Host "  ✅ useAuth hook imported" -ForegroundColor Green
} else {
    Write-Host "  ❌ useAuth hook not found" -ForegroundColor Red
    $allPassed = $false
}

if ($lifecycleForm -match "isAuthenticated") {
    Write-Host "  ✅ isAuthenticated check implemented" -ForegroundColor Green
} else {
    Write-Host "  ❌ isAuthenticated check not found" -ForegroundColor Red
    $allPassed = $false
}

if ($lifecycleForm -match "Login Required") {
    Write-Host "  ✅ 'Login Required' text found" -ForegroundColor Green
} else {
    Write-Host "  ❌ 'Login Required' text not found" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 5: Check if build exists
Write-Host "Test 5: Checking Build Output..." -ForegroundColor Yellow
if (Test-Path "frontend/dist/index.html") {
    Write-Host "  ✅ Build output exists (dist/index.html)" -ForegroundColor Green
    
    # Check if assets exist
    $cssFiles = Get-ChildItem "frontend/dist/assets/*.css" -ErrorAction SilentlyContinue
    $jsFiles = Get-ChildItem "frontend/dist/assets/*.js" -ErrorAction SilentlyContinue
    
    if ($cssFiles.Count -gt 0) {
        Write-Host "  ✅ CSS assets found ($($cssFiles.Count) files)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ No CSS assets found" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($jsFiles.Count -gt 0) {
        Write-Host "  ✅ JS assets found ($($jsFiles.Count) files)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ No JS assets found" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "  ❌ Build output not found" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 6: Check API endpoint
Write-Host "Test 6: Testing API Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest `
        -Uri "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/drafts" `
        -Method OPTIONS `
        -UseBasicParsing `
        -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ API endpoint is accessible" -ForegroundColor Green
        
        $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
        if ($corsHeader) {
            Write-Host "  ✅ CORS headers present: $corsHeader" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  CORS headers not found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ❌ API endpoint test failed: $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# Test 7: Check Lambda function
Write-Host "Test 7: Checking Lambda Function..." -ForegroundColor Yellow
try {
    $lambdaStatus = aws lambda get-function --function-name gp-saveDraft-dev --region us-east-1 --query "Configuration.State" --output text 2>&1
    if ($lambdaStatus -eq "Active") {
        Write-Host "  ✅ Lambda function is Active" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Lambda function status: $lambdaStatus" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ⚠️  Could not check Lambda status (AWS CLI may not be configured)" -ForegroundColor Yellow
}
Write-Host ""

# Test 8: Check DynamoDB table
Write-Host "Test 8: Checking DynamoDB Table..." -ForegroundColor Yellow
try {
    $tableStatus = aws dynamodb describe-table --table-name Drafts --region us-east-1 --query "Table.TableStatus" --output text 2>&1
    if ($tableStatus -eq "ACTIVE") {
        Write-Host "  ✅ DynamoDB table 'Drafts' is ACTIVE" -ForegroundColor Green
    } else {
        Write-Host "  ❌ DynamoDB table status: $tableStatus" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ⚠️  Could not check DynamoDB table (AWS CLI may not be configured)" -ForegroundColor Yellow
}
Write-Host ""

# Final Summary
Write-Host "============================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The UI fixes have been successfully implemented and deployed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Live URL: https://d3m14ih8ommfry.cloudfront.net" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please test the following manually:" -ForegroundColor Yellow
    Write-Host "  1. Input field widths are readable" -ForegroundColor Yellow
    Write-Host "  2. Save Draft button shows 'Login Required' when not logged in" -ForegroundColor Yellow
    Write-Host "  3. No overflow at different zoom levels (50%, 100%, 150%)" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  SOME TESTS FAILED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please review the failed tests above." -ForegroundColor Yellow
}
Write-Host "============================================" -ForegroundColor Cyan
