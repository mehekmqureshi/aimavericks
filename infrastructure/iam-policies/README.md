# IAM Policies for Lambda Functions

This directory contains IAM policy documents for all Lambda functions in the Green Passport platform. Each policy follows the principle of least privilege, granting only the minimum permissions required for each function to operate.

## Policy Files

### 1. lambda-createProduct-policy.json
**Lambda Function:** `createProduct`
**Permissions:**
- DynamoDB PutItem on Products table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-CreateProduct-Policy \
  --policy-document file://lambda-createProduct-policy.json
```

### 2. lambda-updateProduct-policy.json
**Lambda Function:** `updateProduct`
**Permissions:**
- DynamoDB GetItem and UpdateItem on Products table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-UpdateProduct-Policy \
  --policy-document file://lambda-updateProduct-policy.json
```

### 3. lambda-getProduct-policy.json
**Lambda Function:** `getProduct`
**Permissions:**
- DynamoDB GetItem on Products table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-GetProduct-Policy \
  --policy-document file://lambda-getProduct-policy.json
```

### 4. lambda-listProducts-policy.json
**Lambda Function:** `listProducts`
**Permissions:**
- DynamoDB Query on Products table and manufacturerId-index GSI
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-ListProducts-Policy \
  --policy-document file://lambda-listProducts-policy.json
```

### 5. lambda-generateQR-policy.json
**Lambda Function:** `generateQR`
**Permissions:**
- DynamoDB GetItem on Products table
- DynamoDB PutItem on ProductSerials table
- S3 PutObject on QR codes bucket
- S3 GetObject for signed URL generation
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-GenerateQR-Policy \
  --policy-document file://lambda-generateQR-policy.json
```

### 6. lambda-verifySerial-policy.json
**Lambda Function:** `verifySerial`
**Permissions:**
- DynamoDB GetItem on ProductSerials, Products, and Manufacturers tables
- DynamoDB UpdateItem on ProductSerials table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-VerifySerial-Policy \
  --policy-document file://lambda-verifySerial-policy.json
```

### 7. lambda-aiGenerate-policy.json
**Lambda Function:** `aiGenerate`
**Permissions:**
- Bedrock InvokeModel on Claude 3 Sonnet models
- DynamoDB GetItem on Products table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-AIGenerate-Policy \
  --policy-document file://lambda-aiGenerate-policy.json
```

### 8. lambda-calculateEmission-policy.json
**Lambda Function:** `calculateEmission`
**Permissions:**
- CloudWatch Logs write permissions only (stateless calculation)

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-CalculateEmission-Policy \
  --policy-document file://lambda-calculateEmission-policy.json
```

### 9. lambda-draft-policy.json
**Lambda Functions:** `saveDraft` and `getDraft`
**Permissions:**
- DynamoDB PutItem and GetItem on Drafts table
- CloudWatch Logs write permissions

**Usage:**
```bash
aws iam create-policy \
  --policy-name GreenPassport-Draft-Policy \
  --policy-document file://lambda-draft-policy.json
```

## Creating IAM Roles

After creating the policies, attach them to Lambda execution roles:

### Step 1: Create the Lambda execution role
```bash
aws iam create-role \
  --role-name GreenPassport-CreateProduct-Role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### Step 2: Attach the policy to the role
```bash
aws iam attach-role-policy \
  --role-name GreenPassport-CreateProduct-Role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GreenPassport-CreateProduct-Policy
```

### Step 3: Assign the role to the Lambda function
```bash
aws lambda update-function-configuration \
  --function-name createProduct \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/GreenPassport-CreateProduct-Role
```

## Bulk Deployment Script

You can use the following script to create all policies and roles:

```bash
#!/bin/bash

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICIES_DIR="infrastructure/iam-policies"

# Array of Lambda functions and their policy files
declare -A LAMBDA_POLICIES=(
  ["createProduct"]="lambda-createProduct-policy.json"
  ["updateProduct"]="lambda-updateProduct-policy.json"
  ["getProduct"]="lambda-getProduct-policy.json"
  ["listProducts"]="lambda-listProducts-policy.json"
  ["generateQR"]="lambda-generateQR-policy.json"
  ["verifySerial"]="lambda-verifySerial-policy.json"
  ["aiGenerate"]="lambda-aiGenerate-policy.json"
  ["calculateEmission"]="lambda-calculateEmission-policy.json"
  ["saveDraft"]="lambda-draft-policy.json"
  ["getDraft"]="lambda-draft-policy.json"
)

for FUNCTION_NAME in "${!LAMBDA_POLICIES[@]}"; do
  POLICY_FILE="${LAMBDA_POLICIES[$FUNCTION_NAME]}"
  POLICY_NAME="GreenPassport-${FUNCTION_NAME}-Policy"
  ROLE_NAME="GreenPassport-${FUNCTION_NAME}-Role"
  
  echo "Creating policy: $POLICY_NAME"
  POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://${POLICIES_DIR}/${POLICY_FILE}" \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || echo "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}")
  
  echo "Creating role: $ROLE_NAME"
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' 2>/dev/null || echo "Role already exists"
  
  echo "Attaching policy to role"
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN"
  
  echo "Completed: $FUNCTION_NAME"
  echo "---"
done

echo "All IAM roles and policies created successfully!"
```

## Security Best Practices

1. **Least Privilege**: Each policy grants only the minimum permissions required
2. **Resource Specificity**: Policies target specific tables and buckets where possible
3. **CloudWatch Logging**: All functions have logging permissions for observability
4. **No Wildcard Actions**: Specific actions are listed rather than using wildcards
5. **Table-Level Permissions**: DynamoDB permissions are scoped to specific tables

## Environment-Specific Configuration

For production deployments, consider:
- Replacing wildcard regions (`*`) with specific regions
- Using environment-specific bucket names (e.g., `gp-qr-codes-prod`)
- Adding condition keys for additional security (e.g., IP restrictions)
- Implementing resource tags for cost allocation and access control

## Monitoring and Auditing

Use AWS CloudTrail to monitor IAM policy usage:
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::IAM::Policy \
  --max-results 50
```

## Requirements Mapping

- **Requirement 21.3**: Lambda functions configured with appropriate IAM roles
- **Requirement 23.1**: IAM roles assigned with minimum required permissions
- **Requirement 23.2**: DynamoDB and S3 access restricted to specific resources
- **Requirement 23.3**: S3 access includes both read and write for QR generation
- **Requirement 23.4**: Bedrock access restricted to specific models
