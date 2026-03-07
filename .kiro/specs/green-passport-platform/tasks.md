# Implementation Plan: Green Passport AWS Native Serverless Platform

## Overview

This implementation plan breaks down the Green Passport platform into discrete, actionable coding tasks. The system is built entirely on AWS serverless services using TypeScript for Lambda functions and React with TypeScript for the frontend. Tasks are organized to build incrementally, with early validation through automated tests and checkpoints.

## Tasks

- [x] 1. Initialize project workspace and development environment
  - Create root directory structure: `/backend`, `/frontend`, `/infrastructure`, `/shared`
  - Initialize Node.js project with TypeScript configuration
  - Set up package.json with dependencies: AWS SDK v3, fast-check, Jest, React, Vite
  - Configure TypeScript compiler options for strict mode
  - Create .gitignore for node_modules and build artifacts
  - _Requirements: 27.1_

- [x] 2. Define shared TypeScript interfaces and types
  - [x] 2.1 Create shared data model interfaces
    - Define Product, Manufacturer, ProductSerial interfaces
    - Define structured LifecycleData with Material_Row, Manufacturing_Data, Packaging_Data, Transport_Data, Usage_Data, EndOfLife_Data interfaces
    - Define CarbonFootprintResult with breakdown by section (materials, manufacturing, packaging, transport, usage, disposal)
    - Define Badge, DraftData interfaces
    - Define API request/response types
    - Create `/shared/types.ts` with all domain models
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 17.3, 18.3_
  
  - [ ]* 2.2 Write property test for data model round-trip
    - **Property 6: Product Data Round-Trip**
    - **Validates: Requirements 3.4, 17.3**


- [x] 3. Provision DynamoDB tables using MCP servers
  - [x] 3.1 Create Manufacturers table
    - Use @modelcontextprotocol/server-aws-dynamodb to create table
    - Set manufacturerId as primary key (String)
    - Configure on-demand billing mode
    - Enable encryption at rest
    - _Requirements: 2.1, 27.1_
  
  - [x] 3.2 Create Products table with GSI
    - Create table with productId as primary key (String)
    - Add Global Secondary Index on manufacturerId
    - Configure on-demand billing mode
    - Enable encryption at rest
    - _Requirements: 17.1, 17.2, 27.1_
  
  - [x] 3.3 Create ProductSerials table with GSI
    - Create table with serialId as primary key (String)
    - Add Global Secondary Index on productId
    - Configure on-demand billing mode
    - Enable encryption at rest
    - _Requirements: 18.1, 18.2, 27.1_

- [x] 4. Provision S3 buckets using MCP servers
  - [x] 4.1 Create QR codes bucket
    - Use @modelcontextprotocol/server-aws-s3 to create bucket
    - Name: gp-qr-codes-{environment}
    - Configure private access (no public access)
    - Enable AES-256 encryption at rest
    - Enable versioning
    - _Requirements: 10.1, 22.1, 22.3, 22.4, 27.1_
  
  - [x] 4.2 Create frontend assets bucket
    - Create bucket: gp-frontend-{environment}
    - Configure for static website hosting
    - Enable AES-256 encryption at rest
    - Configure CORS for API access
    - _Requirements: 19.2, 27.1_

- [x] 5. Provision Cognito User Pool using MCP servers
  - [x] 5.1 Create Cognito User Pool
    - Use @modelcontextprotocol/server-aws-cognito
    - Configure email/password authentication
    - Set JWT token expiration to 1 hour
    - Add custom attribute for manufacturer role
    - Create app client for frontend
    - _Requirements: 1.1, 1.2, 27.1_
  
  - [ ]* 5.2 Write property test for JWT token validation
    - **Property 2: JWT Token Validation**
    - **Validates: Requirements 1.3, 20.3**


- [x] 6. Implement Carbon Calculator service
  - [x] 6.1 Create CarbonCalculator class
    - Implement calculateFootprint method returning CarbonFootprintResult with breakdown
    - Implement calculateMaterialEmission method for individual material rows
    - Implement calculateManufacturingEmission method for manufacturing section
    - Implement calculatePackagingEmission method for packaging section
    - Implement calculateTransportEmission method for transport section
    - Implement calculateUsageEmission method for usage section
    - Implement calculateDisposalEmission method for end-of-life section
    - Apply formula: Total CO2 = Sum(material emissions) + manufacturing + packaging + transport + usage + disposal
    - Support real-time calculation with 50ms response time per section
    - Create `/backend/services/CarbonCalculator.ts`
    - _Requirements: 4.1, 3.1.5, 3.2.7, 3.3.5, 3.4.5, 3.5.4, 3.6.5_
  
  - [ ]* 6.2 Write property test for carbon footprint calculation
    - **Property 7: Carbon Footprint Calculation**
    - **Validates: Requirements 4.1**
  
  - [ ]* 6.3 Write property test for real-time calculation response
    - **Property 49: Real-Time Calculation Response**
    - **Validates: Requirements 3.1.6, 3.2.8, 3.3.6, 3.4.6**
  
  - [ ]* 6.4 Write unit tests for carbon calculator
    - Test with known material weights and emission factors
    - Test section-by-section calculation methods
    - Test edge case: empty materials array
    - Test edge case: zero emission factors
    - Verify individual section calculations complete within 50ms
    - Verify total calculation completes within 500ms
    - _Requirements: 4.2_

- [x] 7. Implement Badge Engine service
  - [x] 7.1 Create BadgeEngine class
    - Implement assignBadge method with threshold logic
    - Return Badge object with name, color, threshold
    - Create `/backend/services/BadgeEngine.ts`
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 7.2 Write property test for badge assignment
    - **Property 10: Badge Assignment by Threshold**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
  
  - [ ]* 7.3 Write unit tests for badge thresholds
    - Test carbon < 4kg returns "Environment Friendly" (green)
    - Test carbon = 4kg returns "Moderate Impact" (yellow)
    - Test carbon = 7kg returns "Moderate Impact" (yellow)
    - Test carbon > 7kg returns "High Impact" (red)
    - Test boundary values: 3.9kg, 4.0kg, 7.0kg, 7.1kg
    - Verify assignment completes within 100ms
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implement Signature Service
  - [x] 8.1 Create SignatureService class
    - Implement generateSignature method using SHA256
    - Hash productId + serialId + manufacturerId + carbonFootprint
    - Create `/backend/services/SignatureService.ts`
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 8.2 Write property test for signature determinism
    - **Property 16: Digital Signature Determinism**
    - **Validates: Requirements 9.2, 13.2**
  
  - [ ]* 8.3 Write unit tests for signature generation
    - Test signature generation with known inputs
    - Verify signature format is valid SHA256 hex string
    - Test signature consistency across multiple calls
    - _Requirements: 9.2_


