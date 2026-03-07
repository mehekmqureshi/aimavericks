@echo off
echo ========================================
echo Complete Deployment Process
echo ========================================
echo.

echo Step 1: Building Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    exit /b 1
)
cd ..
echo Frontend build complete!
echo.

echo Step 2: Running Complete Deployment...
npx ts-node infrastructure/complete-deployment.ts
if %errorlevel% neq 0 (
    echo Deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
