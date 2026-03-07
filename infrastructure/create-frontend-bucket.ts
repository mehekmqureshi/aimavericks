import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  PutBucketCorsCommand,
  PutBucketWebsiteCommand,
  BucketLocationConstraint
} from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new S3Client({ region });
const bucketName = process.env.FRONTEND_BUCKET || 'gp-frontend-aimavericks-2026';

async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function createFrontendBucket(): Promise<void> {
  console.log(`Creating frontend bucket: ${bucketName}\n`);

  if (await bucketExists(bucketName)) {
    console.log(`✓ Bucket ${bucketName} already exists`);
    return;
  }

  // Create bucket
  const createParams: any = {
    Bucket: bucketName
  };

  // Only add LocationConstraint if not in us-east-1
  if (region !== 'us-east-1') {
    createParams.CreateBucketConfiguration = {
      LocationConstraint: region as BucketLocationConstraint
    };
  }

  await client.send(new CreateBucketCommand(createParams));
  console.log(`✓ Bucket created`);

  // Configure public access block (will be accessed via CloudFront)
  await client.send(new PutPublicAccessBlockCommand({
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      IgnorePublicAcls: false,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false
    }
  }));
  console.log(`✓ Public access configured for CloudFront`);

  // Enable AES-256 encryption at rest
  await client.send(new PutBucketEncryptionCommand({
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          },
          BucketKeyEnabled: true
        }
      ]
    }
  }));
  console.log(`✓ AES-256 encryption enabled`);

  // Configure static website hosting
  await client.send(new PutBucketWebsiteCommand({
    Bucket: bucketName,
    WebsiteConfiguration: {
      IndexDocument: {
        Suffix: 'index.html'
      },
      ErrorDocument: {
        Key: 'index.html' // SPA fallback
      }
    }
  }));
  console.log(`✓ Static website hosting configured`);

  // Configure CORS for API access
  await client.send(new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'], // Should be restricted to CloudFront domain in production
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600
        }
      ]
    }
  }));
  console.log(`✓ CORS configured`);

  console.log(`\n✓ Frontend bucket ${bucketName} created successfully`);
}

async function main() {
  try {
    await createFrontendBucket();
  } catch (error) {
    console.error('Error creating frontend bucket:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createFrontendBucket };