- [x] 9. Implement QR Generator service
  - [x] 9.1 Create QRGenerator class
    - Implement generateBatch method
    - Generate serial IDs with format: productId-paddedIndex
    - Use qrcode library to create QR images
    - Integrate SignatureService for digital signatures
    - Create `/backend/services/QRGenerator.ts`
    - _Requirements: 8.2, 8.3, 9.1, 9.4_
  
  - [ ]* 9.2 Write property test for batch generation count
    - **Property 13: Batch QR Generation Count**
    - **Validates: Requirements 8.2**
  
  - [ ]* 9.3 Write property test for serial ID format
    - **Property 14: Serial ID Format**
    - **Validates: Requirements 8.3**
  
  - [ ]* 9.4 Write unit tests for QR generator
    - Test batch generation with N=5 produces 5 serial IDs
    - Test serial ID format: PROD001-0001, PROD001-0002, etc.
    - Test batch generation with N=1000 (boundary)
    - Test batch generation with N=1001 throws validation error
    - Test QR code embedding of digital signature
    - Verify generation completes within 5 seconds for N≤1000
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 9.4_

- [x] 10. Implement ZIP packaging and S3 upload
  - [x] 10.1 Create S3Service class
    - Implement uploadQRBatch method
    - Use archiver library to create ZIP from QR images
    - Upload ZIP to S3 bucket
    - Generate signed URL with 1-hour expiration
    - Create `/backend/services/S3Service.ts`
    - _Requirements: 10.2, 10.3, 22.2_
  
  - [ ]* 10.2 Write property test for QR batch ZIP packaging
    - **Property 19: QR Batch ZIP Packaging**
    - **Validates: Requirements 10.2**
  
  - [ ]* 10.3 Write property test for signed URL generation
    - **Property 20: Signed URL Generation**
    - **Validates: Requirements 10.3, 22.2**
  
  - [ ]* 10.4 Write unit tests for S3 operations
    - Test ZIP creation with multiple QR images
    - Test S3 upload with correct bucket and key
    - Test signed URL generation with 1-hour expiration
    - Test expired URL returns access denied
    - _Requirements: 10.2, 10.3, 10.5_


- [x] 11. Implement Data Repository layer
  - [x] 11.1 Create ProductRepository class
    - Implement createProduct, getProduct, updateProduct methods
    - Implement listProductsByManufacturer using GSI
    - Use AWS SDK v3 DynamoDB DocumentClient
    - Create `/backend/repositories/ProductRepository.ts`
    - _Requirements: 17.1, 17.2, 17.4_
  
  - [x] 11.2 Create SerialRepository class
    - Implement createSerial, getSerial methods
    - Implement listSerialsByProduct using GSI
    - Create `/backend/repositories/SerialRepository.ts`
    - _Requirements: 18.1, 18.2, 18.4_
  
  - [x] 11.3 Create ManufacturerRepository class
    - Implement getManufacturer, updateManufacturer methods
    - Create `/backend/repositories/ManufacturerRepository.ts`
    - _Requirements: 2.1, 2.3_
  
  - [ ]* 11.4 Write property test for product query by manufacturer
    - **Property 30: Product Query by Manufacturer**
    - **Validates: Requirements 17.4**
  
  - [ ]* 11.5 Write property test for serial query by product
    - **Property 31: Serial Query by Product**
    - **Validates: Requirements 18.4**
  
  - [ ]* 11.6 Write unit tests for repositories
    - Test product CRUD operations
    - Test serial CRUD operations
    - Test manufacturer retrieval and update
    - Test GSI queries return correct results
    - Verify queries complete within 100ms
    - _Requirements: 17.4, 18.4_

- [x] 12. Implement Verification Service
  - [x] 12.1 Create VerificationService class
    - Implement verifySerial method
    - Retrieve serial, product, and manufacturer data
    - Recompute digital signature from current data
    - Compare stored vs computed signatures
    - Return VerificationResult with verified status
    - Create `/backend/services/VerificationService.ts`
    - _Requirements: 13.1, 13.3, 13.4_
  
  - [ ]* 12.2 Write property test for signature verification match
    - **Property 25: Signature Verification Match**
    - **Validates: Requirements 13.3**
  
  - [ ]* 12.3 Write property test for signature verification mismatch
    - **Property 26: Signature Verification Mismatch**
    - **Validates: Requirements 13.4**
  
  - [ ]* 12.4 Write unit tests for verification service
    - Test verification with matching signatures returns "Verified"
    - Test verification with mismatched signatures returns "Verification Failed"
    - Test verification with invalid serial ID returns error
    - Verify verification completes within 200ms
    - _Requirements: 13.3, 13.4, 13.5_


- [x] 13. Implement AI Service with Bedrock integration
  - [x] 13.1 Create AIService class
    - Implement generateDescription method using Bedrock
    - Implement generateInsights method
    - Use Claude 3 Sonnet model
    - Configure 3-second timeout
    - Implement circuit breaker pattern for resilience
    - Create `/backend/services/AIService.ts`
    - _Requirements: 15.2, 16.1, 16.2_
  
  - [ ]* 13.2 Write property test for AI description generation
    - **Property 27: AI Description Generation**
    - **Validates: Requirements 15.2**
  
  - [ ]* 13.3 Write property test for AI generation error handling
    - **Property 28: AI Generation Error Handling**
    - **Validates: Requirements 15.5**
  
  - [ ]* 13.4 Write unit tests for AI service
    - Test description generation returns non-empty string
    - Test insights generation with lifecycle data
    - Test timeout handling after 3 seconds
    - Test circuit breaker opens after 5 failures
    - Test error handling preserves existing content
    - _Requirements: 15.3, 15.5_

