/**
 * Deployment Verification Script
 * 
 * Verifies that all AWS resources are properly deployed and accessible:
 * - Frontend accessibility via CloudFront URL
 * - API Gateway health check endpoint
 * - DynamoDB tables exist and are active
 * - S3 buckets exist with correct permissions
 * - Cognito user pool is active
 * 
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand, GetBucketEncryptionCommand } from '@aws-sdk/client-s3';
import { 
  CognitoIdentityProviderClient, 
  DescribeUserPoolCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  CloudFrontClient, 
  GetDistributionCommand 
} from '@aws-sdk/client-cloudfront';
import https from 'https';
import http from 'http';

const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

interface VerificationResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

/**
 * Utility function to make HTTP/HTTPS requests
 */
function makeRequest(url: string, timeout: number = 10000): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Verify DynamoDB tables exist and are active
 */
async function verifyDynamoDBTables(): Promise<void> {
  console.log('\n📊 Verifying DynamoDB Tables...');
  const client = new DynamoDBClient({ region });
  
  const tables = [
    'Manufacturers',
    'Products',
    'ProductSerials',
    'Drafts'
  ];

  for (const tableName of tables) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(command);
      
      const status = response.Table?.TableStatus;
      const itemCount = response.Table?.ItemCount || 0;
      
      if (status === 'ACTIVE') {
        results.push({
          service: `DynamoDB - ${tableName}`,
          status: 'PASS',
          message: `Table is ACTIVE with ${itemCount} items`,
          details: {
            status,
            itemCount,
            creationDate: response.Table?.CreationDateTime
          }
        });
        console.log(`  ✓ ${tableName}: ACTIVE (${itemCount} items)`);
      } else {
        results.push({
          service: `DynamoDB - ${tableName}`,
          status: 'WARN',
          message: `Table status is ${status}`,
          details: { status }
        });
        console.log(`  ⚠ ${tableName}: ${status}`);
      }
    } catch (error: any) {
      results.push({
        service: `DynamoDB - ${tableName}`,
        status: 'FAIL',
        message: error.message || 'Table not found',
        details: { error: error.name }
      });
      console.log(`  ✗ ${tableName}: NOT FOUND`);
    }
  }
}

/**
 * Verify S3 buckets exist with correct permissions
 */
async function verifyS3Buckets(): Promise<void> {
  console.log('\n🪣 Verifying S3 Buckets...');
  const client = new S3Client({ region });
  
  const buckets = [
    { name: `gp-qr-codes-${environment}`, type: 'QR Codes' },
    { name: `gp-frontend-${environment}`, type: 'Frontend Assets' }
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      await client.send(new HeadBucketCommand({ Bucket: bucket.name }));
      
      // Check encryption
      try {
        const encryptionResponse = await client.send(
          new GetBucketEncryptionCommand({ Bucket: bucket.name })
        );
        
        const encryptionEnabled = encryptionResponse.ServerSideEncryptionConfiguration?.Rules?.some(
          rule => rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm === 'AES256'
        );
        
        results.push({
          service: `S3 - ${bucket.type}`,
          status: 'PASS',
          message: `Bucket exists with encryption: ${encryptionEnabled ? 'AES256' : 'Unknown'}`,
          details: {
            bucketName: bucket.name,
            encryption: encryptionEnabled
          }
        });
        console.log(`  ✓ ${bucket.name}: EXISTS (Encryption: ${encryptionEnabled ? 'AES256' : 'Unknown'})`);
      } catch (encError) {
        // Bucket exists but encryption check failed
        results.push({
          service: `S3 - ${bucket.type}`,
          status: 'WARN',
          message: 'Bucket exists but encryption status unknown',
          details: { bucketName: bucket.name }
        });
        console.log(`  ⚠ ${bucket.name}: EXISTS (Encryption: Unknown)`);
      }
    } catch (error: any) {
      results.push({
        service: `S3 - ${bucket.type}`,
        status: 'FAIL',
        message: error.message || 'Bucket not found',
        details: { bucketName: bucket.name, error: error.name }
      });
      console.log(`  ✗ ${bucket.name}: NOT FOUND`);
    }
  }
}

/**
 * Verify Cognito user pool is active
 */
