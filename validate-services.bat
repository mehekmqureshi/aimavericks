@echo off
echo AWS Services Validation and Repair
echo ===================================
echo.

REM Check if .env exists
if not exist .env (
    echo Error: .env file not found
    echo Please copy .env.example to .env and configure your AWS credentials
    exit /b 1
)

REM Load environment variables
for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#"') do set %%a

echo Running validation script...
echo.

cd infrastructure
npx tsx validate-and-repair-services.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Validation completed successfully
) else (
    echo.
    echo ⚠️  Validation found issues - review output above
)

cd ..
pause