- [x] 14. Checkpoint - Verify all backend services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement Lambda function: CreateProduct
  - [x] 15.1 Create createProduct Lambda handler
    - Parse and validate request body with structured lifecycle data
    - Extract manufacturerId from JWT token
    - Validate material percentages sum to 100%
    - Calculate carbon footprint with section breakdown using CarbonCalculator
    - Assign badge using BadgeEngine
    - Calculate sustainability score
    - Store product with carbonBreakdown using ProductRepository
    - Return product with carbon metrics and breakdown
    - Create `/backend/lambdas/createProduct.ts`
    - _Requirements: 3.2, 3.1.9, 4.1, 4.3, 4.5, 5.1, 6.1, 21.1_
  
  - [ ]* 15.2 Write property test for lifecycle data validation
    - **Property 5: Lifecycle Data Validation**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ]* 15.3 Write property test for carbon footprint persistence
    - **Property 8: Carbon Footprint Persistence**
    - **Validates: Requirements 4.3**
  
  - [ ]* 15.4 Write property test for sustainability score range
    - **Property 11: Sustainability Score Range**
    - **Validates: Requirements 6.1**
  
  - [ ]* 15.5 Write unit tests for createProduct Lambda
    - Test successful product creation with valid structured data
    - Test validation error with missing required fields
    - Test validation error when material percentages don't sum to 100%
    - Test carbon footprint is calculated with breakdown and stored
    - Test badge is assigned and stored
    - Test sustainability score is within 0-100 range
    - Test Lambda completes within 3 seconds
    - _Requirements: 3.3, 3.1.9, 4.3, 4.5, 5.5, 6.1, 21.2_


- [x] 16. Implement Lambda function: GenerateQR
  - [x] 16.1 Create generateQR Lambda handler
    - Parse and validate request body (productId, count)
    - Validate count ≤ 1000
    - Retrieve product data
    - Generate batch of QR codes using QRGenerator
    - Store serial records using SerialRepository
    - Upload QR images to S3 and create ZIP
    - Generate signed URL for ZIP download
    - Return serial IDs and ZIP URL
    - Create `/backend/lambdas/generateQR.ts`
    - _Requirements: 8.1, 8.2, 8.5, 9.3, 10.1, 10.2, 10.3, 21.1_
  
  - [ ]* 16.2 Write property test for serial record persistence
    - **Property 17: Serial Record Persistence**
    - **Validates: Requirements 9.3, 18.3**
  
  - [ ]* 16.3 Write property test for QR code signature embedding
    - **Property 18: QR Code Signature Embedding**
    - **Validates: Requirements 9.4**
  
  - [ ]* 16.4 Write unit tests for generateQR Lambda
    - Test successful QR generation with N=10
    - Test validation error when N > 1000
    - Test serial records are stored in database
    - Test ZIP file is created and uploaded to S3
    - Test signed URL is returned with 1-hour expiration
    - Test Lambda completes within 3 seconds for N≤100
    - _Requirements: 8.4, 8.5, 9.3, 10.3, 21.2_

- [x] 17. Implement Lambda function: GetProduct
  - [x] 17.1 Create getProduct Lambda handler
    - Parse productId from path parameters
    - Retrieve product using ProductRepository
    - Return product data or 404 if not found
    - Create `/backend/lambdas/getProduct.ts`
    - _Requirements: 21.1_
  
  - [ ]* 17.2 Write unit tests for getProduct Lambda
    - Test successful product retrieval with valid productId
    - Test 404 response for non-existent productId
    - Test Lambda completes within 3 seconds
    - _Requirements: 21.2_

- [x] 18. Implement Lambda function: VerifySerial
  - [x] 18.1 Create verifySerial Lambda handler
    - Parse serialId from path parameters
    - Use VerificationService to verify serial
    - Retrieve product and manufacturer data
    - Update scan statistics (scannedCount, lastScannedAt)
    - Return verification result with product data
    - Create `/backend/lambdas/verifySerial.ts`
    - _Requirements: 11.3, 11.4, 11.5, 13.1, 13.3, 13.4, 21.1_
  
  - [ ]* 18.2 Write property test for QR code serial extraction
    - **Property 21: QR Code Serial Extraction**
    - **Validates: Requirements 11.3**
  
  - [ ]* 18.3 Write property test for serial data retrieval
    - **Property 22: Serial Data Retrieval**
    - **Validates: Requirements 11.4**
  
  - [ ]* 18.4 Write property test for invalid serial error handling
    - **Property 23: Invalid Serial Error Handling**
    - **Validates: Requirements 11.5**
  
  - [ ]* 18.5 Write unit tests for verifySerial Lambda
    - Test successful verification with valid serialId
    - Test "Product not found" error for invalid serialId
    - Test scan statistics are updated
    - Test Lambda completes within 3 seconds
    - _Requirements: 11.5, 21.2_


- [x] 19. Implement Lambda function: AIGenerate
  - [x] 19.1 Create aiGenerate Lambda handler
    - Parse request body (productData or productId)
    - Use AIService to generate description or insights
    - Return generated content
    - Handle errors and return fallback messages
    - Create `/backend/lambdas/aiGenerate.ts`
    - _Requirements: 15.1, 15.2, 16.1, 21.1_
  
  - [ ]* 19.2 Write property test for AI insights generation
    - **Property 29: AI Insights Generation**
    - **Validates: Requirements 16.1**
  
  - [ ]* 19.3 Write unit tests for aiGenerate Lambda
    - Test description generation with product data
    - Test insights generation with productId
    - Test error handling returns error message
    - Test Lambda completes within 3 seconds
    - _Requirements: 15.3, 15.5, 21.2_

