/**
 * Deploy Frontend with CloudFront + HTTPS
 * 
 * This script:
 * 1. Creates/updates CloudFront distribution with HTTPS
 * 2. Configures Origin Access Identity (OAI) for S3
 * 3. Updates S3 bucket policy for secure access
 * 4. Deploys frontend files to S3
 * 5. Invalidates CloudFront cache
 * 
 * Camera Access Fix: CloudFront provides HTTPS which is required for camera access
 */

import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateCloudFrontOriginAccessIdentityCommand,
  ListDistributionsCommand,
  CreateInvalidationCommand,
  ViewerProtocolPolicy,
  Method,
  PriceClass,
  HttpVersion,
  MinimumProtocolVersion
} from '@aws-sdk/client-cloudfront';
import {
  S3Client,
  PutObjectCommand,
  PutBucketPolicyCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const cloudFrontClient = new CloudFrontClient({ region });
const s3Client = new S3Client({ region });
const environment = process.env.ENVIRONMENT || 'dev';
const frontendBucket = process.env.FRONTEND_BUCKET || `gp-frontend-${environment}`;

// Content type mapping
const contentTypeMap: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Cache control settings
const cacheControlMap: Record<string, string> = {
  '.html': 'no-cache, no-store, must-revalidate',
  '.css': 'public, max-age=31536000, immutable',
  '.js': 'public, max-age=31536000, immutable',
  '.png': 'public, max-age=31536000',
  '.jpg': 'public, max-age=31536000',
  '.svg': 'public, max-age=31536000',
  '.ico': 'public, max-age=86400'
};

/**
 * Check if S3 bucket exists
 */
async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: any) {
    return false;
  }
}

/**
 * Create Origin Access Identity (OAI)
 */
async function createOAI(): Promise<string> {
  console.log('\n📋 Step 1: Creating Origin Access Identity...');
  
  try {
    const command = new CreateCloudFrontOriginAccessIdentityCommand({
      CloudFrontOriginAccessIdentityConfig: {
        CallerReference: `gp-oai-${environment}-${Date.now()}`,
        Comment: `OAI for Green Passport Frontend ${environment}`
      }
    });
    
    const response = await cloudFrontClient.send(command);
    const oaiId = response.CloudFrontOriginAccessIdentity?.Id;
    
    if (!oaiId) {
      throw new Error('Failed to create OAI');
    }
    
    console.log(`  ✓ OAI created: ${oaiId}`);
    return oaiId;
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('  ℹ OAI already exists, continuing...');
      // Return a placeholder - we'll handle this in the distribution check
      return 'existing';
    }
    throw error;
  }
}

/**
 * Update S3 bucket policy for OAI access
 */
async function updateBucketPolicy(oaiId: string): Promise<void> {
  console.log('\n📋 Step 2: Updating S3 bucket policy...');
  
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowCloudFrontOAI',
        Effect: 'Allow',
        Principal: {
          Service: 'cloudfront.amazonaws.com'
        },
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${frontendBucket}/*`,
        Condition: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${process.env.AWS_ACCOUNT_ID || '*'}:distribution/*`
          }
        }
      }
    ]
  };
  
  try {
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: frontendBucket,
      Policy: JSON.stringify(bucketPolicy)
    }));
    console.log('  ✓ S3 bucket policy updated');
  } catch (error: any) {
    console.error('  ✗ Failed to update bucket policy:', error.message);
    throw error;
  }
}

/**
 * Check for existing CloudFront distribution
 */
async function getExistingDistribution(): Promise<any> {
  try {
    const response = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const distributions = response.DistributionList?.Items || [];
    
    const existingDist = distributions.find(dist => {
      const origins = dist.Origins?.Items || [];
      return origins.some(origin => 
        origin.DomainName?.includes(frontendBucket)
      );
    });
    
    return existingDist || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create CloudFront distribution with HTTPS
 */
async function createDistribution(oaiId: string): Promise<{ distributionId: string; domain: string }> {
  console.log('\n📋 Step 3: Creating CloudFront distribution with HTTPS...');
  
  // Check for existing distribution
  const existing = await getExistingDistribution();
  if (existing && existing.Id && existing.DomainName) {
    console.log(`  ✓ Distribution already exists: ${existing.Id}`);
    console.log(`  ✓ Domain: ${existing.DomainName}`);
    return {
      distributionId: existing.Id,
      domain: existing.DomainName
    };
  }
  
  const originDomain = `${frontendBucket}.s3.${region}.amazonaws.com`;
  
  const distributionConfig = {
    CallerReference: `gp-dist-${environment}-${Date.now()}`,
    Comment: `Green Passport Frontend - ${environment} (HTTPS for Camera Access)`,
    Enabled: true,
    
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: `S3-${frontendBucket}`,
          DomainName: originDomain,
          S3OriginConfig: {
            OriginAccessIdentity: `origin-access-identity/cloudfront/${oaiId}`
          }
        }
      ]
    },
    
    DefaultCacheBehavior: {
      TargetOriginId: `S3-${frontendBucket}`,
      ViewerProtocolPolicy: 'redirect-to-https' as ViewerProtocolPolicy, // Force HTTPS
      AllowedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'] as Method[],
        CachedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'] as Method[]
        }
      },
      Compress: true,
      ForwardedValues: {
        QueryString: false,
        Cookies: { Forward: 'none' as const }
      },
      MinTTL: 0,
      DefaultTTL: 86400,
      MaxTTL: 31536000,
      TrustedSigners: {
        Enabled: false,
        Quantity: 0
      }
    },
    
    CustomErrorResponses: {
      Quantity: 2,
      Items: [
        {
          ErrorCode: 404,
          ResponsePagePath: '/index.html',
          ResponseCode: '200',
          ErrorCachingMinTTL: 300
        },
        {
          ErrorCode: 403,
          ResponsePagePath: '/index.html',
          ResponseCode: '200',
          ErrorCachingMinTTL: 300
        }
      ]
    },
    
    DefaultRootObject: 'index.html',
    
    ViewerCertificate: {
      CloudFrontDefaultCertificate: true,
      MinimumProtocolVersion: 'TLSv1.2_2021' as MinimumProtocolVersion
    },
    
    PriceClass: 'PriceClass_100' as PriceClass,
    HttpVersion: 'http2and3' as HttpVersion
  };
  
  try {
    const command = new CreateDistributionCommand({
      DistributionConfig: distributionConfig
    });
    
    const response = await cloudFrontClient.send(command);
    const distribution = response.Distribution;
    
    if (!distribution?.Id || !distribution?.DomainName) {
      throw new Error('Failed to create distribution');
    }
    
    console.log(`  ✓ Distribution created: ${distribution.Id}`);
    console.log(`  ✓ Domain: ${distribution.DomainName}`);
    console.log(`  ✓ Status: ${distribution.Status}`);
    
    return {
      distributionId: distribution.Id,
      domain: distribution.DomainName
    };
  } catch (error: any) {
    console.error('  ✗ Failed to create distribution:', error.message);
    throw error;
  }
}

