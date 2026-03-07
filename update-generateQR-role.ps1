# Update generateQR Lambda Role Permissions

Write-Host "=== Updating generateQR Lambda Role ===" -ForegroundColor Cyan
Write-Host ""

$roleName = "gp-generateQR-role-dev"
$policyName = "gp-generateQR-role-dev-policy"
$accountId = $env:AWS_ACCOUNT_ID

Write-Host "Role: $roleName" -ForegroundColor Yellow
Write-Host ""

# Updated policy with S3 GetObject permission for signed URLs
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:${accountId}:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:${accountId}:table/Products",
                "arn:aws:dynamodb:*:${accountId}:table/Manufacturers",
                "arn:aws:dynamodb:*:${accountId}:table/ProductSerials",
                "arn:aws:dynamodb:*:${accountId}:table/Drafts",
                "arn:aws:dynamodb:*:${accountId}:table/Products/index/*",
                "arn:aws:dynamodb:*:${accountId}:table/ProductSerials/index/*",
                "arn:aws:dynamodb:*:${accountId}:table/Drafts/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::gp-qr-codes-dev/*",
                "arn:aws:s3:::gp-frontend-*/*"
            ]
        }
    ]
}
"@

$policyFile = "generateQR-policy.json"
[System.IO.File]::WriteAllText($policyFile, $policy, [System.Text.Encoding]::ASCII)

Write-Host "Updating IAM role policy..." -ForegroundColor Cyan
aws iam put-role-policy `
    --role-name $roleName `
    --policy-name $policyName `
    --policy-document "file://$policyFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: IAM role policy updated" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to update IAM role policy" -ForegroundColor Red
    Remove-Item $policyFile -Force -ErrorAction SilentlyContinue
    exit 1
}

Remove-Item $policyFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Update Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The Lambda role now has permission to:" -ForegroundColor Yellow
Write-Host "  - Put objects to S3 (upload QR codes)" -ForegroundColor Gray
Write-Host "  - Get objects from S3 (generate signed URLs)" -ForegroundColor Gray