- [x] 20. Implement Lambda function: UpdateProduct
  - [x] 20.1 Create updateProduct Lambda handler
    - Parse productId and updates from request
    - Validate manufacturerId matches JWT token
    - Support partial lifecycle section updates
    - Recalculate affected section emissions if lifecycle data changed
    - Recalculate total carbon footprint and breakdown
    - Recalculate sustainability score if lifecycle data changed
    - Update product using ProductRepository
    - Return updated product with new carbon metrics
    - Create `/backend/lambdas/updateProduct.ts`
    - _Requirements: 4.4, 6.4, 17.7, 21.1_
  
  - [ ]* 20.2 Write property test for carbon footprint recalculation
    - **Property 9: Carbon Footprint Recalculation**
    - **Validates: Requirements 4.4**
  
  - [ ]* 20.3 Write property test for sustainability score recalculation
    - **Property 12: Sustainability Score Recalculation**
    - **Validates: Requirements 6.4**
  
  - [ ]* 20.4 Write property test for partial lifecycle update
    - **Property 48: Partial Lifecycle Update**
    - **Validates: Requirements 17.7**
  
  - [ ]* 20.5 Write unit tests for updateProduct Lambda
    - Test successful update with valid data
    - Test partial section update preserves other sections
    - Test carbon footprint recalculation on lifecycle change
    - Test sustainability score recalculation on lifecycle change
    - Test authorization check for manufacturerId
    - Test Lambda completes within 3 seconds
    - _Requirements: 4.4, 6.4, 17.7, 21.2_

- [x] 21. Implement Lambda function: ListProducts
  - [x] 21.1 Create listProducts Lambda handler
    - Extract manufacturerId from JWT token
    - Query products using ProductRepository GSI
    - Return list of products with count
    - Create `/backend/lambdas/listProducts.ts`
    - _Requirements: 17.4, 21.1_
  
  - [ ]* 21.2 Write unit tests for listProducts Lambda
    - Test successful product listing for manufacturer
    - Test empty list for manufacturer with no products
    - Test Lambda completes within 3 seconds
    - _Requirements: 17.4, 21.2_

- [x] 22. Implement Lambda function: CalculateEmission (Real-time)
  - [x] 22.1 Create calculateEmission Lambda handler
    - Parse request body with section type and section data
    - Use CarbonCalculator to compute section emission
    - Return section emission and updated total within 50ms
    - Support all section types: materials, manufacturing, packaging, transport, usage, disposal
    - Create `/backend/lambdas/calculateEmission.ts`
    - _Requirements: 3.1.6, 3.2.8, 3.3.6, 3.4.6, 3.5.5, 3.6.5_
  
  - [ ]* 22.2 Write property test for real-time calculation response
    - **Property 49: Real-Time Calculation Response**
    - **Validates: Requirements 3.1.6, 3.2.8, 3.3.6, 3.4.6**
  
  - [ ]* 22.3 Write unit tests for calculateEmission Lambda
    - Test material section calculation
    - Test manufacturing section calculation
    - Test packaging section calculation
    - Test transport section calculation
    - Test usage section calculation
    - Test disposal section calculation
    - Verify response time within 50ms
    - _Requirements: 3.1.6, 3.2.8, 3.3.6, 3.4.6_

- [x] 23. Implement Lambda function: SaveDraft and GetDraft
  - [x] 23.1 Create saveDraft Lambda handler
    - Parse request body with partial lifecycle data
    - Extract manufacturerId from JWT token
    - Store draft data in DynamoDB with draftId
    - Return draftId and timestamp
    - Create `/backend/lambdas/saveDraft.ts`
    - _Requirements: 3.1.6_
  
  - [x] 23.2 Create getDraft Lambda handler
    - Parse draftId from path parameters
    - Retrieve draft data from DynamoDB
    - Validate manufacturerId matches JWT token
    - Return draft data with all saved fields
    - Create `/backend/lambdas/getDraft.ts`
    - _Requirements: 3.1.6_
  
  - [ ]* 23.3 Write property test for draft save and restore
    - **Property 50: Draft Save and Restore**
    - **Validates: Requirements 3.1.6**
  
  - [ ]* 23.4 Write unit tests for draft Lambda functions
    - Test draft save with partial data
    - Test draft retrieval restores all fields
    - Test authorization check for manufacturerId
    - Test Lambda completes within 3 seconds
    - _Requirements: 3.1.6_

- [x] 24. Implement Migration Service for legacy data
  - [x] 24.1 Create MigrationService class
    - Implement migrateProduct method to convert legacy lifecycle format to structured format
    - Preserve carbon footprint within 0.01 kg tolerance
    - Map legacy fields to new Material_Row, Manufacturing_Data, etc.
    - Create `/backend/services/MigrationService.ts`
    - _Requirements: 26.1.4, 26.1.5_
  
  - [ ]* 24.2 Write property test for schema migration preservation
    - **Property 47: Schema Migration Preservation**
    - **Validates: Requirements 26.1.4, 26.1.5**
  
  - [ ]* 24.3 Write unit tests for migration service
    - Test legacy product migration
    - Test carbon footprint preservation
    - Test field mapping correctness
    - _Requirements: 26.1.4, 26.1.5_

- [x] 25. Create schema migration script
  - [x] 25.1 Implement migration script
    - Query all products with legacy lifecycle format
    - Use MigrationService to migrate each product
    - Update products in DynamoDB with new format
    - Log migration results and any errors
    - Create `/infrastructure/migrate-schema.ts`
    - _Requirements: 26.1.4, 26.1.5_
  
  - [ ]* 25.2 Write unit tests for migration script
    - Test batch migration of multiple products
    - Test error handling for invalid legacy data
    - Test migration validation
    - _Requirements: 26.1.4, 26.1.5_