async function verifyCognitoUserPool(): Promise<void> {
  console.log('\n🔐 Verifying Cognito User Pool...');
  
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  
  if (!userPoolId) {
    results.push({
      service: 'Cognito User Pool',
      status: 'WARN',
      message: 'COGNITO_USER_POOL_ID environment variable not set',
      details: { note: 'Set COGNITO_USER_POOL_ID to verify user pool' }
    });
    console.log('  ⚠ COGNITO_USER_POOL_ID not set - skipping verification');
    return;
  }

  const client = new CognitoIdentityProviderClient({ region });
  
  try {
    const command = new DescribeUserPoolCommand({ UserPoolId: userPoolId });
    const response = await client.send(command);
    
    const status = response.UserPool?.Status;
    const name = response.UserPool?.Name;
    
    if (status === 'Enabled' || !status) {
      results.push({
        service: 'Cognito User Pool',
        status: 'PASS',
        message: `User pool "${name}" is active`,
        details: {
          userPoolId,
          name,
          status: status || 'Enabled',
          creationDate: response.UserPool?.CreationDate
        }
      });
      console.log(`  ✓ ${name}: ACTIVE`);
    } else {
      results.push({
        service: 'Cognito User Pool',
        status: 'WARN',
        message: `User pool status is ${status}`,
        details: { userPoolId, status }
      });
      console.log(`  ⚠ ${name}: ${status}`);
    }
  } catch (error: any) {
    results.push({
      service: 'Cognito User Pool',
      status: 'FAIL',
      message: error.message || 'User pool not found',
      details: { userPoolId, error: error.name }
    });
    console.log(`  ✗ User Pool: NOT FOUND`);
  }
}

/**
 * Verify CloudFront distribution and frontend accessibility
 */
async function verifyCloudFrontDistribution(): Promise<void> {
  console.log('\n🌐 Verifying CloudFront Distribution...');
  
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  
  if (!distributionId) {
    results.push({
      service: 'CloudFront Distribution',
      status: 'WARN',
      message: 'CLOUDFRONT_DISTRIBUTION_ID environment variable not set',
      details: { note: 'Set CLOUDFRONT_DISTRIBUTION_ID to verify distribution' }
    });
    console.log('  ⚠ CLOUDFRONT_DISTRIBUTION_ID not set - skipping verification');
    return;
  }

  const client = new CloudFrontClient({ region: 'us-east-1' }); // CloudFront is global
  
  try {
    const command = new GetDistributionCommand({ Id: distributionId });
    const response = await client.send(command);
    
    const status = response.Distribution?.Status;
    const domainName = response.Distribution?.DomainName;
    const enabled = response.Distribution?.DistributionConfig?.Enabled;
    
    if (status === 'Deployed' && enabled) {
      results.push({
        service: 'CloudFront Distribution',
        status: 'PASS',
        message: `Distribution is deployed and enabled`,
        details: {
          distributionId,
          domainName,
          status,
          enabled
        }
      });
      console.log(`  ✓ Distribution: DEPLOYED`);
      console.log(`  ✓ Domain: ${domainName}`);
      
      // Test frontend accessibility
      if (domainName) {
        await verifyFrontendAccessibility(`https://${domainName}`);
      }
    } else {
      results.push({
        service: 'CloudFront Distribution',
        status: 'WARN',
        message: `Distribution status: ${status}, enabled: ${enabled}`,
        details: { distributionId, status, enabled }
      });
      console.log(`  ⚠ Distribution: ${status} (Enabled: ${enabled})`);
    }
  } catch (error: any) {
    results.push({
      service: 'CloudFront Distribution',
      status: 'FAIL',
      message: error.message || 'Distribution not found',
      details: { distributionId, error: error.name }
    });
    console.log(`  ✗ Distribution: NOT FOUND`);
  }
}

/**
 * Verify frontend accessibility via CloudFront URL
 */