/**
 * Get all files recursively
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Upload file to S3
 */
async function uploadFile(filePath: string, distDir: string): Promise<void> {
  const fileContent = readFileSync(filePath);
  const relativePath = filePath.replace(distDir + '\\', '').replace(/\\/g, '/');
  const ext = extname(filePath);
  
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  const cacheControl = cacheControlMap[ext] || 'public, max-age=3600';

  await s3Client.send(new PutObjectCommand({
    Bucket: frontendBucket,
    Key: relativePath,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: cacheControl
  }));

  console.log(`  ✓ ${relativePath}`);
}

/**
 * Deploy frontend files to S3
 */
async function deployFrontend(): Promise<void> {
  console.log('\n📋 Step 4: Deploying frontend files to S3...');
  
  const distDir = join(__dirname, '..', 'frontend', 'dist');
  
  if (!existsSync(distDir)) {
    throw new Error(`Frontend dist directory not found: ${distDir}\nPlease run: cd frontend && npm run build`);
  }
  
  const files = getAllFiles(distDir);
  console.log(`  Found ${files.length} files to upload\n`);

  for (const file of files) {
    await uploadFile(file, distDir);
  }
  
  console.log('\n  ✓ All files uploaded');
}

/**
 * Invalidate CloudFront cache
 */
async function invalidateCache(distributionId: string): Promise<void> {
  console.log('\n📋 Step 5: Invalidating CloudFront cache...');
  
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ['/*']
        }
      }
    });
    
    const response = await cloudFrontClient.send(command);
    console.log(`  ✓ Invalidation created: ${response.Invalidation?.Id}`);
    console.log('  ℹ Cache invalidation may take 5-10 minutes');
  } catch (error: any) {
    console.error('  ✗ Failed to invalidate cache:', error.message);
    // Don't throw - this is not critical
  }
}

/**
 * Main deployment function
 */
async function main() {
  try {
    console.log('🚀 Deploying Frontend with CloudFront + HTTPS');
    console.log('=' .repeat(60));
    console.log(`Environment: ${environment}`);
    console.log(`Frontend Bucket: ${frontendBucket}`);
    console.log(`Region: ${region}`);
    console.log('=' .repeat(60));
    
    // Verify bucket exists
    if (!await bucketExists(frontendBucket)) {
      throw new Error(`S3 bucket ${frontendBucket} does not exist. Please create it first.`);
    }
    
    // Step 1: Create OAI
    const oaiId = await createOAI();
    
    // Step 2: Update bucket policy
    if (oaiId !== 'existing') {
      await updateBucketPolicy(oaiId);
    }
    
    // Step 3: Create/get CloudFront distribution
    const { distributionId, domain } = await createDistribution(oaiId);
    
    // Step 4: Deploy frontend files
    await deployFrontend();
    
    // Step 5: Invalidate cache
    await invalidateCache(distributionId);
    
    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ DEPLOYMENT SUCCESSFUL');
    console.log('='.repeat(60));
    console.log('\n📱 Frontend URL (HTTPS):');
    console.log(`   https://${domain}`);
    console.log('\n🎥 Camera Access:');
    console.log('   ✓ HTTPS enabled - camera will work on mobile and desktop');
    console.log('   ✓ Secure origin - browsers will allow camera access');
    console.log('\n⏱️  Distribution Status:');
    console.log('   • Initial deployment: 15-20 minutes');
    console.log('   • Cache invalidation: 5-10 minutes');
    console.log('   • Check status: AWS Console > CloudFront');
    console.log('\n📋 Next Steps:');
    console.log('   1. Wait for distribution to deploy (check AWS Console)');
    console.log(`   2. Access: https://${domain}`);
    console.log('   3. Test camera on /consumer page');
    console.log('   4. Verify QR scanning works on mobile and desktop');
    console.log('\n💡 Testing Camera:');
    console.log(`   • Desktop: https://${domain}/consumer`);
    console.log(`   • Mobile: Scan QR code or visit URL directly`);
    console.log('   • Allow camera permission when prompted');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DEPLOYMENT FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check AWS credentials: aws configure');
    console.error('   2. Verify S3 bucket exists:', frontendBucket);
    console.error('   3. Build frontend: cd frontend && npm run build');
    console.error('   4. Check IAM permissions for CloudFront and S3');
    console.error('   5. Review error details above');
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createOAI, updateBucketPolicy, createDistribution, deployFrontend, invalidateCache };