- [x] 26. Configure IAM roles for Lambda functions
  - [x] 26.1 Create IAM role for createProduct Lambda
    - Grant DynamoDB PutItem on Products table
    - Grant CloudWatch Logs write permissions
    - Apply least privilege principle
    - _Requirements: 21.3, 23.1, 23.2_
  
  - [x] 26.2 Create IAM role for generateQR Lambda
    - Grant DynamoDB GetItem on Products table
    - Grant DynamoDB PutItem on ProductSerials table
    - Grant S3 PutObject on QR codes bucket
    - Grant S3 GetObject for signed URL generation
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2, 23.3_
  
  - [x] 26.3 Create IAM role for getProduct Lambda
    - Grant DynamoDB GetItem on Products table
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2_
  
  - [x] 26.4 Create IAM role for verifySerial Lambda
    - Grant DynamoDB GetItem on ProductSerials, Products, Manufacturers tables
    - Grant DynamoDB UpdateItem on ProductSerials table
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2_
  
  - [x] 26.5 Create IAM role for aiGenerate Lambda
    - Grant Bedrock InvokeModel on Claude 3 Sonnet
    - Grant DynamoDB GetItem on Products table
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.4_
  
  - [x] 26.6 Create IAM role for updateProduct Lambda
    - Grant DynamoDB GetItem and UpdateItem on Products table
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2_
  
  - [x] 26.7 Create IAM role for listProducts Lambda
    - Grant DynamoDB Query on Products table GSI
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2_
  
  - [x] 26.8 Create IAM role for calculateEmission Lambda
    - Grant CloudWatch Logs write permissions
    - Apply least privilege principle
    - _Requirements: 21.3, 23.1_
  
  - [x] 26.9 Create IAM role for saveDraft and getDraft Lambdas
    - Grant DynamoDB PutItem and GetItem on Drafts table
    - Grant CloudWatch Logs write permissions
    - _Requirements: 21.3, 23.1, 23.2_

- [x] 27. Checkpoint - Verify all Lambda functions and IAM roles
  - Ensure all tests pass, ask the user if questions arise.


- [x] 28. Provision API Gateway using MCP servers
  - [x] 28.1 Create REST API
    - Use @modelcontextprotocol/server-aws-apigateway
    - Create REST API named "green-passport-api"
    - Configure production stage
    - _Requirements: 20.1, 27.1_
  
  - [x] 28.2 Configure JWT authorizer
    - Create JWT authorizer linked to Cognito User Pool
    - Configure token validation
    - _Requirements: 1.3, 20.3_
  
  - [x] 28.3 Create API routes and methods
    - POST /products → createProduct Lambda
    - GET /products → listProducts Lambda
    - GET /products/{productId} → getProduct Lambda
    - PUT /products/{productId} → updateProduct Lambda
    - POST /qr/generate → generateQR Lambda
    - GET /verify/{serialId} → verifySerial Lambda
    - POST /ai/generate → aiGenerate Lambda
    - POST /calculate/emission → calculateEmission Lambda (real-time)
    - POST /drafts → saveDraft Lambda
    - GET /drafts/{draftId} → getDraft Lambda
    - Configure JWT authorizer on protected routes
    - _Requirements: 20.1, 20.3, 3.1.6_
  
  - [x] 28.4 Configure CORS
    - Enable CORS for all routes
    - Allow origins: CloudFront domain
    - Allow methods: GET, POST, PUT, OPTIONS
    - Allow headers: Authorization, Content-Type
    - _Requirements: 20.2_
  
  - [x] 28.5 Configure rate limiting
    - Set rate limit: 100 requests per second per IP
    - Set burst limit: 200 requests
    - _Requirements: 20.5_
  
  - [ ]* 28.6 Write property test for API request routing
    - **Property 33: API Request Routing**
    - **Validates: Requirements 20.1**
  
  - [ ]* 28.7 Write property test for HTTP status code correctness
    - **Property 34: HTTP Status Code Correctness**
    - **Validates: Requirements 20.4**

- [x] 29. Implement error handling and logging
  - [x] 29.1 Create error handling middleware
    - Implement try-catch wrapper for all Lambda handlers
    - Log errors to CloudWatch with stack trace
    - Return structured error responses
    - Create `/backend/middleware/errorHandler.ts`
    - _Requirements: 21.4, 21.5, 29.1, 29.2_
  
  - [x] 29.2 Implement structured logging utility
    - Create logger with consistent format
    - Include timestamp, requestId, function name, level
    - Support ERROR, WARN, INFO, DEBUG levels
    - Create `/backend/utils/logger.ts`
    - _Requirements: 29.3, 29.4_
  
  - [ ]* 29.3 Write property test for Lambda error logging
    - **Property 35: Lambda Error Logging**
    - **Validates: Requirements 21.4, 29.1**
  
  - [ ]* 29.4 Write property test for structured error responses
    - **Property 36: Structured Error Responses**
    - **Validates: Requirements 21.5, 29.2**
  
  - [ ]* 29.5 Write property test for API request logging
    - **Property 42: API Request Logging**
    - **Validates: Requirements 29.3**
  
  - [ ]* 29.6 Write property test for structured logging format
    - **Property 43: Structured Logging Format**
    - **Validates: Requirements 29.4**
  
  - [ ]* 29.7 Write property test for fault isolation
    - **Property 44: Fault Isolation**
    - **Validates: Requirements 29.5**


- [-] 30. Initialize frontend React application
  - [x] 30.1 Create React + Vite project
    - Initialize Vite project with React and TypeScript
    - Configure Vite for production builds
    - Set up directory structure: /components, /pages, /services, /hooks, /utils
    - Install dependencies: react-router-dom, axios, recharts, react-qr-scanner, canvas-confetti
    - Create `/frontend` directory
    - _Requirements: 19.1, 27.1_
  
  - [x] 30.2 Configure environment variables
    - Create .env file with API Gateway URL, Cognito config
    - Create environment variable loader
    - _Requirements: 19.1_

- [x] 31. Implement authentication context and API client
  - [x] 31.1 Create AuthContext
    - Implement login, logout, token refresh
    - Store JWT token in localStorage
    - Provide authentication state to components
    - Create `/frontend/contexts/AuthContext.tsx`
    - _Requirements: 1.2, 1.3_
  
  - [x] 31.2 Create API client service
    - Implement axios instance with interceptors
    - Add Authorization header with JWT token
    - Handle token refresh on 401 responses
    - Create `/frontend/services/apiClient.ts`
    - _Requirements: 1.3, 20.3_
  
  - [ ]* 31.3 Write property test for authentication token issuance
    - **Property 1: Authentication Token Issuance**
    - **Validates: Requirements 1.2**
  
  - [ ]* 31.4 Write property test for authentication error messages
    - **Property 3: Authentication Error Messages**
    - **Validates: Requirements 1.5**