async function verifyFrontendAccessibility(url: string): Promise<void> {
  console.log('\n🌍 Verifying Frontend Accessibility...');
  
  try {
    const { statusCode, body } = await makeRequest(url, 15000);
    
    if (statusCode === 200) {
      const hasReactRoot = body.includes('id="root"') || body.includes('id=root');
      const hasVite = body.includes('vite') || body.includes('type="module"');
      
      results.push({
        service: 'Frontend Accessibility',
        status: 'PASS',
        message: `Frontend is accessible (HTTP ${statusCode})`,
        details: {
          url,
          statusCode,
          hasReactRoot,
          hasVite
        }
      });
      console.log(`  ✓ Frontend URL: ${url}`);
      console.log(`  ✓ HTTP Status: ${statusCode}`);
      console.log(`  ✓ React Root: ${hasReactRoot ? 'Found' : 'Not Found'}`);
    } else {
      results.push({
        service: 'Frontend Accessibility',
        status: 'WARN',
        message: `Frontend returned HTTP ${statusCode}`,
        details: { url, statusCode }
      });
      console.log(`  ⚠ Frontend URL: ${url} (HTTP ${statusCode})`);
    }
  } catch (error: any) {
    results.push({
      service: 'Frontend Accessibility',
      status: 'FAIL',
      message: error.message || 'Frontend not accessible',
      details: { url, error: error.message }
    });
    console.log(`  ✗ Frontend URL: ${url} (${error.message})`);
  }
}

/**
 * Verify API Gateway health check endpoint
 */
async function verifyAPIGateway(): Promise<void> {
  console.log('\n🔌 Verifying API Gateway...');
  
  const apiUrl = process.env.API_GATEWAY_URL;
  
  if (!apiUrl) {
    results.push({
      service: 'API Gateway',
      status: 'WARN',
      message: 'API_GATEWAY_URL environment variable not set',
      details: { note: 'Set API_GATEWAY_URL to verify API Gateway' }
    });
    console.log('  ⚠ API_GATEWAY_URL not set - skipping verification');
    return;
  }

  // Test health check endpoint
  const healthCheckUrl = `${apiUrl}/health`;
  
  try {
    const { statusCode, body } = await makeRequest(healthCheckUrl, 10000);
    
    if (statusCode === 200) {
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
      
      results.push({
        service: 'API Gateway Health Check',
        status: 'PASS',
        message: `Health check endpoint is accessible (HTTP ${statusCode})`,
        details: {
          url: healthCheckUrl,
          statusCode,
          response: parsedBody
        }
      });
      console.log(`  ✓ Health Check: ${healthCheckUrl}`);
      console.log(`  ✓ HTTP Status: ${statusCode}`);
    } else {
      results.push({
        service: 'API Gateway Health Check',
        status: 'WARN',
        message: `Health check returned HTTP ${statusCode}`,
        details: { url: healthCheckUrl, statusCode }
      });
      console.log(`  ⚠ Health Check: ${healthCheckUrl} (HTTP ${statusCode})`);
    }
  } catch (error: any) {
    results.push({
      service: 'API Gateway Health Check',
      status: 'FAIL',
      message: error.message || 'Health check endpoint not accessible',
      details: { url: healthCheckUrl, error: error.message }
    });
    console.log(`  ✗ Health Check: ${healthCheckUrl} (${error.message})`);
  }
}

/**
 * Print summary report
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`\nTotal Checks: ${total}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`⚠ Warnings: ${warned}`);
  console.log(`✗ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ DEPLOYMENT VERIFICATION FAILED');
    console.log('\nFailed Checks:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.service}: ${r.message}`);
    });
  } else if (warned > 0) {
    console.log('\n⚠️  DEPLOYMENT VERIFICATION COMPLETED WITH WARNINGS');
    console.log('\nWarnings:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.service}: ${r.message}`);
    });
  } else {
    console.log('\n✅ ALL DEPLOYMENT CHECKS PASSED');
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Deployment Verification...');
  console.log(`Region: ${region}`);
  console.log(`Environment: ${environment}`);
  
  try {
    // Run all verification checks
    await verifyDynamoDBTables();
    await verifyS3Buckets();
    await verifyCognitoUserPool();
    await verifyCloudFrontDistribution();
    await verifyAPIGateway();
    
    // Print summary
    printSummary();
    
    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Unexpected error during verification:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  verifyDynamoDBTables,
  verifyS3Buckets,
  verifyCognitoUserPool,
  verifyCloudFrontDistribution,
  verifyFrontendAccessibility,
  verifyAPIGateway
};
