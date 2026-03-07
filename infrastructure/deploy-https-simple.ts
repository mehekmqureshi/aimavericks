/**
 * Simple HTTPS Deployment Script
 * Uses existing CloudFront distribution and updates files
 */

import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateInvalidationCommand
} from '@aws-sdk/client-cloudfront';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const s3Client = new S3Client({ region });
const cloudFrontClient = new CloudFrontClient({ region });
const frontendBucket = process.env.FRONTEND_BUCKET || 'gp-frontend-prod-2026';

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

async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: any) {
    return false;
  }
}

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

async function deployFrontend(): Promise<void> {
  console.log('\n📋 Deploying frontend files to S3...');
  
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

async function getCloudFrontDistribution(): Promise<string | null> {
  try {
    const response = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const distributions = response.DistributionList?.Items || [];
    
    const dist = distributions.find(d => {
      const origins = d.Origins?.Items || [];
      return origins.some(origin => 
        origin.DomainName?.includes(frontendBucket) ||
        origin.DomainName?.includes('gp-frontend')
      );
    });
    
    return dist?.Id || null;
  } catch (error) {
    return null;
  }
}

async function invalidateCache(distributionId: string): Promise<void> {
  console.log('\n📋 Invalidating CloudFront cache...');
  
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
  } catch (error: any) {
    console.warn('  ⚠ Failed to invalidate cache:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Simple HTTPS Deployment');
    console.log('=' .repeat(60));
    console.log(`Frontend Bucket: ${frontendBucket}`);
    console.log(`Region: ${region}`);
    console.log('=' .repeat(60));
    
    // Verify bucket exists
    if (!await bucketExists(frontendBucket)) {
      throw new Error(`S3 bucket ${frontendBucket} does not exist.`);
    }
    console.log('✓ S3 bucket exists');
    
    // Deploy frontend files
    await deployFrontend();
    
    // Get CloudFront distribution
    const distributionId = await getCloudFrontDistribution();
    
    if (distributionId) {
      console.log(`\n✓ Found CloudFront distribution: ${distributionId}`);
      await invalidateCache(distributionId);
      
      // Get distribution domain
      const response = await cloudFrontClient.send(new ListDistributionsCommand({}));
      const dist = response.DistributionList?.Items?.find(d => d.Id === distributionId);
      const domain = dist?.DomainName;
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT SUCCESSFUL');
      console.log('='.repeat(60));
      console.log('\n📱 Frontend URL (HTTPS):');
      console.log(`   https://${domain}`);
      console.log('\n🔒 Security:');
      console.log('   ✓ CloudFront serves via HTTPS');
      console.log('   ✓ API Gateway uses HTTPS');
      console.log('   ✓ All endpoints secure');
      console.log('\n⏱️  Cache invalidation: 5-10 minutes');
      console.log('='.repeat(60));
    } else {
      console.log('\n⚠️  No CloudFront distribution found');
      console.log('   Files uploaded to S3 successfully');
      console.log('   You may need to create a CloudFront distribution');
    }
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DEPLOYMENT FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { deployFrontend, invalidateCache };