- [x] 32. Implement Manufacturer Dashboard layout
  - [x] 32.1 Create DashboardLayout component
    - Implement sidebar navigation with sections: Dashboard, Create DPP, Products List, QR Management, Auditor, Settings
    - Apply blue gradient corporate design theme
    - Implement responsive layout for desktop and tablet
    - Create `/frontend/components/DashboardLayout.tsx`
    - _Requirements: 24.1, 24.2, 24.4, 24.5_
  
  - [x] 32.2 Create routing configuration
    - Configure React Router with routes: /dashboard, /create-dpp, /products, /qr-management, /auditor, /settings
    - Implement protected route wrapper
    - Create `/frontend/App.tsx`
    - _Requirements: 24.2_


- [x] 33. Implement Lifecycle_Form component with multi-step structure
  - [x] 33.1 Create Lifecycle_Form component with six-section navigation
    - Implement multi-step form with sections: Raw Materials, Manufacturing, Packaging, Transport, Usage Phase, End of Life
    - Add state management for currentStep (0-5) and formData
    - Implement section-by-section validation before progression
    - Add "Previous", "Next", and "Save as Draft" buttons with appropriate enabled/disabled states
    - Apply blue professional theme consistent with dashboard
    - Create `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.1.1, 3.1.5, 3.1.7, 24.6, 24.10_
  
  - [x] 33.2 Create ProgressIndicator component
    - Display horizontal step indicator with 6 steps
    - Show step numbers and labels (Raw Materials, Manufacturing, etc.)
    - Highlight current active step
    - Show completion status for completed steps
    - Create `/frontend/components/ProgressIndicator.tsx`
    - _Requirements: 3.1.2, 24.6, 24.7_
  
  - [x] 33.3 Create MaterialTable component for dynamic material entry
    - Implement dynamic multi-row table for Material_Row entries
    - Add "Add Material" button to insert new rows
    - Provide material name dropdown with custom entry option
    - Add input fields: percentage, weight, emissionFactor, countryOfOrigin, recycled toggle, certification (optional)
    - Display calculated materialEmission for each row in real-time
    - Add delete button for each row
    - Validate total percentages sum to 100% before allowing progression
    - Create `/frontend/components/MaterialTable.tsx`
    - _Requirements: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.9_
  
  - [x] 33.4 Create Emission_Preview sidebar component
    - Display real-time emission calculations as data is entered
    - Show breakdown by section: materials, manufacturing, packaging, transport, usage, disposal
    - Display running total as sections are completed
    - Update in real-time as form fields change (call calculation API)
    - Use green color theme for emission values
    - Create `/frontend/components/Emission_Preview.tsx`
    - _Requirements: 3.1.3, 4.5, 24.8, 24.9_
  
  - [x] 33.5 Implement Manufacturing section form
    - Add input fields: factoryLocation, energyConsumption, energyEmissionFactor, dyeingMethod (dropdown), waterConsumption, wasteGenerated
    - Call real-time calculation API when energy fields change
    - Display calculated manufacturingEmission in Emission_Preview
    - Create section component in `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8_
  
  - [x] 33.6 Implement Packaging section form
    - Add input fields: materialType (dropdown), weight, emissionFactor, recyclable (toggle)
    - Call real-time calculation API when packaging fields change
    - Display calculated packagingEmission in Emission_Preview
    - Create section component in `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6_
  
  - [x] 33.7 Implement Transport section form
    - Add input fields: mode (dropdown: Road/Air/Ship), distance, fuelType (dropdown), emissionFactorPerKm
    - Call real-time calculation API when transport fields change
    - Display calculated transportEmission in Emission_Preview
    - Create section component in `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5, 3.4.6_
  
  - [x] 33.8 Implement Usage Phase section form
    - Add input fields: avgWashCycles, washTemperature, dryerUse (toggle)
    - Call real-time calculation API when usage fields change
    - Display calculated usageEmission in Emission_Preview
    - Create section component in `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.5.5_
  
  - [x] 33.9 Implement End of Life section form
    - Add input fields: recyclable (toggle), biodegradable (toggle), takebackProgram (toggle), disposalEmission
    - Display disposalEmission value in Emission_Preview
    - Create section component in `/frontend/components/Lifecycle_Form.tsx`
    - _Requirements: 3.6.1, 3.6.2, 3.6.3, 3.6.4, 3.6.5_
  
  - [x] 33.10 Integrate AI autofill button
    - Add "AI Autofill" button for product description field
    - Call AI generate API endpoint
    - Populate description field with generated content
    - Display error message on AI failure
    - _Requirements: 15.1, 15.2, 15.4, 15.5_
  
  - [x] 33.11 Implement confetti animation on save
    - Use canvas-confetti library
    - Trigger confetti popup on successful product save
    - Display sustainability badge in popup
    - Auto-dismiss after 3 seconds
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 33.12 Write unit tests for Lifecycle_Form components
    - Test form validation with missing fields
    - Test section navigation and progression
    - Test material percentage validation (sum to 100%)
    - Test successful form submission
    - Test AI autofill button click
    - Test confetti animation triggers on save
    - Test error message display on save failure
    - Test real-time emission calculations
    - _Requirements: 3.3, 3.1.9, 7.4, 15.5_

- [x] 34. Implement ProductsList component
  - [x] 34.1 Create products table view
    - Display columns: Name, Category, Carbon Footprint, Badge, Created Date
    - Implement filtering by category and badge
    - Implement sorting by carbon footprint
    - Fetch products from API on mount
    - Create `/frontend/components/ProductsList.tsx`
    - _Requirements: 17.4_
  
  - [ ]* 34.2 Write unit tests for ProductsList
    - Test products are fetched and displayed
    - Test filtering by category
    - Test sorting by carbon footprint
    - _Requirements: 17.4_

- [x] 35. Implement QRManagement component
  - [x] 35.1 Create QR generation interface
    - Display product selector dropdown
    - Add numeric input for batch count (max 1000)
    - Add "Generate QR Codes" button
    - Display download link for ZIP file
    - Show validation error when count > 1000
    - Create `/frontend/components/QRManagement.tsx`
    - _Requirements: 8.1, 8.5, 10.4_
  
  - [ ]* 35.2 Write unit tests for QRManagement
    - Test batch count validation
    - Test QR generation API call
    - Test download link display
    - Test error message for count > 1000
    - _Requirements: 8.5, 10.4_


- [x] 36. Implement Consumer View components
  - [x] 36.1 Create QRScanner component
    - Implement camera-based QR scanning using react-qr-scanner
    - Add manual serial number text input
    - Extract serial ID from scanned QR code
    - Call verify API endpoint with serial ID
    - Create `/frontend/components/QRScanner.tsx`
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 36.2 Create ProductDisplay component
    - Display manufacturer information
    - Display product name, description, category
    - Display carbon footprint value
    - Display sustainability badge with color
    - Display verification status with indicator
    - Apply white and green eco-friendly theme
    - Create `/frontend/components/ProductDisplay.tsx`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 25.1, 25.2, 25.3_
  
  - [x] 36.3 Create LifecycleChart component
    - Implement bar chart using recharts
    - Display emission breakdown by lifecycle stage
    - Use green color theme
    - Create `/frontend/components/LifecycleChart.tsx`
    - _Requirements: 14.1, 14.5_
  
  - [x] 36.4 Create MaterialChart component
    - Implement pie chart using recharts
    - Display material composition percentages
    - Use green color theme
    - Create `/frontend/components/MaterialChart.tsx`
    - _Requirements: 14.2, 14.5_
  
  - [x] 36.5 Create SustainabilityGauge component
    - Implement gauge meter for sustainability score
    - Display score value (0-100)
    - Use color gradient based on score
    - Create `/frontend/components/SustainabilityGauge.tsx`
    - _Requirements: 14.3, 14.5_
  
  - [x] 36.6 Create VerificationBadge component
    - Display "Verified" status with green indicator
    - Display "Verification Failed" status with red indicator
    - Create `/frontend/components/VerificationBadge.tsx`
    - _Requirements: 13.3, 13.4_
  
  - [ ]* 36.7 Write unit tests for Consumer View components
    - Test QRScanner extracts serial ID correctly
    - Test ProductDisplay renders all fields
    - Test charts render within 1 second
    - Test VerificationBadge shows correct status
    - Test responsive layout for mobile, tablet, desktop
    - _Requirements: 11.3, 12.1, 14.4, 25.5_

- [x] 37. Implement Consumer View routing
  - [x] 37.1 Create consumer view pages
    - Create landing page with QRScanner at /
    - Create product details page at /product/:serialId
    - Implement responsive layout for all viewports
    - Create `/frontend/pages/ConsumerView.tsx`
    - _Requirements: 11.1, 12.1, 25.5_


- [x] 38. Checkpoint - Verify frontend components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 39. Build and deploy frontend to S3
  - [x] 39.1 Build production frontend
    - Run Vite build command
    - Generate optimized production assets
    - Verify build output in /dist directory
    - _Requirements: 19.1_
  
  - [x] 39.2 Upload frontend assets to S3
    - Upload all files from /dist to frontend S3 bucket
    - Set correct content types for HTML, CSS, JS files
    - Configure cache headers
    - _Requirements: 19.2_

- [x] 40. Provision CloudFront distribution using MCP servers
  - [x] 40.1 Create CloudFront distribution
    - Use @modelcontextprotocol/server-aws-cloudfront
    - Configure S3 frontend bucket as origin
    - Create Origin Access Identity (OAI)
    - Enable HTTPS with default CloudFront certificate
    - Configure cache behaviors for static assets
    - Set default root object to index.html
    - Configure custom error pages (404 → index.html for SPA routing)
    - _Requirements: 19.1, 19.3, 19.4, 27.1_
  
  - [ ]* 40.2 Write property test for CloudFront cache invalidation
    - **Property 32: CloudFront Cache Invalidation**
    - **Validates: Requirements 19.5**

- [-] 41. Deploy all Lambda functions
  - [x] 41.1 Package Lambda functions
    - Bundle each Lambda with dependencies using esbuild
    - Create deployment packages for all 10 Lambda functions (including calculateEmission, saveDraft, getDraft)
    - _Requirements: 21.1_
  
  - [x] 41.2 Deploy Lambda functions using MCP servers
    - Use @modelcontextprotocol/server-aws-lambda
    - Deploy createProduct, generateQR, getProduct, verifySerial, aiGenerate, updateProduct, listProducts, calculateEmission, saveDraft, getDraft
    - Configure Node.js 20.x runtime
    - Set memory: 512MB for most, 1GB for generateQR
    - Set timeout: 30 seconds
    - Attach IAM roles created in task 26
    - Configure environment variables (table names, bucket names)
    - _Requirements: 21.1, 21.2, 21.3, 27.1_


- [x] 42. Configure Amazon Bedrock access
  - [x] 42.1 Enable Bedrock model access
    - Request access to Claude 3 Haiku model in AWS region
    - Configure model invocation parameters
    - Verify IAM permissions for aiGenerate Lambda
    - _Requirements: 15.2, 16.1, 27.1_

- [x] 43. Implement deployment verification script
  - [x] 43.1 Create verification script
    - Verify frontend accessibility via CloudFront URL
    - Verify API Gateway health check endpoint
    - Verify DynamoDB tables exist and are active
    - Verify S3 buckets exist with correct permissions
    - Verify Cognito user pool is active
    - Create `/infrastructure/verify-deployment.ts`
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ]* 43.2 Write property test for deployment service validation
    - **Property 45: Deployment Service Validation**
    - **Validates: Requirements 27.4**
  
  - [ ]* 43.3 Write property test for deployment error messages
    - **Property 46: Deployment Error Messages**
    - **Validates: Requirements 27.5**

- [x] 44. Create test data seeding script
  - [x] 44.1 Implement seeding script
    - Create 1 manufacturer record with name, location, certifications
    - Create 5 product records with varied carbon footprints (2kg, 5kg, 8kg, 3kg, 6kg)
    - Generate 50 QR serial records distributed across 5 products (10 per product)
    - Verify carbon calculations produce correct badge assignments
    - Verify QR scanning retrieves correct product data
    - Create `/infrastructure/seed-data.ts`
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [ ]* 44.2 Write unit tests for seeding script
    - Test manufacturer creation
    - Test product creation with correct badges
    - Test serial generation and storage
    - Test verification of seeded data
    - _Requirements: 26.4, 26.5_

- [x] 45. Implement configuration parser
  - [x] 45.1 Create configuration parser
    - Parse .env files into Configuration object
    - Validate required fields
    - Return descriptive errors for invalid config
    - Create `/infrastructure/config-parser.ts`
    - _Requirements: 28.1, 28.2_
  
  - [ ]* 45.2 Write property test for configuration parsing
    - **Property 38: Configuration Parsing**
    - **Validates: Requirements 28.1**
  
  - [ ]* 45.3 Write property test for configuration parse error handling
    - **Property 39: Configuration Parse Error Handling**
    - **Validates: Requirements 28.2**
  
  - [ ]* 45.4 Write property test for configuration round-trip
    - **Property 40: Configuration Round-Trip**
    - **Validates: Requirements 28.4**
  
  - [ ]* 45.5 Write property test for configuration schema validation
    - **Property 41: Configuration Schema Validation**
    - **Validates: Requirements 28.5**


- [x] 46. Implement S3 bucket security configurations
  - [x] 46.1 Configure bucket policies
    - Block all public access on QR codes bucket
    - Configure bucket policy for signed URL access
    - Enable encryption at rest (AES-256)
    - Enable versioning on critical buckets
    - _Requirements: 22.1, 22.3, 22.4_
  
  - [ ]* 46.2 Write property test for unauthorized access denial
    - **Property 37: Unauthorized Access Denial**
    - **Validates: Requirements 22.5**

- [x] 47. Implement CloudWatch monitoring and alarms
  - [x] 47.1 Create CloudWatch dashboard
    - Add metrics for API request count, latency, errors
    - Add metrics for Lambda execution duration, errors, throttles
    - Add metrics for DynamoDB read/write capacity, throttles
    - Add metrics for S3 request count, data transfer
    - Create `/infrastructure/monitoring.ts`
    - _Requirements: 29.1, 29.3_
  
  - [x] 47.2 Configure CloudWatch alarms
    - Create alarm for API error rate > 5%
    - Create alarm for Lambda error rate > 2%
    - Create alarm for DynamoDB throttling events
    - Create alarm for S3 4xx/5xx error rate > 1%
    - _Requirements: 29.1_

- [x] 48. Implement manufacturer profile management
  - [x] 48.1 Create ManufacturerProfile component
    - Display manufacturer name, location, certifications
    - Implement edit form for profile updates
    - Call updateManufacturer API endpoint
    - Create `/frontend/components/ManufacturerProfile.tsx`
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 48.2 Write property test for manufacturer profile persistence
    - **Property 4: Manufacturer Profile Persistence**
    - **Validates: Requirements 2.2, 2.3**
  
  - [ ]* 48.3 Write unit tests for ManufacturerProfile
    - Test profile display
    - Test profile update
    - Test update persistence within 1 second
    - _Requirements: 2.3_

- [x] 49. Checkpoint - Verify complete system integration
  - Ensure all tests pass, ask the user if questions arise.


- [x] 50. Run complete deployment
  - [x] 50.1 Execute deployment script
    - Run infrastructure provisioning for all AWS services
    - Deploy all Lambda functions
    - Upload frontend to S3 and configure CloudFront
    - Run deployment verification script
    - Output CloudFront URL, API endpoint, admin dashboard URL
    - _Requirements: 27.1, 27.2, 27.3_
  
  - [x] 50.2 Seed test data
    - Run seeding script to create manufacturer, products, and serials
    - Verify seeded data is accessible via API
    - _Requirements: 26.1, 26.2, 26.3_

- [-] 51. Perform end-to-end verification
  - [x] 51.1 Test manufacturer authentication flow
    - Create test manufacturer user in Cognito
    - Test login via dashboard
    - Verify JWT token is issued
    - _Requirements: 1.2, 1.3_
  
  - [x] 51.2 Test product creation flow
    - Log in to manufacturer dashboard
    - Navigate to Create DPP page
    - Fill in structured lifecycle data form (all 6 sections)
    - Verify material percentage validation (sum to 100%)
    - Verify real-time emission calculations in Emission_Preview
    - Submit product creation
    - Verify confetti animation displays
    - Verify product appears in products list
    - _Requirements: 3.1, 3.2, 3.1.9, 7.1, 7.2_
  
  - [x] 51.3 Test QR generation flow
    - Navigate to QR Management page
    - Select product and enter batch count
    - Generate QR codes
    - Download ZIP file
    - Verify ZIP contains correct number of QR images
    - _Requirements: 8.1, 8.2, 10.2, 10.3_
  
  - [x] 51.4 Test consumer verification flow
    - Open consumer view in browser
    - Scan QR code or enter serial ID manually
    - Verify product information displays
    - Verify charts render correctly with structured lifecycle data
    - Verify verification badge shows "Verified" status
    - _Requirements: 11.1, 11.2, 12.1, 12.2, 12.3, 12.4, 12.5, 13.3, 14.1, 14.2, 14.3_
  
  - [x] 51.5 Test AI generation flow
    - Navigate to Create DPP page
    - Click "AI Autofill" button for description
    - Verify description is generated and populated
    - _Requirements: 15.1, 15.2, 15.4_

- [x] 52. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- All 50 correctness properties from the design document are covered by property test tasks (including new properties 47-50 for structured lifecycle data)
- The implementation uses TypeScript for both backend (Lambda functions) and frontend (React)
- AWS MCP servers are used for all infrastructure provisioning to ensure automated deployment
- IAM roles follow least privilege principle with resource-level restrictions
- Error handling and logging are implemented consistently across all Lambda functions
- Frontend uses blue gradient theme for manufacturer dashboard and green eco-theme for consumer view
- New structured lifecycle data entry system with 6-section multi-step form, real-time emission calculations, and comprehensive validation
- MaterialTable component provides dynamic multi-row material entry with percentage validation
- Emission_Preview sidebar displays real-time calculated emissions as data is entered
- Draft save/restore functionality allows manufacturers to save incomplete lifecycle data
- Migration service preserves carbon footprint within 0.01 kg tolerance when converting legacy data
